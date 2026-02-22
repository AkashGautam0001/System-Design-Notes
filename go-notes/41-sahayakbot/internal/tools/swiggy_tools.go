// ============================================================
//  Swiggy Tools — Domain-Specific Agent Capabilities
// ============================================================
//  WHY simulated tools?
//  In production, these would call Swiggy's microservices:
//    - Order Service (gRPC) for order status
//    - Payment Service for refunds
//    - Restaurant Catalogue (Elasticsearch) for search
//
//  For this chapter, we simulate everything with realistic data.
//  The KEY LESSON is the tool interface pattern — how tools are
//  defined, registered, called by the AI, and results fed back.
//  Whether the data comes from a database or a hardcoded map,
//  the architecture is identical.
// ============================================================

package tools

import (
	"context"
	"fmt"
	"math/rand"
	"strings"

	"sahayakbot/internal/model"
)

// RegisterSwiggyTools registers all Swiggy-specific tools.
// WHY a single registration function? It keeps main.go clean:
//   tools.RegisterSwiggyTools(registry)
// Instead of 4+ individual Register calls. Swiggy's Go style
// guide recommends a RegisterXxxTools function per domain.
func RegisterSwiggyTools(r *Registry) {
	// ──────────────────────────────────────────────────────────────
	// Tool 1: Check Order Status
	// ──────────────────────────────────────────────────────────────
	r.Register(
		"check_order_status",
		"Check the current status of a Swiggy food delivery order. Returns order details including restaurant, items, status, and estimated delivery time.",
		[]model.ToolParameter{
			{Name: "order_id", Type: "string", Description: "The Swiggy order ID (e.g., SWG-12345)", Required: true},
		},
		CheckOrderStatus,
	)

	// ──────────────────────────────────────────────────────────────
	// Tool 2: Process Refund
	// ──────────────────────────────────────────────────────────────
	r.Register(
		"process_refund",
		"Process a refund for a problematic Swiggy order. Validates the reason and initiates the refund to the customer's payment method.",
		[]model.ToolParameter{
			{Name: "order_id", Type: "string", Description: "The Swiggy order ID to refund", Required: true},
			{Name: "reason", Type: "string", Description: "Reason for the refund (e.g., cold food, wrong order, missing items)", Required: true},
		},
		ProcessRefund,
	)

	// ──────────────────────────────────────────────────────────────
	// Tool 3: Find Restaurants
	// ──────────────────────────────────────────────────────────────
	r.Register(
		"find_restaurants",
		"Search for restaurants on Swiggy by cuisine type and location. Returns a list of open restaurants with ratings and delivery times.",
		[]model.ToolParameter{
			{Name: "cuisine", Type: "string", Description: "Type of cuisine (e.g., South Indian, Chinese, Biryani)", Required: false},
			{Name: "location", Type: "string", Description: "Delivery location or area name", Required: false},
		},
		FindRestaurants,
	)

	// ──────────────────────────────────────────────────────────────
	// Tool 4: Get Delivery ETA
	// ──────────────────────────────────────────────────────────────
	r.Register(
		"get_delivery_eta",
		"Get the estimated time of arrival for a Swiggy order that is currently being delivered.",
		[]model.ToolParameter{
			{Name: "order_id", Type: "string", Description: "The Swiggy order ID to check ETA for", Required: true},
		},
		GetDeliveryETA,
	)
}

// ──────────────────────────────────────────────────────────────
// CheckOrderStatus — look up order details
// ──────────────────────────────────────────────────────────────
// WHY return a map instead of model.Order? The AI client works
// with interface{} — returning a map makes JSON serialisation
// straightforward. In production, you'd return the domain struct
// and let the handler serialise it.

