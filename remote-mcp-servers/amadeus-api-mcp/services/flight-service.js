import { getAmadeusClient } from './amadeus-client.js';

export async function searchFlights(params, env) {
  try {
    const amadeus = await getAmadeusClient(env);
    
    // Build request parameters
    const requestParams = {
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
    
    // Make API request using the correct endpoint
    const response = await amadeus.get('/v2/shopping/flight-offers', requestParams);
    
    // Format results
    return formatFlightResults(response.data);
  } catch (error) {
    console.error('Error searching flights:', error);
    
    if (error.message?.includes('Authentication failed')) {
      throw new Error('Authentication failed. Please check your Amadeus API credentials.');
    }
    
    if (error.message?.includes('Invalid API call as no apiproduct match found')) {
      throw new Error('API subscription error: Your Amadeus API account does not have access to the Flight Offers Search API. Please check your Amadeus API subscription and ensure you have access to the required endpoints.');
    }
    
    if (error.message?.includes('keymanagement.service.InvalidAPICallAsNoApiProductMatchFound')) {
      throw new Error('API configuration error: The Flight Offers Search API is not available in your current Amadeus API subscription. You may need to upgrade your plan or contact Amadeus support to enable this endpoint.');
    }
    
    throw new Error(`Failed to search flights: ${error.message}`);
  }
}

function formatFlightResults(data) {
  if (!data || data.length === 0) {
    return 'No flights found matching your criteria.';
  }
  
  try {
    const flights = data.map((offer, index) => {
      const price = offer.price ? `${offer.price.total} ${offer.price.currency}` : 'Price unavailable';
      
      const segments = offer.itineraries[0].segments.map((segment) => {
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

function formatDateTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}