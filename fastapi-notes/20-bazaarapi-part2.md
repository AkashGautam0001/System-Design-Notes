# ============================================================
# FILE 20: BAZAARAPI PART 2 — CART, ORDERS, AND RAZORPAY PAYMENTS
# ============================================================
# Topics: Cart management, order flow, Razorpay integration,
#         payment verification, order status, webhooks
#
# WHY THIS MATTERS:
# The cart-to-payment flow is where e-commerce lives or dies.
# Razorpay processes Rs.4 lakh crore annually — learning their
# integration means you can build real payment systems.
# ============================================================


## STORY: The Big Billion Day Problem

October 2023. Flipkart's Big Billion Days sale goes live at midnight.
Within the first hour, 1 million orders flood in. Carts time out.
Payments fail. Stock counts go negative. Customers see "Order Placed"
but their money doesn't move.

Behind every one of these failures is a developer who didn't respect
the atomic nature of the cart-to-order-to-payment pipeline. A cart
is a promise. An order is a commitment. A payment is a contract.
Each transition must be all-or-nothing.

BazaarAPI won't handle 1M orders per hour. But the patterns we build
here — atomic operations, stock validation, idempotent payments,
webhook fallbacks — are the exact same patterns Flipkart uses. Scale
changes the numbers, not the architecture.

---

## SECTION 1 — Cart Management

### WHY: The cart is where browsing becomes buying.

The shopping cart seems simple, but it handles surprising edge cases:
- What if a product is deleted after being added to cart?
- What if stock drops below the cart quantity?
- What if the user adds the same product twice?

### Cart Data Model

```python
# cart/models.py
class CartItem(SQLModel, table=True):
    __tablename__ = "cart_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    product_id: int = Field(foreign_key="products.id")
    quantity: int = Field(default=1, ge=1)
    added_at: datetime

class CartResponse(SQLModel):
    items: List[CartItemRead]
    total: float
    item_count: int
```

**Design decision:** The cart is NOT a table — it's a virtual collection of
`CartItem` rows belonging to a user. There's no `Cart` table. This simplifies
the schema and avoids the "empty cart" problem (do you create a cart row when
a user registers? When they first add an item?).

### Cart Endpoints

| Method | Path              | Auth     | Purpose              |
|--------|------------------|----------|----------------------|
| GET    | /cart            | Customer | View cart with totals |
| POST   | /cart/items      | Customer | Add product to cart   |
| PATCH  | /cart/items/{id} | Customer | Update quantity       |
| DELETE | /cart/items/{id} | Customer | Remove one item       |
| DELETE | /cart            | Customer | Clear entire cart     |

### Add to Cart — Handling Edge Cases

```python
# cart/services.py
def add_to_cart(session, user_id, data):
    # 1. Product must exist and be active
    product = session.get(Product, data.product_id)
    if not product or not product.is_active:
        raise HTTPException(404, "Product not found or inactive")

    # 2. Check stock availability
    if data.quantity > product.stock:
        raise HTTPException(400, f"Only {product.stock} items in stock")

    # 3. If already in cart, UPDATE quantity (don't duplicate)
    existing = session.exec(
        select(CartItem).where(
            CartItem.user_id == user_id,
            CartItem.product_id == data.product_id,
        )
    ).first()

    if existing:
        new_qty = existing.quantity + data.quantity
        if new_qty > product.stock:
            raise HTTPException(400,
                f"Cannot add more. {product.stock} in stock, "
                f"{existing.quantity} already in cart"
            )
        existing.quantity = new_qty
        session.add(existing)
        session.commit()
        return existing

    # 4. New cart item
    cart_item = CartItem(
        user_id=user_id,
        product_id=data.product_id,
        quantity=data.quantity,
    )
    session.add(cart_item)
    session.commit()
    return cart_item
```

**WHY merge duplicates?** If a user adds "iPhone 15" with quantity 1, then
later adds "iPhone 15" again with quantity 2, they expect 3 iPhones in their
cart — not two separate line items. This matches every major e-commerce UX.

