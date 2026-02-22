// ============================================================
//  Swiggy Models — Domain-Specific Data Structures
// ============================================================
//  WHY Swiggy-specific models?
//  These represent the real-world entities that SahayakBot's
//  tools operate on — orders, restaurants, refunds. In production,
//  these would come from Swiggy's Order Service, Restaurant
//  Catalogue, and Payments Service. Here we simulate them with
//  realistic Indian food delivery data.
// ============================================================

package model

// ──────────────────────────────────────────────────────────────
// Order — a Swiggy delivery order
// ──────────────────────────────────────────────────────────────
// WHY a full Order struct (not just status string)?
// Real support conversations need context: "Your Biryani from
// Paradise is being prepared — total ₹549, expected by 7:45 PM."
// The AI uses every field to craft a helpful response.

type Order struct {
	ID           string      `json:"id"`            // e.g., "SWG-12345"
	UserID       string      `json:"user_id"`       // customer identifier
	Restaurant   string      `json:"restaurant"`    // restaurant name
	Items        []OrderItem `json:"items"`         // what was ordered
	Status       string      `json:"status"`        // Preparing, Out for Delivery, etc.
	DeliveryTime string      `json:"delivery_time"` // estimated or actual time
	Total        float64     `json:"total"`         // order total in INR
}

// OrderItem represents a single item in an order.
type OrderItem struct {
	Name     string  `json:"name"`     // "Chicken Biryani"
	Quantity int     `json:"quantity"` // 2
	Price    float64 `json:"price"`    // 299.00 (per unit, in INR)
}

// ──────────────────────────────────────────────────────────────
// Restaurant — a Swiggy restaurant listing
// ──────────────────────────────────────────────────────────────

type Restaurant struct {
	ID           string  `json:"id"`            // "REST-001"
	Name         string  `json:"name"`          // "Paradise Biryani"
	Cuisine      string  `json:"cuisine"`       // "Hyderabadi"
	Rating       float64 `json:"rating"`        // 4.5
	DeliveryTime string  `json:"delivery_time"` // "25-35 min"
	IsOpen       bool    `json:"is_open"`       // currently accepting orders?
}

// ──────────────────────────────────────────────────────────────
// Refund — refund request and response
// ──────────────────────────────────────────────────────────────
// WHY separate Request and Response? The request captures what the
// user wants; the response captures what the system decided. In
// Swiggy's payments team, this separation enables audit trails.

type RefundRequest struct {
	OrderID string  `json:"order_id"` // which order to refund
	Reason  string  `json:"reason"`   // why the customer wants a refund
	Amount  float64 `json:"amount"`   // requested refund amount (0 = full)
}

type RefundResponse struct {
	RefundID      string  `json:"refund_id"`      // "REF-44521"
	Status        string  `json:"status"`         // "Approved", "Under Review"
	Amount        float64 `json:"amount"`         // actual refund amount in INR
	EstimatedDays int     `json:"estimated_days"` // days until credit
}
