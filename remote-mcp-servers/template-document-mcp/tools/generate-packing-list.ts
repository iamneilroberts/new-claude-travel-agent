import { z } from "zod";

export const generatePackingListSchema = z.object({
  destination: z.string().describe("Travel destination"),
  trip_type: z.enum(["business", "leisure", "adventure", "beach", "city", "winter_sports", "hiking"]).describe("Type of trip"),
  duration: z.number().describe("Trip duration in days"),
  season: z.enum(["spring", "summer", "fall", "winter"]).describe("Season of travel"),
  climate: z.enum(["tropical", "temperate", "cold", "desert", "mountain"]).optional().describe("Destination climate"),
  special_activities: z.array(z.string()).optional().describe("Special activities planned"),
  travelers: z.array(z.object({
    name: z.string(),
    type: z.enum(["adult_male", "adult_female", "child", "infant"])
  })).describe("Travelers and their types")
});

export async function generatePackingList(params: z.infer<typeof generatePackingListSchema>): Promise<any> {
  const essentials = getEssentialItems();
  const clothing = getClothingItems(params.trip_type, params.season, params.climate, params.duration);
  const electronics = getElectronicsItems();
  const toiletries = getToiletriesItems(params.duration);
  const documents = getDocumentItems();
  const specialItems = getSpecialActivityItems(params.special_activities || []);
  const travelerSpecific = getTravelerSpecificItems(params.travelers);

  const packingList = `# Packing List for ${params.destination}

## Trip Details
- **Destination**: ${params.destination}
- **Trip Type**: ${params.trip_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **Duration**: ${params.duration} days
- **Season**: ${params.season.charAt(0).toUpperCase() + params.season.slice(1)}
- **Climate**: ${params.climate ? params.climate.charAt(0).toUpperCase() + params.climate.slice(1) : 'Various'}
- **Travelers**: ${params.travelers.map(t => t.name).join(', ')}

## Essential Documents & Money
${documents.map(item => `- [ ] ${item}`).join('\n')}

## Clothing${params.duration > 7 ? ' (Pack for ' + Math.ceil(params.duration / 7) + ' week' + (Math.ceil(params.duration / 7) > 1 ? 's' : '') + ', plan to do laundry)' : ''}
${clothing.map(item => `- [ ] ${item}`).join('\n')}

## Electronics & Gadgets
${electronics.map(item => `- [ ] ${item}`).join('\n')}

## Toiletries & Personal Care
${toiletries.map(item => `- [ ] ${item}`).join('\n')}

## Health & Safety
${essentials.map(item => `- [ ] ${item}`).join('\n')}

${specialItems.length > 0 ? `## Special Activity Items
${specialItems.map(item => `- [ ] ${item}`).join('\n')}

` : ''}${travelerSpecific.length > 0 ? `## Traveler-Specific Items
${travelerSpecific.map(item => `- [ ] ${item}`).join('\n')}

` : ''}## Packing Tips
${getPackingTips(params.trip_type, params.duration)}

## Pre-Departure Checklist
- [ ] Check weather forecast 24 hours before departure
- [ ] Confirm all reservations (flights, hotels, activities)
- [ ] Notify bank of travel plans
- [ ] Check passport expiration (6+ months remaining)
- [ ] Download offline maps and translation apps
- [ ] Set up international phone/data plan
- [ ] Leave emergency contact info with someone at home
- [ ] Take photos of important documents (store separately)

---
*Generated on ${new Date().toLocaleDateString()}*`;

  return {
    content: [{
      type: "text",
      text: packingList
    }]
  };
}

function getEssentialItems(): string[] {
  return [
    "First aid kit (band-aids, pain relievers, antiseptic)",
    "Prescription medications (bring extra)",
    "Sunscreen (SPF 30+)",
    "Insect repellent",
    "Hand sanitizer",
    "Travel insurance documentation",
    "Emergency contact information",
    "Copies of prescriptions"
  ];
}

function getDocumentItems(): string[] {
  return [
    "Passport (check expiration date)",
    "Visa (if required)",
    "Driver's license",
    "Travel insurance documents",
    "Flight confirmations",
    "Hotel confirmations",
    "Activity/tour confirmations",
    "Credit cards (notify bank of travel)",
    "Cash in local currency",
    "Emergency cash (USD/EUR)",
    "Backup copies of all documents"
  ];
}

