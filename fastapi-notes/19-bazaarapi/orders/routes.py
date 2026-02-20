# ============================================================
# BazaarAPI — Order Routes
# ============================================================
# Customer: create order (from cart), view orders, cancel
# Admin: view any order, update status
# ============================================================

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from database import get_session
from auth.dependencies import get_current_active_user, require_admin
from users.models import User
from orders.models import OrderCreate, OrderRead, OrderStatusUpdate
from orders.services import (
    create_order_from_cart,
    get_user_orders,
    get_order_by_id,
    update_order_status,
    cancel_order,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "/",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create order from cart",
)
def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> OrderRead:
    """
    Convert your cart into an order.

    This is atomic: validates stock, creates order + items,
    decrements stock, and clears cart — all or nothing.
    """
    order = create_order_from_cart(session, current_user.id, data)  # type: ignore
    # Re-fetch as OrderRead with items
    order_read = get_order_by_id(session, order.id)  # type: ignore
    if not order_read:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Order created but could not be retrieved",
        )
    return order_read


@router.get(
    "/",
    response_model=List[OrderRead],
    summary="List your orders",
)
def list_my_orders(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> List[OrderRead]:
    """Get all orders for the authenticated user."""
    return get_user_orders(session, current_user.id)  # type: ignore


@router.get(
    "/{order_id}",
    response_model=OrderRead,
    summary="Get order details",
)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> OrderRead:
    """Get details of a specific order (must be yours)."""
    order = get_order_by_id(session, order_id, user_id=current_user.id)  # type: ignore
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    return order


@router.patch(
    "/{order_id}/status",
    response_model=OrderRead,
    summary="Update order status (admin)",
)
def admin_update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> OrderRead:
    """
    Admin-only: Update the status of an order.

    Validates that the status transition is valid.
    """
    update_order_status(session, order_id, data.status)
    order = get_order_by_id(session, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    return order


@router.patch(
    "/{order_id}/cancel",
    response_model=OrderRead,
    summary="Cancel your order",
)
def cancel_my_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> OrderRead:
    """
    Cancel your own order.

    Only works for orders in 'placed' status (before payment).
    Stock is restored when an order is cancelled.
    """
    cancel_order(session, order_id, current_user.id)  # type: ignore
    order = get_order_by_id(session, order_id, user_id=current_user.id)  # type: ignore
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    return order