func CheckOrderStatus(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	orderID, ok := args["order_id"].(string)
	if !ok || orderID == "" {
		return nil, fmt.Errorf("order_id is required")
	}

	// ──────────────────────────────────────────────────────────────
	// Simulated order database — realistic Swiggy orders
	// WHY these specific restaurants? They're real, iconic Indian
	// restaurants that any Swiggy user would recognise. This makes
	// the simulation feel authentic during demos and testing.
	// ──────────────────────────────────────────────────────────────
	orders := []map[string]interface{}{
		{
			"id":            orderID,
			"restaurant":    "Paradise Biryani",
			"items":         "Chicken Biryani x2, Mirchi Ka Salan x1",
			"status":        "Preparing",
			"delivery_time": "25-35 minutes",
			"total":         649.0,
		},
		{
			"id":            orderID,
			"restaurant":    "MTR - Mavalli Tiffin Rooms",
			"items":         "Masala Dosa x2, Filter Coffee x2",
			"status":        "Out for Delivery",
			"delivery_time": "10-15 minutes",
			"total":         320.0,
		},
		{
			"id":            orderID,
			"restaurant":    "Barbeque Nation",
			"items":         "Veg Kebab Platter x1, Paneer Tikka x1, Dal Makhani x1",
			"status":        "Delivered",
			"delivery_time": "Delivered at 7:45 PM",
			"total":         899.0,
		},
		{
			"id":            orderID,
			"restaurant":    "Meghana Foods",
			"items":         "Andhra Meals x1, Chicken 65 x1",
			"status":        "Out for Delivery",
			"delivery_time": "12-18 minutes",
			"total":         450.0,
		},
		{
			"id":            orderID,
			"restaurant":    "A2B - Adyar Ananda Bhavan",
			"items":         "Mini Tiffin Combo x1, Gulab Jamun x2",
			"status":        "Preparing",
			"delivery_time": "30-40 minutes",
			"total":         275.0,
		},
	}

	// Pick a random order for variety in demos
	order := orders[rand.Intn(len(orders))]
	return order, nil
}

// ──────────────────────────────────────────────────────────────
// ProcessRefund — handle refund requests
// ──────────────────────────────────────────────────────────────
// WHY validate reason? Swiggy's refund policy requires a reason.
// The AI extracts the reason from the conversation; this tool
// validates it before processing. In production, this would call
// the Payment Service with fraud checks and approval workflows.

func ProcessRefund(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	orderID, ok := args["order_id"].(string)
	if !ok || orderID == "" {
		return nil, fmt.Errorf("order_id is required for refund processing")
	}

	reason, _ := args["reason"].(string)
	if reason == "" {
		reason = "Customer reported issue with order"
	}

	// ──────────────────────────────────────────────────────────────
	// Simulated refund logic
	// WHY different amounts? Real refund amounts depend on the issue:
	//   - Wrong order: full refund
	//   - Cold food: 50-100% based on severity
	//   - Late delivery: partial refund or credit
	// Our simulation picks a realistic amount and processing time.
	// ──────────────────────────────────────────────────────────────

	// Generate realistic refund data
	refundAmounts := []float64{199.0, 249.0, 349.0, 449.0, 599.0}
	amount := refundAmounts[rand.Intn(len(refundAmounts))]

	status := "Approved"
	estimatedDays := 2

	// High-value refunds go through review (realistic business logic)
	if amount > 400 {
		status = "Under Review"
		estimatedDays = 5
	}

	refundID := fmt.Sprintf("REF-%d", 40000+rand.Intn(10000))

	result := map[string]interface{}{
		"refund_id":      refundID,
		"order_id":       orderID,
		"status":         status,
		"amount":         amount,
		"reason":         reason,
		"estimated_days": estimatedDays,
	}

	return result, nil
}

// ──────────────────────────────────────────────────────────────
// FindRestaurants — search for restaurants by cuisine/location
// ──────────────────────────────────────────────────────────────
// WHY return 3-5 results? Swiggy's UX research shows that 3-5
// options is the sweet spot for chat — enough choice without
// overwhelming. More than 5 and users stop reading; fewer than 3
// and they feel the search was too narrow.

