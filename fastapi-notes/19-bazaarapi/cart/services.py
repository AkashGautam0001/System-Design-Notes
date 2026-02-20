# ============================================================
# BazaarAPI — Cart Services (Business Logic)
# ============================================================
# Cart operations: add, update, remove, clear, get with totals.
#
# Key business rules:
#   - Can't add more items than available stock
#   - Adding an existing product updates quantity (no duplicates)
#   - Cart total is computed on-the-fly from current product prices
# ============================================================

from typing import List, Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from cart.models import CartItem, CartItemCreate, CartItemRead, CartResponse
from products.models import Product


def get_cart(session: Session, user_id: int) -> CartResponse:
    """
    Get the full cart for a user, including product details and totals.

    We join with products to get current names and prices.
    This means prices update if a product's price changes
    (cart reflects current price, not price-at-add-time).
    """
    cart_items = session.exec(
        select(CartItem).where(CartItem.user_id == user_id)
    ).all()

    items: List[CartItemRead] = []
    total = 0.0

    for item in cart_items:
        product = session.get(Product, item.product_id)
        if product and product.is_active:
            subtotal = product.price * item.quantity
            items.append(
                CartItemRead(
                    id=item.id,  # type: ignore
                    product_id=item.product_id,
                    product_name=product.name,
                    product_price=product.price,
                    quantity=item.quantity,
                    subtotal=subtotal,
                )
            )
            total += subtotal

    return CartResponse(
        items=items,
        total=round(total, 2),
        item_count=len(items),
    )


def add_to_cart(
    session: Session,
    user_id: int,
    data: CartItemCreate,
) -> CartItem:
    """
    Add a product to the user's cart.

    Business rules:
    - Product must exist and be active
    - Requested quantity must not exceed stock
    - If product already in cart, increase quantity instead of duplicating
    """
    # Validate product exists and is active
    product = session.get(Product, data.product_id)
    if not product or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or inactive",
        )

    # Check stock
    if data.quantity > product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock} items available in stock",
        )

    # Check if product already in cart — update quantity if so
    existing = session.exec(
        select(CartItem).where(
            CartItem.user_id == user_id,
            CartItem.product_id == data.product_id,
        )
    ).first()

    if existing:
        new_quantity = existing.quantity + data.quantity
        if new_quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add more. Only {product.stock} in stock, "
                       f"you already have {existing.quantity} in cart",
            )
        existing.quantity = new_quantity
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    # New cart item
    cart_item = CartItem(
        user_id=user_id,
        product_id=data.product_id,
        quantity=data.quantity,
    )
    session.add(cart_item)
    session.commit()
    session.refresh(cart_item)
    return cart_item


def update_cart_item(
    session: Session,
    user_id: int,
    item_id: int,
    quantity: int,
) -> CartItem:
    """
    Update the quantity of a cart item.

    Validates ownership and stock availability.
    """
    cart_item = _get_user_cart_item(session, user_id, item_id)

    product = session.get(Product, cart_item.product_id)
    if product and quantity > product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock} items available in stock",
        )

    cart_item.quantity = quantity
    session.add(cart_item)
    session.commit()
    session.refresh(cart_item)
    return cart_item


def remove_cart_item(session: Session, user_id: int, item_id: int) -> None:
    """Remove a single item from the user's cart."""
    cart_item = _get_user_cart_item(session, user_id, item_id)
    session.delete(cart_item)
    session.commit()


def clear_cart(session: Session, user_id: int) -> None:
    """Remove ALL items from the user's cart."""
    cart_items = session.exec(
        select(CartItem).where(CartItem.user_id == user_id)
    ).all()
    for item in cart_items:
        session.delete(item)
    session.commit()


def _get_user_cart_item(
    session: Session,
    user_id: int,
    item_id: int,
) -> CartItem:
    """
    Helper: fetch a cart item and verify it belongs to the user.

    Prevents users from modifying other users' carts.
    """
    cart_item = session.get(CartItem, item_id)
    if not cart_item or cart_item.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )
    return cart_item
