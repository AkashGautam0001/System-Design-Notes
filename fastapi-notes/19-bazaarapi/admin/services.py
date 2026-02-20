# ============================================================
# BazaarAPI — Admin Services (Business Logic)
# ============================================================
# Dashboard analytics and business intelligence queries.
#
# These queries give admins visibility into:
#   - Overall platform stats (users, orders, revenue)
#   - Top-selling products
#   - Recent orders for monitoring
#   - Revenue trends over time
# ============================================================

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlmodel import Session, select, func

from users.models import User
from products.models import Product
from orders.models import Order, OrderItem, OrderStatus


def get_dashboard_stats(session: Session) -> Dict[str, Any]:
    """
    Get high-level platform statistics.

    Returns total users, total orders, total revenue,
    and counts by order status.
    """
    # Total users
    total_users = session.exec(
        select(func.count()).select_from(User)
    ).one()

    # Total orders
    total_orders = session.exec(
        select(func.count()).select_from(Order)
    ).one()

    # Total revenue (only from paid/shipped/delivered orders)
    paid_statuses = [OrderStatus.paid, OrderStatus.shipped, OrderStatus.delivered]
    total_revenue_result = session.exec(
        select(func.sum(Order.total_amount)).where(
            Order.status.in_(paid_statuses)  # type: ignore
        )
    ).one()
    total_revenue = total_revenue_result or 0.0

    # Orders by status
    orders_by_status: Dict[str, int] = {}
    for order_status in OrderStatus:
        count = session.exec(
            select(func.count()).select_from(Order).where(
                Order.status == order_status
            )
        ).one()
        orders_by_status[order_status.value] = count

    # Total products
    total_products = session.exec(
        select(func.count()).select_from(Product).where(
            Product.is_active == True  # noqa: E712
        )
    ).one()

    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "total_products": total_products,
        "orders_by_status": orders_by_status,
    }


def get_top_products(
    session: Session,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Get top-selling products by quantity sold.

    Joins OrderItem with Product to aggregate total quantity
    sold per product.
    """
    results = session.exec(
        select(
            OrderItem.product_id,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.price_at_purchase * OrderItem.quantity).label("total_revenue"),
        )
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    ).all()

    top_products = []
    for row in results:
        product = session.get(Product, row[0])
        product_name = product.name if product else "Unknown"
        top_products.append({
            "product_id": row[0],
            "product_name": product_name,
            "total_sold": row[1],
            "total_revenue": round(row[2], 2) if row[2] else 0,
        })

    return top_products


def get_recent_orders(
    session: Session,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Get the most recent orders for admin monitoring.

    Includes user info and order details.
    """
    orders = session.exec(
        select(Order)
        .order_by(Order.created_at.desc())  # type: ignore
        .limit(limit)
    ).all()

    result = []
    for order in orders:
        user = session.get(User, order.user_id)
        username = user.username if user else "Unknown"
        result.append({
            "order_id": order.id,
            "username": username,
            "total_amount": order.total_amount,
            "status": order.status.value,
            "created_at": order.created_at.isoformat(),
        })

    return result


def get_revenue_stats(
    session: Session,
    period: str = "daily",
    days: int = 30,
) -> List[Dict[str, Any]]:
    """
    Get revenue statistics grouped by time period.

    Args:
        period: "daily", "weekly", or "monthly"
        days: How many days back to look

    Returns list of {period, revenue, order_count} dicts.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Fetch paid orders within the time range
    paid_statuses = [OrderStatus.paid, OrderStatus.shipped, OrderStatus.delivered]
    orders = session.exec(
        select(Order).where(
            Order.status.in_(paid_statuses),  # type: ignore
            Order.created_at >= since,
        )
    ).all()

    # Group by period
    buckets: Dict[str, Dict[str, Any]] = {}

    for order in orders:
        if period == "daily":
            key = order.created_at.strftime("%Y-%m-%d")
        elif period == "weekly":
            # ISO week number
            key = order.created_at.strftime("%Y-W%W")
        else:  # monthly
            key = order.created_at.strftime("%Y-%m")

        if key not in buckets:
            buckets[key] = {"period": key, "revenue": 0.0, "order_count": 0}

        buckets[key]["revenue"] += order.total_amount
        buckets[key]["order_count"] += 1

    # Sort by period and round revenue
    result = sorted(buckets.values(), key=lambda x: x["period"])
    for item in result:
        item["revenue"] = round(item["revenue"], 2)

    return result