### Cart Total Calculation

```python
# cart/services.py
def get_cart(session, user_id):
    cart_items = session.exec(
        select(CartItem).where(CartItem.user_id == user_id)
    ).all()

    items = []
    total = 0.0

    for item in cart_items:
        product = session.get(Product, item.product_id)
        if product and product.is_active:
            subtotal = product.price * item.quantity
            items.append(CartItemRead(
                id=item.id,
                product_id=item.product_id,
                product_name=product.name,
                product_price=product.price,
                quantity=item.quantity,
                subtotal=subtotal,
            ))
            total += subtotal

    return CartResponse(
        items=items, total=round(total, 2), item_count=len(items)
    )
```

**WHY compute totals on-the-fly?** Product prices can change. If Samsung
drops the Galaxy S24 price from 79,999 to 69,999, the cart should reflect
the new price immediately. We use the CURRENT product price, not the
price-at-add-time.

---

## SECTION 2 — Order Placement Flow

### WHY: Converting a cart to an order is an atomic operation.

This is the most critical code in BazaarAPI. When a customer clicks
"Place Order," six things must happen as one indivisible unit:

1. Validate all cart items have sufficient stock
2. Create the Order record
3. Create OrderItem records (with price-at-purchase)
4. Decrement product stock
5. Clear the cart
6. Return the order

If step 4 fails, steps 2-3 must roll back. If step 5 fails, the
customer gets charged but their cart isn't cleared. Every step
depends on every other step.

### Order Model

```python
# orders/models.py
class OrderStatus(str, Enum):
    placed = "placed"        # Order created, awaiting payment
    paid = "paid"            # Payment confirmed
    shipped = "shipped"      # Dispatched to customer
    delivered = "delivered"  # Customer received it
    cancelled = "cancelled"  # Cancelled (before or after payment)
    refunded = "refunded"    # Money returned after cancellation

class Order(SQLModel, table=True):
    __tablename__ = "orders"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    total_amount: float = Field(ge=0)
    status: OrderStatus = Field(default=OrderStatus.placed)
    shipping_address: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    product_id: int = Field(foreign_key="products.id")
    quantity: int = Field(ge=1)
    price_at_purchase: float = Field(ge=0)  # SNAPSHOT!
```

**WHY `price_at_purchase`?** This is a critical concept. When you order a
phone for Rs.79,999, the order must record Rs.79,999 — even if the price
changes to Rs.69,999 tomorrow. The cart uses current prices (dynamic).
The order uses frozen prices (static). This is the difference between
a shopping list and a receipt.

### The Atomic Order Creation

```python
# orders/services.py — The most critical function in BazaarAPI
def create_order_from_cart(session, user_id, data):
    # Step 1: Fetch cart
    cart_items = list(session.exec(
        select(CartItem).where(CartItem.user_id == user_id)
    ).all())

    if not cart_items:
        raise HTTPException(400, "Cart is empty")

    # Step 2 & 3: Validate stock + calculate total
    total_amount = 0.0
    order_items_data = []

    for cart_item in cart_items:
        product = session.get(Product, cart_item.product_id)
        if not product or not product.is_active:
            raise HTTPException(400,
                f"Product ID {cart_item.product_id} unavailable")

        if cart_item.quantity > product.stock:
            raise HTTPException(400,
                f"Insufficient stock for '{product.name}'")

        subtotal = product.price * cart_item.quantity
        total_amount += subtotal
        order_items_data.append({
            "product": product,
            "quantity": cart_item.quantity,
            "price_at_purchase": product.price,
        })

    # Step 4: Create Order (flush to get ID)
    order = Order(
        user_id=user_id,
        total_amount=round(total_amount, 2),
        shipping_address=data.shipping_address,
    )
    session.add(order)
    session.flush()  # Get ID without committing

    # Step 4b: Create OrderItems
    for item_data in order_items_data:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            price_at_purchase=item_data["price_at_purchase"],
        )
        session.add(order_item)

    # Step 5: Decrement stock
    for item_data in order_items_data:
        product = item_data["product"]
        product.stock -= item_data["quantity"]
        session.add(product)

    # Step 6: Clear cart
    for cart_item in cart_items:
        session.delete(cart_item)

    # ALL OR NOTHING
    session.commit()
    session.refresh(order)
    return order
```

