# ============================================================
# BazaarAPI — Razorpay Client Wrapper
# ============================================================
# Wraps the razorpay SDK with a clean interface.
#
# IMPORTANT: Handles the case where the razorpay package is NOT
# installed. In development, a mock client is used so developers
# can test the payment flow without real Razorpay credentials.
#
# In production, install razorpay: pip install razorpay
# ============================================================

import hashlib
import hmac
import logging
from typing import Any, Dict, Optional

from config import settings

logger = logging.getLogger(__name__)


class MockRazorpayClient:
    """
    Mock Razorpay client for development/testing.

    Simulates the Razorpay API so the payment flow can be
    tested without real credentials or the razorpay package.

    All mock order IDs start with 'mock_' to distinguish them
    from real Razorpay orders.
    """

    def __init__(self) -> None:
        self._order_counter = 0
        logger.warning(
            "Using MockRazorpayClient — install 'razorpay' package "
            "and set RAZORPAY_KEY_ID/SECRET for real payments"
        )

    def create_order(
        self,
        amount: int,
        currency: str = "INR",
        receipt: str = "",
    ) -> Dict[str, Any]:
        """Create a mock Razorpay order."""
        self._order_counter += 1
        return {
            "id": f"mock_order_{self._order_counter}",
            "amount": amount,
            "currency": currency,
            "receipt": receipt,
            "status": "created",
        }

    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """
        Verify payment signature in mock mode.

        In mock mode, we accept any signature that is non-empty.
        In production, this uses HMAC-SHA256 verification.
        """
        if razorpay_order_id.startswith("mock_"):
            # In mock mode, accept any non-empty signature
            return bool(razorpay_signature)

        # For non-mock orders, do real HMAC verification
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, razorpay_signature)


class RealRazorpayClient:
    """
    Production Razorpay client using the official razorpay SDK.

    This wraps the SDK to provide a consistent interface matching
    our MockRazorpayClient, so the rest of the app doesn't need
    to know which implementation is in use.
    """

    def __init__(self, client: Any) -> None:
        self._client = client
        logger.info("Using real Razorpay client")

    def create_order(
        self,
        amount: int,
        currency: str = "INR",
        receipt: str = "",
    ) -> Dict[str, Any]:
        """Create a real Razorpay order via their API."""
        order_data = {
            "amount": amount,  # Amount in paise
            "currency": currency,
            "receipt": receipt,
            "payment_capture": 1,  # Auto-capture payment
        }
        return self._client.order.create(data=order_data)

    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """Verify payment signature using Razorpay SDK."""
        try:
            self._client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            })
            return True
        except Exception:
            return False


def get_razorpay_client() -> "MockRazorpayClient | RealRazorpayClient":
    """
    Factory function: returns the appropriate Razorpay client.

    - If the razorpay package is installed AND credentials are set,
      returns a RealRazorpayClient.
    - Otherwise, returns a MockRazorpayClient for development.
    """
    try:
        import razorpay  # type: ignore

        if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            client = razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
            )
            return RealRazorpayClient(client)
        else:
            logger.warning(
                "razorpay package found but RAZORPAY_KEY_ID/SECRET not set. "
                "Using mock client."
            )
            return MockRazorpayClient()
    except ImportError:
        logger.warning(
            "razorpay package not installed. Using mock client. "
            "Install with: pip install razorpay"
        )
        return MockRazorpayClient()


# Module-level singleton — import this in services
razorpay_client = get_razorpay_client()
