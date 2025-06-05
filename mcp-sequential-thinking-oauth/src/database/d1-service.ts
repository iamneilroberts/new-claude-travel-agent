import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Centralized database connection management for D1
export function getDatabase(env: any): D1Database {
  if (!env.DB) {
    throw new Error('D1 database not available. Make sure DB binding is configured in wrangler.jsonc');
  }
  return env.DB;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  name: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface OAuthApplication {
  id: string;
  name: string;
  uid: string; // client_id
  secret: string;
  redirect_uri: string;
  scopes: string;
  client_uri?: string;
  logo_uri?: string;
  tos_uri?: string;
  policy_uri?: string;
  contacts?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOAuthApplicationData {
  client_name: string;
  redirect_uris: string[];
  client_uri?: string;
  logo_uri?: string;
  tos_uri?: string;
  policy_uri?: string;
  contacts?: string[];
  scope?: string;
}

export interface OAuthAccessGrant {
  id: string;
  application_id: string;
  user_id: string;
  token: string;
  token_type: string;
  redirect_uri?: string;
  scopes: string;
  code_challenge?: string;
  code_challenge_method?: string;
  expires_at: string;
  revoked_at?: string;
  created_at: string;
}

export interface CreateOAuthGrantData {
  applicationId: string;
  userId: string;
  token: string;
  tokenType: string;
  redirectUri?: string;
  scopes: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: Date;
}

export interface OAuthAccessToken {
  id: string;
  application_id: string;
  user_id: string;
  token: string;
  refresh_token?: string;
  scopes: string;
  expires_at: string;
  revoked_at?: string;
  created_at: string;
}

export interface CreateOAuthTokenData {
  applicationId: string;
  userId: string;
  token: string;
  refreshToken?: string;
  scopes: string;
  expiresAt: Date;
}

export class D1DatabaseService {
  private db: D1Database;

  constructor(env: any) {
    this.db = getDatabase(env);
  }

  // Helper to generate IDs
  private generateId(): string {
    return crypto.randomUUID();
  }

  // Helper to format date for D1
  private formatDate(date: Date): string {
    return date.toISOString();
  }

  // Helper to parse date from D1
  private parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  // User management
  async createUser(userData: CreateUserData): Promise<User> {
    const id = this.generateId();
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const now = this.formatDate(new Date());

    const result = await this.db.prepare(`
      INSERT INTO users (id, username, email, name, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      id,
      userData.username,
      userData.email,
      userData.name,
      passwordHash,
      now,
      now
    ).first();

    if (!result) {
      throw new Error('Failed to create user');
    }

    return result as User;
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first();

    return result as User | null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE username = ?
    `).bind(username).first();

    return result as User | null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).bind(email).first();

    return result as User | null;
  }

  async validateUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  }

  // OAuth Application management
  async findOrCreateOAuthApplication(name: string, data: CreateOAuthApplicationData): Promise<OAuthApplication> {
    // First try to find existing application
    const existing = await this.db.prepare(`
      SELECT * FROM oauth_applications WHERE name = ?
    `).bind(name).first() as OAuthApplication | null;

    if (existing) {
      // Update existing application
      const redirectUri = data.redirect_uris.join('\n');
      const scopes = (data.scope || 'read') + ' read';
      const contacts = data.contacts ? JSON.stringify(data.contacts) : null;
      const now = this.formatDate(new Date());

      const result = await this.db.prepare(`
        UPDATE oauth_applications 
        SET redirect_uri = ?, scopes = ?, client_uri = ?, logo_uri = ?, 
            tos_uri = ?, policy_uri = ?, contacts = ?, updated_at = ?
        WHERE name = ?
        RETURNING *
      `).bind(
        redirectUri,
        scopes,
        data.client_uri || null,
        data.logo_uri || null,
        data.tos_uri || null,
        data.policy_uri || null,
        contacts,
        now,
        name
      ).first();

      return result as OAuthApplication;
    } else {
      // Create new application
      const id = this.generateId();
      const uid = crypto.randomBytes(16).toString('hex');
      const secret = crypto.randomBytes(32).toString('hex');
      const redirectUri = data.redirect_uris.join('\n');
      const scopes = (data.scope || 'read') + ' read';
      const contacts = data.contacts ? JSON.stringify(data.contacts) : null;
      const now = this.formatDate(new Date());

      const result = await this.db.prepare(`
        INSERT INTO oauth_applications (
          id, name, uid, secret, redirect_uri, scopes, client_uri, logo_uri,
          tos_uri, policy_uri, contacts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `).bind(
        id, name, uid, secret, redirectUri, scopes,
        data.client_uri || null,
        data.logo_uri || null,
        data.tos_uri || null,
        data.policy_uri || null,
        contacts,
        now,
        now
      ).first();

      return result as OAuthApplication;
    }
  }

  async getOAuthApplicationById(id: string): Promise<OAuthApplication | null> {
    const result = await this.db.prepare(`
      SELECT * FROM oauth_applications WHERE id = ?
    `).bind(id).first();

    return result as OAuthApplication | null;
  }

  async getOAuthApplicationByClientId(clientId: string): Promise<OAuthApplication | null> {
    const result = await this.db.prepare(`
      SELECT * FROM oauth_applications WHERE uid = ?
    `).bind(clientId).first();

    return result as OAuthApplication | null;
  }

  async listOAuthApplications(): Promise<OAuthApplication[]> {
    const result = await this.db.prepare(`
      SELECT * FROM oauth_applications ORDER BY created_at DESC
    `).all();

    return result.results as OAuthApplication[];
  }

  // OAuth Grant management
  async createOAuthGrant(grantData: CreateOAuthGrantData): Promise<OAuthAccessGrant> {
    const id = this.generateId();
    const now = this.formatDate(new Date());
    const expiresAt = this.formatDate(grantData.expiresAt);

    const result = await this.db.prepare(`
      INSERT INTO oauth_access_grants (
        id, application_id, user_id, token, token_type, redirect_uri,
        scopes, code_challenge, code_challenge_method, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      id,
      grantData.applicationId,
      grantData.userId,
      grantData.token,
      grantData.tokenType,
      grantData.redirectUri || null,
      grantData.scopes,
      grantData.codeChallenge || null,
      grantData.codeChallengeMethod || null,
      expiresAt,
      now
    ).first();

    return result as OAuthAccessGrant;
  }

  async findOAuthAccessGrantByToken(token: string): Promise<OAuthAccessGrant | null> {
    const result = await this.db.prepare(`
      SELECT * FROM oauth_access_grants WHERE token = ? AND revoked_at IS NULL
    `).bind(token).first();

    return result as OAuthAccessGrant | null;
  }

  async revokeOAuthGrant(grantId: string): Promise<boolean> {
    const now = this.formatDate(new Date());
    
    const result = await this.db.prepare(`
      UPDATE oauth_access_grants SET revoked_at = ? WHERE id = ?
    `).bind(now, grantId).run();

    return result.success;
  }

  // OAuth Token management
  async createOAuthAccessToken(tokenData: CreateOAuthTokenData): Promise<OAuthAccessToken> {
    const id = this.generateId();
    const now = this.formatDate(new Date());
    const expiresAt = this.formatDate(tokenData.expiresAt);

    const result = await this.db.prepare(`
      INSERT INTO oauth_access_tokens (
        id, application_id, user_id, token, refresh_token, scopes, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      id,
      tokenData.applicationId,
      tokenData.userId,
      tokenData.token,
      tokenData.refreshToken || null,
      tokenData.scopes,
      expiresAt,
      now
    ).first();

    return result as OAuthAccessToken;
  }

  async findOAuthAccessTokenByToken(token: string): Promise<OAuthAccessToken | null> {
    const result = await this.db.prepare(`
      SELECT * FROM oauth_access_tokens WHERE token = ? AND revoked_at IS NULL
    `).bind(token).first();

    return result as OAuthAccessToken | null;
  }

  async findOAuthAccessTokenByRefreshToken(refreshToken: string): Promise<OAuthAccessToken | null> {
    const result = await this.db.prepare(`
      SELECT * FROM oauth_access_tokens WHERE refresh_token = ? AND revoked_at IS NULL
    `).bind(refreshToken).first();

    return result as OAuthAccessToken | null;
  }

  async revokeOAuthAccessToken(tokenId: string): Promise<boolean> {
    const now = this.formatDate(new Date());
    
    const result = await this.db.prepare(`
      UPDATE oauth_access_tokens SET revoked_at = ? WHERE id = ?
    `).bind(now, tokenId).run();

    return result.success;
  }
}