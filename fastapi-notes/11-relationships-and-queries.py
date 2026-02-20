"""
============================================================
FILE 11: DATABASE RELATIONSHIPS, JOINS, AND ADVANCED QUERIES
============================================================
Topics: one-to-many, foreign keys, Relationship(), back_populates,
        joins, many-to-many, aggregation, pagination, search,
        sorting, complex queries, complete relational example

WHY THIS MATTERS:
Real-world applications never have just one table. Products have
reviews, users have orders, orders have items. Understanding how
to model relationships and write efficient queries is what
separates a toy app from a production-grade API.
============================================================
"""

# STORY: Amazon India — Product Has Reviews, User Has Reviews
# Amazon India handles 300M+ products and billions of reviews.
# Every product page you see is a JOIN across products, reviews,
# users, sellers, and inventory tables. When you filter by
# "4 stars & above" or sort by "most recent", that is a database
# query with WHERE, ORDER BY, and LIMIT — not Python filtering.
# Getting relationships and queries right is the backbone of
# every e-commerce platform operating at Indian scale.

from typing import Optional, List
from datetime import datetime, timezone

# ════════════════════════════════════════════════════════════
# SECTION 1 — One-to-Many Relationships (User Has Many Posts)
# ════════════════════════════════════════════════════════════

# WHY: One-to-many is the most common relationship in any app.
# A user writes many posts, a product has many reviews, an
# order contains many items. Master this pattern first.

from sqlmodel import (
    SQLModel, Field, Relationship, Session, create_engine,
    select, col, or_, func
)

# --- Parent Model: User ---
# The "one" side of one-to-many. A user can have many posts.

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationship: this user's posts
    # back_populates="author" means Post.author points back here
    posts: List["Post"] = Relationship(back_populates="author")

    # Relationship: this user's reviews
    reviews: List["Review"] = Relationship(back_populates="reviewer")


# --- Child Model: Post ---
# The "many" side. Each post belongs to exactly one user.

class Post(SQLModel, table=True):
    __tablename__ = "posts"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=200)
    content: str
    published: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Foreign key: links this post to a user
    # "users.id" refers to the users table, id column
    author_id: Optional[int] = Field(default=None, foreign_key="users.id")

    # Relationship back to User
    # back_populates="posts" means User.posts points to these
    author: Optional[User] = Relationship(back_populates="posts")


# ════════════════════════════════════════════════════════════
# SECTION 2 — Foreign Keys and Relationship() Explained
# ════════════════════════════════════════════════════════════

# WHY: Foreign keys enforce data integrity at the database level.
# Without them, you could have reviews pointing to non-existent
# products — orphaned data that corrupts your application.

# --- Product and Review models (Amazon India scenario) ---

class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: str = Field(default="")
    price: float = Field(ge=0)
    category: str = Field(index=True)
    stock: int = Field(default=0, ge=0)
    seller_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # One product has many reviews
    reviews: List["Review"] = Relationship(back_populates="product")


class Review(SQLModel, table=True):
    __tablename__ = "reviews"

    id: Optional[int] = Field(default=None, primary_key=True)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Foreign keys — each review belongs to one product AND one user
    product_id: Optional[int] = Field(default=None, foreign_key="products.id")
    reviewer_id: Optional[int] = Field(default=None, foreign_key="users.id")

    # Bidirectional relationships
    product: Optional[Product] = Relationship(back_populates="reviews")
    reviewer: Optional[User] = Relationship(back_populates="reviews")


# ════════════════════════════════════════════════════════════
# SECTION 3 — Many-to-Many Relationships (Tags <-> Products)
# ════════════════════════════════════════════════════════════

# WHY: Many products can share the same tag, and one product
# can have multiple tags. You need a junction/link table to
# model this. Think of Flipkart categories, Swiggy cuisine tags.

# --- Link/Junction Table ---
# This table has NO data of its own, just two foreign keys.

class ProductTagLink(SQLModel, table=True):
    __tablename__ = "product_tag_link"

    product_id: Optional[int] = Field(
        default=None, foreign_key="products.id", primary_key=True
    )
    tag_id: Optional[int] = Field(
        default=None, foreign_key="tags.id", primary_key=True
    )


class Tag(SQLModel, table=True):
    __tablename__ = "tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)

    # Many-to-many: a tag can be on many products
    # The link_model tells SQLModel which junction table to use
    products: List[Product] = Relationship(
        back_populates="tags",
        link_model=ProductTagLink
    )


