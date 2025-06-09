/**
 * Travel Workflow Implementation
 * Sprint: S02_M03_Implementation - Travel Workflow Phase
 * 
 * Implements specialized travel industry workflows:
 * - Mobile lead processing with data extraction
 * - Client follow-up automation with intelligent scheduling
 * - Three-tier proposal generation with pricing
 * - Document generation integration
 */

import { templateEngine } from './template-engine.js';
import { chainExecutor, ChainDefinition, ExecutionContext } from './chain-executor.js';

export interface TravelWorkflowResult {
  workflowType: string;
  status: 'completed' | 'failed' | 'in_progress' | 'requires_attention';
  outputs: Record<string, any>;
  clientId?: string;
  sessionId?: string;
  nextActions: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';
  metadata: {
    processingTime: number;
    stepsCompleted: number;
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    automationLevel: number; // 0-100% automated
  };
}

export interface LeadData {
  clientName: string;
  destination?: string;
  travelDates?: string;
  travelerCount?: string;
  budgetRange?: string;
  tripType?: string;
  specialRequests?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    preferredContact?: 'phone' | 'email' | 'text';
  };
  urgency?: 'low' | 'medium' | 'high';
  source?: 'phone' | 'web' | 'referral' | 'social';
}

export interface FollowupContext {
  clientId: string;
  clientName: string;
  destination: string;
  proposalSentDate: string;
  lastContactDate?: string;
  responseStatus: 'pending' | 'responded' | 'booking_confirmed' | 'declined';
  clientType: 'first_time' | 'returning' | 'vip' | 'corporate';
  travelDates: string;
  proposalType?: 'initial' | 'revised' | 'final';
}

export class TravelWorkflowProcessor {
  
  /**
   * Process mobile lead from raw message input
   */
  async processMobileLead(
    rawMessage: string, 
    agentInfo: { name: string; email: string; phone?: string },
    options?: { 
      validateData?: boolean; 
      autoScheduleFollowup?: boolean;
      extractContactInfo?: boolean;
    }
  ): Promise<TravelWorkflowResult> {
    const startTime = Date.now();
    console.log('Processing mobile lead from raw message...');

    try {
      // Step 1: Extract structured data from raw message
      const leadData = this.extractLeadDataFromMessage(rawMessage);
      
      // Step 2: Validate and enhance data quality
      if (options?.validateData) {
        this.validateAndEnhanceLeadData(leadData);
      }

      // Step 3: Generate client profile data
      const clientProfile = this.generateClientProfile(leadData, agentInfo);

      // Step 4: Create welcome email content
      const welcomeEmailContent = await this.generateWelcomeEmail(leadData, agentInfo);

      // Step 5: Determine next actions based on data quality
      const nextActions = this.determineNextActions(leadData, options);

      const processingTime = Date.now() - startTime;
      const dataQuality = this.assessDataQuality(leadData);

      return {
        workflowType: 'mobile_lead_processing',
        status: dataQuality === 'poor' ? 'requires_attention' : 'completed',
        outputs: {
          leadData,
          clientProfile,
          welcomeEmailContent,
          extractedContactInfo: options?.extractContactInfo ? leadData.contactInfo : undefined
        },
        clientId: clientProfile.clientId,
        sessionId: clientProfile.sessionId,
        nextActions,
        urgencyLevel: leadData.urgency || 'medium',
        metadata: {
          processingTime,
          stepsCompleted: 5,
          dataQuality,
          automationLevel: dataQuality === 'excellent' ? 95 : dataQuality === 'good' ? 80 : 60
        }
      };

    } catch (error) {
      console.error('Mobile lead processing failed:', error);
      return {
        workflowType: 'mobile_lead_processing',
        status: 'failed',
        outputs: { error: error instanceof Error ? error.message : 'Unknown error' },
        nextActions: ['manual_review_required', 'contact_agent'],
        urgencyLevel: 'high',
        metadata: {
          processingTime: Date.now() - startTime,
          stepsCompleted: 0,
          dataQuality: 'poor',
          automationLevel: 0
        }
      };
    }
  }

