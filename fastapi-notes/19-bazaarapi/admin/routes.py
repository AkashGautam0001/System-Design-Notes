# ============================================================
# BazaarAPI — Admin Routes
# ============================================================
# Dashboard and analytics endpoints — admin only.
# Business stakeholders need data without touching the database.
# ============================================================

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from database import get_session
from auth.dependencies import require_admin
from users.models import User
from admin.services import (
    get_dashboard_stats,
    get_top_products,
    get_recent_orders,
    get_revenue_stats,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/dashboard",
    summary="Admin dashboard stats",
)
def dashboard(
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    High-level platform statistics.

    Returns: total users, orders, revenue, products,
    and order counts by status.
    """
    return get_dashboard_stats(session)


@router.get(
    "/top-products",
    summary="Top selling products",
)
def top_products(
    limit: int = Query(default=10, ge=1, le=50),
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> List[Dict[str, Any]]:
    """Top products ranked by quantity sold."""
    return get_top_products(session, limit=limit)


@router.get(
    "/recent-orders",
    summary="Recent orders",
)
def recent_orders(
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> List[Dict[str, Any]]:
    """Most recent orders with user and status info."""
    return get_recent_orders(session, limit=limit)


@router.get(
    "/revenue",
    summary="Revenue statistics",
)
def revenue(
    period: str = Query(default="daily", description="daily, weekly, or monthly"),
    days: int = Query(default=30, ge=1, le=365, description="Days to look back"),
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> List[Dict[str, Any]]:
    """
    Revenue grouped by time period.

    Supports daily, weekly, and monthly aggregation.
    """
    return get_revenue_stats(session, period=period, days=days)
