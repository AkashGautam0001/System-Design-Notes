// ============================================================
//  PACKAGE handler — Product Handlers
// ============================================================
//  WHY: Products are the core of the marketplace. During Big
//  Billion Days, the product endpoints handle three distinct
//  traffic patterns:
//  1. Browse (GET /products) — extremely high volume, must be fast
//  2. Detail (GET /products/{id}) — high volume, users viewing items
//  3. Admin CRUD — low volume, catalog team managing listings
//
//  The handler separates public (browse) from admin (CRUD) routes.
//  Public routes are unauthenticated for maximum performance.
//  Admin routes require JWT + "admin" role.
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
// ProductHandler holds dependencies for product endpoints.
// ──────────────────────────────────────────────────────────────

// ProductHandler handles product-related HTTP requests.
type ProductHandler struct {
	productStore *store.ProductStore
}

// NewProductHandler creates a ProductHandler with the given store.
func NewProductHandler(productStore *store.ProductStore) *ProductHandler {
	return &ProductHandler{
		productStore: productStore,
	}
}

// ──────────────────────────────────────────────────────────────
// HandleList — GET /api/products
// Supports pagination (?page=2&limit=20) and category filtering
// (?category=electronics).
//
// WHY default limit of 20? It is a sweet spot between:
// - Too few (user must paginate too often)
// - Too many (response is slow and heavy)
// Amazon, Flipkart, and Myntra all use 20-24 items per page.
// ──────────────────────────────────────────────────────────────

// HandleList returns paginated products with optional category filter.
func (h *ProductHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters from query string.
	page := 1
	limit := 20

	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}

	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	// WHY cap limit at 100? To prevent abuse. A client requesting
	// limit=1000000 would force the server to serialize a massive JSON
	// array, consuming memory and CPU. Capping at 100 is defensive.
	category := r.URL.Query().Get("category")
	offset := (page - 1) * limit

	products, total, err := h.productStore.GetAll(r.Context(), limit, offset, category)
	if err != nil {
		log.Printf("ERROR: list products: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// WHY include pagination metadata? So the client can build a
	// "Page 3 of 42" UI. Without total_count and page info, the
	// client would need a separate API call to count products.
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"products":    products,
		"total_count": total,
		"page":        page,
		"limit":       limit,
	})
}

// ──────────────────────────────────────────────────────────────
// HandleGetByID — GET /api/products/{id}
// Returns a single product's full details.
// ──────────────────────────────────────────────────────────────

// HandleGetByID returns a single product by its ID.
func (h *ProductHandler) HandleGetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	product, err := h.productStore.GetByID(r.Context(), id)
	if err != nil {
		log.Printf("ERROR: get product: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if product == nil {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}

	respondJSON(w, http.StatusOK, product)
}

// ──────────────────────────────────────────────────────────────
// HandleCreate — POST /api/admin/products
// Creates a new product listing. Admin only.
// WHY extract sellerID from context? Because the JWT middleware
// already validated the token and injected the user ID. We trust
// the middleware — no need to re-validate the token here.
// ──────────────────────────────────────────────────────────────

// HandleCreate adds a new product to the catalog. Requires admin role.
func (h *ProductHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var req model.CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate required fields.
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "product name is required")
		return
	}
	if req.Price < 0 {
		respondError(w, http.StatusBadRequest, "price must be non-negative")
		return
	}
	if req.Stock < 0 {
		respondError(w, http.StatusBadRequest, "stock must be non-negative")
		return
	}
	if req.Category == "" {
		req.Category = "general"
	}

	// Extract the admin's user ID from the context (set by auth middleware).
	sellerID, ok := r.Context().Value("user_id").(int64)
	if !ok {
		respondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	product, err := h.productStore.Create(r.Context(), req, sellerID)
	if err != nil {
		log.Printf("ERROR: create product: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusCreated, product)
}

// ──────────────────────────────────────────────────────────────
// HandleUpdate — PUT /api/admin/products/{id}
// Updates an existing product. Admin only.
// ──────────────────────────────────────────────────────────────

// HandleUpdate modifies an existing product. Requires admin role.
func (h *ProductHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	var req model.UpdateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate price and stock if provided.
	if req.Price != nil && *req.Price < 0 {
		respondError(w, http.StatusBadRequest, "price must be non-negative")
		return
	}
	if req.Stock != nil && *req.Stock < 0 {
		respondError(w, http.StatusBadRequest, "stock must be non-negative")
		return
	}

	product, err := h.productStore.Update(r.Context(), id, req)
	if err != nil {
		log.Printf("ERROR: update product: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if product == nil {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}

	respondJSON(w, http.StatusOK, product)
}

// ──────────────────────────────────────────────────────────────
// HandleDelete — DELETE /api/admin/products/{id}
// Removes a product from the catalog. Admin only.
// WHY soft delete vs hard delete? For a real marketplace (Flipkart),
// you would soft-delete (set a deleted_at timestamp) so that
// existing orders still reference the product. For this educational
// project, we hard-delete for simplicity.
// ──────────────────────────────────────────────────────────────

// HandleDelete removes a product from the catalog. Requires admin role.
func (h *ProductHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	deleted, err := h.productStore.Delete(r.Context(), id)
	if err != nil {
		log.Printf("ERROR: delete product: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !deleted {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
