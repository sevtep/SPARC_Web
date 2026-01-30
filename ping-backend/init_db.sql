-- Create PING database
CREATE DATABASE ping_db;

-- Create default organization
INSERT INTO organizations (name, domain, is_active, data_collection_enabled, keyboard_tracking_enabled)
VALUES ('Rowan University', 'rowan.edu', true, true, true);

-- Create platform admin user (password: admin123)
-- Note: In production, use a secure password and change immediately
INSERT INTO users (email, username, hashed_password, full_name, role, is_active, is_verified, organization_id)
VALUES (
  'admin@ping.agaii.org',
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lQvceL2Z0d8i',  -- admin123
  'Platform Admin',
  'platform_admin',
  true,
  true,
  1
);

-- Schema updates for invite system
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'classes' AND column_name = 'description'
    ) THEN
        ALTER TABLE classes ADD COLUMN description TEXT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS invite_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id),
    class_id INTEGER REFERENCES classes(id),
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invite_uses (
    id SERIAL PRIMARY KEY,
    invite_id INTEGER NOT NULL REFERENCES invite_codes(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    used_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(64),
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS class_students (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    invite_id INTEGER REFERENCES invite_codes(id),
    invited_by INTEGER REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_class_students UNIQUE (class_id, user_id)
);

CREATE TABLE IF NOT EXISTS sparc_wordgame_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    player_name VARCHAR(255) NOT NULL,
    score INTEGER DEFAULT 0,
    scene VARCHAR(255),
    played_at TIMESTAMPTZ,
    original_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sparc_game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    game_slug VARCHAR(255) NOT NULL,
    score INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
