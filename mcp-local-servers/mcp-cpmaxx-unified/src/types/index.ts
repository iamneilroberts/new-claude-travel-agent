export interface ChromeInstruction {
  tool: string;
  args: any;
}

export interface SearchPlan {
  searchId: string;
  provider: string;
  status: string;
  totalSteps: number;
  currentStep: number;
  instructions: ChromeInstruction[];
  nextAction: string;
}

export interface SearchState {
  searchId: string;
  provider: string;
  status: 'in_progress' | 'html_saved' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  searchCriteria: any;
  error?: string;
}

export interface SearchResults {
  provider: string;
  searchId: string;
  criteria: any;
  searchDate: string;
  searchLocation: string;
  errors: Array<{
    code: string;
    message: string;
  }>;
}

export interface VacationPackage {
  packageId: string;
  provider: string;
  hotel: {
    name: string;
    rating?: number;
    location: string;
  };
  flight: {
    airline: string;
    departureTime: string;
    arrivalTime: string;
    stops: number;
  };
  pricing: {
    total: number;
    perPerson: number;
    currency: string;
    taxes?: number;
  };
  duration: {
    nights: number;
    days: number;
  };
}

export interface Hotel {
  hotelId: string;
  name: string;
  location: string;
  starRating: number;
  amenities: string[];
  roomTypes: Array<{
    type: string;
    price: number;
    available: boolean;
  }>;
  pricing: {
    perNight: number;
    total: number;
    currency: string;
  };
}

export interface DeltaSearchResults extends SearchResults {
  packages: VacationPackage[];
  totalPackages: number;
}

export interface AmericanSearchResults extends SearchResults {
  packages: VacationPackage[];
  totalPackages: number;
}

export interface HotelSearchResults extends SearchResults {
  hotels: Hotel[];
  totalHotels: number;
}