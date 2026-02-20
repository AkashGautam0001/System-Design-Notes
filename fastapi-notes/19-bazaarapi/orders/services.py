# ============================================================
# BazaarAPI — Order Services (Business Logic)
# ============================================================
# The most critical business logic in the entire app.
#
# create_order_from_cart is an ATOMIC operation:
#   1. Validate all cart items have sufficient stock
#   2. Create the order record
#   3. Create order items (capturing price at time of purchase)
#   4. Decrement product stock
#   5. Clear the cart
#   If ANY step fails, the entire operation rolls back.
# ============================================================

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from cart.models import CartItem
from orders.models import (
    Order,
    OrderItem,
    OrderCreate,
    OrderRead,
    OrderItemRead,
    OrderStatus,
)
from products.models import Product


def create_order_from_cart(
    session: Session,
    user_id: int,
    data: OrderCreate,
) -> Order:
    """
    Convert the user's cart into a confirmed order.

    This is an atomic operation — all steps succeed or all fail.
    We handle this within a single session transaction.

    Steps:
    1. Fetch all cart items
    2. Validate stock for each item
    3. Calculate total
    4. Create Order + OrderItems
    5. Decrement stock
    6. Clear cart
    """
    # Step 1: Fetch cart items
    cart_items = list(session.exec(
        select(CartItem).where(CartItem.user_id == user_id)
    ).all())

    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty — add items before placing an order",
        )

    # Step 2 & 3: Validate stock and calculate total
    total_amount = 0.0
    order_items_data = []

    for cart_item in cart_items:
        product = session.get(Product, cart_item.product_id)
        if not product or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product ID {cart_item.product_id} is no longer available",
            )

        if cart_item.quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. "
                       f"Available: {product.stock}, Requested: {cart_item.quantity}",
            )

        subtotal = product.price * cart_item.quantity
        total_amount += subtotal
        order_items_data.append({
            "product": product,
            "quantity": cart_item.quantity,
            "price_at_purchase": product.price,
        })

    # Step 4: Create Order
    order = Order(
        user_id=user_id,
        total_amount=round(total_amount, 2),
        status=OrderStatus.placed,
        shipping_address=data.shipping_address,
    )
    session.add(order)
    session.flush()  # Get the order ID without committing

    # Step 4b: Create OrderItems
    for item_data in order_items_data:
        order_item = OrderItem(
            order_id=order.id,  # type: ignore
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            price_at_purchase=item_data["price_at_purchase"],
        )
        session.add(order_item)

    # Step 5: Decrement stock
    for item_data in order_items_data:
        product = item_data["product"]
        product.stock -= item_data["quantity"]
        product.updated_at = datetime.now(timezone.utc)
        session.add(product)

    # Step 6: Clear cart
    for cart_item in cart_items:
        session.delete(cart_item)

    # Commit the entire transaction
    session.commit()
    session.refresh(order)
    return order


def get_user_orders(session: Session, user_id: int) -> List[OrderRead]:
    """Fetch all orders for a user, with items."""
    orders = session.exec(
        select(Order)
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())  # type: ignore
    ).all()

    result = []
    for order in orders:
        order_read = _build_order_read(session, order)
        result.append(order_read)
    return result


def get_order_by_id(
    session: Session,
    order_id: int,
    user_id: Optional[int] = None,
) -> Optional[OrderRead]:
    """
    Fetch a single order by ID.

    If user_id is provided, verifies ownership (for customer access).
    If user_id is None, skips ownership check (for admin access).
    """
    order = session.get(Order, order_id)
    if not order:
        return None

    if user_id is not None and order.user_id != user_id:
        return None

    return _build_order_read(session, order)


def update_order_status(
    session: Session,
    order_id: int,
    new_status: OrderStatus,
) -> Order:
    """
    Admin: Update order status.

    Validates status transitions to prevent invalid states.
    """
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    # Validate transition
    valid_transitions = {
        OrderStatus.placed: [OrderStatus.paid, OrderStatus.cancelled],
        OrderStatus.paid: [OrderStatus.shipped, OrderStatus.cancelled],
        OrderStatus.shipped: [OrderStatus.delivered],
        OrderStatus.cancelled: [OrderStatus.refunded],
        OrderStatus.delivered: [],
        OrderStatus.refunded: [],
    }

    allowed = valid_transitions.get(order.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{order.status}' to '{new_status}'. "
                   f"Allowed transitions: {[s.value for s in allowed]}",
        )

    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


def cancel_order(session: Session, order_id: int, user_id: int) -> Order:
    """
    User: Cancel their own order.

    Only allowed if order is in 'placed' status (not yet paid).
    Restores stock for all items in the order.
    """
    order = session.get(Order, order_id)
    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if order.status != OrderStatus.placed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order in '{order.status}' status. "
                   "Only 'placed' orders can be cancelled by the customer.",
        )

    # Restore stock
    order_items = session.exec(
        select(OrderItem).where(OrderItem.order_id == order_id)
    ).all()

    for item in order_items:
        product = session.get(Product, item.product_id)
        if product:
            product.stock += item.quantity
            product.updated_at = datetime.now(timezone.utc)
            session.add(product)

    order.status = OrderStatus.cancelled
    order.updated_at = datetime.now(timezone.utc)
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


def _build_order_read(session: Session, order: Order) -> OrderRead:
    """Helper: build an OrderRead with nested items."""
    order_items = session.exec(
        select(OrderItem).where(OrderItem.order_id == order.id)
    ).all()

    items = []
    for item in order_items:
        product = session.get(Product, item.product_id)
        product_name = product.name if product else "Unknown Product"
        items.append(
            OrderItemRead(
                id=item.id,  # type: ignore
                product_id=item.product_id,
                product_name=product_name,
                quantity=item.quantity,
                price_at_purchase=item.price_at_purchase,
                subtotal=round(item.price_at_purchase * item.quantity, 2),
            )
        )

    return OrderRead(
        id=order.id,  # type: ignore
        user_id=order.user_id,
        total_amount=order.total_amount,
        status=order.status,
        shipping_address=order.shipping_address,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=items,
    )
