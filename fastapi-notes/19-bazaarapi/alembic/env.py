# ============================================================
# BazaarAPI — Alembic Environment Configuration
# ============================================================
# This file is used by Alembic for database migrations.
# It's configured to work with SQLModel's metadata so that
# Alembic can auto-detect schema changes.
#
# Usage:
#   alembic revision --autogenerate -m "add phone to users"
#   alembic upgrade head
#   alembic downgrade -1
# ============================================================

import sys
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

# Add parent directory to path so we can import our models
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import all models so SQLModel metadata knows about them
from users.models import User  # noqa: F401
from categories.models import Category  # noqa: F401
from products.models import Product  # noqa: F401
from cart.models import CartItem  # noqa: F401
from orders.models import Order, OrderItem  # noqa: F401
from payments.models import Payment  # noqa: F401
from config import settings

# Alembic Config object
config = context.config

# Set the database URL from our settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Setup logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# SQLModel metadata for autogenerate support
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    Generates SQL scripts without connecting to the database.
    Useful for reviewing migration SQL before applying.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    Connects to the database and applies migrations directly.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
