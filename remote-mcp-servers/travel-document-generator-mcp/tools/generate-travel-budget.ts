import { z } from "zod";

export const generateTravelBudgetSchema = z.object({
  destination: z.string().describe("Travel destination"),
  duration: z.number().describe("Trip duration in days"),
  travelers: z.number().describe("Number of travelers"),
  trip_style: z.enum(["budget", "mid-range", "luxury", "backpacker"]).describe("Travel style/budget level"),
  currency: z.string().default("USD").describe("Preferred currency for budget (default: USD)"),
  expenses: z.object({
    flights: z.object({
      total_cost: z.number().optional(),
      cost_per_person: z.number().optional(),
      notes: z.string().optional()
    }).optional(),
    accommodation: z.object({
      cost_per_night: z.number().optional(),
      total_nights: z.number().optional(),
      type: z.string().optional(),
      notes: z.string().optional()
    }).optional(),
    food: z.object({
      daily_budget: z.number().optional(),
      style: z.enum(["street_food", "local_restaurants", "mid_range", "fine_dining", "mixed"]).optional(),
      notes: z.string().optional()
    }).optional(),
    activities: z.array(z.object({
      name: z.string(),
      cost: z.number(),
      per_person: z.boolean().default(true)
    })).optional(),
    transportation: z.object({
      daily_budget: z.number().optional(),
      type: z.string().optional(),
      notes: z.string().optional()
    }).optional(),
    shopping: z.object({
      budget: z.number().optional(),
      notes: z.string().optional()
    }).optional(),
    miscellaneous: z.object({
      daily_budget: z.number().optional(),
      notes: z.string().optional()
    }).optional()
  }).describe("Detailed expense categories")
});

export async function generateTravelBudget(params: z.infer<typeof generateTravelBudgetSchema>): Promise<any> {
  const { destination, duration, travelers, trip_style, currency, expenses } = params;

  // Calculate totals
  const flightTotal = calculateFlightTotal(expenses.flights, travelers);
  const accommodationTotal = calculateAccommodationTotal(expenses.accommodation, duration);
  const foodTotal = calculateFoodTotal(expenses.food, duration, travelers);
  const activitiesTotal = calculateActivitiesTotal(expenses.activities, travelers);
  const transportationTotal = calculateTransportationTotal(expenses.transportation, duration);
  const shoppingTotal = expenses.shopping?.budget || 0;
  const miscTotal = calculateMiscTotal(expenses.miscellaneous, duration);

  const grandTotal = flightTotal + accommodationTotal + foodTotal + activitiesTotal + transportationTotal + shoppingTotal + miscTotal;
  const perPersonTotal = grandTotal / travelers;
  const dailyBudget = grandTotal / duration;

  const budgetDocument = `# Travel Budget for ${destination}

## Trip Overview
- **Destination**: ${destination}
- **Duration**: ${duration} days
- **Travelers**: ${travelers} ${travelers === 1 ? 'person' : 'people'}
- **Travel Style**: ${trip_style.replace('_', ' ').toUpperCase()}
- **Currency**: ${currency}

## Budget Summary
- **Total Trip Cost**: ${formatCurrency(grandTotal, currency)}
- **Cost per Person**: ${formatCurrency(perPersonTotal, currency)}
- **Daily Budget**: ${formatCurrency(dailyBudget, currency)}

## Detailed Budget Breakdown

### ✈️ Flights
${formatExpenseSection('flights', expenses.flights, flightTotal, currency, travelers)}

### 🏨 Accommodation
${formatExpenseSection('accommodation', expenses.accommodation, accommodationTotal, currency, duration)}

### 🍽️ Food & Dining
${formatExpenseSection('food', expenses.food, foodTotal, currency, duration, travelers)}

### 🎯 Activities & Attractions
${formatActivitiesSection(expenses.activities, activitiesTotal, currency, travelers)}

### 🚌 Local Transportation
${formatExpenseSection('transportation', expenses.transportation, transportationTotal, currency, duration)}

### 🛍️ Shopping & Souvenirs
- **Budget**: ${formatCurrency(shoppingTotal, currency)}
${expenses.shopping?.notes ? `- **Notes**: ${expenses.shopping.notes}` : ''}

### 💰 Miscellaneous Expenses
${formatExpenseSection('miscellaneous', expenses.miscellaneous, miscTotal, currency, duration)}

## Budget Recommendations by Travel Style

${getBudgetRecommendations(trip_style, destination, duration, travelers, currency)}

## Money-Saving Tips
${getMoneySavingTips(trip_style)}

## Budget Tracking Tips
- Use a travel expense app to track spending in real-time
- Take photos of receipts for record-keeping
- Check exchange rates before making purchases
- Keep some emergency cash in local currency
- Monitor credit card foreign transaction fees

## Emergency Fund
**Recommended**: ${formatCurrency(grandTotal * 0.1, currency)} (10% of total budget)

---
*Budget generated on ${new Date().toLocaleDateString()}*
*Exchange rates may vary - check current rates before travel*`;

  return {
    content: [{
      type: "text",
      text: budgetDocument
    }]
  };
}