**WHY `session.flush()` instead of `session.commit()`?** Flush sends the INSERT
to the database (so we get `order.id`) but keeps the transaction open. If
anything fails after this point, the entire transaction — including the
order creation — rolls back. Commit makes it permanent.

### Order Status Machine

```
placed ────> paid ────> shipped ────> delivered
  │            │
  │            v
  └──────> cancelled ────> refunded
```

Valid transitions are enforced in code:

```python
valid_transitions = {
    OrderStatus.placed:    [OrderStatus.paid, OrderStatus.cancelled],
    OrderStatus.paid:      [OrderStatus.shipped, OrderStatus.cancelled],
    OrderStatus.shipped:   [OrderStatus.delivered],
    OrderStatus.cancelled: [OrderStatus.refunded],
    OrderStatus.delivered: [],  # Terminal state
    OrderStatus.refunded:  [],  # Terminal state
}
```

**WHY enforce transitions?** Without validation, an admin could mark a
"delivered" order as "placed" — which makes no sense. State machines
prevent impossible states.

### Order Cancellation with Stock Restoration

```python
def cancel_order(session, order_id, user_id):
    order = session.get(Order, order_id)
    if order.status != OrderStatus.placed:
        raise HTTPException(400,
            "Only 'placed' orders can be cancelled by customer")

    # Restore stock for each item
    order_items = session.exec(
        select(OrderItem).where(OrderItem.order_id == order_id)
    ).all()
    for item in order_items:
        product = session.get(Product, item.product_id)
        if product:
            product.stock += item.quantity
            session.add(product)

    order.status = OrderStatus.cancelled
    session.commit()
    return order
```

**WHY restore stock?** When a customer cancels, those items should become
available for other customers to buy. Without stock restoration, cancelled
orders permanently reduce available inventory — a silent bug that costs
real money.

---

## SECTION 3 — Razorpay Integration Setup

### WHY: Razorpay is India's leading payment gateway — used by 8M+ businesses.

Razorpay processes payments for Swiggy, Zomato, Airtel, and millions of
Indian businesses. Their API follows a standard flow:

```
1. Your server creates a Razorpay "order" (server-to-server)
2. Your frontend opens Razorpay's checkout with that order ID
3. Customer pays through Razorpay (UPI, card, netbanking)
4. Razorpay redirects back with payment details
5. Your server VERIFIES the payment signature (server-to-server)
```

### The Razorpay Client Wrapper

```python
# payments/razorpay_client.py
def get_razorpay_client():
    """Factory: returns real or mock client."""
    try:
        import razorpay
        if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            client = razorpay.Client(auth=(...))
            return RealRazorpayClient(client)
        return MockRazorpayClient()
    except ImportError:
        return MockRazorpayClient()
```

**WHY mock fallback?** Not every developer has Razorpay credentials. The mock
client lets you test the entire payment flow locally. Mock order IDs start
with `mock_` so you can always distinguish real from test transactions.

### Payment Model

```python
# payments/models.py
class Payment(SQLModel, table=True):
    __tablename__ = "payments"
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    razorpay_order_id: str       # From Razorpay API
    razorpay_payment_id: str     # From Razorpay after payment
    razorpay_signature: str      # For verification
    amount: float
    currency: str = "INR"
    status: str = "created"      # created -> paid -> failed
    created_at: datetime
```

### Creating a Razorpay Order

