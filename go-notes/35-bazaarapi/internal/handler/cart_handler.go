// ============================================================
//  PACKAGE handler — Cart Handlers
// ============================================================
//  WHY: The shopping cart is the bridge between browsing and
//  buying. During Big Billion Days, the cart endpoints see
//  explosive traffic — users frantically add flash deal items
//  before stock runs out. Every cart operation requires
//  authentication (you must be logged in to have a cart).
//
//  All cart handlers extract user_id from the request context,
//  which was set by the JWT middleware. This means users can only
//  see and modify their own carts — no user can peek into another
//  user's cart.
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
// CartHandler holds dependencies for cart endpoints.
// ──────────────────────────────────────────────────────────────

// CartHandler handles shopping cart HTTP requests.
type CartHandler struct {
	cartStore    *store.CartStore
	productStore *store.ProductStore
}

// NewCartHandler creates a CartHandler with the given stores.
// WHY both CartStore and ProductStore? Because AddItem needs to
// validate that the product exists and has sufficient stock before
// adding it to the cart. The ProductStore provides that check.
func NewCartHandler(cartStore *store.CartStore, productStore *store.ProductStore) *CartHandler {
	return &CartHandler{
		cartStore:    cartStore,
		productStore: productStore,
	}
}

// ──────────────────────────────────────────────────────────────
// getUserID extracts the authenticated user's ID from context.
// WHY a helper? Because every cart handler needs user_id, and
// duplicating the type assertion 4 times would be error-prone.
// ──────────────────────────────────────────────────────────────

func getUserID(r *http.Request) (int64, bool) {
	userID, ok := r.Context().Value("user_id").(int64)
	return userID, ok
}

// ──────────────────────────────────────────────────────────────
// HandleGetCart — GET /api/cart
// Returns the user's cart with all items, product details, and
// the computed total.
// ──────────────────────────────────────────────────────────────

// HandleGetCart returns the authenticated user's shopping cart.
func (h *CartHandler) HandleGetCart(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	cart, err := h.cartStore.GetCart(r.Context(), userID)
	if err != nil {
		log.Printf("ERROR: get cart: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, cart)
}

// ──────────────────────────────────────────────────────────────
// HandleAddItem — POST /api/cart
// Adds a product to the cart, or increments the quantity if the
// product already exists (upsert behavior).
//
// WHY validate stock here? Because we want to give users immediate
// feedback: "Only 2 left in stock, you cannot add 5." The database
// constraint (CHECK stock >= 0) is the ultimate safety net at
// checkout time, but early validation improves user experience.
// ──────────────────────────────────────────────────────────────

// HandleAddItem adds a product to the user's cart.
func (h *CartHandler) HandleAddItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	var req model.AddToCartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ProductID <= 0 {
		respondError(w, http.StatusBadRequest, "valid product_id is required")
		return
	}
	if req.Quantity <= 0 {
		respondError(w, http.StatusBadRequest, "quantity must be at least 1")
		return
	}

	// Verify the product exists and has stock.
	product, err := h.productStore.GetByID(r.Context(), req.ProductID)
	if err != nil {
		log.Printf("ERROR: get product for cart: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if product == nil {
		respondError(w, http.StatusBadRequest, "product not found")
		return
	}
	if product.Stock < req.Quantity {
		respondError(w, http.StatusBadRequest, "insufficient stock")
		return
	}

	// Add to cart (upsert — if product already in cart, quantity is incremented).
	if err := h.cartStore.AddItem(r.Context(), userID, req.ProductID, req.Quantity); err != nil {
		log.Printf("ERROR: add to cart: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Return the updated cart so the client does not need a second request.
	cart, err := h.cartStore.GetCart(r.Context(), userID)
	if err != nil {
		log.Printf("ERROR: get cart after add: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, cart)
}

// ──────────────────────────────────────────────────────────────
// HandleUpdateItem — PUT /api/cart/{productId}
// Sets the quantity of a specific product in the cart.
// WHY PUT (replace) instead of PATCH (partial)? Because the client
// sends the desired quantity, not a delta. "Set quantity to 3" is
// clearer than "add 1 more". It also avoids race conditions with
// concurrent requests.
// ──────────────────────────────────────────────────────────────

// HandleUpdateItem updates the quantity of a product in the user's cart.
func (h *CartHandler) HandleUpdateItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	productIDStr := chi.URLParam(r, "productId")
	productID, err := strconv.ParseInt(productIDStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	var req model.UpdateCartItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Quantity <= 0 {
		respondError(w, http.StatusBadRequest, "quantity must be at least 1")
		return
	}

	updated, err := h.cartStore.UpdateQuantity(r.Context(), userID, productID, req.Quantity)
	if err != nil {
		log.Printf("ERROR: update cart item: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !updated {
		respondError(w, http.StatusNotFound, "item not found in cart")
		return
	}

	// Return the updated cart.
	cart, err := h.cartStore.GetCart(r.Context(), userID)
	if err != nil {
		log.Printf("ERROR: get cart after update: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, cart)
}

// ──────────────────────────────────────────────────────────────
// HandleRemoveItem — DELETE /api/cart/{productId}
// Removes a specific product from the cart entirely.
// ──────────────────────────────────────────────────────────────

// HandleRemoveItem removes a product from the user's cart.
func (h *CartHandler) HandleRemoveItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	productIDStr := chi.URLParam(r, "productId")
	productID, err := strconv.ParseInt(productIDStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	removed, err := h.cartStore.RemoveItem(r.Context(), userID, productID)
	if err != nil {
		log.Printf("ERROR: remove from cart: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !removed {
		respondError(w, http.StatusNotFound, "item not found in cart")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
