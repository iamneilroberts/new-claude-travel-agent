export const searchAirportTransfersTool = {
  name: 'search_airport_transfers',
  description: 'Searches for airport transfer options between airports and locations using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      startType: { type: 'string', enum: ['AIRPORT', 'COORDINATES'] },
      endType: { type: 'string', enum: ['AIRPORT', 'COORDINATES'] },
      transferDate: { type: 'string' },
      startIataCode: { type: 'string' },
      startLatitude: { type: 'number' },
      startLongitude: { type: 'number' },
      endIataCode: { type: 'string' },
      endLatitude: { type: 'number' },
      endLongitude: { type: 'number' },
      passengers: { type: 'number', default: 1 }
    },
    required: ['startType', 'endType', 'transferDate']
  },
  execute: async (params, env) => {
    return {
      content: [{
        type: 'text',
        text: `❌ Tool 'search_airport_transfers' is not yet implemented.\n\nThis feature requires the Amadeus Airport Transfer API which may not be available in your current API subscription.\n\nFor transportation options, consider using other travel booking platforms or search for ground transportation separately.`
      }],
      isError: true
    };
  }
};
