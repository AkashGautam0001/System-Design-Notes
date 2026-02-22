// ============================================================
//  PACKAGE store — Order Store (SQLite)
// ============================================================
//  WHY: The OrderStore is the most critical piece of BazaarAPI.
//  It handles the cart → order conversion — the moment a Big
//  Billion Days shopper clicks "Place Order". This involves:
//  1. Reading the cart
//  2. Validating stock for every item
//  3. Calculating the total
//  4. Creating the order record
//  5. Creating order item records (with price snapshot)
//  6. Decrementing stock for each product
//  7. Clearing the cart
//  All of this must be ATOMIC — if step 6 fails because stock
//  ran out, steps 4 and 5 must be rolled back. This is why we
//  use database transactions (BEGIN ... COMMIT / ROLLBACK).
//
//  THE BIG BILLION DAYS PROBLEM:
//  Two users both have the last OnePlus Nord in their cart.
//  Both click "Place Order" at the same time. Without transactions:
//    User A: reads stock=1 → creates order → sets stock=0 ✓
//    User B: reads stock=1 → creates order → sets stock=-1 ✗ OVERSOLD
//  With a transaction and the CHECK(stock >= 0) constraint, User B's
//  stock decrement fails, the transaction rolls back, and the user
//  gets a friendly "out of stock" error. No overselling. No fraud.
// ============================================================

package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"bazaarapi/internal/model"
)

// ──────────────────────────────────────────────────────────────
// OrderStore — repository for order data.
// ──────────────────────────────────────────────────────────────

// OrderStore handles order persistence in SQLite.
type OrderStore struct {
	db           *sql.DB
	productStore *ProductStore
	cartStore    *CartStore
}

// NewOrderStore creates orders and order_items tables and returns an OrderStore.
// WHY does it take ProductStore and CartStore? Because CreateFromCart needs to:
// - Read the cart (CartStore.GetCart)
// - Decrement stock (ProductStore.UpdateStock)
// - Clear the cart (CartStore.ClearCart)
// This is dependency injection — the OrderStore declares what it needs.
func NewOrderStore(db *sql.DB, productStore *ProductStore, cartStore *CartStore) (*OrderStore, error) {
	query := `
	CREATE TABLE IF NOT EXISTS orders (
		id               INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id          INTEGER  NOT NULL,
		status           TEXT     NOT NULL DEFAULT 'pending',
		total_amount     REAL     NOT NULL DEFAULT 0,
		shipping_address TEXT     NOT NULL DEFAULT '',
		created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
	CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

	CREATE TABLE IF NOT EXISTS order_items (
		id             INTEGER PRIMARY KEY AUTOINCREMENT,
		order_id       INTEGER NOT NULL,
		product_id     INTEGER NOT NULL,
		quantity       INTEGER NOT NULL CHECK(quantity > 0),
		price_at_order REAL    NOT NULL CHECK(price_at_order >= 0),
		FOREIGN KEY (order_id)   REFERENCES orders(id),
		FOREIGN KEY (product_id) REFERENCES products(id)
	);
	CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
	`
	if _, err := db.ExecContext(context.Background(), query); err != nil {
		return nil, fmt.Errorf("create orders tables: %w", err)
	}

	return &OrderStore{
		db:           db,
		productStore: productStore,
		cartStore:    cartStore,
	}, nil
}

// ──────────────────────────────────────────────────────────────
// CreateFromCart — THE STAR OF CHAPTER 35
//
// This method converts a user's cart into a permanent order.
// It is a single transaction that either fully succeeds or
// fully rolls back. Here is the step-by-step flow:
//
//   BEGIN TRANSACTION
//   ├── 1. Read cart items (with product details via JOIN)
//   ├── 2. Validate: cart must not be empty
//   ├── 3. Calculate total amount
//   ├── 4. INSERT into orders table
//   ├── 5. For each cart item:
//   │   ├── INSERT into order_items (snapshot price)
//   │   └── UPDATE products SET stock = stock - quantity
//   ├── 6. DELETE all cart_items for this user
//   └── COMMIT (or ROLLBACK on any error)
//
// WHY defer tx.Rollback()? It is a safety net. If any step fails
// and we return early, the deferred Rollback() undoes everything.
// If we reach Commit() successfully, the subsequent Rollback()
// is a no-op (calling Rollback on a committed tx does nothing).
// ──────────────────────────────────────────────────────────────

