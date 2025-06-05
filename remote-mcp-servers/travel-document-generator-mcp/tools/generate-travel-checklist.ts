import { z } from "zod";

export const generateTravelChecklistSchema = z.object({
  trip_type: z.enum(["domestic", "international"]).describe("Type of trip"),
  destination: z.string().describe("Travel destination"),
  departure_date: z.string().describe("Departure date (YYYY-MM-DD)"),
  duration: z.number().describe("Trip duration in days"),
  travelers: z.array(z.object({
    name: z.string(),
    age: z.number().optional(),
    passport_expiry: z.string().optional().describe("Passport expiry date (YYYY-MM-DD)")
  })).describe("List of travelers"),
  special_requirements: z.array(z.string()).optional().describe("Special requirements (medications, dietary, accessibility, etc.)"),
  activities: z.array(z.string()).optional().describe("Planned activities or trip highlights")
});

export async function generateTravelChecklist(params: z.infer<typeof generateTravelChecklistSchema>): Promise<any> {
  const { trip_type, destination, departure_date, duration, travelers, special_requirements, activities } = params;

  const departureDate = new Date(departure_date);
  const today = new Date();
  const daysUntilDeparture = Math.ceil((departureDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const checklist = `# Travel Checklist for ${destination}

## Trip Overview
- **Destination**: ${destination}
- **Trip Type**: ${trip_type === 'international' ? 'International' : 'Domestic'}
- **Departure**: ${formatDate(departure_date)}
- **Duration**: ${duration} days
- **Days Until Departure**: ${daysUntilDeparture} days
- **Travelers**: ${travelers.map(t => t.name).join(', ')}

${daysUntilDeparture > 30 ? `## 1-2 Months Before Departure
${getEarlyPlanningTasks(trip_type, travelers, destination)}

` : ''}${daysUntilDeparture > 7 ? `## 1-2 Weeks Before Departure
${getPreTravelTasks(trip_type, travelers, special_requirements)}

` : ''}## 1-3 Days Before Departure
${getLastMinuteTasks(trip_type)}

## Day of Departure
${getDepartureDayTasks(trip_type)}

## Travel Documents Checklist
${getDocumentChecklist(trip_type, travelers)}

${special_requirements && special_requirements.length > 0 ? `## Special Requirements
${special_requirements.map(req => `- [ ] ${req}`).join('\n')}

` : ''}${activities && activities.length > 0 ? `## Activity Preparations
${getActivityPreparations(activities)}

` : ''}## Digital Preparations
${getDigitalPreparations(trip_type, destination)}

## Health & Safety
${getHealthSafetyChecklist(trip_type, duration)}

## Financial Preparations
${getFinancialChecklist(trip_type)}

## Last-Minute Emergency Kit
${getEmergencyKitChecklist()}

## Return Travel Preparations
${getReturnPreparations()}

---
*Checklist generated on ${new Date().toLocaleDateString()}*
*Complete items as you go to ensure nothing is forgotten!*`;

  return {
    content: [{
      type: "text",
      text: checklist
    }]
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getEarlyPlanningTasks(tripType: string, travelers: any[], destination: string): string {
  const tasks = [
    "Research destination weather and cultural norms",
    "Check passport expiration dates (must be valid 6+ months)",
    "Apply for visas if required",
    "Book flights and accommodation",
    "Research travel insurance options",
    "Start any required vaccinations",
    "Research local customs and etiquette",
    "Plan rough itinerary and must-see attractions"
  ];

  if (tripType === 'international') {
    tasks.push(
      "Check visa requirements for all travelers",
      "Research vaccination requirements",
      "Register with embassy/consulate if recommended"
    );
  }

  return tasks.map(task => `- [ ] ${task}`).join('\n');
}

function getPreTravelTasks(tripType: string, travelers: any[], specialRequirements?: string[]): string {
  const tasks = [
    "Confirm all reservations (flights, hotels, tours)",
    "Check in for flights (24-48 hours prior)",
    "Print or download boarding passes",
    "Print hotel confirmations and important documents",
    "Notify bank and credit card companies of travel",
    "Set up international phone/data plan",
    "Download offline maps and translation apps",
    "Pack according to your packing list",
    "Arrange pet care or house sitting if needed",
    "Stop mail and newspaper delivery",
    "Clean out refrigerator and secure home"
  ];

  if (tripType === 'international') {
    tasks.push(
      "Get local currency or arrange for ATM access",
      "Check current exchange rates",
      "Verify international driving permit if needed"
    );
  }

  // Add traveler-specific passport checks
  travelers.forEach(traveler => {
    if (traveler.passport_expiry) {
      const expiryDate = new Date(traveler.passport_expiry);
      const today = new Date();
      const monthsUntilExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsUntilExpiry < 6) {
        tasks.push(`URGENT: ${traveler.name}'s passport expires ${traveler.passport_expiry} - renew immediately`);
      }
    }
  });

  return tasks.map(task => `- [ ] ${task}`).join('\n');
}

function getLastMinuteTasks(tripType: string): string {
  const tasks = [
    "Check weather forecast for departure and destination",
    "Charge all electronic devices",
    "Pack phone chargers and adapters",
    "Confirm transportation to airport",
    "Set out-of-office email replies",
    "Do final packing check against your list",
    "Prepare carry-on with essentials",
    "Set multiple alarms for departure day",
    "Check flight status for any delays",
    "Prepare travel day outfit and check weather"
  ];

  if (tripType === 'international') {
    tasks.push(
      "Double-check passport and visa location",
      "Confirm international adapter and converter",
      "Check current travel advisories"
    );
  }

  return tasks.map(task => `- [ ] ${task}`).join('\n');
}

function getDepartureDayTasks(tripType: string): string {
  const tasks = [
    "Final check of departure time and gate",
    "Arrive at airport with recommended time buffer",
    "Bring ID, boarding pass, and travel documents",
    "Keep essentials in easily accessible carry-on",
    "Stay hydrated and bring snacks",
    "Download entertainment for the journey",
    "Keep phone charged and bring portable charger",
    "Take photos of parking location if driving to airport"
  ];

  if (tripType === 'international') {
    tasks.push(
      "Have passport readily accessible",
      "Declare any items at customs if required",
      "Keep customs forms and receipts handy"
    );
  }

  return tasks.map(task => `- [ ] ${task}`).join('\n');
}

function getDocumentChecklist(tripType: string, travelers: any[]): string {
  const baseDocuments = [
    "Government-issued photo ID",
    "Flight confirmations/boarding passes",
    "Hotel/accommodation confirmations",
    "Travel insurance documents",
    "Emergency contact information",
    "Driver's license (if planning to drive)",
    "Backup copies of all important documents"
  ];

  if (tripType === 'international') {
    baseDocuments.unshift(
      "Valid passport (6+ months remaining)",
      "Visa (if required)",
      "International driving permit (if driving)"
    );
  }

  let documentsList = baseDocuments.map(doc => `- [ ] ${doc}`).join('\n');

  // Add traveler-specific checks
  documentsList += '\n\n**Per Traveler Document Verification:**\n';
  travelers.forEach(traveler => {
    documentsList += `\n**${traveler.name}:**\n`;
    documentsList += `- [ ] Valid ID/Passport\n`;
    if (tripType === 'international') {
      documentsList += `- [ ] Visa if required\n`;
      if (traveler.passport_expiry) {
        documentsList += `- [ ] Passport valid until ${traveler.passport_expiry}\n`;
      }
    }
    if (traveler.age && traveler.age < 18) {
      documentsList += `- [ ] Parental consent forms if traveling without both parents\n`;
    }
  });

  return documentsList;
}

function getActivityPreparations(activities: string[]): string {
  const preparations: string[] = [];

  activities.forEach(activity => {
    const lowerActivity = activity.toLowerCase();

    if (lowerActivity.includes('museum') || lowerActivity.includes('gallery')) {
      preparations.push(`Book tickets for ${activity} in advance`);
    }

    if (lowerActivity.includes('tour')) {
      preparations.push(`Confirm meeting point and time for ${activity}`);
    }

    if (lowerActivity.includes('restaurant') || lowerActivity.includes('dining')) {
      preparations.push(`Make reservations for ${activity}`);
    }

    if (lowerActivity.includes('hik') || lowerActivity.includes('outdoor')) {
      preparations.push(`Check weather and pack appropriate gear for ${activity}`);
    }

    if (lowerActivity.includes('theater') || lowerActivity.includes('show') || lowerActivity.includes('concert')) {
      preparations.push(`Print tickets for ${activity}`);
    }
  });

  // Add general activity preparations
  preparations.push("Research opening hours for planned attractions");
  preparations.push("Download apps for local attractions and transportation");
  preparations.push("Save offline maps for activity locations");

  return [...new Set(preparations)].map(prep => `- [ ] ${prep}`).join('\n');
}

function getDigitalPreparations(tripType: string, destination: string): string {
  const tasks = [
    "Download maps for offline use (Google Maps, Maps.me)",
    "Download translation app (Google Translate, etc.)",
    "Download transportation apps (Uber, local metro apps)",
    "Download weather app for destination",
    "Save important contact numbers in phone",
    "Backup photos and important files to cloud",
    "Download entertainment (movies, music, podcasts)",
    "Install VPN app if traveling to restricted countries",
    "Download currency converter app"
  ];

  if (tripType === 'international') {
    tasks.push(
      "Research and download local apps (food delivery, ride-sharing)",
      "Check if social media platforms are accessible",
      "Download offline language learning apps"
    );
  }

  return tasks.map(task => `- [ ] ${task}`).join('\n');
}

function getHealthSafetyChecklist(tripType: string, duration: number): string {
  const tasks = [
    "Pack first aid kit with band-aids and pain relievers",
    "Bring any prescription medications (pack extra)",
    "Research local hospitals and emergency numbers",
    "Purchase travel insurance",
    "Pack sunscreen and insect repellent",
    "Bring hand sanitizer",
    "Research local health risks and precautions"
  ];

  if (tripType === 'international') {
    tasks.push(
      "Check vaccination requirements",
      "Research water safety and food precautions",
      "Bring copies of prescriptions",
      "Research local pharmacy options"
    );
  }

  if (duration > 7) {
    tasks.push("Pack enough medication for entire trip plus extra");
  }

  return tasks.map(task => `- [ ] ${task}`).join('\n');
}

function getFinancialChecklist(tripType: string): string {
  const tasks = [
    "Notify banks of travel dates and destinations",
    "Check daily withdrawal limits for ATMs",
    "Bring multiple payment methods (cards, cash)",
    "Research local tipping customs",
    "Set up travel expense tracking app",
    "Take photos of credit cards (store securely)"
  ];

  if (tripType === 'international') {
    tasks.push(
      "Get some local currency before departure",
      "Research current exchange rates",
      "Check foreign transaction fees on cards",
      "Confirm international ATM access"
    );
  }

  return tasks.map(task => `- [ ] ${task}`).join('\n');
}

function getEmergencyKitChecklist(): string {
  return [
    "Emergency cash in local currency",
    "Backup credit card (stored separately)",
    "Emergency contact list",
    "Copy of passport/ID in separate location",
    "Hotel contact information",
    "Embassy contact information (international travel)",
    "Travel insurance hotline number",
    "Basic first aid supplies",
    "Emergency medication"
  ].map(item => `- [ ] ${item}`).join('\n');
}

function getReturnPreparations(): string {
  return [
    "Check-in for return flight 24 hours prior",
    "Confirm transportation home from airport",
    "Research customs regulations for items purchased",
    "Save receipts for expensive purchases",
    "Check airline baggage policies for return",
    "Leave time for final souvenir shopping",
    "Prepare for jet lag and schedule recovery time",
    "Plan grocery shopping for return home"
  ].map(item => `- [ ] ${item}`).join('\n');
}

export const generateTravelChecklistTool = {
  name: "generate_travel_checklist",
  description: "Generate a comprehensive, time-based travel checklist with all preparations needed before and during travel",
  schema: generateTravelChecklistSchema,
  execute: generateTravelChecklist
};