# NOTE: In a real project, you would also add a "tags" relationship
# inside the Product class with link_model=ProductTagLink.


# ════════════════════════════════════════════════════════════
# SECTION 4 — Creating Related Records
# ════════════════════════════════════════════════════════════

# WHY: Knowing how to insert related data correctly ensures
# referential integrity. Wrong insertion order = foreign key
# violations and crashed endpoints.

DATABASE_URL = "sqlite:///./amazon_india.db"
engine = create_engine(DATABASE_URL, echo=False)


def create_tables():
    """Create all tables in the database."""
    SQLModel.metadata.create_all(engine)


def seed_data():
    """Insert sample data with relationships."""
    with Session(engine) as session:
        # Step 1: Create users first (they are the "one" side)
        buyer = User(username="rahul_sharma", email="rahul@gmail.com")
        seller = User(username="delhi_electronics", email="seller@delhi.com")
        session.add(buyer)
        session.add(seller)
        session.commit()
        # After commit, buyer.id and seller.id are populated

        session.refresh(buyer)
        session.refresh(seller)

        # Step 2: Create products (referencing seller)
        phone = Product(
            name="Samsung Galaxy M34", description="5G phone",
            price=14999.0, category="Electronics", stock=500,
            seller_id=seller.id
        )
        earbuds = Product(
            name="boAt Airdopes 141", description="TWS earbuds",
            price=1099.0, category="Electronics", stock=2000,
            seller_id=seller.id
        )
        session.add(phone)
        session.add(earbuds)
        session.commit()
        session.refresh(phone)
        session.refresh(earbuds)

        # Step 3: Create reviews (referencing product AND user)
        review1 = Review(
            rating=5,
            comment="Amazing battery life! Lasts 2 days easily.",
            product_id=phone.id,
            reviewer_id=buyer.id
        )
        review2 = Review(
            rating=4,
            comment="Good sound quality for the price.",
            product_id=earbuds.id,
            reviewer_id=buyer.id
        )
        session.add(review1)
        session.add(review2)
        session.commit()

        # Step 4: Create tags and link them via junction table
        tag_5g = Tag(name="5G")
        tag_budget = Tag(name="Budget")
        session.add_all([tag_5g, tag_budget])
        session.commit()
        session.refresh(tag_5g)
        session.refresh(tag_budget)

        link1 = ProductTagLink(product_id=phone.id, tag_id=tag_5g.id)
        link2 = ProductTagLink(product_id=earbuds.id, tag_id=tag_budget.id)
        session.add_all([link1, link2])
        session.commit()
        print("Seed data inserted successfully!")


# ════════════════════════════════════════════════════════════
# SECTION 5 — Querying with Relationships (Lazy Loading)
# ════════════════════════════════════════════════════════════

# WHY: Once relationships are set up, you can traverse them in
# Python. Get user.posts, product.reviews — SQLModel loads them
# automatically. This is called lazy loading.

def query_with_relationships():
    """Demonstrate accessing related data through relationships."""
    with Session(engine) as session:
        # Get a user and access their reviews
        user = session.exec(
            select(User).where(User.username == "rahul_sharma")
        ).first()

        if user:
            print(f"User: {user.username}")
            print(f"Number of reviews: {len(user.reviews)}")
            for review in user.reviews:
                print(f"  - Rating: {review.rating}, Comment: {review.comment}")

        # Get a product and access its reviews
        product = session.exec(
            select(Product).where(Product.name == "Samsung Galaxy M34")
        ).first()

        if product:
            print(f"\nProduct: {product.name}")
            print(f"Number of reviews: {len(product.reviews)}")
            for review in product.reviews:
                # Access the reviewer through the review
                print(f"  - {review.rating} stars by user #{review.reviewer_id}")


# ════════════════════════════════════════════════════════════
# SECTION 6 — Joining Tables with select().join()
# ════════════════════════════════════════════════════════════

# WHY: Lazy loading makes N+1 queries (one per related object).
# For listing pages with 50 products + reviews, that is 51 queries.
# JOINs fetch everything in ONE query — critical for performance.