```python
# payments/services.py
def create_payment_order(session, order_id, user_id):
    # 1. Validate the order
    order = session.get(Order, order_id)
    if order.status != OrderStatus.placed:
        raise HTTPException(400, "Order already paid or cancelled")

    # 2. Idempotency: return existing payment if already created
    existing = session.exec(
        select(Payment).where(
            Payment.order_id == order_id,
            Payment.status == "created",
        )
    ).first()
    if existing:
        return existing_razorpay_response

    # 3. Create Razorpay order (amount in PAISE)
    amount_in_paise = int(order.total_amount * 100)
    razorpay_order = razorpay_client.create_order(
        amount=amount_in_paise,
        currency="INR",
        receipt=f"order_{order_id}",
    )

    # 4. Save payment record
    payment = Payment(
        order_id=order_id,
        razorpay_order_id=razorpay_order["id"],
        amount=order.total_amount,
    )
    session.add(payment)
    session.commit()

    # 5. Return details for frontend
    return RazorpayOrderResponse(
        razorpay_order_id=razorpay_order["id"],
        amount=amount_in_paise,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,  # Safe for frontend
    )
```

**WHY amount in paise?** Razorpay expects amounts in the smallest currency
unit. Rs.799.99 becomes 79999 paise. This avoids floating-point issues in
payment processing. Never pass float amounts to a payment API.

---

## SECTION 4 — Payment Verification

### WHY: Never trust the client — always verify payments server-side.

After the customer pays through Razorpay's checkout, the frontend receives
three values: `razorpay_order_id`, `razorpay_payment_id`, and
`razorpay_signature`. These must be verified server-side.

### Signature Verification

Razorpay signs `order_id|payment_id` with your secret key using HMAC-SHA256.
If the signature matches, the payment is genuine. If it doesn't, someone
is trying to fake a successful payment.

```python
# payments/services.py
def verify_and_confirm_payment(session, data):
    # 1. Find the payment record
    payment = session.exec(
        select(Payment).where(
            Payment.razorpay_order_id == data.razorpay_order_id
        )
    ).first()

    if payment.status == "paid":
        return payment  # Idempotent

    # 2. Verify signature (CRITICAL!)
    is_valid = razorpay_client.verify_payment_signature(
        razorpay_order_id=data.razorpay_order_id,
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature,
    )

    if not is_valid:
        payment.status = "failed"
        session.commit()
        raise HTTPException(400, "Invalid payment signature")

    # 3. Update payment
    payment.razorpay_payment_id = data.razorpay_payment_id
    payment.razorpay_signature = data.razorpay_signature
    payment.status = "paid"

    # 4. Update order status
    order = session.get(Order, payment.order_id)
    if order.status == OrderStatus.placed:
        order.status = OrderStatus.paid

    session.commit()
    return payment
```

**WHY idempotent verification?** The frontend might call `/verify` twice
(network retry, user double-click). The second call should return success
without modifying anything. Idempotency prevents double-processing.

---

## SECTION 5 — Order Status Machine

### WHY: Order lifecycle tracking is critical for customer trust.

Customers need to know: "Is my order confirmed? Has it shipped? When will
it arrive?" The order status machine provides this visibility.

### Status Flow

```
Customer places order ──> [placed]
                              │
                    Payment verified
                              │
                              v
                          [paid]
                              │
                     Admin ships order
                              │
                              v
                        [shipped]
                              │
                    Delivery confirmed
                              │
                              v
                       [delivered]
```

Cancellation path:
```
[placed] ──> customer cancels ──> [cancelled]
[paid]   ──> admin cancels    ──> [cancelled] ──> admin refunds ──> [refunded]
```

### Endpoint Design

```python
# Admin updates status (e.g., mark as shipped)
@router.patch("/{order_id}/status")
def admin_update_status(
    order_id: int, data: OrderStatusUpdate,
    admin = Depends(require_admin), session = Depends(get_session),
):
    update_order_status(session, order_id, data.status)
    return get_order_by_id(session, order_id)

# Customer cancels their own order
@router.patch("/{order_id}/cancel")
def cancel_my_order(
    order_id: int,
    current_user = Depends(get_current_active_user),
    session = Depends(get_session),
):
    cancel_order(session, order_id, current_user.id)
    return get_order_by_id(session, order_id, user_id=current_user.id)
```

