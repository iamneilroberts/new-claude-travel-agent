export default {
  async fetch(request, env, ctx) {
    if (request.method === 'POST') {
      // Test OAuth directly
      const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: env.AMADEUS_API_KEY || 'NOT_SET',
          client_secret: env.AMADEUS_API_SECRET || 'NOT_SET'
        })
      });

      const result = await response.text();

      return new Response(JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        hasApiKey: !!env.AMADEUS_API_KEY,
        hasApiSecret: !!env.AMADEUS_API_SECRET,
        apiKeyStart: env.AMADEUS_API_KEY?.substring(0, 5) || 'NOT_SET',
        result: result
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Send POST request to test', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
