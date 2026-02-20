# ============================================================
# BazaarAPI — Payment Routes
# ============================================================
# Endpoints for the Razorpay payment flow:
#   1. Create a Razorpay order (authenticated customer)
#   2. Verify payment after checkout (authenticated customer)
#   3. Webhook handler (called by Razorpay servers, no auth)
# ============================================================

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from database import get_session
from auth.dependencies import get_current_active_user
from users.models import User
from payments.models import PaymentRead, PaymentVerify, RazorpayOrderResponse
from payments.services import (
    create_payment_order,
    verify_and_confirm_payment,
    handle_webhook_event,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post(
    "/create-order/{order_id}",
    response_model=RazorpayOrderResponse,
    summary="Create a Razorpay payment order",
)
def create_razorpay_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> RazorpayOrderResponse:
    """
    Step 1 of the payment flow.

    Creates a Razorpay order and returns the details needed by
    the frontend to open Razorpay's checkout widget.

    The frontend uses the returned key_id and razorpay_order_id
    to initialize the Razorpay checkout.
    """
    return create_payment_order(session, order_id, current_user.id)  # type: ignore


@router.post(
    "/verify",
    response_model=PaymentRead,
    summary="Verify payment after Razorpay checkout",
)
def verify_payment(
    data: PaymentVerify,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> PaymentRead:
    """
    Step 2 of the payment flow.

    After the customer completes payment on Razorpay's checkout,
    the frontend sends the payment details here for server-side
    verification.

    NEVER trust the client — we verify the cryptographic signature
    to ensure the payment is genuine.
    """
    payment = verify_and_confirm_payment(session, data)
    return PaymentRead(
        id=payment.id,  # type: ignore
        order_id=payment.order_id,
        razorpay_order_id=payment.razorpay_order_id,
        razorpay_payment_id=payment.razorpay_payment_id,
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status,
        created_at=payment.created_at,
    )


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Razorpay webhook handler",
)
async def razorpay_webhook(
    request: Request,
    session: Session = Depends(get_session),
) -> dict:
    """
    Webhook endpoint called by Razorpay servers.

    This is a safety net for payment confirmation. If the frontend
    verification call fails (network issues, user closes browser),
    the webhook ensures we still process the payment.

    No authentication (no JWT) — instead we verify the webhook
    signature to ensure the request came from Razorpay.
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify the webhook signature
    if not verify_webhook_signature(body, signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event_type = payload.get("event", "")
    event_payload = payload.get("payload", {})

    handle_webhook_event(session, event_type, event_payload)

    # Always return 200 to Razorpay — they'll retry on non-2xx
    return {"status": "ok"}
