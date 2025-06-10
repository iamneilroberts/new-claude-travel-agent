import { getAmadeusClient } from './amadeus-client';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  adults?: number;
  returnDate?: string;
  travelClass?: string;
}

export async function searchFlights(params: FlightSearchParams, env: Env): Promise<string> {
  try {
    const amadeus = await getAmadeusClient(env);

    // Build request parameters
    const requestParams: any = {
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.date,
      adults: params.adults || 1,
      max: 10,
      currencyCode: 'USD'
    };

    // Add optional parameters
    if (params.returnDate) {
      requestParams.returnDate = params.returnDate;
    }

    if (params.travelClass) {
      requestParams.travelClass = params.travelClass.toUpperCase();
    }

    // Make API request using the correct v2 endpoint
    const response = await amadeus.get('/v2/shopping/flight-offers', requestParams);

    // Format results
    return formatFlightResults(response.data);
  } catch (error: any) {
    console.error('Error searching flights:', error);

    if (error.message?.includes('Authentication failed')) {
      throw new Error('Authentication failed. Please check your Amadeus API credentials.');
    }

    throw new Error(`Failed to search flights: ${error.message}`);
  }
}

function formatFlightResults(data: any[]): string {
  if (!data || data.length === 0) {
    return 'No flights found matching your criteria.';
  }

  try {
    const flights = data.map((offer, index) => {
      const price = offer.price ? `${offer.price.total} ${offer.price.currency}` : 'Price unavailable';

      const segments = offer.itineraries[0].segments.map((segment: any) => {
        const departure = `${segment.departure.iataCode} at ${formatDateTime(segment.departure.at)}`;
        const arrival = `${segment.arrival.iataCode} at ${formatDateTime(segment.arrival.at)}`;
        const airline = segment.carrierCode || 'Unknown';
        const flightNumber = segment.number || 'N/A';

        return `Flight ${airline}${flightNumber}: ${departure} → ${arrival}`;
      });

      return `${index + 1}. Price: ${price}\n   ${segments.join('\n   ')}`;
    });

    const origin = data[0].itineraries[0].segments[0].departure.iataCode;
    const destination = data[0].itineraries[0].segments[data[0].itineraries[0].segments.length - 1].arrival.iataCode;

    return `Found ${flights.length} flights from ${origin} to ${destination}:\n\n${flights.join('\n\n')}`;
  } catch (error) {
    console.error('Error formatting flight results:', error);
    return 'Error formatting flight results. Raw data may be in an unexpected format.';
  }
}

function formatDateTime(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
