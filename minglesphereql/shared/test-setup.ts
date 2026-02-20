import pg from 'pg';
import 'dotenv/config';

export async function setup() {
  const mainPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minglesphereql',
  });

  try {
    // Create test database if it doesn't exist
    const result = await mainPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'minglesphereql_test'"
    );

    if (result.rowCount === 0) {
      await mainPool.query('CREATE DATABASE minglesphereql_test');
    }
  } catch (err: any) {
    // Database might already exist, that's fine
    if (err.code !== '42P04') {
      console.error('Error creating test database:', err.message);
    }
  } finally {
    await mainPool.end();
  }

  // Connect to test database and set up schema
  const testPool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minglesphereql_test',
  });

  try {
    // Enable extensions
    await testPool.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    await testPool.query('CREATE EXTENSION IF NOT EXISTS "vector"');

    // Try to enable PostGIS (may not be available in all environments)
    try {
      await testPool.query('CREATE EXTENSION IF NOT EXISTS "postgis"');
    } catch {
      console.warn('PostGIS extension not available - spatial tests will be skipped');
    }

    // Create enums (IF NOT EXISTS)
    const enums = [
      "DO $$ BEGIN CREATE TYPE user_status AS ENUM ('online', 'offline', 'away', 'busy'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
      "DO $$ BEGIN CREATE TYPE post_type AS ENUM ('text', 'image', 'video'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
      "DO $$ BEGIN CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
      "DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('like', 'comment', 'friend_request', 'mention', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
      "DO $$ BEGIN CREATE TYPE report_target_type AS ENUM ('user', 'post', 'comment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
      "DO $$ BEGIN CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
      "DO $$ BEGIN CREATE TYPE location_category AS ENUM ('city', 'landmark', 'venue', 'event', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    ];

    for (const enumSql of enums) {
      await testPool.query(enumSql);
    }

    // Create tables
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(100),
        bio TEXT,
        avatar_url VARCHAR(500),
        status user_status DEFAULT 'offline',
        location geometry(Point, 4326),
        embedding vector(384),
        metadata JSONB,
        is_verified BOOLEAN DEFAULT false,
        post_count INTEGER DEFAULT 0,
        follower_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type post_type NOT NULL DEFAULT 'text',
        media_url VARCHAR(500),
        likes_count INTEGER NOT NULL DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        posts_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status friend_request_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type notification_type NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        read_at TIMESTAMPTZ,
        reference_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL UNIQUE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type report_target_type NOT NULL,
        target_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status report_status NOT NULL DEFAULT 'pending',
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await testPool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        coordinates geometry(Point, 4326),
        radius REAL,
        category location_category DEFAULT 'other',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await testPool.query('CREATE INDEX IF NOT EXISTS users_username_idx ON users(username)');
    await testPool.query('CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)');
    await testPool.query('CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at)');
    await testPool.query('CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at)');
    await testPool.query('CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS comments_author_id_idx ON comments(author_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS friend_requests_sender_id_idx ON friend_requests(sender_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS friend_requests_receiver_id_idx ON friend_requests(receiver_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON messages(receiver_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)');
    await testPool.query('CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token)');
    await testPool.query('CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON reports(reporter_id)');

  } finally {
    await testPool.end();
  }
}

export async function teardown() {
  // No-op: keep the test database for inspection
  // Drop it manually if needed: DROP DATABASE minglesphereql_test
}
