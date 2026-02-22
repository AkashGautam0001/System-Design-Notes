// ============================================================
//  PACKAGE store — User Store (SQLite)
// ============================================================
//  WHY: The UserStore handles all database operations for user
//  accounts. During Big Billion Days, millions of users register
//  and log in. The store ensures email uniqueness at the database
//  level (UNIQUE constraint) so that even under heavy concurrent
//  registrations, no two users share an email.
//
//  This is a simplified version of the user store from Ch 34
//  (Dwarpal), adapted for the BazaarAPI context with a role field.
// ============================================================

package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"bazaarapi/internal/model"
)

// ──────────────────────────────────────────────────────────────
// UserStore — repository for user data.
// WHY *sql.DB and not *sql.Conn? Because sql.DB is a connection
// pool. It manages multiple connections, handles retries, and is
// safe for concurrent use. A single *sql.Conn would be a
// bottleneck during Big Billion Days traffic.
// ──────────────────────────────────────────────────────────────

// UserStore handles user persistence in SQLite.
type UserStore struct {
	db *sql.DB
}

// NewUserStore creates the users table and returns a UserStore.
// WHY create table at startup? This is the "migration on boot" pattern.
// For small projects, it avoids the complexity of migration tools. For
// production at Flipkart scale, you would use a dedicated migration system.
func NewUserStore(db *sql.DB) (*UserStore, error) {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		email       TEXT    NOT NULL UNIQUE,
		password_hash TEXT  NOT NULL,
		name        TEXT    NOT NULL,
		role        TEXT    NOT NULL DEFAULT 'user',
		created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	`
	// WHY ExecContext? Every database operation should accept a context
	// so that request cancellations propagate down to the DB layer.
	if _, err := db.ExecContext(context.Background(), query); err != nil {
		return nil, fmt.Errorf("create users table: %w", err)
	}

	return &UserStore{db: db}, nil
}

// ──────────────────────────────────────────────────────────────
// Create inserts a new user and returns the created record.
// WHY return the full user? So the handler can build the response
// without a second query. The RETURNING clause is not available in
// all SQLite versions, so we use LastInsertId instead.
// ──────────────────────────────────────────────────────────────

// Create inserts a new user into the database.
func (s *UserStore) Create(ctx context.Context, email, passwordHash, name string) (*model.User, error) {
	now := time.Now().UTC()
	result, err := s.db.ExecContext(ctx,
		`INSERT INTO users (email, password_hash, name, role, created_at)
		 VALUES (?, ?, ?, 'user', ?)`,
		email, passwordHash, name, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("get last insert id: %w", err)
	}

	return &model.User{
		ID:        id,
		Email:     email,
		Name:      name,
		Role:      "user",
		CreatedAt: now,
	}, nil
}

// ──────────────────────────────────────────────────────────────
// GetByEmail retrieves a user by email address.
// WHY this method? Login requires looking up users by email to
// verify their password. The UNIQUE index on email makes this
// query efficient — O(log n) even with millions of users.
// ──────────────────────────────────────────────────────────────

// GetByEmail finds a user by their email address.
func (s *UserStore) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	user := &model.User{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, name, role, created_at
		 FROM users WHERE email = ?`, email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query user by email: %w", err)
	}
	return user, nil
}

// ──────────────────────────────────────────────────────────────
// GetByID retrieves a user by their primary key.
// WHY this method? The JWT middleware extracts user_id from the
// token. We need GetByID to load the full user profile when
// the /api/profile endpoint is hit.
// ──────────────────────────────────────────────────────────────

// GetByID finds a user by their ID.
func (s *UserStore) GetByID(ctx context.Context, id int64) (*model.User, error) {
	user := &model.User{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, name, role, created_at
		 FROM users WHERE id = ?`, id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query user by id: %w", err)
	}
	return user, nil
}
