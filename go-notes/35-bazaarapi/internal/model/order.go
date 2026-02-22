// ============================================================
//  PACKAGE model — Order Data Structures
// ============================================================
//  WHY: Orders are the permanent record of a purchase. Unlike
//  carts (which are mutable and temporary), orders are append-only.
//  Once placed during Big Billion Days, an order moves through a
//  state machine: Pending → Confirmed → Shipped → Delivered.
//
//  OrderItem stores PriceAtOrder — the price at the moment of
//  purchase. Even if the product price changes later (flash deal
//  ends), the customer pays what they saw at checkout. This is a
//  critical business requirement that every e-commerce system must
//  handle.
// ============================================================

package model

import "time"

// ──────────────────────────────────────────────────────────────
// Order Status Constants
// WHY string constants instead of iota? Because these values are
// stored in the database and returned in API responses. Integers
// would require a lookup table; strings are self-documenting.
// ──────────────────────────────────────────────────────────────

const (
	OrderStatusPending   = "pending"
	OrderStatusConfirmed = "confirmed"
	OrderStatusShipped   = "shipped"
	OrderStatusDelivered = "delivered"
	OrderStatusCancelled = "cancelled"
)

// ──────────────────────────────────────────────────────────────
// Order — a completed purchase by a user.
// ──────────────────────────────────────────────────────────────

// Order represents a completed purchase in the marketplace.
type Order struct {
	ID              int64       `json:"id"`
	UserID          int64       `json:"user_id"`
	Status          string      `json:"status"`
	TotalAmount     float64     `json:"total_amount"`
	ShippingAddress string      `json:"shipping_address"`
	Items           []OrderItem `json:"items,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

// ──────────────────────────────────────────────────────────────
// OrderItem — a single product line within an order.
// WHY PriceAtOrder? Imagine a OnePlus phone is Rs 29,999 during
// the flash sale. The user places an order. An hour later, the
// sale ends and the price goes back to Rs 34,999. The order must
// still show Rs 29,999 — that is what the customer agreed to pay.
// ──────────────────────────────────────────────────────────────

// OrderItem represents a single product within an order.
type OrderItem struct {
	ID           int64    `json:"id"`
	OrderID      int64    `json:"order_id"`
	ProductID    int64    `json:"product_id"`
	Quantity     int      `json:"quantity"`
	PriceAtOrder float64  `json:"price_at_order"`
	Product      *Product `json:"product,omitempty"`
}

// ──────────────────────────────────────────────────────────────
// Request DTOs
// ──────────────────────────────────────────────────────────────

// CreateOrderRequest is the JSON body for placing a new order.
// WHY only ShippingAddress? The items come from the user's cart,
// and the total is computed server-side. The client just says
// "ship it here" — everything else is derived from the cart.
type CreateOrderRequest struct {
	ShippingAddress string `json:"shipping_address"`
}

// UpdateOrderStatusRequest is the JSON body for admins updating order status.
type UpdateOrderStatusRequest struct {
	Status string `json:"status"`
}
