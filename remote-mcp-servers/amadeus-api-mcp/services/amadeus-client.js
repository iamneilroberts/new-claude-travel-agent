// Amadeus API client for Cloudflare Workers

let amadeusInstance = null;

/**
 * Amadeus API client using fetch
 */
export class AmadeusAPI {
  constructor(apiKey, apiSecret, cache) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = 'https://api.amadeus.com';
    this.tokenUrl = 'https://api.amadeus.com/v1/security/oauth2/token';
    this.cache = cache;
  }

  async getAccessToken() {
    // Check cache first
    const cached = await this.cache?.get('amadeus_token');
    if (cached) {
      const { token, expires } = JSON.parse(cached);
      if (Date.now() < expires) {
        return token;
      }
    }

    // Get new token
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: this.apiSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.access_token;
    const expires = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

    // Cache the token
    await this.cache?.put('amadeus_token', JSON.stringify({ token, expires }));

    return token;
  }

  async request(endpoint, params = {}) {
    const token = await this.getAccessToken();
    const url = new URL(`${this.baseUrl}${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Amadeus API error (${response.status}): ${errorText}`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.fault) {
          errorMessage = `Amadeus API error (${response.status}): ${errorJson.fault.faultstring}`;
          if (errorJson.fault.detail?.errorcode) {
            errorMessage += ` [${errorJson.fault.detail.errorcode}]`;
          }
        } else if (errorJson.errors && errorJson.errors.length > 0) {
          const errors = errorJson.errors.map(err => `${err.title}: ${err.detail}`).join('; ');
          errorMessage = `Amadeus API error (${response.status}): ${errors}`;
        }
      } catch (parseError) {
        // If parsing fails, stick with the original error text
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  async get(endpoint, params = {}) {
    return this.request(endpoint, params);
  }
}

/**
 * Creates and returns a singleton Amadeus client instance
 */
export async function getAmadeusClient(env) {
  if (!amadeusInstance) {
    if (!env.AMADEUS_API_KEY || !env.AMADEUS_API_SECRET) {
      throw new Error('Amadeus API credentials not configured');
    }

    amadeusInstance = new AmadeusAPI(
      env.AMADEUS_API_KEY,
      env.AMADEUS_API_SECRET,
      env.CACHE
    );
  }

  return amadeusInstance;
}
