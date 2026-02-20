# ============================================================
# BazaarAPI — Cart Routes
# ============================================================
# All cart endpoints require authentication.
# Each user can only see and modify their own cart.
# ============================================================

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from database import get_session
from auth.dependencies import get_current_active_user
from users.models import User
from cart.models import CartItemCreate, CartItemUpdate, CartResponse
from cart.services import (
    get_cart,
    add_to_cart,
    update_cart_item,
    remove_cart_item,
    clear_cart,
)

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get(
    "/",
    response_model=CartResponse,
    summary="View your shopping cart",
)
def view_cart(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> CartResponse:
    """Get the current user's cart with items, prices, and total."""
    return get_cart(session, current_user.id)  # type: ignore


@router.post(
    "/items",
    status_code=status.HTTP_201_CREATED,
    summary="Add an item to your cart",
)
def add_item_to_cart(
    data: CartItemCreate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> dict:
    """
    Add a product to your cart.

    If the product is already in your cart, the quantity is increased.
    """
    cart_item = add_to_cart(session, current_user.id, data)  # type: ignore
    return {"message": "Item added to cart", "cart_item_id": cart_item.id}


@router.patch(
    "/items/{item_id}",
    summary="Update cart item quantity",
)
def update_item_quantity(
    item_id: int,
    data: CartItemUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> dict:
    """Update the quantity of an item in your cart."""
    update_cart_item(session, current_user.id, item_id, data.quantity)  # type: ignore
    return {"message": "Cart item updated"}


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an item from your cart",
)
def remove_item_from_cart(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> None:
    """Remove a single item from your cart."""
    remove_cart_item(session, current_user.id, item_id)  # type: ignore


@router.delete(
    "/",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear your entire cart",
)
def clear_entire_cart(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> None:
    """Remove ALL items from your cart."""
    clear_cart(session, current_user.id)  # type: ignore