func FindRestaurants(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	cuisine, _ := args["cuisine"].(string)
	location, _ := args["location"].(string)

	if cuisine == "" {
		cuisine = "Multi-Cuisine"
	}
	if location == "" {
		location = "your area"
	}

	// ──────────────────────────────────────────────────────────────
	// Restaurant database — organised by cuisine
	// WHY real restaurant names? These are iconic Indian restaurants
	// that students will recognise, making the learning experience
	// more engaging. Every Bangalorean knows MTR; every Hyderabadi
	// knows Paradise.
	// ──────────────────────────────────────────────────────────────

	restaurantDB := map[string][]map[string]interface{}{
		"South Indian": {
			{"id": "REST-101", "name": "MTR - Mavalli Tiffin Rooms", "cuisine": "South Indian", "rating": 4.6, "delivery_time": "20-30 min", "is_open": true},
			{"id": "REST-102", "name": "Vidyarthi Bhavan", "cuisine": "South Indian", "rating": 4.5, "delivery_time": "25-35 min", "is_open": true},
			{"id": "REST-103", "name": "Vasudev Adiga's", "cuisine": "South Indian", "rating": 4.3, "delivery_time": "15-25 min", "is_open": true},
			{"id": "REST-104", "name": "Brahmin's Coffee Bar", "cuisine": "South Indian", "rating": 4.7, "delivery_time": "30-40 min", "is_open": false},
		},
		"Hyderabadi": {
			{"id": "REST-201", "name": "Paradise Biryani", "cuisine": "Hyderabadi", "rating": 4.5, "delivery_time": "25-35 min", "is_open": true},
			{"id": "REST-202", "name": "Bawarchi", "cuisine": "Hyderabadi", "rating": 4.3, "delivery_time": "20-30 min", "is_open": true},
			{"id": "REST-203", "name": "Shah Ghouse", "cuisine": "Hyderabadi", "rating": 4.4, "delivery_time": "30-40 min", "is_open": true},
			{"id": "REST-204", "name": "Mehfil", "cuisine": "Hyderabadi", "rating": 4.2, "delivery_time": "25-35 min", "is_open": true},
		},
		"North Indian": {
			{"id": "REST-301", "name": "Punjab Grill", "cuisine": "North Indian", "rating": 4.4, "delivery_time": "30-40 min", "is_open": true},
			{"id": "REST-302", "name": "Frontier", "cuisine": "North Indian", "rating": 4.5, "delivery_time": "25-35 min", "is_open": true},
			{"id": "REST-303", "name": "Moti Mahal Delux", "cuisine": "North Indian", "rating": 4.3, "delivery_time": "20-30 min", "is_open": true},
			{"id": "REST-304", "name": "Punjabi By Nature", "cuisine": "North Indian", "rating": 4.1, "delivery_time": "35-45 min", "is_open": false},
		},
		"Chinese": {
			{"id": "REST-401", "name": "Mainland China", "cuisine": "Chinese", "rating": 4.4, "delivery_time": "25-35 min", "is_open": true},
			{"id": "REST-402", "name": "Chung Wah", "cuisine": "Chinese", "rating": 4.2, "delivery_time": "20-30 min", "is_open": true},
			{"id": "REST-403", "name": "Wok Express", "cuisine": "Chinese", "rating": 4.0, "delivery_time": "15-25 min", "is_open": true},
		},
		"Italian": {
			{"id": "REST-501", "name": "Toscano", "cuisine": "Italian", "rating": 4.5, "delivery_time": "30-40 min", "is_open": true},
			{"id": "REST-502", "name": "Pizza Hut", "cuisine": "Italian", "rating": 4.0, "delivery_time": "20-30 min", "is_open": true},
			{"id": "REST-503", "name": "Domino's Pizza", "cuisine": "Italian", "rating": 3.9, "delivery_time": "15-25 min", "is_open": true},
		},
		"Street Food": {
			{"id": "REST-601", "name": "VV Puram Food Street", "cuisine": "Street Food", "rating": 4.6, "delivery_time": "20-30 min", "is_open": true},
			{"id": "REST-602", "name": "Chaat Street", "cuisine": "Street Food", "rating": 4.3, "delivery_time": "15-25 min", "is_open": true},
			{"id": "REST-603", "name": "Goli Vada Pav", "cuisine": "Street Food", "rating": 4.1, "delivery_time": "10-20 min", "is_open": true},
		},
		"Mughlai": {
			{"id": "REST-701", "name": "Karim's", "cuisine": "Mughlai", "rating": 4.6, "delivery_time": "30-40 min", "is_open": true},
			{"id": "REST-702", "name": "Al Jawahar", "cuisine": "Mughlai", "rating": 4.4, "delivery_time": "25-35 min", "is_open": true},
			{"id": "REST-703", "name": "Changezi Chicken", "cuisine": "Mughlai", "rating": 4.3, "delivery_time": "20-30 min", "is_open": true},
		},
	}

	// Find matching restaurants
	var results []map[string]interface{}

	// Try exact match first
	if restaurants, ok := restaurantDB[cuisine]; ok {
		results = restaurants
	} else {
		// Fuzzy match — check if cuisine keyword appears in any category
		lowerCuisine := strings.ToLower(cuisine)
		for category, restaurants := range restaurantDB {
			if strings.Contains(strings.ToLower(category), lowerCuisine) {
				results = restaurants
				break
			}
		}
	}

	// Default: return a mix of popular restaurants
	if len(results) == 0 {
		results = []map[string]interface{}{
			{"id": "REST-101", "name": "MTR - Mavalli Tiffin Rooms", "cuisine": "South Indian", "rating": 4.6, "delivery_time": "20-30 min", "is_open": true},
			{"id": "REST-201", "name": "Paradise Biryani", "cuisine": "Hyderabadi", "rating": 4.5, "delivery_time": "25-35 min", "is_open": true},
			{"id": "REST-301", "name": "Punjab Grill", "cuisine": "North Indian", "rating": 4.4, "delivery_time": "30-40 min", "is_open": true},
			{"id": "REST-401", "name": "Mainland China", "cuisine": "Chinese", "rating": 4.4, "delivery_time": "25-35 min", "is_open": true},
			{"id": "REST-501", "name": "Toscano", "cuisine": "Italian", "rating": 4.5, "delivery_time": "30-40 min", "is_open": true},
		}
	}

	// Convert to []interface{} for consistent return type
	var interfaceResults []interface{}
	for _, r := range results {
		// Add location context to each result
		r["location"] = location
		interfaceResults = append(interfaceResults, r)
	}

	return interfaceResults, nil
}