// CreateFromCart converts the user's cart into an order within a single transaction.
func (s *OrderStore) CreateFromCart(ctx context.Context, userID int64, shippingAddress string) (*model.Order, error) {
	// Step 1: Read the cart BEFORE starting the transaction.
	// WHY outside the tx? GetCart uses the CartStore's db connection.
	// We read the cart first, then do all mutations inside the tx.
	cart, err := s.cartStore.GetCart(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get cart: %w", err)
	}

	// Step 2: Validate — cannot place an order with an empty cart.
	if len(cart.Items) == 0 {
		return nil, fmt.Errorf("cart is empty")
	}

	// Step 3: Begin the transaction.
	// WHY BeginTx with context? So that if the HTTP request is cancelled
	// (user closes browser), the transaction is rolled back automatically.
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	// WHY defer Rollback? This is the safety net pattern:
	// - If any step below returns an error, we exit the function,
	//   and the deferred Rollback undoes all changes.
	// - If we reach Commit successfully, Rollback is a harmless no-op.
	// This pattern is idiomatic Go for transaction handling.
	defer tx.Rollback()

	now := time.Now().UTC()

	// Step 4: Calculate total from current product prices.
	// WHY recalculate instead of using cart.Total? Because between
	// the time the user loaded their cart page and clicked "Place Order",
	// prices might have changed (flash deal started/ended). We use
	// the prices from the cart JOIN query (which are current).
	var totalAmount float64
	for _, item := range cart.Items {
		if item.Product == nil {
			return nil, fmt.Errorf("product details missing for cart item %d", item.ID)
		}
		totalAmount += item.Product.Price * float64(item.Quantity)
	}

	// Step 5: Insert the order record.
	result, err := tx.ExecContext(ctx,
		`INSERT INTO orders (user_id, status, total_amount, shipping_address, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		userID, model.OrderStatusPending, totalAmount, shippingAddress, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert order: %w", err)
	}

	orderID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("get order id: %w", err)
	}

	// Step 6: For each cart item — create order_item + decrement stock.
	orderItems := make([]model.OrderItem, 0, len(cart.Items))
	for _, item := range cart.Items {
		// Insert order item with PriceAtOrder — the price snapshot.
		// WHY snapshot the price? Because the product price may change
		// tomorrow, but this order's total must remain what the user
		// agreed to pay. This is a fundamental e-commerce principle.
		_, err := tx.ExecContext(ctx,
			`INSERT INTO order_items (order_id, product_id, quantity, price_at_order)
			 VALUES (?, ?, ?, ?)`,
			orderID, item.ProductID, item.Quantity, item.Product.Price,
		)
		if err != nil {
			return nil, fmt.Errorf("insert order item: %w", err)
		}

		// Decrement stock. The UpdateStock method uses:
		//   WHERE id = ? AND stock >= ?
		// This means if stock has gone to 0 between cart-load and now
		// (another user bought the last one), this UPDATE affects 0 rows
		// and returns an error. The transaction rolls back. No overselling.
		if err := s.productStore.UpdateStock(ctx, tx, item.ProductID, item.Quantity); err != nil {
			return nil, fmt.Errorf("decrement stock for product %d: %w", item.ProductID, err)
		}

		orderItems = append(orderItems, model.OrderItem{
			OrderID:      orderID,
			ProductID:    item.ProductID,
			Quantity:     item.Quantity,
			PriceAtOrder: item.Product.Price,
			Product:      item.Product,
		})
	}

	// Step 7: Clear the cart — the items are now in order_items.
	if err := s.cartStore.ClearCart(ctx, tx, userID); err != nil {
		return nil, fmt.Errorf("clear cart: %w", err)
	}

	// Step 8: COMMIT — make everything permanent.
	// WHY explicit Commit? Without it, the deferred Rollback would
	// undo all our work. Commit is the "yes, I meant all of that" signal.
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	// Build and return the order for the API response.
	order := &model.Order{
		ID:              orderID,
		UserID:          userID,
		Status:          model.OrderStatusPending,
		TotalAmount:     totalAmount,
		ShippingAddress: shippingAddress,
		Items:           orderItems,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	return order, nil
}

// ──────────────────────────────────────────────────────────────
// GetByID retrieves a single order with its items.
// WHY two queries? The order and its items are in separate tables.
// We fetch the order first, then its items. An alternative would
// be a single JOIN query, but that duplicates the order columns
// for every item row — wasteful for orders with many items.
// ──────────────────────────────────────────────────────────────

// GetByID retrieves an order by its ID, including order items with product details.
func (s *OrderStore) GetByID(ctx context.Context, orderID int64) (*model.Order, error) {
	order := &model.Order{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, user_id, status, total_amount, shipping_address, created_at, updated_at
		 FROM orders WHERE id = ?`, orderID,
	).Scan(&order.ID, &order.UserID, &order.Status, &order.TotalAmount,
		&order.ShippingAddress, &order.CreatedAt, &order.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query order: %w", err)
	}

	// Fetch order items with product details.
	items, err := s.getOrderItems(ctx, orderID)
	if err != nil {
		return nil, err
	}
	order.Items = items

	return order, nil
}