  /**
   * Process client follow-up workflow
   */
  async processClientFollowup(
    followupContext: FollowupContext,
    agentInfo: { name: string; email: string },
    options?: {
      followupType?: 'gentle' | 'standard' | 'urgent';
      includeProposalSummary?: boolean;
      suggestAlternatives?: boolean;
    }
  ): Promise<TravelWorkflowResult> {
    const startTime = Date.now();
    console.log(`Processing client follow-up for ${followupContext.clientName}...`);

    try {
      // Step 1: Analyze follow-up timing and context
      const followupAnalysis = this.analyzeFollowupTiming(followupContext);
      
      // Step 2: Determine appropriate follow-up strategy
      const followupStrategy = this.determineFollowupStrategy(followupContext, followupAnalysis, options);
      
      // Step 3: Generate personalized follow-up message
      const followupMessage = await this.generateFollowupMessage(followupContext, followupStrategy, agentInfo);
      
      // Step 4: Schedule next follow-up if needed
      const nextFollowupSchedule = this.scheduleNextFollowup(followupContext, followupStrategy);
      
      // Step 5: Determine call-to-action based on context
      const callToAction = this.generateCallToAction(followupContext, followupStrategy);

      const processingTime = Date.now() - startTime;
      const urgencyLevel = this.calculateFollowupUrgency(followupContext, followupAnalysis);

      return {
        workflowType: 'client_followup',
        status: 'completed',
        outputs: {
          followupMessage,
          followupStrategy,
          callToAction,
          nextFollowupSchedule,
          followupAnalysis
        },
        clientId: followupContext.clientId,
        nextActions: [
          'send_followup_email',
          nextFollowupSchedule.recommended ? 'schedule_next_followup' : 'monitor_response',
          urgencyLevel === 'urgent' ? 'escalate_to_manager' : 'track_engagement'
        ],
        urgencyLevel,
        metadata: {
          processingTime,
          stepsCompleted: 5,
          dataQuality: 'good',
          automationLevel: 85
        }
      };

    } catch (error) {
      console.error('Client follow-up processing failed:', error);
      return {
        workflowType: 'client_followup',
        status: 'failed',
        outputs: { error: error instanceof Error ? error.message : 'Unknown error' },
        clientId: followupContext.clientId,
        nextActions: ['manual_followup_required', 'review_client_context'],
        urgencyLevel: 'high',
        metadata: {
          processingTime: Date.now() - startTime,
          stepsCompleted: 0,
          dataQuality: 'poor',
          automationLevel: 0
        }
      };
    }
  }