function calculateFlightTotal(flights: any, travelers: number): number {
  if (!flights) return 0;
  if (flights.total_cost) return flights.total_cost;
  if (flights.cost_per_person) return flights.cost_per_person * travelers;
  return 0;
}

function calculateAccommodationTotal(accommodation: any, duration: number): number {
  if (!accommodation) return 0;
  const nights = accommodation.total_nights || duration - 1;
  return (accommodation.cost_per_night || 0) * nights;
}

function calculateFoodTotal(food: any, duration: number, travelers: number): number {
  if (!food) return 0;
  return (food.daily_budget || 0) * duration * travelers;
}

function calculateActivitiesTotal(activities: any[] | undefined, travelers: number): number {
  if (!activities || activities.length === 0) return 0;
  return activities.reduce((total, activity) => {
    const cost = activity.per_person ? activity.cost * travelers : activity.cost;
    return total + cost;
  }, 0);
}

function calculateTransportationTotal(transportation: any, duration: number): number {
  if (!transportation) return 0;
  return (transportation.daily_budget || 0) * duration;
}

function calculateMiscTotal(misc: any, duration: number): number {
  if (!misc) return 0;
  return (misc.daily_budget || 0) * duration;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function formatExpenseSection(category: string, data: any, total: number, currency: string, duration?: number, travelers?: number): string {
  if (!data && total === 0) {
    return `- **Total**: ${formatCurrency(0, currency)} (Not specified)`;
  }

  let section = `- **Total**: ${formatCurrency(total, currency)}\n`;

  if (data) {
    if (category === 'flights') {
      if (data.cost_per_person) section += `- **Cost per Person**: ${formatCurrency(data.cost_per_person, currency)}\n`;
    }

    if (category === 'accommodation') {
      if (data.cost_per_night) section += `- **Cost per Night**: ${formatCurrency(data.cost_per_night, currency)}\n`;
      if (data.total_nights) section += `- **Total Nights**: ${data.total_nights}\n`;
      if (data.type) section += `- **Accommodation Type**: ${data.type}\n`;
    }

    if (category === 'food') {
      if (data.daily_budget) section += `- **Daily Budget per Person**: ${formatCurrency(data.daily_budget, currency)}\n`;
      if (data.style) section += `- **Dining Style**: ${data.style.replace('_', ' ')}\n`;
    }

    if (category === 'transportation') {
      if (data.daily_budget) section += `- **Daily Budget**: ${formatCurrency(data.daily_budget, currency)}\n`;
      if (data.type) section += `- **Primary Transportation**: ${data.type}\n`;
    }

    if (category === 'miscellaneous') {
      if (data.daily_budget) section += `- **Daily Budget**: ${formatCurrency(data.daily_budget, currency)}\n`;
    }

    if (data.notes) section += `- **Notes**: ${data.notes}\n`;
  }

  return section.trim();
}

function formatActivitiesSection(activities: any[] | undefined, total: number, currency: string, travelers: number): string {
  if (!activities || activities.length === 0) {
    return `- **Total**: ${formatCurrency(total, currency)} (No activities specified)`;
  }

  let section = `- **Total**: ${formatCurrency(total, currency)}\n\n**Activity Breakdown:**\n`;

  activities.forEach(activity => {
    const cost = activity.per_person ? activity.cost * travelers : activity.cost;
    const perPersonNote = activity.per_person ? ` (${formatCurrency(activity.cost, 'USD')} per person)` : ' (total cost)';
    section += `- ${activity.name}: ${formatCurrency(cost, currency)}${perPersonNote}\n`;
  });

  return section.trim();
}

function getBudgetRecommendations(style: string, destination: string, duration: number, travelers: number, currency: string): string {
  const recommendations = {
    budget: {
      accommodation: "Hostels, budget hotels, or Airbnb shared spaces",
      food: "Street food, local markets, cooking when possible",
      transportation: "Public transit, walking, budget airlines",
      activities: "Free attractions, hiking, self-guided tours"
    },
    backpacker: {
      accommodation: "Hostels, camping, couchsurfing",
      food: "Street food, grocery stores, hostel kitchens",
      transportation: "Buses, trains, hitchhiking, walking",
      activities: "Free activities, nature, local experiences"
    },
    "mid-range": {
      accommodation: "3-star hotels, quality Airbnb, boutique properties",
      food: "Mix of local restaurants and nicer establishments",
      transportation: "Mix of public transit and taxis/rideshare",
      activities: "Paid attractions, guided tours, experiences"
    },
    luxury: {
      accommodation: "4-5 star hotels, luxury resorts, premium Airbnb",
      food: "Fine dining, hotel restaurants, culinary experiences",
      transportation: "Private transfers, business class, rental cars",
      activities: "Premium experiences, private tours, exclusive access"
    }
  };

  const rec = recommendations[style as keyof typeof recommendations];

  return `### ${style.replace('_', ' ').toUpperCase()} Travel Recommendations
- **Accommodation**: ${rec.accommodation}
- **Food**: ${rec.food}
- **Transportation**: ${rec.transportation}
- **Activities**: ${rec.activities}`;
}

function getMoneySavingTips(style: string): string {
  const baseTips = [
    "- Book flights and accommodation in advance for better rates",
    "- Travel during shoulder season for lower prices",
    "- Use public transportation instead of taxis",
    "- Eat where locals eat for authentic and affordable meals",
    "- Look for free walking tours and activities",
    "- Use travel reward credit cards for points and miles",
    "- Consider travel insurance to protect your investment"
  ];

  const styleTips = {
    budget: [
      "- Stay in hostels or budget accommodations",
      "- Cook your own meals when possible",
      "- Use budget airlines and book early",
      "- Take advantage of free museum days"
    ],
    backpacker: [
      "- Use hostel kitchens to prepare meals",
      "- Travel overland instead of flying",
      "- Look for work exchange opportunities",
      "- Use apps for free accommodation (Couchsurfing)"
    ],
    "mid-range": [
      "- Book accommodation with kitchen facilities",
      "- Mix expensive and budget activities",
      "- Use hotel loyalty programs for upgrades",
      "- Book tours directly with local operators"
    ],
    luxury: [
      "- Book well in advance for luxury properties",
      "- Use points and miles for upgrades",
      "- Look for package deals that include experiences",
      "- Consider luxury travel during weekdays"
    ]
  };

  const allTips = [...baseTips, ...styleTips[style as keyof typeof styleTips]];
  return allTips.join('\n');
}

export const generateTravelBudgetTool = {
  name: "generate_travel_budget",
  description: "Generate a comprehensive travel budget with expense categories, recommendations, and money-saving tips",
  schema: generateTravelBudgetSchema,
  execute: generateTravelBudget
};
