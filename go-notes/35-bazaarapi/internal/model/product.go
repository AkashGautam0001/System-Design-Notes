// ============================================================
//  PACKAGE model — Product Data Structures
// ============================================================
//  WHY: The product is the heart of any e-commerce platform.
//  During Flipkart's Big Billion Days, the catalog has millions
//  of products across categories — electronics, fashion, home.
//  Each product tracks stock in real-time so that flash deals
//  show accurate availability.
//
//  NOTE ON PRICE: We use float64 for simplicity. In production
//  e-commerce systems (Razorpay, Stripe, Flipkart), prices are
//  stored as integer paise/cents to avoid floating-point rounding
//  errors. Rs 999.99 becomes 99999 paise. For this educational
//  project, float64 keeps the code readable.
// ============================================================

package model

import "time"

// ──────────────────────────────────────────────────────────────
// Product — a single item in the BazaarAPI marketplace.
// ──────────────────────────────────────────────────────────────

// Product represents an item available for purchase.
type Product struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Stock       int       `json:"stock"`
	Category    string    `json:"category"`
	ImageURL    string    `json:"image_url,omitempty"`
	SellerID    int64     `json:"seller_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ──────────────────────────────────────────────────────────────
// Request DTOs
// WHY separate Create and Update? Create requires all fields.
// Update uses pointers so that omitted fields stay unchanged
// (nil means "don't update this field").
// ──────────────────────────────────────────────────────────────

// CreateProductRequest is the JSON body for creating a new product.
type CreateProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	Category    string  `json:"category"`
	ImageURL    string  `json:"image_url,omitempty"`
}

// UpdateProductRequest is the JSON body for updating a product.
// WHY pointers? A nil pointer means "do not change this field".
// Without pointers, we cannot distinguish between "set price to 0"
// and "don't change price" — both would be the zero value.
type UpdateProductRequest struct {
	Name        *string  `json:"name,omitempty"`
	Description *string  `json:"description,omitempty"`
	Price       *float64 `json:"price,omitempty"`
	Stock       *int     `json:"stock,omitempty"`
	Category    *string  `json:"category,omitempty"`
	ImageURL    *string  `json:"image_url,omitempty"`
}
