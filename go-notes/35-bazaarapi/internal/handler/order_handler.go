// ============================================================
//  PACKAGE handler — Order Handlers
// ============================================================
//  WHY: Orders are the finish line of e-commerce. When a Big
//  Billion Days shopper clicks "Place Order", everything converges:
//  the cart is read, stock is validated, payment is calculated,
//  and the order is created — all atomically. The OrderHandler
//  orchestrates this by calling OrderStore.CreateFromCart.
//
//  After placement, users can view their order history and track
//  individual orders. Admins can update order statuses (confirming
//  shipment, marking delivery).
// ============================================================

package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"bazaarapi/internal/model"
	"bazaarapi/internal/store"

	"github.com/go-chi/chi/v5"
)

// ──────────────────────────────────────────────────────────────
// OrderHandler holds dependencies for order endpoints.
// ──────────────────────────────────────────────────────────────

// OrderHandler handles order-related HTTP requests.
type OrderHandler struct {
	orderStore *store.OrderStore
}

// NewOrderHandler creates an OrderHandler with the given store.
func NewOrderHandler(orderStore *store.OrderStore) *OrderHandler {
	return &OrderHandler{
		orderStore: orderStore,
	}
}

// ──────────────────────────────────────────────────────────────
// HandleCreateOrder — POST /api/orders
// THE CHECKOUT ENDPOINT — the climax of Big Billion Days.
//
// This handler does very little itself — it validates the request,
// extracts user_id from context, and delegates to CreateFromCart.
// All the heavy lifting (transaction, stock validation, price
// snapshot) happens in the store layer. This separation keeps
// handlers thin and stores testable.
// ──────────────────────────────────────────────────────────────

// HandleCreateOrder converts the user's cart into a permanent order.
func (h *OrderHandler) HandleCreateOrder(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	var req model.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ShippingAddress == "" {
		respondError(w, http.StatusBadRequest, "shipping_address is required")
		return
	}

	// CreateFromCart does everything: validate cart, check stock, create order,
	// create order items, decrement stock, clear cart — all in one transaction.
	order, err := h.orderStore.CreateFromCart(r.Context(), userID, req.ShippingAddress)
	if err != nil {
		log.Printf("ERROR: create order: %v", err)
		// WHY check for specific error messages? So we can return appropriate
		// status codes. "cart is empty" and "insufficient stock" are client
		// errors (400), not server errors (500).
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, order)
}

// ──────────────────────────────────────────────────────────────
// HandleGetOrders — GET /api/orders
// Returns the authenticated user's order history.
// WHY no pagination here? For simplicity. In production (Flipkart),
// order history would be paginated — a power user might have hundreds
// of orders. Adding pagination follows the same pattern as products.
// ──────────────────────────────────────────────────────────────

// HandleGetOrders returns all orders for the authenticated user.
func (h *OrderHandler) HandleGetOrders(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	orders, err := h.orderStore.GetByUserID(r.Context(), userID)
	if err != nil {
		log.Printf("ERROR: get orders: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// WHY return an empty array instead of null? Because the frontend
	// expects an array it can iterate over. JSON null would cause a
	// "cannot iterate over null" error in JavaScript.
	if orders == nil {
		orders = []model.Order{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"orders": orders,
	})
}

// ──────────────────────────────────────────────────────────────
// HandleGetOrder — GET /api/orders/{id}
// Returns a single order with all its items and product details.
// WHY check user_id? To ensure users can only view their own orders.
// Without this check, any authenticated user could view any order
// by guessing the order ID — a privacy violation.
// ──────────────────────────────────────────────────────────────

// HandleGetOrder returns a single order with items for the authenticated user.
func (h *OrderHandler) HandleGetOrder(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	orderID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid order id")
		return
	}

	order, err := h.orderStore.GetByID(r.Context(), orderID)
	if err != nil {
		log.Printf("ERROR: get order: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if order == nil {
		respondError(w, http.StatusNotFound, "order not found")
		return
	}

	// Ensure the user can only see their own orders.
	// WHY check here and not in the store? Because the store is a data layer —
	// it should not enforce authorization rules. Authorization belongs in the
	// handler (or middleware). This separation of concerns makes the store
	// reusable for admin endpoints where cross-user access is intentional.
	if order.UserID != userID {
		respondError(w, http.StatusNotFound, "order not found")
		return
	}

	respondJSON(w, http.StatusOK, order)
}

// ──────────────────────────────────────────────────────────────
// HandleUpdateStatus — PUT /api/admin/orders/{id}/status
// Admin endpoint to update order status (e.g., confirmed → shipped).
// WHY admin only? Regular users should not be able to mark their
// own orders as "delivered" — that would be fraud. Only Flipkart's
// logistics team (admins) can update shipment statuses.
// ──────────────────────────────────────────────────────────────

// HandleUpdateStatus updates the status of an order. Requires admin role.
func (h *OrderHandler) HandleUpdateStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	orderID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid order id")
		return
	}

	var req model.UpdateOrderStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Status == "" {
		respondError(w, http.StatusBadRequest, "status is required")
		return
	}

	order, err := h.orderStore.UpdateStatus(r.Context(), orderID, req.Status)
	if err != nil {
		log.Printf("ERROR: update order status: %v", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if order == nil {
		respondError(w, http.StatusNotFound, "order not found")
		return
	}

	respondJSON(w, http.StatusOK, order)
}
