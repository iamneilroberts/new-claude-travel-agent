// Custom HTTP implementation for Amadeus that uses fetch instead of XMLHttpRequest
export class AmadeusFetchClient {
  private baseURL = 'https://api.amadeus.com';
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private cache?: KVNamespace
  ) {}

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken as string;
    }

    // Check KV cache
    if (this.cache) {
      const cached: any = await this.cache.get('amadeus_token', 'json');
      if (cached && cached.expires_at > Date.now()) {
        this.accessToken = cached.access_token;
        this.tokenExpiry = cached.expires_at;
        return this.accessToken as string;
      }
    }

    // Get new token
    const tokenEndpoint = 'https://api.amadeus.com/v1/security/oauth2/token';
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Subtract 1 minute for safety

    // Cache the token
    if (this.cache) {
      await this.cache.put('amadeus_token', JSON.stringify({
        access_token: this.accessToken,
        expires_at: this.tokenExpiry
      }), {
        expirationTtl: Math.floor((this.tokenExpiry - Date.now()) / 1000)
      });
    }

    return this.accessToken as string;
  }

  async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const token = await this.getAccessToken();

    // Determine the base URL based on the endpoint
    let baseURL = this.baseURL;
    if (endpoint.startsWith('/')) {
      // If endpoint starts with slash, use it directly
      baseURL = this.baseURL + endpoint;
    } else {
      // Add v1 if no version specified
      baseURL = this.baseURL + '/v1/' + endpoint;
    }

    const url = new URL(baseURL);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errorMessage = data.errors?.[0]?.detail || `API error: ${response.statusText}`;
      const error = new Error(errorMessage);
      (error as any).response = data;
      throw error;
    }

    return data;
  }

  async post(endpoint: string, body: any = {}): Promise<any> {
    const token = await this.getAccessToken();

    // Determine the base URL based on the endpoint
    let baseURL = this.baseURL;
    if (endpoint.startsWith('/')) {
      // If endpoint starts with slash, use it directly
      baseURL = this.baseURL + endpoint;
    } else {
      // Add v1 if no version specified
      baseURL = this.baseURL + '/v1/' + endpoint;
    }

    const response = await fetch(baseURL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errorMessage = data.errors?.[0]?.detail || `API error: ${response.statusText}`;
      const error = new Error(errorMessage);
      (error as any).response = data;
      throw error;
    }

    return data;
  }
}
