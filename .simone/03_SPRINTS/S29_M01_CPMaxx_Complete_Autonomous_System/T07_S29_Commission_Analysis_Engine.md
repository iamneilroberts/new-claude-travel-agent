# Task T07: Build Commission Analysis Engine

## Objective
Implement a comprehensive commission analysis system that calculates and compares commission potential across all providers and booking types.

## Requirements

### 1. Commission Calculator Architecture
```typescript
interface CommissionAnalyzer {
  // Analyze single search result
  analyzeCommission(searchId: string): Promise<CommissionAnalysis>;
  
  // Compare commissions across multiple searches
  compareCommissions(searchIds: string[]): Promise<CommissionComparison>;
  
  // Calculate optimal booking strategy
  recommendBookingStrategy(searchId: string): Promise<BookingRecommendation>;
  
  // Get commission rates by provider
  getCommissionRates(): CommissionRateTable;
}
```

### 2. Commission Rate Configuration
```typescript
const COMMISSION_RATES = {
  packages: {
    delta: {
      base: 0.10,  // 10% base commission
      preferred: 0.12,  // 12% for preferred agents
      volume: {
        threshold: 50000,  // Annual sales threshold
        rate: 0.13  // 13% for high volume
      }
    },
    apple: {
      base: 0.11,
      preferred: 0.13,
      promotions: {
        'early-booking': 0.02,  // +2% for 90+ days advance
        'group': 0.01  // +1% for 10+ passengers
      }
    },
    american: {
      base: 0.10,
      preferred: 0.12
    }
  },
  components: {
    hotels: {
      cpmaxx: 0.10,
      direct: 0.08,
      allInclusive: 0.12
    },
    flights: {
      published: 0.01,  // 1% on published fares
      consolidated: 0.05,  // 5% on consolidated
      business: 0.07  // 7% on business class
    },
    cars: {
      base: 0.08,
      insurance: 0.15  // 15% on insurance products
    },
    cruises: {
      base: 0.12,
      luxury: 0.15,
      groups: 0.14
    },
    tours: {
      base: 0.10,
      multiDay: 0.12,
      private: 0.15
    }
  },
  serviceCharges: {
    recommended: {
      domestic: 35,
      international: 50,
      complex: 75,
      group: 100
    }
  }
};
```

### 3. Commission Analysis Implementation
```typescript
class CommissionAnalysisEngine implements CommissionAnalyzer {
  async analyzeCommission(searchId: string): Promise<CommissionAnalysis> {
    const searchData = await this.storage.getSearch(searchId);
    if (!searchData || !searchData.results) {
      throw new Error('Search results not found');
    }
    
    const analysis: CommissionAnalysis = {
      searchId,
      provider: searchData.provider,
      totalResults: searchData.results.length,
      commissionBreakdown: []
    };
    
    // Analyze each result
    for (const result of searchData.results) {
      const commission = this.calculateCommission(result, searchData.provider);
      analysis.commissionBreakdown.push(commission);
    }
    
    // Calculate summary statistics
    analysis.summary = {
      averageCommission: this.calculateAverage(analysis.commissionBreakdown),
      highestCommission: this.findHighest(analysis.commissionBreakdown),
      lowestCommission: this.findLowest(analysis.commissionBreakdown),
      potentialServiceCharges: this.calculateServiceCharges(searchData.request)
    };
    
    return analysis;
  }
  
  private calculateCommission(result: any, provider: string): ItemCommission {
    const basePrice = result.pricing.total;
    const commissionRate = this.getCommissionRate(provider, result);
    const commission = basePrice * commissionRate;
    
    return {
      itemId: result.id,
      itemName: result.name || result.hotelName || 'Package',
      basePrice,
      commissionRate,
      commissionAmount: commission,
      promotionalBonus: this.calculatePromotionalBonus(result, provider),
      totalCommission: commission + this.calculatePromotionalBonus(result, provider)
    };
  }
  
  async compareCommissions(searchIds: string[]): Promise<CommissionComparison> {
    const analyses = await Promise.all(
      searchIds.map(id => this.analyzeCommission(id))
    );
    
    return {
      searchIds,
      comparisonDate: new Date().toISOString(),
      providers: analyses.map(a => a.provider),
      highestCommissionOption: this.findBestOption(analyses),
      averageCommissionByProvider: this.groupByProvider(analyses),
      recommendations: this.generateRecommendations(analyses)
    };
  }
  
  async recommendBookingStrategy(searchId: string): Promise<BookingRecommendation> {
    const analysis = await this.analyzeCommission(searchId);
    const searchData = await this.storage.getSearch(searchId);
    
    return {
      searchId,
      strategy: this.determineStrategy(analysis, searchData),
      reasoning: this.explainStrategy(analysis, searchData),
      projectedCommission: analysis.summary.highestCommission,
      suggestedServiceCharge: this.suggestServiceCharge(searchData.request),
      alternativeOptions: this.findAlternatives(analysis),
      upsellOpportunities: this.identifyUpsells(searchData.results)
    };
  }
}
```

### 4. MCP Tool Implementation
```typescript
{
  name: "analyze_commission",
  description: "Analyze commission potential for search results",
  inputSchema: {
    type: "object",
    properties: {
      searchId: { type: "string", description: "Search ID to analyze" },
      includeRecommendations: { type: "boolean", default: true },
      compareWithComponents: { type: "boolean", default: false }
    },
    required: ["searchId"]
  }
}

// Tool handler
async function handleCommissionAnalysis(args: any) {
  const analyzer = new CommissionAnalysisEngine();
  const analysis = await analyzer.analyzeCommission(args.searchId);
  
  if (args.includeRecommendations) {
    const recommendation = await analyzer.recommendBookingStrategy(args.searchId);
    analysis.recommendation = recommendation;
  }
  
  if (args.compareWithComponents) {
    // Calculate if booking components separately would yield more commission
    analysis.componentComparison = await analyzer.comparePackageVsComponents(args.searchId);
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(analysis, null, 2)
    }]
  };
}
```

### 5. Advanced Features
- Historical commission tracking
- Seasonal commission variations
- Group booking commission calculations
- Loyalty program impact on commissions
- Commission forecasting based on booking patterns

## Success Metrics
- Accurate commission calculations
- Clear recommendations provided
- Package vs component analysis available
- Service charge suggestions appropriate
- Upsell opportunities identified