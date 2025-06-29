// Car Rental Types for CPMaxx Integration

export interface CarRentalSearchCriteria {
  pickupLocation: string;
  dropoffLocation?: string;
  pickupDate: string;
  pickupTime?: string;
  dropoffDate: string;
  dropoffTime?: string;
  carType?: string;
}

export interface CarRentalVehicle {
  id?: string;
  vehicleClass: string;
  vehicleName: string;
  vehicleType: string;
  category?: string;
  type?: string;
  make?: string;
  model?: string;
  exampleCar?: string;
  transmission: string;
  fuelType?: string;
  doors?: number;
  seats?: number;
  capacity: {
    passengers: number;
    luggage: number;
  };
  largeBags?: number;
  smallBags?: number;
  airConditioning?: boolean;
  features: string[];
  price: {
    total: number;
    daily: number;
    currency: string;
  };
  image?: string;
  imageUrl?: string;
}

export interface CarRentalVendorResult {
  vendorCode: string;
  vendorName: string;
  location: string;
  vendorUrl: string;
  vehicles: CarRentalVehicle[];
}

export interface CarRentalOffer {
  offerId: string;
  vendorCode: string;
  vendorName: string;
  company?: string;
  vehicle: CarRentalVehicle;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  mileage?: string;
  pricing?: {
    total: number;
    daily: number;
    currency: string;
  };
}

export interface CarRentalSearchResults {
  provider: string;
  searchId: string;
  criteria: CarRentalSearchCriteria;
  searchDate: string;
  searchLocation: string;
  airportCode?: string;
  vendors?: CarRentalVendorResult[];
  offers: CarRentalOffer[];
  totalVehicles?: number;
  filters?: any;
  extractionReport?: any;
  errors: Array<{
    code: string;
    message: string;
  }>;
}