  /**
   * Generate three-tier travel proposal workflow
   */
  async generateThreeTierProposal(
    clientRequirements: {
      clientName: string;
      destination: string;
      travelDates: string;
      travelerCount: string;
      budgetRange: string;
      tripType?: string;
      specialRequests?: string;
    },
    agentInfo: { name: string; email: string; phone?: string },
    options?: {
      includePriceBreakdown?: boolean;
      addUpgrades?: boolean;
      customizeByClientType?: boolean;
    }
  ): Promise<TravelWorkflowResult> {
    const startTime = Date.now();
    console.log(`Generating three-tier proposal for ${clientRequirements.clientName}...`);

    try {
      // Step 1: Calculate base pricing from budget range
      const basePricing = this.calculateBasePricing(clientRequirements.budgetRange);
      
      // Step 2: Research destination and generate tier details
      const tierDetails = await this.generateTierDetails(clientRequirements, basePricing, options);
      
      // Step 3: Generate proposal document using template
      const proposalDocument = await this.generateProposalDocument(clientRequirements, tierDetails, agentInfo);
      
      // Step 4: Create pricing summary and comparison
      const pricingComparison = this.createPricingComparison(tierDetails);
      
      // Step 5: Generate presentation materials
      const presentationMaterials = this.generatePresentationMaterials(tierDetails, clientRequirements);

      const processingTime = Date.now() - startTime;

      return {
        workflowType: 'three_tier_proposal',
        status: 'completed',
        outputs: {
          proposalDocument,
          tierDetails,
          pricingComparison,
          presentationMaterials,
          basePricing
        },
        nextActions: [
          'send_proposal_to_client',
          'schedule_proposal_review_call',
          'setup_followup_reminder',
          'log_proposal_activity'
        ],
        urgencyLevel: 'medium',
        metadata: {
          processingTime,
          stepsCompleted: 5,
          dataQuality: 'excellent',
          automationLevel: 90
        }
      };

    } catch (error) {
      console.error('Three-tier proposal generation failed:', error);
      return {
        workflowType: 'three_tier_proposal',
        status: 'failed',
        outputs: { error: error instanceof Error ? error.message : 'Unknown error' },
        nextActions: ['manual_proposal_creation', 'contact_pricing_team'],
        urgencyLevel: 'high',
        metadata: {
          processingTime: Date.now() - startTime,
          stepsCompleted: 0,
          dataQuality: 'poor',
          automationLevel: 0
        }
      };
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Extract structured lead data from raw message
   */
  private extractLeadDataFromMessage(rawMessage: string): LeadData {
    const leadData: LeadData = {
      clientName: '',
      source: 'phone' // Default for mobile leads
    };

    // Extract client name (common patterns)
    const namePatterns = [
      /(?:client|customer|traveler)?\s*(?:name|called)?\s*(?:is|:)?\s*([A-Z][a-z]+ [A-Z][a-z]+)/i,
      /^([A-Z][a-z]+ [A-Z][a-z]+)/,
      /for ([A-Z][a-z]+ [A-Z][a-z]+)/i
    ];

    for (const pattern of namePatterns) {
      const match = rawMessage.match(pattern);
      if (match) {
        leadData.clientName = match[1].trim();
        break;
      }
    }

    // Extract destination
    const destinationPatterns = [
      /(?:to|visiting|going to|destination)\s+([A-Z][a-z,\s]+)/i,
      /trip to ([A-Z][a-z,\s]+)/i,
      /vacation in ([A-Z][a-z,\s]+)/i
    ];

    for (const pattern of destinationPatterns) {
      const match = rawMessage.match(pattern);
      if (match) {
        leadData.destination = match[1].trim().replace(/\.$/, '');
        break;
      }
    }

    // Extract travel dates
    const datePatterns = [
      /(?:dates?|when|traveling)\s*:?\s*([A-Z][a-z]+ \d+(?:-\d+)?(?:, \d{4})?)/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(next month|next year|summer|winter|fall|spring)/i
    ];

    for (const pattern of datePatterns) {
      const match = rawMessage.match(pattern);
      if (match) {
        leadData.travelDates = match[1].trim();
        break;
      }
    }

    // Extract traveler count
    const travelerPatterns = [
      /(\d+)\s*(?:people|travelers|adults|guests|pax)/i,
      /party of (\d+)/i,
      /(couple|family of \d+|solo)/i
    ];

    for (const pattern of travelerPatterns) {
      const match = rawMessage.match(pattern);
      if (match) {
        leadData.travelerCount = match[1].trim();
        break;
      }
    }

    // Extract budget
    const budgetPatterns = [
      /budget\s*:?\s*\$?([\d,]+(?:-[\d,]+)?)/i,
      /spending\s*:?\s*\$?([\d,]+)/i,
      /up to \$?([\d,]+)/i
    ];

    for (const pattern of budgetPatterns) {
      const match = rawMessage.match(pattern);
      if (match) {
        leadData.budgetRange = '$' + match[1].trim();
        break;
      }
    }

    // Extract trip type
    const tripTypePatterns = [
      /(honeymoon|anniversary|business|family|vacation|getaway|retreat)/i,
      /(romantic|adventure|luxury|budget|cultural)/i
    ];

    for (const pattern of tripTypePatterns) {
      const match = rawMessage.match(pattern);
      if (match) {
        leadData.tripType = match[1].toLowerCase();
        break;
      }
    }

    // Extract contact info
    const phonePattern = /(\d{3}[-.]?\d{3}[-.]?\d{4})/;
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    
    const phoneMatch = rawMessage.match(phonePattern);
    const emailMatch = rawMessage.match(emailPattern);
    
    if (phoneMatch || emailMatch) {
      leadData.contactInfo = {
        phone: phoneMatch ? phoneMatch[1] : undefined,
        email: emailMatch ? emailMatch[1] : undefined,
        preferredContact: phoneMatch ? 'phone' : 'email'
      };
    }

    // Assess urgency from keywords
    if (/urgent|asap|soon|quickly|rush/i.test(rawMessage)) {
      leadData.urgency = 'high';
    } else if (/flexible|sometime|eventually/i.test(rawMessage)) {
      leadData.urgency = 'low';
    } else {
      leadData.urgency = 'medium';
    }

    return leadData;
  }

  /**
   * Validate and enhance lead data quality
   */
  private validateAndEnhanceLeadData(leadData: LeadData): void {
    // Enhance client name formatting
    if (leadData.clientName) {
      leadData.clientName = leadData.clientName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Standardize destination format
    if (leadData.destination) {
      leadData.destination = leadData.destination
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Enhance traveler count format
    if (leadData.travelerCount) {
      const count = leadData.travelerCount.toLowerCase();
      if (count === 'couple') leadData.travelerCount = '2 adults';
      else if (count === 'solo') leadData.travelerCount = '1 adult';
      else if (/^\d+$/.test(count)) leadData.travelerCount = `${count} adults`;
    }

    // Standardize budget format
    if (leadData.budgetRange && !leadData.budgetRange.startsWith('$')) {
      leadData.budgetRange = '$' + leadData.budgetRange;
    }
  }

  /**
   * Generate client profile from lead data
   */
  private generateClientProfile(leadData: LeadData, agentInfo: { name: string; email: string }): any {
    const timestamp = new Date().toISOString();
    return {
      clientId: 'CL-' + Date.now().toString(36),
      sessionId: 'Session-' + new Date().toISOString().split('T')[0] + '-' + Math.random().toString(36).substr(2, 5),
      clientName: leadData.clientName,
      destination: leadData.destination,
      travelDates: leadData.travelDates,
      travelerCount: leadData.travelerCount,
      budgetRange: leadData.budgetRange,
      tripType: leadData.tripType,
      specialRequests: leadData.specialRequests,
      contactInfo: leadData.contactInfo,
      source: leadData.source,
      urgency: leadData.urgency,
      assignedAgent: agentInfo.name,
      agentEmail: agentInfo.email,
      createdAt: timestamp,
      status: 'new_lead'
    };
  }

  /**
   * Generate welcome email content
   */
  private async generateWelcomeEmail(leadData: LeadData, agentInfo: { name: string; email: string }): Promise<string> {
    const template = `Dear {client_name},

Thank you for choosing Somo Travel for your upcoming {trip_type} to {destination}! 

I'm {agent_name}, your dedicated travel consultant, and I'm excited to help you create an unforgettable experience.

**Your Trip Details:**
- Destination: {destination}
- Travel Dates: {travel_dates}
- Number of Travelers: {traveler_count}
- Budget Range: {budget_range}

**Next Steps:**
1. I'll be preparing three customized proposal options for you
2. Each proposal will include different service levels to match your preferences
3. I'll follow up within {followup_timeframe} with your personalized options

If you have any questions or additional requirements, please don't hesitate to reach out!

Best regards,
{agent_name}
{agency_name}
{contact_info}`;

    const variables = {
      client_name: leadData.clientName || 'Valued Client',
      trip_type: leadData.tripType || 'trip',
      destination: leadData.destination || 'your desired destination',
      agent_name: agentInfo.name,
      travel_dates: leadData.travelDates || 'your preferred dates',
      traveler_count: leadData.travelerCount || 'your group',
      budget_range: leadData.budgetRange || 'your budget',
      followup_timeframe: '24-48 hours',
      agency_name: 'Somo Travel',
      contact_info: agentInfo.email
    };

    const result = templateEngine.render(template, variables);
    return result.success ? result.content : template;
  }

  /**
   * Determine next actions based on lead data quality
   */
  private determineNextActions(leadData: LeadData, options?: any): string[] {
    const actions: string[] = [];
    
    if (!leadData.clientName) {
      actions.push('request_client_name');
    }
    
    if (!leadData.destination) {
      actions.push('clarify_destination');
    }
    
    if (!leadData.travelDates) {
      actions.push('confirm_travel_dates');
    }
    
    if (!leadData.budgetRange) {
      actions.push('discuss_budget_range');
    }
    
    if (!leadData.contactInfo?.email && !leadData.contactInfo?.phone) {
      actions.push('collect_contact_information');
    }

    // Standard follow-up actions
    actions.push('send_welcome_email');
    
    if (options?.autoScheduleFollowup) {
      actions.push('schedule_followup_call');
    }
    
    actions.push('create_client_profile');
    actions.push('log_lead_activity');

    return actions;
  }

  /**
   * Assess the quality of extracted lead data
   */
  private assessDataQuality(leadData: LeadData): 'excellent' | 'good' | 'fair' | 'poor' {
    let score = 0;
    
    if (leadData.clientName) score += 20;
    if (leadData.destination) score += 20;
    if (leadData.travelDates) score += 15;
    if (leadData.travelerCount) score += 10;
    if (leadData.budgetRange) score += 15;
    if (leadData.contactInfo?.email || leadData.contactInfo?.phone) score += 20;
    
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Analyze follow-up timing and context
   */
  private analyzeFollowupTiming(context: FollowupContext): any {
    const now = new Date();
    const proposalDate = new Date(context.proposalSentDate);
    const daysSinceProposal = Math.floor((now.getTime() - proposalDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      daysSinceProposal,
      isOverdue: daysSinceProposal > 7,
      isUrgent: daysSinceProposal > 14,
      timeCategory: daysSinceProposal <= 3 ? 'recent' : daysSinceProposal <= 7 ? 'standard' : 'overdue',
      recommendedAction: daysSinceProposal <= 2 ? 'wait' : daysSinceProposal <= 7 ? 'gentle_followup' : 'active_followup'
    };
  }

  /**
   * Determine appropriate follow-up strategy
   */
  private determineFollowupStrategy(context: FollowupContext, analysis: any, options?: any): any {
    const strategy = {
      tone: 'professional',
      urgency: 'medium',
      approach: 'standard',
      includeIncentive: false,
      suggestCall: false
    };

    // Adjust based on client type
    if (context.clientType === 'vip') {
      strategy.tone = 'personalized';
      strategy.approach = 'premium';
    } else if (context.clientType === 'first_time') {
      strategy.tone = 'welcoming';
      strategy.approach = 'educational';
    }

    // Adjust based on timing
    if (analysis.daysSinceProposal > 14) {
      strategy.urgency = 'high';
      strategy.includeIncentive = true;
      strategy.suggestCall = true;
    } else if (analysis.daysSinceProposal > 7) {
      strategy.urgency = 'medium';
      strategy.suggestCall = true;
    }

    // Apply options
    if (options?.followupType) {
      strategy.urgency = options.followupType === 'urgent' ? 'high' : options.followupType === 'gentle' ? 'low' : 'medium';
    }

    return strategy;
  }

  /**
   * Generate personalized follow-up message
   */
  private async generateFollowupMessage(context: FollowupContext, strategy: any, agentInfo: { name: string }): Promise<string> {
    const template = `Hi {client_name},

I wanted to follow up on the {proposal_type} I sent for your {destination} trip on {proposal_date}.

{followup_message}

**Quick Reminder of Your Trip:**
- Destination: {destination}
- Dates: {travel_dates}
- Travelers: {traveler_count}

{call_to_action}

I'm here to answer any questions and make adjustments to ensure this trip is perfect for you!

Best,
{agent_name}`;

    const followupMessages = {
      recent: "I hope you've had a chance to review the options. I'd love to hear your initial thoughts!",
      standard: "I hope you've had time to review the proposal. I'm excited to hear what resonates with you most!",
      overdue: "I wanted to check in about your travel plans. I know these decisions take time, and I'm here to help with any questions."
    };

    const callToActions = {
      low: "Feel free to reach out when you're ready to discuss the details.",
      medium: "Would you like to schedule a quick call this week to discuss the options?",
      high: "I'd love to schedule a call to discuss how we can make this trip perfect for you. Are you available this week?"
    };

    const variables = {
      client_name: context.clientName,
      proposal_type: 'travel proposal',
      destination: context.destination,
      proposal_date: new Date(context.proposalSentDate).toLocaleDateString(),
      followup_message: followupMessages[strategy.approach as keyof typeof followupMessages] || followupMessages.standard,
      travel_dates: context.travelDates,
      traveler_count: '2 adults', // Default, should come from context
      call_to_action: callToActions[strategy.urgency as keyof typeof callToActions] || callToActions.medium,
      agent_name: agentInfo.name
    };

    const result = templateEngine.render(template, variables);
    return result.success ? result.content : template;
  }

  /**
   * Schedule next follow-up based on strategy
   */
  private scheduleNextFollowup(context: FollowupContext, strategy: any): any {
    const now = new Date();
    const nextFollowupDate = new Date(now);
    
    if (strategy.urgency === 'high') {
      nextFollowupDate.setDate(now.getDate() + 3);
    } else if (strategy.urgency === 'medium') {
      nextFollowupDate.setDate(now.getDate() + 7);
    } else {
      nextFollowupDate.setDate(now.getDate() + 14);
    }

    return {
      recommended: strategy.urgency !== 'low',
      date: nextFollowupDate.toISOString(),
      type: strategy.urgency === 'high' ? 'urgent_followup' : 'standard_followup',
      method: strategy.suggestCall ? 'phone_call' : 'email'
    };
  }

  /**
   * Generate appropriate call-to-action
   */
  private generateCallToAction(context: FollowupContext, strategy: any): string {
    if (strategy.urgency === 'high') {
      return "I'd love to connect this week to finalize your travel plans. When would be a good time for a quick call?";
    } else if (strategy.suggestCall) {
      return "Would you like to schedule a call to discuss the proposal in more detail?";
    } else {
      return "Please let me know if you have any questions or if you'd like to move forward with any of the options.";
    }
  }

  /**
   * Calculate follow-up urgency level
   */
  private calculateFollowupUrgency(context: FollowupContext, analysis: any): 'low' | 'medium' | 'high' | 'urgent' {
    if (analysis.daysSinceProposal > 21) return 'urgent';
    if (analysis.daysSinceProposal > 14) return 'high';
    if (analysis.daysSinceProposal > 7) return 'medium';
    return 'low';
  }

  /**
   * Calculate base pricing from budget range
   */
  private calculateBasePricing(budgetRange: string): any {
    // Extract numeric value from budget string
    const match = budgetRange.match(/\$?([\d,]+)(?:-[\d,]+)?/);
    const baseAmount = match ? parseInt(match[1].replace(/,/g, '')) : 5000;

    return {
      basePrice: baseAmount,
      classicPrice: Math.round(baseAmount * 0.75),
      premiumPrice: Math.round(baseAmount * 1.10),
      luxuryPrice: Math.round(baseAmount * 1.75)
    };
  }

  /**
   * Generate tier details for three-tier proposal
   */
  private async generateTierDetails(requirements: any, pricing: any, options?: any): Promise<any> {
    return {
      classic: {
        name: 'Classic Package',
        price: pricing.classicPrice,
        description: 'Essential travel experience with comfortable accommodations and key activities',
        inclusions: [
          'Round-trip flights',
          '3-star hotel accommodations',
          'Airport transfers',
          'Daily breakfast',
          'City tour',
          '24/7 support'
        ],
        hotels: 'Comfortable 3-star properties in central locations',
        activities: 'Essential sightseeing and cultural experiences'
      },
      premium: {
        name: 'Premium Package',
        price: pricing.premiumPrice,
        description: 'Enhanced experience with upgraded accommodations and additional activities',
        inclusions: [
          'Round-trip flights (preferred seating)',
          '4-star hotel accommodations',
          'Private airport transfers',
          'Daily breakfast + 3 dinners',
          'Private city tour',
          'Spa treatment',
          'Concierge services',
          '24/7 priority support'
        ],
        hotels: 'Upscale 4-star hotels with premium amenities',
        activities: 'Private tours and exclusive experiences'
      },
      luxury: {
        name: 'Luxury Package',
        price: pricing.luxuryPrice,
        description: 'Ultimate luxury experience with premium accommodations and VIP treatment',
        inclusions: [
          'Round-trip business class flights',
          '5-star luxury hotel accommodations',
          'Private luxury transfers',
          'All meals included',
          'Private guide for all tours',
          'Daily spa treatments',
          'Personal concierge',
          'VIP access and experiences',
          '24/7 luxury support'
        ],
        hotels: 'Luxury 5-star resorts and boutique properties',
        activities: 'Exclusive VIP experiences and private access'
      }
    };
  }

  /**
   * Generate proposal document using template
   */
  private async generateProposalDocument(requirements: any, tierDetails: any, agentInfo: any): Promise<string> {
    const template = `# Travel Proposal: {destination}
**Prepared for:** {client_name}  
**Travel Dates:** {travel_dates}  
**Travelers:** {traveler_count}

## Classic Package - ${tierDetails.classic.price}
*{classic_description}*

**Included:**
{classic_inclusions}

**Hotels:** {classic_hotels}
**Activities:** {classic_activities}

---

## Premium Package - ${tierDetails.premium.price}  
*{premium_description}*

**Included:**
{premium_inclusions}

**Hotels:** {premium_hotels}
**Activities:** {premium_activities}

---

## Luxury Package - ${tierDetails.luxury.price}
*{luxury_description}*

**Included:**
{luxury_inclusions}

**Hotels:** {luxury_hotels}
**Activities:** {luxury_activities}

---

**Next Steps:**
Please review these options and let me know which package interests you most. I can customize any option to better fit your preferences!

{agent_signature}`;

    const variables = {
      client_name: requirements.clientName,
      destination: requirements.destination,
      travel_dates: requirements.travelDates,
      traveler_count: requirements.travelerCount,
      classic_description: tierDetails.classic.description,
      classic_inclusions: tierDetails.classic.inclusions.map((item: string) => `- ${item}`).join('\n'),
      classic_hotels: tierDetails.classic.hotels,
      classic_activities: tierDetails.classic.activities,
      premium_description: tierDetails.premium.description,
      premium_inclusions: tierDetails.premium.inclusions.map((item: string) => `- ${item}`).join('\n'),
      premium_hotels: tierDetails.premium.hotels,
      premium_activities: tierDetails.premium.activities,
      luxury_description: tierDetails.luxury.description,
      luxury_inclusions: tierDetails.luxury.inclusions.map((item: string) => `- ${item}`).join('\n'),
      luxury_hotels: tierDetails.luxury.hotels,
      luxury_activities: tierDetails.luxury.activities,
      agent_signature: `Best regards,\n${agentInfo.name}\nSomo Travel\n${agentInfo.email}`
    };

    const result = templateEngine.render(template, variables);
    return result.success ? result.content : template;
  }

  /**
   * Create pricing comparison for the three tiers
   */
  private createPricingComparison(tierDetails: any): any {
    return {
      summary: {
        classic: tierDetails.classic.price,
        premium: tierDetails.premium.price,
        luxury: tierDetails.luxury.price
      },
      valueAnalysis: {
        classicValue: 'Best budget option with essential experiences',
        premiumValue: 'Best overall value with enhanced comfort and experiences',
        luxuryValue: 'Ultimate experience with VIP treatment and exclusive access'
      },
      savings: {
        premiumVsLuxury: tierDetails.luxury.price - tierDetails.premium.price,
        classicVsPremium: tierDetails.premium.price - tierDetails.classic.price
      }
    };
  }

  /**
   * Generate presentation materials for the proposal
   */
  private generatePresentationMaterials(tierDetails: any, requirements: any): any {
    return {
      executiveSummary: `Three-tier travel proposal for ${requirements.clientName}'s ${requirements.destination} trip`,
      keyHighlights: [
        `Destination: ${requirements.destination}`,
        `Travel Dates: ${requirements.travelDates}`,
        `Travelers: ${requirements.travelerCount}`,
        `Price Range: $${tierDetails.classic.price} - $${tierDetails.luxury.price}`
      ],
      recommendedTier: 'premium',
      reasoning: 'Premium package offers the best balance of value, comfort, and experiences for most travelers'
    };
  }
}

// Export singleton instance
export const travelWorkflowProcessor = new TravelWorkflowProcessor();