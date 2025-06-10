// Enhanced scenario interfaces (no Zod dependency)
export interface TestScenario {
  id: string;
  title: string;
  description: string;
  complexity: "simple" | "intermediate" | "complex";
  category: "flight" | "hotel" | "activity" | "workflow" | "edge_case";
  travelType: "business" | "leisure" | "family" | "solo" | "group" | "romantic" | "adventure";
  prompt: string;
  expectedOutcomes: string[];
  requiredTools: string[];
  maxDuration?: number;
  metadata: {
    destinations: string[];
    travelers: number;
    duration?: number; // days
    budget?: {
      min?: number;
      max?: number;
      currency: string;
    };
    specialRequirements?: string[];
    timeConstraints?: {
      advanceBooking?: "last_minute" | "normal" | "far_advance";
      seasonality?: "peak" | "shoulder" | "off_season";
    };
  };
  variations?: {
    dateRange?: string[];
    destinationAlternatives?: string[];
    travelerCountOptions?: number[];
    budgetVariations?: Array<{
      min: number;
      max: number;
    }>;
  };
  seed?: string; // For reproducible generation
}

// Travel data pools for realistic scenario generation
export class ScenarioDataPools {
  static readonly DESTINATIONS = {
    domestic: [
      { city: "New York", code: "NYC", airports: ["JFK", "LGA", "EWR"] },
      { city: "Los Angeles", code: "LAX", airports: ["LAX"] },
      { city: "Chicago", code: "CHI", airports: ["ORD", "MDW"] },
      { city: "Miami", code: "MIA", airports: ["MIA"] },
      { city: "San Francisco", code: "SFO", airports: ["SFO"] },
      { city: "Las Vegas", code: "LAS", airports: ["LAS"] },
      { city: "Seattle", code: "SEA", airports: ["SEA"] },
      { city: "Boston", code: "BOS", airports: ["BOS"] },
      { city: "Denver", code: "DEN", airports: ["DEN"] },
      { city: "Orlando", code: "MCO", airports: ["MCO"] }
    ],
    international: [
      { city: "London", code: "LON", airports: ["LHR", "LGW", "STN"], country: "UK" },
      { city: "Paris", code: "PAR", airports: ["CDG", "ORY"], country: "France" },
      { city: "Tokyo", code: "TYO", airports: ["NRT", "HND"], country: "Japan" },
      { city: "Rome", code: "ROM", airports: ["FCO"], country: "Italy" },
      { city: "Barcelona", code: "BCN", airports: ["BCN"], country: "Spain" },
      { city: "Amsterdam", code: "AMS", airports: ["AMS"], country: "Netherlands" },
      { city: "Frankfurt", code: "FRA", airports: ["FRA"], country: "Germany" },
      { city: "Dubai", code: "DXB", airports: ["DXB"], country: "UAE" },
      { city: "Sydney", code: "SYD", airports: ["SYD"], country: "Australia" },
      { city: "Bangkok", code: "BKK", airports: ["BKK"], country: "Thailand" }
    ]
  };

  static readonly TRAVELER_PROFILES = [
    { type: "business", count: 1, needs: ["wifi", "business_center", "early_checkin"] },
    { type: "leisure_couple", count: 2, needs: ["romantic", "spa", "fine_dining"] },
    { type: "family", count: 4, needs: ["family_rooms", "kids_activities", "pool"] },
    { type: "solo_adventure", count: 1, needs: ["budget_friendly", "local_experiences", "safety"] },
    { type: "group_friends", count: 6, needs: ["group_discounts", "nightlife", "activities"] },
    { type: "elderly_couple", count: 2, needs: ["accessibility", "comfort", "medical_facilities"] },
    { type: "student_budget", count: 1, needs: ["budget", "hostels", "student_discounts"] }
  ];

  static readonly TRAVEL_PURPOSES = [
    "business_meeting",
    "conference",
    "vacation",
    "honeymoon",
    "anniversary",
    "family_reunion",
    "graduation",
    "medical_treatment",
    "relocation",
    "wedding_attendance",
    "cultural_exploration",
    "adventure_sports",
    "food_tourism",
    "photography_tour"
  ];

