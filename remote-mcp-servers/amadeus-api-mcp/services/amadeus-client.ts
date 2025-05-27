import { AmadeusFetchClient } from './amadeus-fetch';
import { Env } from '../index';

let amadeusInstance: AmadeusFetchClient | null = null;

/**
 * Creates and returns a singleton Amadeus client instance
 * Uses custom fetch implementation for Cloudflare Workers
 */
export async function getAmadeusClient(env: Env): Promise<AmadeusFetchClient> {
  if (!amadeusInstance) {
    if (!env.AMADEUS_API_KEY || !env.AMADEUS_API_SECRET) {
      throw new Error('Amadeus API credentials not configured');
    }

    amadeusInstance = new AmadeusFetchClient(
      env.AMADEUS_API_KEY,
      env.AMADEUS_API_SECRET,
      env.CACHE
    );
  }

  return amadeusInstance;
}