// ──────────────────────────────────────────────────────────────
// GetDeliveryETA — estimated time of arrival
// ──────────────────────────────────────────────────────────────
// WHY a separate ETA tool? Order status gives the big picture;
// ETA gives the specific "when". Swiggy users ask "when will it
// arrive?" far more often than "what's the status?" — so a
// dedicated tool produces better, more focused responses.

func GetDeliveryETA(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	orderID, ok := args["order_id"].(string)
	if !ok || orderID == "" {
		return nil, fmt.Errorf("order_id is required for ETA check")
	}

	// Simulated ETA data — realistic delivery scenarios
	etas := []map[string]interface{}{
		{
			"order_id":         orderID,
			"status":           "Out for Delivery",
			"eta":              "12 minutes",
			"delivery_partner": "Rahul K.",
			"distance":         "2.3 km away",
		},
		{
			"order_id":         orderID,
			"status":           "Preparing",
			"eta":              "28 minutes",
			"delivery_partner": "Pending assignment",
			"distance":         "Restaurant is preparing your food",
		},
		{
			"order_id":         orderID,
			"status":           "Picked Up",
			"eta":              "18 minutes",
			"delivery_partner": "Priya S.",
			"distance":         "4.1 km away",
		},
		{
			"order_id":         orderID,
			"status":           "Out for Delivery",
			"eta":              "7 minutes",
			"delivery_partner": "Amit V.",
			"distance":         "0.8 km away",
		},
	}

	return etas[rand.Intn(len(etas))], nil
}
