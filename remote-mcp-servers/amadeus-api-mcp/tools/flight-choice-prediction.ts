import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';

interface Env {
  AMADEUS_API_KEY: string;
  AMADEUS_API_SECRET: string;
  CACHE: any;
}

const inputSchema = z.object({
  flightOffers: z.array(z.record(z.any())).describe('Array of flight offers to predict choice probability for')
});

async function flightChoicePrediction(params: z.infer<typeof inputSchema>, env: Env): Promise<string> {
  try {
    const amadeus = await getAmadeusClient(env);
    const response = await amadeus.post('/v2/shopping/flight-offers/prediction', {
      data: params.flightOffers
    });

    if (!response.data) {
      const errorResult = {
        error: 'No prediction data received from Amadeus API',
        details: response
      };
      return JSON.stringify(errorResult, null, 2);
    }

    const predictions = response.data.map((prediction: any, index: number) => {
      const choiceProb = prediction.choiceProbability || 0;
      const confidence = choiceProb > 0.7 ? 'High' : choiceProb > 0.4 ? 'Medium' : 'Low';
      
      return {
        flightOfferIndex: index,
        choiceProbability: choiceProb,
        confidenceLevel: confidence,
        recommendation: choiceProb > 0.6 ? 
          'Highly likely to be chosen - great option for booking' :
          choiceProb > 0.3 ?
          'Moderate choice probability - consider comparing alternatives' :
          'Lower choice probability - may want to explore other options',
        offer: params.flightOffers[index]
      };
    });

    // Sort by choice probability descending
    predictions.sort((a: any, b: any) => b.choiceProbability - a.choiceProbability);

    const result = {
      predictions,
      summary: {
        totalOffers: predictions.length,
        topChoice: predictions[0],
        averageProbability: predictions.reduce((sum: number, p: any) => sum + p.choiceProbability, 0) / predictions.length
      },
      note: 'Choice predictions are based on AI analysis of booking patterns and traveler preferences'
    };

    return JSON.stringify(result, null, 2);

  } catch (error: any) {
    const errorResult = {
      error: 'Failed to get flight choice predictions',
      details: error.message || error,
      suggestion: 'Ensure flight offers are valid and properly formatted'
    };
    return JSON.stringify(errorResult, null, 2);
  }
}

export const flightChoicePredictionTool = {
  name: 'flight_choice_prediction',
  description: 'Get AI-powered predictions on which flight offers travelers are most likely to choose based on booking patterns and preferences',
  schema: {
    type: 'object',
    properties: {
      flightOffers: {
        type: 'array',
        items: { type: 'object' },
        description: 'Array of flight offers to predict choice probability for'
      }
    },
    required: ['flightOffers'],
    additionalProperties: false
  },
  execute: async (params: any, env: Env) => {
    const result = await flightChoicePrediction(params, env);
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }
};