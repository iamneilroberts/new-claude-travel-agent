-- OAuth MCP Server Database Schema for Cloudflare D1

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Applications table
CREATE TABLE IF NOT EXISTS oauth_applications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    uid TEXT UNIQUE NOT NULL, -- client_id
    secret TEXT NOT NULL,     -- client_secret
    redirect_uri TEXT NOT NULL,
    scopes TEXT DEFAULT 'read',
    client_uri TEXT,
    logo_uri TEXT,
    tos_uri TEXT,
    policy_uri TEXT,
    contacts TEXT, -- JSON array of contact emails
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Access Grants (authorization codes)
CREATE TABLE IF NOT EXISTS oauth_access_grants (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    token_type TEXT NOT NULL DEFAULT 'authorization_code',
    redirect_uri TEXT,
    scopes TEXT DEFAULT 'read',
    code_challenge TEXT,
    code_challenge_method TEXT,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES oauth_applications(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- OAuth Access Tokens
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    scopes TEXT DEFAULT 'read',
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES oauth_applications(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_applications_uid ON oauth_applications(uid);
CREATE INDEX IF NOT EXISTS idx_oauth_access_grants_token ON oauth_access_grants(token);
CREATE INDEX IF NOT EXISTS idx_oauth_access_grants_application_user ON oauth_access_grants(application_id, user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_token ON oauth_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_refresh_token ON oauth_access_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_application_user ON oauth_access_tokens(application_id, user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);