# ============================================================
# BazaarAPI — Category Services (Business Logic)
# ============================================================

from typing import Optional, List

from sqlmodel import Session, select

from categories.models import Category, CategoryCreate, CategoryUpdate


def get_all_categories(
    session: Session,
    include_inactive: bool = False,
) -> List[Category]:
    """
    Fetch all categories.

    Public users see only active categories.
    Admins can optionally include inactive ones.
    """
    statement = select(Category)
    if not include_inactive:
        statement = statement.where(Category.is_active == True)  # noqa: E712
    return list(session.exec(statement).all())


def get_category_by_id(session: Session, category_id: int) -> Optional[Category]:
    """Fetch a single category by ID."""
    return session.get(Category, category_id)


def get_category_by_slug(session: Session, slug: str) -> Optional[Category]:
    """Fetch a single category by slug."""
    return session.exec(select(Category).where(Category.slug == slug)).first()


def create_category(session: Session, data: CategoryCreate) -> Category:
    """Create a new category."""
    category = Category(
        name=data.name,
        description=data.description,
        slug=data.slug,
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def update_category(
    session: Session,
    category: Category,
    updates: CategoryUpdate,
) -> Category:
    """Update an existing category with provided fields."""
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def delete_category(session: Session, category: Category) -> None:
    """
    Soft-delete a category by marking it inactive.

    We don't hard-delete because products may reference it.
    """
    category.is_active = False
    session.add(category)
    session.commit()
