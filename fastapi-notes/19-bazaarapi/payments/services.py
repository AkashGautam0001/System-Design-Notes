# ============================================================
# BazaarAPI — Payment Services (Business Logic)
# ============================================================
# Handles the Razorpay payment lifecycle:
#   1. Create a Razorpay order (before customer pays)
#   2. Verify payment signature (after customer pays)
#   3. Handle webhook events (async payment updates)
#
# The flow:
#   Frontend -> POST /payments/create-order/{order_id}
#   Frontend -> Opens Razorpay checkout with returned order_id
#   Frontend -> POST /payments/verify (with signature)
#   Razorpay -> POST /payments/webhook (async backup)
# ============================================================

import hashlib
import hmac
import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from config import settings
from orders.models import Order, OrderStatus
from payments.models import Payment, PaymentVerify, RazorpayOrderResponse
from payments.razorpay_client import razorpay_client

logger = logging.getLogger(__name__)


def create_payment_order(
    session: Session,
    order_id: int,
    user_id: int,
) -> RazorpayOrderResponse:
    """
    Create a Razorpay order for an existing BazaarAPI order.

    Steps:
    1. Validate the order exists, belongs to user, and is in 'placed' status
    2. Check for existing payment (idempotency)
    3. Call Razorpay API to create an order
    4. Save payment record in our database
    5. Return Razorpay order details for the frontend
    """
    # Step 1: Validate order
    order = session.get(Order, order_id)
    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if order.status != OrderStatus.placed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create payment for order in '{order.status}' status",
        )

    # Step 2: Check for existing payment (idempotency)
    existing_payment = session.exec(
        select(Payment).where(
            Payment.order_id == order_id,
            Payment.status == "created",
        )
    ).first()

    if existing_payment:
        return RazorpayOrderResponse(
            razorpay_order_id=existing_payment.razorpay_order_id,
            amount=int(existing_payment.amount * 100),  # Convert to paise
            currency=existing_payment.currency,
            key_id=settings.RAZORPAY_KEY_ID,
        )

    # Step 3: Create Razorpay order
    amount_in_paise = int(order.total_amount * 100)  # Razorpay expects paise
    razorpay_order = razorpay_client.create_order(
        amount=amount_in_paise,
        currency="INR",
        receipt=f"order_{order_id}",
    )

    # Step 4: Save payment record
    payment = Payment(
        order_id=order_id,
        razorpay_order_id=razorpay_order["id"],
        amount=order.total_amount,
        currency="INR",
        status="created",
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)

    # Step 5: Return for frontend
    return RazorpayOrderResponse(
        razorpay_order_id=razorpay_order["id"],
        amount=amount_in_paise,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
    )


def verify_and_confirm_payment(
    session: Session,
    data: PaymentVerify,
) -> Payment:
    """
    Verify payment signature and confirm the payment.

    NEVER trust the client — always verify the signature server-side.
    Razorpay signs (order_id + "|" + payment_id) with your secret key.

    Steps:
    1. Find the payment record by razorpay_order_id
    2. Verify signature with Razorpay
    3. Update payment record
    4. Update order status to 'paid'
    """
    # Step 1: Find payment
    payment = session.exec(
        select(Payment).where(Payment.razorpay_order_id == data.razorpay_order_id)
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found for this Razorpay order",
        )

    if payment.status == "paid":
        # Already verified — idempotent response
        return payment

    # Step 2: Verify signature
    is_valid = razorpay_client.verify_payment_signature(
        razorpay_order_id=data.razorpay_order_id,
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature,
    )

    if not is_valid:
        payment.status = "failed"
        session.add(payment)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed — invalid signature",
        )

    # Step 3: Update payment
    payment.razorpay_payment_id = data.razorpay_payment_id
    payment.razorpay_signature = data.razorpay_signature
    payment.status = "paid"
    session.add(payment)

    # Step 4: Update order status
    order = session.get(Order, payment.order_id)
    if order and order.status == OrderStatus.placed:
        order.status = OrderStatus.paid
        session.add(order)

    session.commit()
    session.refresh(payment)
    return payment


def handle_webhook_event(
    session: Session,
    event_type: str,
    payload: dict,
) -> None:
    """
    Handle async Razorpay webhook events.

    Webhooks are a safety net — they confirm payment even if
    the frontend verification call fails (network issues, etc.).

    Common events:
    - payment.captured: Payment was successful
    - payment.failed: Payment failed
    - refund.created: Refund was initiated
    """
    logger.info(f"Received Razorpay webhook: {event_type}")

    if event_type == "payment.captured":
        payment_entity = payload.get("payment", {}).get("entity", {})
        razorpay_order_id = payment_entity.get("order_id", "")
        razorpay_payment_id = payment_entity.get("id", "")

        payment = session.exec(
            select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
        ).first()

        if payment and payment.status != "paid":
            payment.razorpay_payment_id = razorpay_payment_id
            payment.status = "paid"
            session.add(payment)

            order = session.get(Order, payment.order_id)
            if order and order.status == OrderStatus.placed:
                order.status = OrderStatus.paid
                session.add(order)

            session.commit()
            logger.info(f"Webhook confirmed payment for order {payment.order_id}")

    elif event_type == "payment.failed":
        payment_entity = payload.get("payment", {}).get("entity", {})
        razorpay_order_id = payment_entity.get("order_id", "")

        payment = session.exec(
            select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
        ).first()

        if payment and payment.status == "created":
            payment.status = "failed"
            session.add(payment)
            session.commit()
            logger.info(f"Webhook recorded failed payment for order {payment.order_id}")

    else:
        logger.info(f"Unhandled webhook event type: {event_type}")


def verify_webhook_signature(
    body: bytes,
    signature: str,
) -> bool:
    """
    Verify that a webhook request actually came from Razorpay.

    Razorpay signs the request body with your webhook secret.
    """
    if not settings.RAZORPAY_KEY_SECRET:
        logger.warning("No Razorpay secret set — skipping webhook signature check")
        return True

    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