def join_examples():
    """Show different types of joins."""
    with Session(engine) as session:
        # --- INNER JOIN: Products with their reviews ---
        # Only returns products that HAVE reviews
        statement = select(Product, Review).join(Review)
        results = session.exec(statement).all()

        print("=== Products with Reviews (INNER JOIN) ===")
        for product, review in results:
            print(f"{product.name}: {review.rating} stars - {review.comment}")

        # --- JOIN with filter ---
        # Get all reviews for products in "Electronics" category
        statement = (
            select(Review)
            .join(Product)
            .where(Product.category == "Electronics")
        )
        reviews = session.exec(statement).all()
        print(f"\n=== Reviews for Electronics: {len(reviews)} found ===")

        # --- JOIN across three tables ---
        # Get username + product name + review rating
        statement = (
            select(User.username, Product.name, Review.rating)
            .join(Review, Review.reviewer_id == User.id)
            .join(Product, Product.id == Review.product_id)
        )
        results = session.exec(statement).all()
        print("\n=== User-Product-Review Join ===")
        for username, product_name, rating in results:
            print(f"  {username} rated {product_name}: {rating} stars")


# ════════════════════════════════════════════════════════════
# SECTION 7 — Aggregation Queries (COUNT, AVG, SUM)
# ════════════════════════════════════════════════════════════

# WHY: "Average rating: 4.2 stars (1,234 reviews)" — every
# product page shows aggregated data. Doing this in Python
# means loading ALL reviews into memory. Aggregation pushes
# the math to the database where it belongs.

def aggregation_examples():
    """Show COUNT, AVG, SUM, GROUP BY queries."""
    with Session(engine) as session:
        # --- COUNT: How many reviews per product? ---
        statement = (
            select(Product.name, func.count(Review.id).label("review_count"))
            .join(Review)
            .group_by(Product.name)
        )
        results = session.exec(statement).all()
        print("=== Review Count per Product ===")
        for name, count in results:
            print(f"  {name}: {count} reviews")

        # --- AVG: Average rating per product ---
        statement = (
            select(
                Product.name,
                func.avg(Review.rating).label("avg_rating")
            )
            .join(Review)
            .group_by(Product.name)
        )
        results = session.exec(statement).all()
        print("\n=== Average Rating per Product ===")
        for name, avg_rating in results:
            print(f"  {name}: {avg_rating:.1f} stars")

        # --- SUM: Total stock value per category ---
        statement = (
            select(
                Product.category,
                func.sum(Product.price * Product.stock).label("total_value")
            )
            .group_by(Product.category)
        )
        results = session.exec(statement).all()
        print("\n=== Total Inventory Value by Category ===")
        for category, total in results:
            print(f"  {category}: Rs. {total:,.0f}")

        # COUNT with HAVING is also available:
        # .group_by(Product.category).having(func.count(Product.id) > 1)


# ════════════════════════════════════════════════════════════
# SECTION 8 — Pagination, Search, Filter, and Sort
# ════════════════════════════════════════════════════════════

# WHY: No user wants to see 10,000 results on one page. Amazon
# India shows 24 products per page. Pagination, search, and
# sorting MUST happen at the database level for performance.

def pagination_example(page: int = 1, page_size: int = 10):
    """Database-level pagination with offset and limit."""
    with Session(engine) as session:
        # Calculate offset from page number
        offset_val = (page - 1) * page_size

        # Get total count for pagination metadata
        total = session.exec(
            select(func.count(Product.id))
        ).one()

        # Get the page of results
        statement = (
            select(Product)
            .order_by(Product.created_at.desc())
            .offset(offset_val)
            .limit(page_size)
        )
        products = session.exec(statement).all()

        total_pages = (total + page_size - 1) // page_size
        print(f"Page {page} of {total_pages} ({total} total products)")
        for p in products:
            print(f"  - {p.name}: Rs. {p.price}")

        return {
            "items": products,
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        }


def search_and_filter(
    query: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 10
):
    """Full search/filter/sort/paginate for product listing."""
    with Session(engine) as session:
        statement = select(Product)

        if query:
            statement = statement.where(col(Product.name).contains(query))
        if category:
            statement = statement.where(Product.category == category)
        if min_price is not None:
            statement = statement.where(Product.price >= min_price)
        if max_price is not None:
            statement = statement.where(Product.price <= max_price)

        # Sorting
        sort_column = getattr(Product, sort_by, Product.created_at)
        if sort_order == "desc":
            statement = statement.order_by(sort_column.desc())
        else:
            statement = statement.order_by(sort_column.asc())

        # Pagination
        offset_val = (page - 1) * page_size
        statement = statement.offset(offset_val).limit(page_size)
        return session.exec(statement).all()


# --- Complex queries with OR conditions ---