---

## SECTION 6 — Webhook Handling

### WHY: Webhooks handle async payment events you can't poll for.

What happens if the customer pays successfully on Razorpay, but their
internet drops before the frontend can call `/verify`? Without webhooks,
that payment is confirmed on Razorpay but unconfirmed in your system.
The customer paid but your system shows "placed" instead of "paid."

Webhooks solve this: Razorpay's servers call YOUR server directly.

### Webhook Endpoint

```python
# payments/routes.py
@router.post("/webhook")
async def razorpay_webhook(request: Request, session = Depends(get_session)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify the webhook came from Razorpay
    if not verify_webhook_signature(body, signature):
        raise HTTPException(400, "Invalid webhook signature")

    payload = json.loads(body)
    event_type = payload.get("event", "")
    event_payload = payload.get("payload", {})

    handle_webhook_event(session, event_type, event_payload)

    return {"status": "ok"}  # Always return 200 to Razorpay
```

### Webhook Event Processing

```python
# payments/services.py
def handle_webhook_event(session, event_type, payload):
    if event_type == "payment.captured":
        # Payment was successful
        payment_entity = payload["payment"]["entity"]
        razorpay_order_id = payment_entity["order_id"]

        payment = session.exec(
            select(Payment).where(
                Payment.razorpay_order_id == razorpay_order_id
            )
        ).first()

        if payment and payment.status != "paid":
            payment.status = "paid"
            order = session.get(Order, payment.order_id)
            if order.status == OrderStatus.placed:
                order.status = OrderStatus.paid
            session.commit()

    elif event_type == "payment.failed":
        # Payment failed
        # Mark payment as failed for tracking
        ...
```

**WHY always return 200?** Razorpay retries webhooks that return non-2xx
responses. If your webhook handler fails and returns 500, Razorpay will
keep retrying — potentially causing duplicate processing. Return 200
and handle errors internally.

### Webhook Security

```python
def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify webhook came from Razorpay using HMAC-SHA256."""
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**WHY `hmac.compare_digest`?** It's a timing-safe comparison. Regular `==`
comparison can leak information about which characters match through timing
differences. This is called a timing attack. `compare_digest` takes the
same time regardless of where the strings differ.

---

## KEY TAKEAWAYS

1. **Cart = dynamic prices, Order = frozen prices** — The cart always shows
   current product prices. The order snapshots `price_at_purchase` at checkout
   time. This distinction is fundamental to e-commerce.

2. **Atomic operations prevent data corruption** — The cart-to-order conversion
   uses `session.flush()` + `session.commit()` to ensure all six steps succeed
   or all roll back. Partial success is worse than complete failure.

3. **Stock management is bidirectional** — Orders decrement stock. Cancellations
   restore it. Both operations must be atomic with the status change.

4. **Razorpay amounts are in paise** — Rs.799.99 = 79999 paise. Never send
   float amounts to a payment gateway.

5. **Signature verification is non-negotiable** — Anyone can send a POST to your
   `/verify` endpoint with fake data. HMAC-SHA256 signature verification proves
   the payment data came from Razorpay.

6. **Webhooks are your safety net** — They confirm payments even when the
   frontend call fails. Combined with idempotent handlers, they ensure every
   payment is processed exactly once.

7. **State machines prevent impossible states** — By defining valid transitions,
   you make it impossible to ship a cancelled order or refund an unpaid one.

---

## WHAT'S NEXT

In Part 3, we add the production polish:
- **Background tasks** — Email confirmations, low-stock alerts
- **Middleware** — Request logging, timing headers
- **Admin dashboard** — Sales stats, top products, revenue
- **Alembic migrations** — Schema evolution without data loss
- **Docker** — Containerized deployment

The e-commerce engine is running. Now we make it production-ready.
