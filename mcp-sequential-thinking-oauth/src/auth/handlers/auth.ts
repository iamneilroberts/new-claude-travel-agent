import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { CreateUserData, D1DatabaseService, LoginData } from "../../database";
import { loginPageHTML, registerPageHTML } from "../views";
import { getCurrentUser } from "../middleware/session";

const authApp = new Hono<{ Bindings: Env }>();

// Helper function to create session token
async function createSessionToken(user: any, jwtSecret: string): Promise<string> {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  };
  
  return await sign(payload, jwtSecret);
}

// Login page
authApp.get("/login", async (c) => {
  return c.html(loginPageHTML);
});

// Register page
authApp.get("/register", async (c) => {
  return c.html(registerPageHTML);
});

// Login endpoint
authApp.post("/login", async (c) => {
  try {
    const body = await c.req.json() as LoginData & { state?: string };
    const { username, password, state } = body;

    if (!username || !password) {
      return c.json({ message: "Username and password are required" }, 400);
    }

    const db = new D1DatabaseService(c.env);
  
    try {
      // Validate user credentials
      const user = await db.validateUserCredentials(username, password);
      if (!user) {
        return c.json({ message: "Invalid username or password" }, 401);
      }

      // Handle OAuth flow if state is provided
      if (state) {
        let oauthReqInfo;
        try {
          oauthReqInfo = JSON.parse(atob(state)) as any;
        } catch (error) {
          return c.json({ message: "Invalid state parameter" }, 400);
        }

        if (!oauthReqInfo.clientId) {
          return c.json({ message: "Invalid state - missing client ID" }, 400);
        }

        // Create session token
        const sessionToken = await createSessionToken(user, c.env.JWT_SECRET);
        
        // Set secure session cookie
        setCookie(c, 'session', sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/'
        });

        // Redirect back to OAuth authorization endpoint to show consent screen
        const authUrl = new URL("/oauth/authorize", c.req.url);
        authUrl.searchParams.set('client_id', oauthReqInfo.clientId);
        authUrl.searchParams.set('redirect_uri', oauthReqInfo.redirectUri);
        authUrl.searchParams.set('response_type', oauthReqInfo.responseType);
        if (oauthReqInfo.scope && oauthReqInfo.scope.length > 0) {
          authUrl.searchParams.set('scope', Array.isArray(oauthReqInfo.scope) ? oauthReqInfo.scope.join(' ') : oauthReqInfo.scope);
        }
        if (oauthReqInfo.state) {
          authUrl.searchParams.set('state', oauthReqInfo.state);
        }
        if (oauthReqInfo.codeChallenge) {
          authUrl.searchParams.set('code_challenge', oauthReqInfo.codeChallenge);
        }
        if (oauthReqInfo.codeChallengeMethod) {
          authUrl.searchParams.set('code_challenge_method', oauthReqInfo.codeChallengeMethod);
        }

        return c.json({ redirectTo: authUrl.href });
      } else {
        // Direct login without OAuth - create session and set cookie
        try {
          // Create session token
          const sessionToken = await createSessionToken(user, c.env.JWT_SECRET);
          
          // Set secure session cookie
          setCookie(c, 'session', sessionToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/'
          });

          return c.json({ 
            redirectTo: "/", // Redirect to home page
            message: "Login successful",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              name: user.name
            }
          });
        } catch (error) {
          console.error("Session token creation error:", error);
          return c.json({ message: "Failed to create session" }, 500);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  } catch (error) {
    console.error("Outer login error:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Register endpoint
authApp.post("/register", async (c) => {
  try {
    const body = await c.req.json() as CreateUserData;
    const { username, email, name, password } = body;

    if (!username || !email || !name || !password) {
      return c.json({ message: "All fields are required" }, 400);
    }

    if (password.length < 6) {
      return c.json({ message: "Password must be at least 6 characters long" }, 400);
    }

    const db = new D1DatabaseService(c.env);
  
    try {
      // Check if user already exists
      const existingUserByUsername = await db.getUserByUsername(username);
      if (existingUserByUsername) {
        return c.json({ message: "Username already exists" }, 400);
      }

      const existingUserByEmail = await db.getUserByEmail(email);
      if (existingUserByEmail) {
        return c.json({ message: "Email already exists" }, 400);
      }

      // Create user
      await db.createUser({ username, email, name, password });
      
      return c.json({ message: "User created successfully" });
    } catch (error) {
      console.error("Registration error:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  } catch (error) {
    console.error("Outer registration error:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Initialize database endpoint (for setup)
authApp.post("/init-db", async (c) => {
  try {
    return c.json({ message: "Database schema should be initialized via D1 migrations. Use 'wrangler d1 execute --file schema.sql'" });
  } catch (error) {
    console.error("Database initialization error:", error);
    return c.json({ message: "Failed to initialize database" }, 500);
  }
});

// Logout endpoint
authApp.post("/logout", async (c) => {
  try {
    // Clear session cookie
    deleteCookie(c, 'session', {
      path: '/'
    });
    
    return c.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ message: "Logout failed" }, 500);
  }
});

export { authApp };
