/* eslint-disable @typescript-eslint/naming-convention */
import logger from './logger';
import { IMeetingInsightInput, MeetingInsightResult } from './types';

// GraphQL subscription query - complete with all fields from API documentation
const GENERATE_MEETING_INSIGHT_SUBSCRIPTION = `
subscription GenerateMeetingInsight($input: MeetingInsightInput!) {
  generateMeetingInsight(input: $input) {
    ... on MeetingInsightProcessing {
      id
      status
      message
      progress
    }
    ... on MeetingInsightSuccess {
      id
      status
      insight {
        id
        meetingId
        version
        status
        fullReport
        skillsAssessment {
          overallSkillMatchPercentage
          skillSummary
          matchedSkills {
            skillName
            demonstratedLevel
            evidence
            meetsRequirement
          }
          missingSkills
          additionalSkillsDemonstrated
        }
        communicationAnalysis {
          clarityScore
          confidenceScore
          professionalismScore
          communicationStyle
          strengths
          areasForImprovement
          notableQuotes
          overallAssessment
        }
        keyTopicsSummary {
          mainTopicsDiscussed {
            topic
            candidateResponseQuality
            keyPoints
          }
          questionsAsked
          candidateQuestions
          topicsNotCovered
        }
        redFlagsAndConcerns {
          inconsistencies {
            description
            severity
            context
          }
          experienceGaps
          behavioralConcerns
          followUpQuestionsRecommended
          overallRiskLevel
        }
        overallRecommendation {
          hireRecommendation
          confidenceLevel
          summary
          strengthsSummary
          concernsSummary
        }
        transcriptLength
        processingTimeMs
        llmModel
        llmTokensUsed
        generatedAt
      }
    }
    ... on MeetingInsightFailure {
      id
      status
      error {
        code
        message
        timestamp
        recoveryHint
      }
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
    private apiUrl: string | null = null;
    private ws: WebSocket | null = null;
    private wsUrl: string | null = null;

    /**
     * Set the API URL and derive the WebSocket URL for GraphQL subscriptions.
     *
     * @param {string} apiUrl - The base API URL (e.g., https://ai.aiqlick.com).
     * @returns {void}
     */
    setApiUrl(apiUrl: string): void {
        this.apiUrl = apiUrl;

        // Convert https://ai.aiqlick.com to wss://ai.aiqlick.com/graphql
        this.wsUrl = apiUrl.replace(/^http/, 'ws') + '/graphql';
        logger.info(`Insight service configured with API URL: ${apiUrl}, WS URL: ${this.wsUrl}`);
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
            callbacks.onError(new Error('API URL not configured. Please set moderatorPanel.apiUrl in config.'));

            return () => { /* no-op */ };
        }

        // Cancel any existing subscription
        this.cancelSubscription();

        let receivedData = false;
        let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

        // Set connection timeout (30 seconds)
        connectionTimeout = setTimeout(() => {
            if (!receivedData) {
                logger.error('Connection timeout - no response received');
                callbacks.onError(new Error(
                    'Connection timeout. The server did not respond in time. Please try again.'
                ));
                this.cancelSubscription();
            }
        }, 30000);

        const clearConnectionTimeout = () => {
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
        };

        try {
            logger.info(`Connecting to GraphQL subscription at: ${this.wsUrl}`);
            this.ws = new WebSocket(this.wsUrl, 'graphql-transport-ws');

            this.ws.onopen = () => {
                if (!this.ws) {
                    return;
                }

                logger.info('WebSocket connected, sending connection_init');

                // Send connection init
                this.ws.send(JSON.stringify({
                    type: 'connection_init',
                    payload: {}
                }));
            };

            this.ws.onmessage = (event: { data?: string }) => {
                try {
                    const message = JSON.parse(event.data ?? '');

                    logger.debug('Received message:', message.type);

                    switch (message.type) {
                    case 'connection_ack':
                        // Connection acknowledged, send subscription
                        logger.info('Connection acknowledged, starting subscription');
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
                            receivedData = true;
                            clearConnectionTimeout();
                            const result = message.payload.data.generateMeetingInsight;

                            logger.debug('Received insight result:', result.__typename);
                            callbacks.onResult(result);
                        }
                        break;

                    case 'error':
                        // Subscription error
                        clearConnectionTimeout();
                        logger.error('GraphQL subscription error:', message.payload);
                        callbacks.onError(new Error(
                            message.payload?.[0]?.message || 'Subscription error'
                        ));
                        break;

                    case 'complete':
                        // Subscription completed
                        clearConnectionTimeout();
                        logger.info('Insight subscription completed');
                        if (!receivedData) {
                            // Subscription completed without sending any data
                            callbacks.onError(new Error(
                                'No insight data received. The meeting may not have '
                                + 'enough transcript data yet. Please try again later.'
                            ));
                        } else {
                            callbacks.onComplete();
                        }
                        this.cancelSubscription();
                        break;

                    default:
                        logger.debug('Unknown message type:', message.type);
                    }
                } catch (err) {
                    logger.error('Error parsing WebSocket message:', err);
                }
            };

            this.ws.onerror = () => {
                clearConnectionTimeout();
                logger.error('WebSocket error');
                callbacks.onError(new Error(
                    'Failed to connect to the insight service. '
                    + 'Please check your network connection and try again.'
                ));
            };

            this.ws.onclose = (event: { code?: number; reason?: string; wasClean?: boolean }) => {
                clearConnectionTimeout();
                logger.info('WebSocket closed:', event.code, event.reason);
                if (!event.wasClean) {
                    callbacks.onError(new Error(
                        `Connection lost unexpectedly${event.reason ? `: ${event.reason}` : ''}. `
                        + 'Please try again.'
                    ));
                }
            };
        } catch (err) {
            clearConnectionTimeout();
            logger.error('Failed to create WebSocket:', err);
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }

        return () => {
            clearConnectionTimeout();
            this.cancelSubscription();
        };
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
