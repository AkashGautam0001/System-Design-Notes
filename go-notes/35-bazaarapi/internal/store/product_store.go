// ============================================================
//  PACKAGE store — Product Store (SQLite)
// ============================================================
//  WHY: The product catalog is the backbone of BazaarAPI. During
//  Big Billion Days, Flipkart lists over 80 million products
//  across 80+ categories. The ProductStore must support:
//  - Fast reads with pagination (users browsing the catalog)
//  - Category filtering (electronics, fashion, home)
//  - Stock management (decrement on purchase, never go negative)
//  - Admin CRUD (adding new flash deal products minutes before sale)
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
// ProductStore — repository for product data.
// ──────────────────────────────────────────────────────────────

// ProductStore handles product persistence in SQLite.
type ProductStore struct {
	db *sql.DB
}

// NewProductStore creates the products table and returns a ProductStore.
// WHY seller_id as a foreign key? So we can trace which admin/seller listed
// each product. With PRAGMA foreign_keys = ON, SQLite will reject inserts
// that reference a non-existent user — data integrity at the DB level.
func NewProductStore(db *sql.DB) (*ProductStore, error) {
	query := `
	CREATE TABLE IF NOT EXISTS products (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		name        TEXT    NOT NULL,
		description TEXT    NOT NULL DEFAULT '',
		price       REAL    NOT NULL CHECK(price >= 0),
		stock       INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
		category    TEXT    NOT NULL DEFAULT 'general',
		image_url   TEXT    NOT NULL DEFAULT '',
		seller_id   INTEGER NOT NULL,
		created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (seller_id) REFERENCES users(id)
	);
	CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
	CREATE INDEX IF NOT EXISTS idx_products_seller   ON products(seller_id);
	`
	if _, err := db.ExecContext(context.Background(), query); err != nil {
		return nil, fmt.Errorf("create products table: %w", err)
	}

	return &ProductStore{db: db}, nil
}

// ──────────────────────────────────────────────────────────────
// Create inserts a new product into the catalog.
// ──────────────────────────────────────────────────────────────

// Create adds a new product to the database.
func (s *ProductStore) Create(ctx context.Context, req model.CreateProductRequest, sellerID int64) (*model.Product, error) {
	now := time.Now().UTC()
	result, err := s.db.ExecContext(ctx,
		`INSERT INTO products (name, description, price, stock, category, image_url, seller_id, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		req.Name, req.Description, req.Price, req.Stock, req.Category, req.ImageURL, sellerID, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert product: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("get last insert id: %w", err)
	}

	return &model.Product{
		ID:          id,
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		Category:    req.Category,
		ImageURL:    req.ImageURL,
		SellerID:    sellerID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// ──────────────────────────────────────────────────────────────
// GetByID retrieves a single product by its primary key.
// ──────────────────────────────────────────────────────────────

// GetByID finds a product by its ID.
func (s *ProductStore) GetByID(ctx context.Context, id int64) (*model.Product, error) {
	p := &model.Product{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, description, price, stock, category, image_url, seller_id, created_at, updated_at
		 FROM products WHERE id = ?`, id,
	).Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Stock, &p.Category, &p.ImageURL, &p.SellerID, &p.CreatedAt, &p.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query product by id: %w", err)
	}
	return p, nil
}

// ──────────────────────────────────────────────────────────────
// GetAll retrieves products with pagination and optional filtering.
// WHY pagination? During Big Billion Days, the catalog has millions
// of products. Returning all of them in one response would:
// 1. Consume massive server memory (building a giant JSON array)
// 2. Saturate network bandwidth
// 3. Crash the client trying to parse it
// Pagination with LIMIT/OFFSET keeps responses small and fast.
// ──────────────────────────────────────────────────────────────