// getOrderItems fetches all items for a given order with product details.
func (s *OrderStore) getOrderItems(ctx context.Context, orderID int64) ([]model.OrderItem, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT
			oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price_at_order,
			p.id, p.name, p.description, p.price, p.stock, p.category, p.image_url, p.seller_id, p.created_at, p.updated_at
		 FROM order_items oi
		 JOIN products p ON oi.product_id = p.id
		 WHERE oi.order_id = ?
		 ORDER BY oi.id ASC`, orderID,
	)
	if err != nil {
		return nil, fmt.Errorf("query order items: %w", err)
	}
	defer rows.Close()

	var items []model.OrderItem
	for rows.Next() {
		var item model.OrderItem
		var product model.Product
		if err := rows.Scan(
			&item.ID, &item.OrderID, &item.ProductID, &item.Quantity, &item.PriceAtOrder,
			&product.ID, &product.Name, &product.Description, &product.Price,
			&product.Stock, &product.Category, &product.ImageURL, &product.SellerID,
			&product.CreatedAt, &product.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan order item: %w", err)
		}
		item.Product = &product
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate order items: %w", err)
	}

	return items, nil
}

// ──────────────────────────────────────────────────────────────
// GetByUserID returns all orders for a given user.
// WHY no items here? The order list is a summary view (like
// Flipkart's "My Orders" page). Users see order ID, status,
// total, and date. They click into a specific order to see items.
// ──────────────────────────────────────────────────────────────

// GetByUserID returns all orders for a specific user (without items).
func (s *OrderStore) GetByUserID(ctx context.Context, userID int64) ([]model.Order, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, user_id, status, total_amount, shipping_address, created_at, updated_at
		 FROM orders WHERE user_id = ?
		 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("query orders by user: %w", err)
	}
	defer rows.Close()

	var orders []model.Order
	for rows.Next() {
		var o model.Order
		if err := rows.Scan(&o.ID, &o.UserID, &o.Status, &o.TotalAmount,
			&o.ShippingAddress, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		orders = append(orders, o)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate orders: %w", err)
	}

	return orders, nil
}

// ──────────────────────────────────────────────────────────────
// UpdateStatus changes the status of an order.
// WHY validate status? Because the order state machine has rules:
// you cannot go from "delivered" back to "pending". We validate
// the new status against the allowed values.
// ──────────────────────────────────────────────────────────────

// UpdateStatus updates the status of an order. Returns the updated order or nil if not found.
func (s *OrderStore) UpdateStatus(ctx context.Context, orderID int64, status string) (*model.Order, error) {
	// Validate the status value.
	validStatuses := map[string]bool{
		model.OrderStatusPending:   true,
		model.OrderStatusConfirmed: true,
		model.OrderStatusShipped:   true,
		model.OrderStatusDelivered: true,
		model.OrderStatusCancelled: true,
	}
	if !validStatuses[status] {
		return nil, fmt.Errorf("invalid order status: %s", status)
	}

	result, err := s.db.ExecContext(ctx,
		`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`,
		status, time.Now().UTC(), orderID,
	)
	if err != nil {
		return nil, fmt.Errorf("update order status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("rows affected: %w", err)
	}
	if rows == 0 {
		return nil, nil
	}

	return s.GetByID(ctx, orderID)
}
