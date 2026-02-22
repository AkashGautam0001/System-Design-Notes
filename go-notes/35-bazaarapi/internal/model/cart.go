// ============================================================
//  PACKAGE model — Cart Data Structures
// ============================================================
//  WHY: The shopping cart is where intent meets commerce. During
//  Big Billion Days, users frantically add items, adjust
//  quantities, and race to checkout before stock runs out. The
//  cart must be persistent (survives page refreshes) and fast
//  (no one waits 5 seconds to see their cart).
//
//  The Cart struct aggregates CartItems and computes the total
//  server-side — never trust the client to calculate prices.
// ============================================================

package model

// ──────────────────────────────────────────────────────────────
// CartItem — a single product entry in a user's cart.
// WHY embed Product? When we display the cart, users need to see
// product names, prices, and images — not just product IDs. The
// JOIN query fills this in, and the JSON response is rich.
// ──────────────────────────────────────────────────────────────

// CartItem represents a single product entry in a user's shopping cart.
type CartItem struct {
	ID        int64    `json:"id"`
	UserID    int64    `json:"user_id"`
	ProductID int64    `json:"product_id"`
	Quantity  int      `json:"quantity"`
	Product   *Product `json:"product,omitempty"`
}

// ──────────────────────────────────────────────────────────────
// Cart — the aggregated view of all items for a user.
// WHY compute Total server-side? Because the price in the
// database is the source of truth. If a flash deal changes a
// product's price, the cart total must reflect the current price,
// not the price when the item was added.
// ──────────────────────────────────────────────────────────────

// Cart holds all items in a user's shopping cart with computed total.
type Cart struct {
	Items []CartItem `json:"items"`
	Total float64    `json:"total"`
}

// ──────────────────────────────────────────────────────────────
// Request DTOs
// ──────────────────────────────────────────────────────────────

// AddToCartRequest is the JSON body for adding an item to the cart.
type AddToCartRequest struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

// UpdateCartItemRequest is the JSON body for updating cart item quantity.
type UpdateCartItemRequest struct {
	Quantity int `json:"quantity"`
}