  static readonly BUDGET_RANGES = {
    economy: { min: 500, max: 1500 },
    mid_range: { min: 1500, max: 3500 },
    luxury: { min: 3500, max: 8000 },
    ultra_luxury: { min: 8000, max: 20000 }
  };

  static readonly SPECIAL_REQUIREMENTS = [
    "wheelchair_accessible",
    "pet_friendly",
    "dietary_restrictions",
    "medical_equipment",
    "child_care",
    "elderly_assistance",
    "language_assistance",
    "visa_assistance",
    "travel_insurance",
    "group_coordination"
  ];
}

export class ScenarioGenerator {
  private seed: number = Date.now();

  constructor(seed?: string) {
    if (seed) {
      this.seed = this.hashString(seed);
    }
  }

  // Simple hash function for reproducible randomization
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Seeded random number generator
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(this.random() * array.length)];
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Generate dates relative to August 1, 2025 minimum
  private generateDates(advanceBooking: "last_minute" | "normal" | "far_advance") {
    const minDate = new Date('2025-08-01');
    const today = new Date();
    
    // Use the later of today or August 1, 2025 as the base date
    const baseDate = today > minDate ? today : minDate;
    
    let departureStart: number;
    let departureEnd: number;

    switch (advanceBooking) {
      case "last_minute":
        departureStart = 1; // 1 day
        departureEnd = 14; // 2 weeks
        break;
      case "normal":
        departureStart = 14; // 2 weeks
        departureEnd = 90; // 3 months
        break;
      case "far_advance":
        departureStart = 90; // 3 months
        departureEnd = 365; // 1 year
        break;
    }

    const departureDays = this.randomInt(departureStart, departureEnd);
    const tripDuration = this.randomInt(2, 14); // 2-14 days

    const departureDate = new Date(baseDate);
    departureDate.setDate(baseDate.getDate() + departureDays);

    // Ensure departure date is never before August 1, 2025
    if (departureDate < minDate) {
      departureDate.setTime(minDate.getTime());
      departureDate.setDate(minDate.getDate() + departureDays);
    }

    const returnDate = new Date(departureDate);
    returnDate.setDate(departureDate.getDate() + tripDuration);

    return {
      departure: departureDate.toISOString().split('T')[0],
      return: returnDate.toISOString().split('T')[0],
      duration: tripDuration
    };
  }

  // Generate simple scenarios (single tool usage)
  generateSimpleScenarios(count: number = 5): TestScenario[] {
    const scenarios: TestScenario[] = [];

    for (let i = 0; i < count; i++) {
      const category = this.randomChoice(["flight", "hotel", "activity"]);
      const origin = this.randomChoice(ScenarioDataPools.DESTINATIONS.domestic);
      const destination = this.randomChoice([
        ...ScenarioDataPools.DESTINATIONS.domestic,
        ...ScenarioDataPools.DESTINATIONS.international
      ]);
      const profile = this.randomChoice(ScenarioDataPools.TRAVELER_PROFILES);
      const dates = this.generateDates("normal");

      let scenario: TestScenario;

      switch (category) {
        case "flight":
          scenario = {
            id: `flight_simple_${String(i + 1).padStart(3, '0')}`,
            title: `Flight Search: ${origin.city} to ${destination.city}`,
            description: `Simple one-way flight search for ${profile.type.replace('_', ' ')}`,
            complexity: "simple",
            category: "flight",
            travelType: profile.type.includes('business') ? 'business' : 'leisure',
            prompt: `Search for flights from ${origin.city} (${this.randomChoice(origin.airports)}) to ${destination.city} (${this.randomChoice(destination.airports)}) on ${dates.departure} for ${profile.count} passenger${profile.count > 1 ? 's' : ''}`,
            expectedOutcomes: [
              "Flight search results displayed",
              "Multiple airline options shown",
              "Prices and departure times included",
              "Flight duration information provided"
            ],
            requiredTools: ["search_flights"],
            maxDuration: 30,
            metadata: {
              destinations: [origin.city, destination.city],
              travelers: profile.count,
              duration: dates.duration
            },
            seed: `simple_flight_${i}`
          };
          break;

        case "hotel":
          scenario = {
            id: `hotel_simple_${String(i + 1).padStart(3, '0')}`,
            title: `Hotel Search: ${destination.city}`,
            description: `Simple hotel search for ${profile.type.replace('_', ' ')}`,
            complexity: "simple",
            category: "hotel",
            travelType: profile.type.includes('business') ? 'business' : 'leisure',
            prompt: `Find hotels in ${destination.city} for ${profile.count} ${profile.count === 1 ? 'guest' : 'guests'}, checking in ${dates.departure} and checking out ${dates.return}`,
            expectedOutcomes: [
              "Hotel search results displayed",
              "Multiple hotel options shown",
              "Prices per night included",
              "Hotel ratings and amenities listed"
            ],
            requiredTools: ["search_hotels"],
            maxDuration: 30,
            metadata: {
              destinations: [destination.city],
              travelers: profile.count,
              duration: dates.duration
            },
            seed: `simple_hotel_${i}`
          };
          break;

        case "activity":
          scenario = {
            id: `activity_simple_${String(i + 1).padStart(3, '0')}`,
            title: `Activities Search: ${destination.city}`,
            description: `Simple activity search for ${profile.type.replace('_', ' ')}`,
            complexity: "simple",
            category: "activity",
            travelType: profile.type.includes('business') ? 'business' : 'leisure',
            prompt: `Find tourist attractions and activities in ${destination.city} suitable for ${profile.type.replace('_', ' ')} travelers`,
            expectedOutcomes: [
              "Tourist attractions listed",
              "Activity descriptions provided",
              "Location information included",
              "Ratings and reviews shown"
            ],
            requiredTools: ["search_poi", "search_activities"],
            maxDuration: 30,
            metadata: {
              destinations: [destination.city],
              travelers: profile.count,
              specialRequirements: profile.needs
            },
            seed: `simple_activity_${i}`
          };
          break;

        default:
          throw new Error(`Unknown category: ${category}`);
      }

      scenarios.push(scenario);
    }

    return scenarios;
  }

  // Generate intermediate scenarios (multi-parameter searches)
  generateIntermediateScenarios(count: number = 5): TestScenario[] {
    const scenarios: TestScenario[] = [];

    for (let i = 0; i < count; i++) {
      const category = this.randomChoice(["flight", "hotel", "activity"]);
      const origin = this.randomChoice(ScenarioDataPools.DESTINATIONS.domestic);
      const destination = this.randomChoice(ScenarioDataPools.DESTINATIONS.international);
      const profile = this.randomChoice(ScenarioDataPools.TRAVELER_PROFILES);
      const budget = this.randomChoice(Object.values(ScenarioDataPools.BUDGET_RANGES));
      const dates = this.generateDates(this.randomChoice(["normal", "far_advance"]));
      const specialReqs = this.randomChoice(ScenarioDataPools.SPECIAL_REQUIREMENTS);

      let scenario: TestScenario;

      switch (category) {
        case "flight":
          scenario = {
            id: `flight_intermediate_${String(i + 1).padStart(3, '0')}`,
            title: `Complex Flight Search with Preferences`,
            description: `Multi-parameter flight search with specific requirements and budget constraints`,
            complexity: "intermediate",
            category: "flight",
            travelType: profile.type.includes('business') ? 'business' : 'leisure',
            prompt: `Find round-trip flights from ${origin.city} to ${destination.city} departing ${dates.departure} and returning ${dates.return} for ${profile.count} passengers. Budget is $${budget.min}-${budget.max}. Special requirement: ${specialReqs.replace('_', ' ')}. Analyze price trends and find the best value options.`,
            expectedOutcomes: [
              "Round-trip flight options presented",
              "Price analysis completed",
              "Budget constraints respected",
              "Special requirements addressed",
              "Alternative date suggestions provided"
            ],
            requiredTools: ["search_flights", "analyze_flight_prices", "search_cheapest_flight_dates"],
            maxDuration: 60,
            metadata: {
              destinations: [origin.city, destination.city],
              travelers: profile.count,
              duration: dates.duration,
              budget: { min: budget.min, max: budget.max, currency: "USD" },
              specialRequirements: [specialReqs]
            },
            seed: `intermediate_flight_${i}`
          };
          break;

        case "hotel":
          const starRating = this.randomInt(3, 5);
          scenario = {
            id: `hotel_intermediate_${String(i + 1).padStart(3, '0')}`,
            title: `Hotel Search with Detailed Preferences`,
            description: `Hotel search with specific amenities, ratings, and location requirements`,
            complexity: "intermediate",
            category: "hotel",
            travelType: profile.type.includes('business') ? 'business' : 'leisure',
            prompt: `Find ${starRating}-star hotels in ${destination.city} near major attractions for ${profile.count} guests, checking in ${dates.departure} and checking out ${dates.return}. Budget: $${Math.floor(budget.min/dates.duration)}-${Math.floor(budget.max/dates.duration)} per night. Must have: ${profile.needs.join(', ')}. Special requirement: ${specialReqs.replace('_', ' ')}.`,
            expectedOutcomes: [
              "Hotels matching star rating found",
              "Location proximity to attractions verified",
              "Required amenities confirmed",
              "Price range respected",
              "Guest reviews and ratings included"
            ],
            requiredTools: ["search_hotels", "get_hotel_ratings", "search_poi"],
            maxDuration: 60,
            metadata: {
              destinations: [destination.city],
              travelers: profile.count,
              duration: dates.duration,
              budget: { min: budget.min, max: budget.max, currency: "USD" },
              specialRequirements: [specialReqs, ...profile.needs]
            },
            seed: `intermediate_hotel_${i}`
          };
          break;

        case "activity":
          scenario = {
            id: `activity_intermediate_${String(i + 1).padStart(3, '0')}`,
            title: `Curated Activity Planning`,
            description: `Detailed activity planning with preferences, scheduling, and logistics`,
            complexity: "intermediate",
            category: "activity",
            travelType: profile.type.includes('business') ? 'business' : 'leisure',
            prompt: `Plan a ${dates.duration}-day activity itinerary for ${destination.city} for ${profile.count} ${profile.type.replace('_', ' ')} travelers. Include a mix of ${profile.needs.join(', ')} activities. Budget: $${budget.min}-${budget.max} total. Special requirement: ${specialReqs.replace('_', ' ')}. Provide scheduling recommendations and transportation options.`,
            expectedOutcomes: [
              "Daily itinerary created",
              "Activity mix matches traveler profile",
              "Budget allocation provided",
              "Transportation options included",
              "Special requirements accommodated"
            ],
            requiredTools: ["search_poi", "search_activities", "search_airport_transfers"],
            maxDuration: 60,
            metadata: {
              destinations: [destination.city],
              travelers: profile.count,
              duration: dates.duration,
              budget: { min: budget.min, max: budget.max, currency: "USD" },
              specialRequirements: [specialReqs, ...profile.needs]
            },
            seed: `intermediate_activity_${i}`
          };
          break;

        default:
          throw new Error(`Unknown category: ${category}`);
      }

      scenarios.push(scenario);
    }

    return scenarios;
  }

  // Generate complex scenarios (multi-step workflows)
  generateComplexScenarios(count: number = 3): TestScenario[] {
    const scenarios: TestScenario[] = [];

    for (let i = 0; i < count; i++) {
      const origin = this.randomChoice(ScenarioDataPools.DESTINATIONS.domestic);
      const destination = this.randomChoice(ScenarioDataPools.DESTINATIONS.international);
      const profile = this.randomChoice(ScenarioDataPools.TRAVELER_PROFILES);
      const purpose = this.randomChoice(ScenarioDataPools.TRAVEL_PURPOSES);
      const budget = this.randomChoice(Object.values(ScenarioDataPools.BUDGET_RANGES));
      const dates = this.generateDates(this.randomChoice(["normal", "far_advance"]));
      const advanceBooking = this.randomChoice(["last_minute", "normal", "far_advance"]);

      const scenario: TestScenario = {
        id: `workflow_complex_${String(i + 1).padStart(3, '0')}`,
        title: `Complete Trip Planning: ${purpose.replace('_', ' ')} to ${destination.city}`,
        description: `End-to-end trip planning including flights, accommodation, activities, and logistics`,
        complexity: "complex",
        category: "workflow",
        travelType: profile.type.includes('business') ? 'business' : 'leisure',
        prompt: `Plan a complete ${dates.duration}-day ${purpose.replace('_', ' ')} trip to ${destination.city} for ${profile.count} ${profile.type.replace('_', ' ')} travelers departing from ${origin.city}. Travel dates: ${dates.departure} to ${dates.return}. Total budget: $${budget.min}-${budget.max}. This is a ${advanceBooking.replace('_', ' ')} booking.

Requirements:
1. Find and compare flight options with price analysis
2. Search for accommodation matching traveler profile (${profile.needs.join(', ')})
3. Plan daily activities and attractions
4. Arrange airport transfers and local transportation
5. Provide budget breakdown and cost optimization suggestions
6. Include backup options for flights and hotels
7. Generate a comprehensive itinerary with timing recommendations`,
        expectedOutcomes: [
          "Complete flight comparison with price analysis",
          "Accommodation recommendations with ratings",
          "Daily activity itinerary created",
          "Transportation plan provided",
          "Budget breakdown with optimization suggestions",
          "Backup options for key bookings",
          "Comprehensive travel timeline generated",
          "Local recommendations and tips included"
        ],
        requiredTools: [
          "search_flights",
          "analyze_flight_prices", 
          "search_cheapest_flight_dates",
          "search_hotels",
          "get_hotel_ratings",
          "search_poi",
          "search_activities",
          "search_airport_transfers"
        ],
        maxDuration: 180,
        metadata: {
          destinations: [origin.city, destination.city],
          travelers: profile.count,
          duration: dates.duration,
          budget: { min: budget.min, max: budget.max, currency: "USD" },
          specialRequirements: profile.needs,
          timeConstraints: {
            advanceBooking: advanceBooking as "last_minute" | "normal" | "far_advance"
          }
        },
        variations: {
          dateRange: [dates.departure, dates.return],
          travelerCountOptions: [profile.count, profile.count + 1, profile.count + 2],
          budgetVariations: [
            { min: budget.min * 0.8, max: budget.max * 0.8 },
            { min: budget.min, max: budget.max },
            { min: budget.min * 1.2, max: budget.max * 1.2 }
          ]
        },
        seed: `complex_workflow_${i}`
      };

      scenarios.push(scenario);
    }

    return scenarios;
  }

  // Generate edge case scenarios
  generateEdgeCaseScenarios(count: number = 5): TestScenario[] {
    const scenarios: TestScenario[] = [];

    const edgeCases = [
      {
        type: "last_minute_emergency",
        title: "Last-Minute Emergency Travel",
        prompt: "Need to book travel for tomorrow due to family emergency"
      },
      {
        type: "multi_city_complex",
        title: "Multi-City Business Tour",
        prompt: "Plan 7-city business tour across 3 continents in 14 days"
      },
      {
        type: "extreme_budget",
        title: "Ultra-Budget Travel Challenge",
        prompt: "Plan 10-day Europe trip for under $800 total"
      },
      {
        type: "accessibility_focused",
        title: "Wheelchair-Accessible Travel",
        prompt: "Plan fully accessible trip for wheelchair user with medical equipment"
      },
      {
        type: "large_group",
        title: "Corporate Group Travel",
        prompt: "Coordinate travel for 25-person corporate retreat with varying schedules"
      }
    ];

    for (let i = 0; i < Math.min(count, edgeCases.length); i++) {
      const edgeCase = edgeCases[i];
      const origin = this.randomChoice(ScenarioDataPools.DESTINATIONS.domestic);
      const destination = this.randomChoice(ScenarioDataPools.DESTINATIONS.international);

      const scenario: TestScenario = {
        id: `edge_case_${String(i + 1).padStart(3, '0')}`,
        title: edgeCase.title,
        description: `Edge case testing scenario: ${edgeCase.type.replace('_', ' ')}`,
        complexity: "complex",
        category: "edge_case",
        travelType: "business",
        prompt: `${edgeCase.prompt}. Origin: ${origin.city}, Destination: ${destination.city}. Handle all constraints and provide creative solutions.`,
        expectedOutcomes: [
          "Creative solutions provided for constraints",
          "Alternative options explored",
          "Risk mitigation strategies included",
          "Cost-effective solutions found",
          "Practical implementation advice given"
        ],
        requiredTools: [
          "search_flights",
          "search_hotels", 
          "search_activities",
          "analyze_flight_prices",
          "search_cheapest_flight_dates"
        ],
        maxDuration: 120,
        metadata: {
          destinations: [origin.city, destination.city],
          travelers: edgeCase.type === "large_group" ? 25 : this.randomInt(1, 4),
          specialRequirements: [edgeCase.type]
        },
        seed: `edge_case_${edgeCase.type}_${i}`
      };

      scenarios.push(scenario);
    }

    return scenarios;
  }

  // Generate all scenario types
  generateAllScenarios(): TestScenario[] {
    return [
      ...this.generateSimpleScenarios(8),
      ...this.generateIntermediateScenarios(8), 
      ...this.generateComplexScenarios(5),
      ...this.generateEdgeCaseScenarios(5)
    ];
  }

  // Create variations of existing scenarios
  createVariation(baseScenario: TestScenario, variationType: string): TestScenario {
    const variation = { ...baseScenario };
    const timestamp = Date.now();
    
    variation.id = `${baseScenario.id}_var_${variationType}_${timestamp}`;
    variation.title = `${baseScenario.title} (${variationType} variation)`;

    switch (variationType) {
      case "date_shift":
        // Modify dates in the prompt - ensure they're after August 1, 2025
        const minDate = new Date('2025-08-01');
        const shiftDays = this.randomInt(30, 90); // Shift 1-3 months forward
        
        const newDepartureDate = new Date(minDate);
        newDepartureDate.setDate(minDate.getDate() + shiftDays);
        
        const newReturnDate = new Date(newDepartureDate);
        newReturnDate.setDate(newDepartureDate.getDate() + (variation.metadata.duration || 7));
        
        // Replace date patterns in the prompt with new dates
        variation.prompt = variation.prompt.replace(
          /\b\d{4}-\d{2}-\d{2}\b/g,
          () => {
            // Alternate between departure and return dates
            return Math.random() > 0.5 
              ? newDepartureDate.toISOString().split('T')[0]
              : newReturnDate.toISOString().split('T')[0];
          }
        );
        break;

      case "budget_increase":
        // Increase budget by 20-50%
        variation.prompt = variation.prompt.replace(
          /\$(\d+)-(\d+)/g,
          (match, min, max) => {
            const multiplier = 1.2 + (this.random() * 0.3); // 1.2 to 1.5
            return `$${Math.floor(Number(min) * multiplier)}-${Math.floor(Number(max) * multiplier)}`;
          }
        );
        break;

      case "traveler_increase":
        // Increase traveler count
        if (variation.metadata.travelers < 6) {
          const newCount = variation.metadata.travelers + this.randomInt(1, 2);
          variation.metadata.travelers = newCount;
          variation.prompt = variation.prompt.replace(
            /(\d+)\s+(passenger|guest|traveler)/g,
            `${newCount} $2`
          );
        }
        break;

      case "destination_swap":
        // Swap origin and destination
        const destinations = variation.metadata.destinations;
        if (destinations.length >= 2) {
          [destinations[0], destinations[1]] = [destinations[1], destinations[0]];
          variation.prompt = variation.prompt.replace(
            new RegExp(`from ${destinations[1]} to ${destinations[0]}`, 'g'),
            `from ${destinations[0]} to ${destinations[1]}`
          );
        }
        break;
    }

    variation.seed = `${baseScenario.seed}_${variationType}`;
    return variation;
  }
}