// ============================================================
//  PACKAGE store — Cart Store (SQLite)
// ============================================================
//  WHY: The cart is the most volatile data structure in e-commerce.
//  During Big Billion Days, users add and remove items constantly.
//  The CartStore uses two key patterns:
//  1. Upsert (INSERT ... ON CONFLICT UPDATE) — atomically adds or
//     updates cart items without race conditions.
//  2. JOIN queries — fetches cart items with full product details
//     in a single query, avoiding the N+1 problem.
//
//  The UNIQUE(user_id, product_id) constraint ensures each user
//  has at most one entry per product. Adding the same product
//  twice updates the quantity instead of creating a duplicate.
// ============================================================

package store

import (
	"context"
	"database/sql"
	"fmt"

	"bazaarapi/internal/model"
)

// ──────────────────────────────────────────────────────────────
// CartStore — repository for shopping cart data.
// ──────────────────────────────────────────────────────────────

// CartStore handles cart persistence in SQLite.
type CartStore struct {
	db *sql.DB
}

// NewCartStore creates the cart_items table and returns a CartStore.
// WHY UNIQUE(user_id, product_id)? So that the database enforces
// "one row per product per user". The upsert query relies on this
// constraint to decide between INSERT and UPDATE.
func NewCartStore(db *sql.DB) (*CartStore, error) {
	query := `
	CREATE TABLE IF NOT EXISTS cart_items (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id    INTEGER NOT NULL,
		product_id INTEGER NOT NULL,
		quantity   INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
		UNIQUE(user_id, product_id),
		FOREIGN KEY (user_id)    REFERENCES users(id),
		FOREIGN KEY (product_id) REFERENCES products(id)
	);
	CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
	`
	if _, err := db.ExecContext(context.Background(), query); err != nil {
		return nil, fmt.Errorf("create cart_items table: %w", err)
	}

	return &CartStore{db: db}, nil
}

// ──────────────────────────────────────────────────────────────
// AddItem adds a product to the cart, or updates the quantity if
// the product already exists.
// WHY upsert? Consider this Big Billion Days scenario:
//   User clicks "Add to Cart" on a OnePlus phone (quantity 1).
//   User clicks again (wants 2 now).
// Without upsert, we would need: SELECT → if exists UPDATE else INSERT.
// That is two queries and a race condition. The ON CONFLICT clause
// does it atomically in one query.
// ──────────────────────────────────────────────────────────────

// AddItem adds or updates a cart item using upsert.
func (s *CartStore) AddItem(ctx context.Context, userID, productID int64, quantity int) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO cart_items (user_id, product_id, quantity)
		 VALUES (?, ?, ?)
		 ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + ?`,
		userID, productID, quantity, quantity,
	)
	if err != nil {
		return fmt.Errorf("add to cart: %w", err)
	}
	return nil
}

// ──────────────────────────────────────────────────────────────
// GetCart retrieves all cart items for a user with product details.
// WHY JOIN? Without it, we would need to:
//   1. SELECT all cart_items for the user (N rows)
//   2. For each row, SELECT the product details (N more queries)
// This is the infamous N+1 problem. A single JOIN query gets
// everything in one round trip to the database.
// ──────────────────────────────────────────────────────────────

// GetCart returns the user's full cart with product details and total.
func (s *CartStore) GetCart(ctx context.Context, userID int64) (*model.Cart, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT
			ci.id, ci.user_id, ci.product_id, ci.quantity,
			p.id, p.name, p.description, p.price, p.stock, p.category, p.image_url, p.seller_id, p.created_at, p.updated_at
		 FROM cart_items ci
		 JOIN products p ON ci.product_id = p.id
		 WHERE ci.user_id = ?
		 ORDER BY ci.id ASC`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("query cart: %w", err)
	}
	defer rows.Close()

	cart := &model.Cart{
		Items: []model.CartItem{},
	}
	var total float64

	for rows.Next() {
		var item model.CartItem
		var product model.Product

		if err := rows.Scan(
			&item.ID, &item.UserID, &item.ProductID, &item.Quantity,
			&product.ID, &product.Name, &product.Description, &product.Price,
			&product.Stock, &product.Category, &product.ImageURL, &product.SellerID,
			&product.CreatedAt, &product.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan cart item: %w", err)
		}

		item.Product = &product
		cart.Items = append(cart.Items, item)

		// WHY compute total server-side? Because the price in the database
		// is the source of truth. Never trust the client to calculate prices.
		total += product.Price * float64(item.Quantity)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate cart items: %w", err)
	}

	cart.Total = total
	return cart, nil
}

// ──────────────────────────────────────────────────────────────
// UpdateQuantity changes the quantity of a specific cart item.
// ──────────────────────────────────────────────────────────────

// UpdateQuantity updates the quantity of a product in the user's cart.
func (s *CartStore) UpdateQuantity(ctx context.Context, userID, productID int64, quantity int) (bool, error) {
	result, err := s.db.ExecContext(ctx,
		`UPDATE cart_items SET quantity = ?
		 WHERE user_id = ? AND product_id = ?`,
		quantity, userID, productID,
	)
	if err != nil {
		return false, fmt.Errorf("update cart quantity: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("rows affected: %w", err)
	}
	return rows > 0, nil
}

// ──────────────────────────────────────────────────────────────
// RemoveItem deletes a specific product from the user's cart.
// ──────────────────────────────────────────────────────────────

// RemoveItem removes a product from the user's cart.
func (s *CartStore) RemoveItem(ctx context.Context, userID, productID int64) (bool, error) {
	result, err := s.db.ExecContext(ctx,
		`DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`,
		userID, productID,
	)
	if err != nil {
		return false, fmt.Errorf("remove from cart: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("rows affected: %w", err)
	}
	return rows > 0, nil
}

// ──────────────────────────────────────────────────────────────
// ClearCart removes all items from a user's cart.
// WHY a dedicated method? After a successful order placement,
// the cart must be emptied. This is called within the order
// transaction so that cart clearing is atomic with order creation.
// ──────────────────────────────────────────────────────────────

// ClearCart removes all items from a user's cart. Accepts a *sql.Tx
// so it can participate in the order transaction.
func (s *CartStore) ClearCart(ctx context.Context, tx *sql.Tx, userID int64) error {
	_, err := tx.ExecContext(ctx,
		`DELETE FROM cart_items WHERE user_id = ?`, userID,
	)
	if err != nil {
		return fmt.Errorf("clear cart: %w", err)
	}
	return nil
}
