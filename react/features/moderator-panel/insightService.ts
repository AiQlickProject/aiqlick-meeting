/* eslint-disable @typescript-eslint/naming-convention */
import logger from './logger';
import { IMeetingInsightInput, MeetingInsightResult } from './types';

// GraphQL subscription query
const GENERATE_MEETING_INSIGHT_SUBSCRIPTION = `
subscription GenerateMeetingInsight($input: MeetingInsightInput!) {
  generateMeetingInsight(input: $input) {
    __typename
    ... on MeetingInsightProcessing {
      id
      progress
      message
    }
    ... on MeetingInsightSuccess {
      id
      insight {
        fullReport
        skillsAssessment {
          overallSkillMatchPercentage
          matchedSkills { skillName demonstratedLevel evidence }
          missingSkills
        }
        communicationAnalysis {
          clarityScore
          confidenceScore
          professionalismScore
        }
        overallRecommendation {
          hireRecommendation
          confidenceLevel
          summary
          strengthsSummary
          concernsSummary
        }
      }
    }
    ... on MeetingInsightFailure {
      id
      error { code message recoveryHint }
    }
  }
}
`;

interface IInsightServiceCallbacks {
    onComplete: () => void;
    onError: (error: Error) => void;
    onResult: (result: MeetingInsightResult) => void;
}

/**
 * Service to handle GraphQL subscriptions for meeting insights.
 * Uses graphql-ws protocol over native WebSocket.
 */
class InsightService {
    private wsUrl: string | null = null;
    private ws: WebSocket | null = null;

    /**
     * Set the WebSocket URL for GraphQL subscriptions.
     *
     * @param {string} url - The WebSocket URL.
     * @returns {void}
     */
    setWsUrl(url: string): void {
        this.wsUrl = url;
    }

    /**
     * Generate meeting insights via GraphQL subscription.
     *
     * @param {IMeetingInsightInput} input - The input containing meetingId and optional interviewId.
     * @param {IInsightServiceCallbacks} callbacks - Callbacks for handling results.
     * @returns {Function} Cleanup function to cancel the subscription.
     */
    generateInsight(
            input: IMeetingInsightInput,
            callbacks: IInsightServiceCallbacks
    ): () => void {
        if (!this.wsUrl) {
            callbacks.onError(new Error('GraphQL WebSocket URL not configured'));

            return () => { /* no-op */ };
        }

        // Cancel any existing subscription
        this.cancelSubscription();

        try {
            this.ws = new WebSocket(this.wsUrl, 'graphql-transport-ws');

            this.ws.onopen = () => {
                if (!this.ws) {
                    return;
                }

                // Send connection init
                this.ws.send(JSON.stringify({
                    type: 'connection_init',
                    payload: {}
                }));
            };

            this.ws.onmessage = event => {
                try {
                    const message = JSON.parse(event.data);

                    switch (message.type) {
                    case 'connection_ack':
                        // Connection acknowledged, send subscription
                        if (this.ws) {
                            this.ws.send(JSON.stringify({
                                id: '1',
                                payload: {
                                    query: GENERATE_MEETING_INSIGHT_SUBSCRIPTION,
                                    variables: { input }
                                },
                                type: 'subscribe'
                            }));
                        }
                        break;

                    case 'next':
                        // Subscription data received
                        if (message.payload?.data?.generateMeetingInsight) {
                            callbacks.onResult(message.payload.data.generateMeetingInsight);
                        }
                        break;

                    case 'error':
                        // Subscription error
                        logger.error('GraphQL subscription error:', message.payload);
                        callbacks.onError(new Error(
                            message.payload?.[0]?.message || 'Subscription error'
                        ));
                        break;

                    case 'complete':
                        // Subscription completed
                        logger.info('Insight subscription completed');
                        callbacks.onComplete();
                        this.cancelSubscription();
                        break;

                    default:
                        logger.debug('Unknown message type:', message.type);
                    }
                } catch (err) {
                    logger.error('Error parsing WebSocket message:', err);
                }
            };

            this.ws.onerror = event => {
                logger.error('WebSocket error:', event);
                callbacks.onError(new Error('WebSocket connection error'));
            };

            this.ws.onclose = event => {
                logger.info('WebSocket closed:', event.code, event.reason);

                // Check wasClean safely - it exists in browser CloseEvent but not in React Native WebSocketCloseEvent
                const wasClean = 'wasClean' in event ? event.wasClean : true;

                if (!wasClean) {
                    callbacks.onError(new Error(`WebSocket closed unexpectedly: ${event.reason}`));
                }
            };
        } catch (err) {
            logger.error('Failed to create WebSocket:', err);
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }

        return () => this.cancelSubscription();
    }

    /**
     * Cancel the current subscription.
     *
     * @returns {void}
     */
    cancelSubscription(): void {
        if (this.ws) {
            try {
                // Send complete message before closing
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        id: '1',
                        type: 'complete'
                    }));
                }
                this.ws.close();
            } catch (err) {
                logger.error('Error closing WebSocket:', err);
            }
            this.ws = null;
        }
    }
}

// Export singleton instance
export const insightService = new InsightService();

export default InsightService;