def complex_query_example():
    """Multiple filters with OR conditions."""
    with Session(engine) as session:
        # Products that are either cheap OR in Electronics
        statement = (
            select(Product)
            .where(or_(Product.price < 2000, Product.category == "Electronics"))
            .order_by(Product.price.asc())
        )
        results = session.exec(statement).all()
        print("=== Cheap OR Electronics Products ===")
        for p in results:
            print(f"  {p.name}: Rs. {p.price} [{p.category}]")


# ════════════════════════════════════════════════════════════
# SECTION 9 — Complete FastAPI Integration
# ════════════════════════════════════════════════════════════

# WHY: All the query patterns above need to be exposed through
# API endpoints. This section ties everything together into
# a working FastAPI application.

from fastapi import FastAPI, HTTPException, Query, Depends

app = FastAPI(title="Amazon India API", version="1.0.0")


def get_session():
    """Yield a database session."""
    with Session(engine) as session:
        yield session


@app.on_event("startup")
def on_startup():
    create_tables()


# --- Product Endpoints ---

@app.get("/products")
def list_products(
    q: Optional[str] = Query(None, description="Search by name"),
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = Query("created_at", enum=["name", "price", "created_at"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """
    List products with search, filter, sort, and pagination.
    This is the query behind Amazon India's product listing page.
    """
    statement = select(Product)

    if q:
        statement = statement.where(col(Product.name).contains(q))
    if category:
        statement = statement.where(Product.category == category)
    if min_price is not None:
        statement = statement.where(Product.price >= min_price)
    if max_price is not None:
        statement = statement.where(Product.price <= max_price)

    # Sort
    sort_col = getattr(Product, sort_by, Product.created_at)
    if sort_order == "desc":
        statement = statement.order_by(sort_col.desc())
    else:
        statement = statement.order_by(sort_col.asc())

    # Paginate
    offset_val = (page - 1) * page_size
    statement = statement.offset(offset_val).limit(page_size)

    products = session.exec(statement).all()
    return {"items": products, "page": page, "page_size": page_size}


@app.get("/products/{product_id}")
def get_product_detail(product_id: int, session: Session = Depends(get_session)):
    """
    Get product with reviews and average rating — like an
    Amazon India product detail page.
    """
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get aggregated review stats
    stats = session.exec(
        select(
            func.count(Review.id).label("count"),
            func.avg(Review.rating).label("avg_rating"),
        )
        .where(Review.product_id == product_id)
    ).first()

    review_count = stats[0] if stats else 0
    avg_rating = round(stats[1], 1) if stats and stats[1] else 0

    # Get recent reviews with reviewer info
    reviews = session.exec(
        select(Review)
        .where(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .limit(10)
    ).all()

    return {
        "product": product,
        "review_count": review_count,
        "avg_rating": avg_rating,
        "recent_reviews": reviews,
    }


@app.post("/products/{product_id}/reviews")
def create_review(
    product_id: int,
    rating: int = Query(ge=1, le=5),
    comment: str = "",
    reviewer_id: int = Query(ge=1),
    session: Session = Depends(get_session),
):
    """Create a review for a product."""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    reviewer = session.get(User, reviewer_id)
    if not reviewer:
        raise HTTPException(status_code=404, detail="User not found")

    review = Review(
        rating=rating,
        comment=comment,
        product_id=product_id,
        reviewer_id=reviewer_id,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


@app.get("/users/{user_id}/reviews")
def get_user_reviews(user_id: int, session: Session = Depends(get_session)):
    """Get all reviews by a specific user — their review history."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reviews = session.exec(
        select(Review, Product.name)
        .join(Product)
        .where(Review.reviewer_id == user_id)
        .order_by(Review.created_at.desc())
    ).all()

    return {
        "user": user.username,
        "reviews": [
            {
                "product": product_name,
                "rating": review.rating,
                "comment": review.comment,
            }
            for review, product_name in reviews
        ],
    }


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. Use Field(foreign_key="table.column") for relationships
# 2. Relationship(back_populates="field") keeps both sides synced
# 3. Many-to-many needs a link table with two foreign keys
# 4. Always create parent records before children (user before post)
# 5. Use .join() for efficient multi-table queries (avoid N+1)
# 6. Use func.count/avg/sum for aggregation at the DB level
# 7. Pagination = .offset() + .limit() — never load all rows
# 8. Push search/filter/sort to the database — not Python loops
# "Data is the new oil, but only if you can query it." — Clive Humby
