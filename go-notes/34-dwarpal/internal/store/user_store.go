// ============================================================
//  Package store — SQLite Persistence Layer
// ============================================================
//  This package owns all database interactions. No SQL leaks
//  into handlers or middleware — everything goes through the
//  UserStore methods.
//
//  WHY THIS SEPARATION?
//  If Zerodha decides to migrate from SQLite to PostgreSQL
//  tomorrow, only this file changes. Handlers keep calling
//  store.Create(), store.GetByEmail(), etc. — they don't care
//  whether the data lives in SQLite, Postgres, or a stone tablet.
//
//  We use modernc.org/sqlite — a pure-Go SQLite implementation.
//  No CGO, no C compiler, no shared libraries. It compiles
//  cleanly on any platform Go supports.
// ============================================================

package store

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite" // SQLite driver — blank import registers it

	"dwarpal/internal/model"
)

// UserStore wraps the database connection and provides typed
// methods for all user and token operations.
type UserStore struct {
	db *sql.DB
}

// ──────────────────────────────────────────────────────────────
// NewUserStore opens the SQLite database and creates tables
// ──────────────────────────────────────────────────────────────
// WHY create tables here? For a self-contained learning project,
// auto-migration on startup is simpler than maintaining separate
// migration files. In production, you'd use a migration tool
// like goose or golang-migrate.

func NewUserStore(dbPath string) (*UserStore, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Enable WAL mode for better concurrent read performance
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, fmt.Errorf("enable WAL mode: %w", err)
	}

	// ──────────────────────────────────────────────────────────────
	// Users table — the trader registry
	// ──────────────────────────────────────────────────────────────
	// UNIQUE on email prevents duplicate registrations.
	// DEFAULT 'trader' ensures new accounts get the basic role.
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		email         TEXT    NOT NULL UNIQUE,
		password_hash TEXT    NOT NULL,
		role          TEXT    NOT NULL DEFAULT 'trader',
		created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(usersTable); err != nil {
		return nil, fmt.Errorf("create users table: %w", err)
	}

	// ──────────────────────────────────────────────────────────────
	// Refresh tokens table — tracks issued refresh tokens
	// ──────────────────────────────────────────────────────────────
	// WHY store token_hash and not the raw token?
	// Same reason we hash passwords: if the DB is compromised,
	// attackers cannot use the hashed values to forge sessions.
	// The "revoked" column supports token rotation — once used,
	// a refresh token is revoked so it cannot be replayed.
	refreshTable := `
	CREATE TABLE IF NOT EXISTS refresh_tokens (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id    INTEGER  NOT NULL,
		token_hash TEXT     NOT NULL,
		expires_at DATETIME NOT NULL,
		revoked    BOOLEAN  NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	if _, err := db.Exec(refreshTable); err != nil {
		return nil, fmt.Errorf("create refresh_tokens table: %w", err)
	}

	return &UserStore{db: db}, nil
}

// Close shuts down the database connection.
func (s *UserStore) Close() error {
	return s.db.Close()
}

// ──────────────────────────────────────────────────────────────
// User CRUD operations
// ──────────────────────────────────────────────────────────────

// Create inserts a new user and returns the created record.
// The caller is responsible for hashing the password before
// passing it as passwordHash — the store never sees plain text.
func (s *UserStore) Create(email, passwordHash, role string) (*model.User, error) {
	now := time.Now()

	result, err := s.db.Exec(
		"INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
		email, passwordHash, role, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("get last insert id: %w", err)
	}

	return &model.User{
		ID:           id,
		Email:        email,
		PasswordHash: passwordHash,
		Role:         role,
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}

// GetByEmail finds a user by their email address.
// Returns nil, nil if no user is found — callers should check
// for a nil user without treating it as an error.
func (s *UserStore) GetByEmail(email string) (*model.User, error) {
	var u model.User
	err := s.db.QueryRow(
		"SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = ?",
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil // Not found is not an error
	}
	if err != nil {
		return nil, fmt.Errorf("query user by email: %w", err)
	}
	return &u, nil
}

// GetByID finds a user by their numeric ID.
func (s *UserStore) GetByID(id int64) (*model.User, error) {
	var u model.User
	err := s.db.QueryRow(
		"SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = ?",
		id,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query user by id: %w", err)
	}
	return &u, nil
}

// GetAll returns every user in the system. This is an admin-only
// operation — in production you'd add pagination.
func (s *UserStore) GetAll() ([]model.User, error) {
	rows, err := s.db.Query(
		"SELECT id, email, password_hash, role, created_at, updated_at FROM users ORDER BY created_at DESC",
	)
	if err != nil {
		return nil, fmt.Errorf("query all users: %w", err)
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan user row: %w", err)
		}
		users = append(users, u)
	}

	return users, rows.Err()
}

// ──────────────────────────────────────────────────────────────
// Refresh token operations
// ──────────────────────────────────────────────────────────────

// StoreRefreshToken saves a hashed refresh token to the database.
func (s *UserStore) StoreRefreshToken(userID int64, tokenHash string, expiresAt time.Time) error {
	_, err := s.db.Exec(
		"INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
		userID, tokenHash, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("store refresh token: %w", err)
	}
	return nil
}

// GetRefreshToken looks up a refresh token by its hash.
// Returns the user_id, expiry, and revoked status.
func (s *UserStore) GetRefreshToken(tokenHash string) (userID int64, expiresAt time.Time, revoked bool, err error) {
	err = s.db.QueryRow(
		"SELECT user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = ?",
		tokenHash,
	).Scan(&userID, &expiresAt, &revoked)

	if err == sql.ErrNoRows {
		return 0, time.Time{}, false, fmt.Errorf("refresh token not found")
	}
	if err != nil {
		return 0, time.Time{}, false, fmt.Errorf("query refresh token: %w", err)
	}
	return userID, expiresAt, revoked, nil
}

// RevokeRefreshToken marks a refresh token as revoked so it
// cannot be used again. This is the key to token rotation —
// each refresh token is single-use.
func (s *UserStore) RevokeRefreshToken(tokenHash string) error {
	_, err := s.db.Exec(
		"UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?",
		tokenHash,
	)
	if err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}
	return nil
}
