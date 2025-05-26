import { getAmadeusClient } from './amadeus-client';
import { Env } from '../index';

export interface HotelSearchParams {
  city: string;
  check_in: string;
  check_out: string;
  adults?: number;
  radius?: number;
  ratings?: string;
  priceRange?: string;
}

export async function searchHotels(params: HotelSearchParams, env: Env): Promise<string> {
  try {
    const amadeus = await getAmadeusClient(env);
    
    // First, try to find city coordinates and IATA code
    let cityCode = '';
    let cityName = params.city;
    
    try {
      // Search for city using the locations API
      const citySearch = await amadeus.get('/v1/reference-data/locations/cities', {
        keyword: params.city,
        max: 1
      });
      
      if (citySearch.data && citySearch.data.length > 0) {
        cityCode = citySearch.data[0].iataCode;
        cityName = citySearch.data[0].name;
      }
    } catch (error) {
      console.error('City search failed:', error);
      // If city search fails, try using the input as a city code directly
      cityCode = params.city.toUpperCase();
    }
    
    // If we have a city code, search for hotels
    if (!cityCode || cityCode.length !== 3) {
      return `Could not find city "${params.city}". Please provide a valid city name or 3-letter IATA code.`;
    }
    
    // Search for hotels by city
    try {
      const hotelListResponse = await amadeus.get('/v1/reference-data/locations/hotels/by-city', {
        cityCode: cityCode,
        radius: params.radius || 5,
        radiusUnit: 'KM'
      });
      
      if (!hotelListResponse.data || hotelListResponse.data.length === 0) {
        return `No hotels found in ${cityName} (${cityCode})`;
      }
      
      // Get hotel IDs from the first 10 results
      const hotelIds = hotelListResponse.data.slice(0, 10).map((hotel: any) => hotel.hotelId);
      
      // Now search for hotel offers
      const hotelOffersResponse = await amadeus.get('/v3/shopping/hotel-offers', {
        hotelIds: hotelIds.join(','),
        checkInDate: params.check_in,
        checkOutDate: params.check_out,
        adults: params.adults || 1,
        roomQuantity: 1
      });
      
      return formatHotelResults(hotelOffersResponse.data, params);
    } catch (error: any) {
      console.error('Hotel offers search failed:', error.message);
      // Fallback to just showing hotel names if offers search fails
      try {
        const hotelListResponse = await amadeus.get('/v1/reference-data/locations/hotels/by-city', {
          cityCode: cityCode,
          radius: params.radius || 5,
          radiusUnit: 'KM'
        });
        
        return formatBasicHotelResults(hotelListResponse.data, cityName, params);
      } catch (fallbackError) {
        throw error; // Throw the original error
      }
    }
  } catch (error: any) {
    console.error('Error searching hotels:', error);
    
    if (error.message?.includes('Authentication failed')) {
      throw new Error('Authentication failed. Please check your Amadeus API credentials.');
    }
    
    throw new Error(`Failed to search hotels: ${error.message}`);
  }
}

function formatHotelResults(data: any[], params: HotelSearchParams): string {
  if (!data || data.length === 0) {
    return `No hotel offers available in ${params.city} for the specified dates.`;
  }
  
  try {
    const hotels = data.map((hotel, index) => {
      const hotelInfo = hotel.hotel;
      const offers = hotel.offers || [];
      
      const name = hotelInfo.name || 'Unknown Hotel';
      const rating = hotelInfo.rating ? `${hotelInfo.rating} stars` : 'Unrated';
      const address = hotelInfo.address 
        ? `${hotelInfo.address.lines?.join(', ') || ''}, ${hotelInfo.address.cityName || ''}`
        : 'Address not available';
      
      let priceInfo = 'Price not available';
      if (offers.length > 0) {
        const price = offers[0].price;
        priceInfo = `${price.total} ${price.currency}`;
      }
      
      return `${index + 1}. ${name} (${rating})\n   Address: ${address}\n   Price: ${priceInfo}`;
    });
    
    return `Found ${hotels.length} hotels in ${params.city} from ${params.check_in} to ${params.check_out}:\n\n${hotels.join('\n\n')}`;
  } catch (error) {
    console.error('Error formatting hotel results:', error);
    return 'Error formatting hotel results. Raw data may be in an unexpected format.';
  }
}

function formatBasicHotelResults(hotels: any[], cityName: string, params: HotelSearchParams): string {
  if (!hotels || hotels.length === 0) {
    return `No hotels found in ${cityName}`;
  }
  
  const hotelList = hotels.slice(0, 10).map((hotel, index) => {
    const name = hotel.name || 'Unknown Hotel';
    const address = hotel.address 
      ? `${hotel.address.lines?.join(', ') || ''}, ${hotel.address.cityName || ''}`
      : 'Location not available';
    
    return `${index + 1}. ${name}\n   ${address}`;
  });
  
  return `Found ${hotelList.length} hotels in ${cityName} from ${params.check_in} to ${params.check_out}:\n\n${hotelList.join('\n\n')}\n\n*Note: Price information requires hotel offers search.*`;
}