// GetAll returns paginated products with optional category filter.
func (s *ProductStore) GetAll(ctx context.Context, limit, offset int, category string) ([]model.Product, int, error) {
	// WHY two queries? One for the data (with LIMIT/OFFSET) and one for
	// the total count. The count lets the client build pagination UI
	// ("Page 3 of 142"). Some teams optimize this with window functions,
	// but two queries is clearer for educational purposes.

	var countQuery string
	var dataQuery string
	var args []interface{}
	var countArgs []interface{}

	if category != "" {
		countQuery = `SELECT COUNT(*) FROM products WHERE category = ?`
		countArgs = append(countArgs, category)
		dataQuery = `SELECT id, name, description, price, stock, category, image_url, seller_id, created_at, updated_at
		             FROM products WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
		args = append(args, category, limit, offset)
	} else {
		countQuery = `SELECT COUNT(*) FROM products`
		dataQuery = `SELECT id, name, description, price, stock, category, image_url, seller_id, created_at, updated_at
		             FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?`
		args = append(args, limit, offset)
	}

	// Get total count
	var total int
	if err := s.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count products: %w", err)
	}

	// Get paginated data
	rows, err := s.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Stock, &p.Category, &p.ImageURL, &p.SellerID, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, p)
	}

	// WHY check rows.Err()? The for loop exits when rows.Next() returns false,
	// but that could be due to an error (not just end of results). Always check.
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate products: %w", err)
	}

	return products, total, nil
}

// ──────────────────────────────────────────────────────────────
// Update modifies an existing product's fields.
// WHY dynamic query building? Because UpdateProductRequest uses
// pointers — nil means "don't change". We build the SET clause
// dynamically to only update provided fields.
// ──────────────────────────────────────────────────────────────

// Update modifies a product's fields. Only non-nil fields in the request are updated.
func (s *ProductStore) Update(ctx context.Context, id int64, req model.UpdateProductRequest) (*model.Product, error) {
	// Build dynamic update query
	setClauses := []string{}
	args := []interface{}{}

	if req.Name != nil {
		setClauses = append(setClauses, "name = ?")
		args = append(args, *req.Name)
	}
	if req.Description != nil {
		setClauses = append(setClauses, "description = ?")
		args = append(args, *req.Description)
	}
	if req.Price != nil {
		setClauses = append(setClauses, "price = ?")
		args = append(args, *req.Price)
	}
	if req.Stock != nil {
		setClauses = append(setClauses, "stock = ?")
		args = append(args, *req.Stock)
	}
	if req.Category != nil {
		setClauses = append(setClauses, "category = ?")
		args = append(args, *req.Category)
	}
	if req.ImageURL != nil {
		setClauses = append(setClauses, "image_url = ?")
		args = append(args, *req.ImageURL)
	}

	if len(setClauses) == 0 {
		// Nothing to update — just return the existing product.
		return s.GetByID(ctx, id)
	}

	// Always update the timestamp when modifying a product.
	setClauses = append(setClauses, "updated_at = ?")
	args = append(args, time.Now().UTC())
	args = append(args, id)

	query := "UPDATE products SET "
	for i, clause := range setClauses {
		if i > 0 {
			query += ", "
		}
		query += clause
	}
	query += " WHERE id = ?"

	result, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("update product: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("rows affected: %w", err)
	}
	if rows == 0 {
		return nil, nil // Product not found
	}

	return s.GetByID(ctx, id)
}

// ──────────────────────────────────────────────────────────────
// Delete removes a product from the catalog.
// ──────────────────────────────────────────────────────────────

// Delete removes a product by its ID. Returns true if the product existed.
func (s *ProductStore) Delete(ctx context.Context, id int64) (bool, error) {
	result, err := s.db.ExecContext(ctx, `DELETE FROM products WHERE id = ?`, id)
	if err != nil {
		return false, fmt.Errorf("delete product: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("rows affected: %w", err)
	}
	return rows > 0, nil
}

// ──────────────────────────────────────────────────────────────
// UpdateStock adjusts product stock within a transaction.
// WHY a separate method? Because stock updates happen inside the
// order transaction (CreateFromCart). We need to accept a *sql.Tx
// so that stock decrement is part of the same atomic operation.
// ──────────────────────────────────────────────────────────────

// UpdateStock decrements stock for a product within a transaction.
// Returns an error if stock would go below zero.
func (s *ProductStore) UpdateStock(ctx context.Context, tx *sql.Tx, productID int64, quantity int) error {
	result, err := tx.ExecContext(ctx,
		`UPDATE products SET stock = stock - ?, updated_at = ?
		 WHERE id = ? AND stock >= ?`,
		quantity, time.Now().UTC(), productID, quantity,
	)
	if err != nil {
		return fmt.Errorf("update stock: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("insufficient stock for product %d", productID)
	}
	return nil
}