function getClothingItems(tripType: string, season: string, climate: string | undefined, duration: number): string[] {
  const baseItems = [
    `Underwear (${Math.min(duration + 2, 10)} pairs)`,
    `Socks (${Math.min(duration + 2, 10)} pairs)`,
    "Sleepwear",
    "Comfortable walking shoes",
    "Flip-flops or sandals"
  ];

  // Season-specific items
  if (season === "winter" || climate === "cold") {
    baseItems.push(
      "Winter coat/heavy jacket",
      "Warm sweaters/hoodies",
      "Thermal underwear",
      "Warm hat and gloves",
      "Scarf",
      "Waterproof boots"
    );
  }

  if (season === "summer" || climate === "tropical") {
    baseItems.push(
      "Lightweight shirts/tops",
      "Shorts",
      "Sun hat",
      "Swimwear",
      "Light jacket for air conditioning"
    );
  }

  // Trip type specific
  if (tripType === "business") {
    baseItems.push(
      "Business suits/dress clothes",
      "Dress shoes",
      "Ties/accessories",
      "Blazer/sport coat"
    );
  }

  if (tripType === "beach") {
    baseItems.push(
      "Multiple swimsuits",
      "Beach cover-up",
      "Water shoes",
      "Beach towel"
    );
  }

  if (tripType === "adventure" || tripType === "hiking") {
    baseItems.push(
      "Hiking boots",
      "Moisture-wicking clothing",
      "Quick-dry pants",
      "Rain gear",
      "Hiking socks"
    );
  }

  // Add versatile basics
  baseItems.push(
    `Jeans/casual pants (${Math.min(Math.ceil(duration / 3), 3)} pairs)`,
    `T-shirts/casual tops (${Math.min(duration, 7)} pieces)`,
    "Light sweater or cardigan",
    "Rain jacket/umbrella"
  );

  return baseItems;
}

function getElectronicsItems(): string[] {
  return [
    "Phone and charger",
    "Portable battery pack",
    "Universal power adapter",
    "Camera (if not using phone)",
    "Headphones/earbuds",
    "Laptop/tablet (if needed)",
    "E-reader (optional)",
    "Charging cables",
    "Power strip (for multiple devices)"
  ];
}

function getToiletriesItems(duration: number): string[] {
  const sizeNote = duration > 7 ? " (travel sizes or plan to buy locally)" : " (travel sizes)";

  return [
    `Toothbrush and toothpaste${sizeNote}`,
    `Shampoo and conditioner${sizeNote}`,
    `Body wash/soap${sizeNote}`,
    `Deodorant${sizeNote}`,
    "Razor and shaving cream",
    "Moisturizer",
    "Lip balm",
    "Hair styling products",
    "Makeup (if used)",
    "Nail clippers",
    "Tweezers",
    "Contact lens supplies (if applicable)",
    "Feminine hygiene products"
  ];
}

function getSpecialActivityItems(activities: string[]): string[] {
  const items: string[] = [];

  activities.forEach(activity => {
    const lowerActivity = activity.toLowerCase();

    if (lowerActivity.includes("swim") || lowerActivity.includes("beach") || lowerActivity.includes("pool")) {
      items.push("Swimwear", "Beach towel", "Waterproof phone case");
    }

    if (lowerActivity.includes("hik") || lowerActivity.includes("trek") || lowerActivity.includes("trail")) {
      items.push("Hiking boots", "Backpack", "Water bottles", "Trail snacks");
    }

    if (lowerActivity.includes("ski") || lowerActivity.includes("snow")) {
      items.push("Ski clothes", "Goggles", "Gloves", "Hand warmers");
    }

    if (lowerActivity.includes("dive") || lowerActivity.includes("snorkel")) {
      items.push("Snorkel gear (or plan to rent)", "Underwater camera");
    }

    if (lowerActivity.includes("business") || lowerActivity.includes("meeting") || lowerActivity.includes("conference")) {
      items.push("Business cards", "Laptop", "Professional attire", "Notebook");
    }
  });

  return [...new Set(items)]; // Remove duplicates
}

function getTravelerSpecificItems(travelers: any[]): string[] {
  const items: string[] = [];

  travelers.forEach(traveler => {
    if (traveler.type === "infant") {
      items.push(
        `${traveler.name}: Diapers and wipes`,
        `${traveler.name}: Baby formula/food`,
        `${traveler.name}: Baby clothes`,
        `${traveler.name}: Stroller/carrier`,
        `${traveler.name}: Baby toys`
      );
    }

    if (traveler.type === "child") {
      items.push(
        `${traveler.name}: Entertainment (tablets, games, books)`,
        `${traveler.name}: Comfort items (stuffed animal, blanket)`,
        `${traveler.name}: Snacks`,
        `${traveler.name}: Extra clothes (kids get messy)`
      );
    }
  });

  return items;
}

function getPackingTips(tripType: string, duration: number): string {
  const tips = [
    "- Roll clothes instead of folding to save space",
    "- Use packing cubes to organize items",
    "- Wear your heaviest shoes and jacket while traveling",
    "- Pack one complete outfit in your carry-on bag",
    "- Leave some space in your luggage for souvenirs"
  ];

  if (duration > 7) {
    tips.push("- Plan to do laundry during your trip");
    tips.push("- Pack versatile pieces that mix and match");
  }

  if (tripType === "business") {
    tips.push("- Pack wrinkle-resistant fabrics");
    tips.push("- Bring a steamer or travel iron");
  }

  return tips.join('\n');
}

export const generatePackingListTool = {
  name: "generate_packing_list",
  description: "Generate a personalized packing list based on destination, trip type, season, and traveler requirements",
  schema: generatePackingListSchema,
  execute: generatePackingList
};
