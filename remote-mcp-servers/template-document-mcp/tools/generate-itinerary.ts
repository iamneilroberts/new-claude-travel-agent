import { z } from "zod";

export const generateItinerarySchema = z.object({
  title: z.string().describe("Travel itinerary title"),
  destination: z.string().describe("Primary destination"),
  start_date: z.string().describe("Trip start date (YYYY-MM-DD)"),
  end_date: z.string().describe("Trip end date (YYYY-MM-DD)"),
  travelers: z.array(z.object({
    name: z.string(),
    type: z.enum(["adult", "child", "infant"]).optional()
  })).describe("List of travelers"),
  activities: z.array(z.object({
    date: z.string(),
    time: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    cost: z.string().optional()
  })).describe("Daily activities"),
  accommodation: z.array(z.object({
    name: z.string(),
    check_in: z.string(),
    check_out: z.string(),
    address: z.string().optional(),
    confirmation: z.string().optional()
  })).optional().describe("Hotel/accommodation details"),
  flights: z.array(z.object({
    date: z.string(),
    departure: z.string(),
    arrival: z.string(),
    flight_number: z.string().optional(),
    confirmation: z.string().optional()
  })).optional().describe("Flight information"),
  notes: z.string().optional().describe("Additional travel notes")
});

export async function generateItinerary(params: z.infer<typeof generateItinerarySchema>): Promise<any> {
  const duration = calculateDuration(params.start_date, params.end_date);
  const travelerCount = params.travelers.length;

  const itinerary = `# ${params.title}

## Trip Overview
- **Destination**: ${params.destination}
- **Dates**: ${formatDate(params.start_date)} - ${formatDate(params.end_date)} (${duration} days)
- **Travelers**: ${travelerCount} ${travelerCount === 1 ? 'person' : 'people'}

## Travelers
${params.travelers.map(t => `- ${t.name}${t.type ? ` (${t.type})` : ''}`).join('\n')}

${params.flights && params.flights.length > 0 ? `## Flights
${params.flights.map(f => `### ${formatDate(f.date)}
- **${f.departure} → ${f.arrival}**
- Flight: ${f.flight_number || 'TBD'}
- Confirmation: ${f.confirmation || 'Pending'}`).join('\n\n')}

` : ''}${params.accommodation && params.accommodation.length > 0 ? `## Accommodation
${params.accommodation.map(a => `### ${a.name}
- **Check-in**: ${formatDate(a.check_in)}
- **Check-out**: ${formatDate(a.check_out)}
- **Address**: ${a.address || 'TBD'}
- **Confirmation**: ${a.confirmation || 'Pending'}`).join('\n\n')}

` : ''}## Daily Itinerary

${generateDailySchedule(params.activities, params.start_date, params.end_date)}

${params.notes ? `## Additional Notes
${params.notes}

` : ''}## Travel Checklist
- [ ] Passport/ID verification
- [ ] Flight confirmations
- [ ] Hotel confirmations
- [ ] Travel insurance
- [ ] Local currency/payment methods
- [ ] Emergency contacts
- [ ] Medication/prescriptions
- [ ] Phone/data plan for destination

---
*Generated on ${new Date().toLocaleDateString()}*`;

  return {
    content: [{
      type: "text",
      text: itinerary
    }]
  };
}

function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

function generateDailySchedule(activities: any[], startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: string[] = [];

  const activitiesByDate = activities.reduce((acc, activity) => {
    if (!acc[activity.date]) {
      acc[activity.date] = [];
    }
    acc[activity.date].push(activity);
    return acc;
  }, {} as Record<string, any[]>);

  let currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayActivities = activitiesByDate[dateStr] || [];

    days.push(`### ${formatDate(dateStr)}
${dayActivities.length > 0
  ? dayActivities.map((a: any) =>
      `- **${a.time ? a.time + ' - ' : ''}${a.title}**${a.location ? ` at ${a.location}` : ''}${a.description ? `\n  ${a.description}` : ''}${a.cost ? `\n  *Cost: ${a.cost}*` : ''}`
    ).join('\n')
  : '- Free day / Travel day'
}`);

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days.join('\n\n');
}

export const generateItineraryTool = {
  name: "generate_itinerary",
  description: "Generate a comprehensive travel itinerary document with flights, accommodation, activities, and checklists",
  schema: generateItinerarySchema,
  execute: generateItinerary
};
