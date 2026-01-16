/**
 * Types for meeting insight generation.
 * Based on API documentation for Transcriptions & Meeting Insights.
 */

// Enums
export type InsightStatus = 'GENERATING' | 'COMPLETED' | 'FAILED' | 'STALE';
export type HireRecommendation = 'STRONG_YES' | 'YES' | 'MAYBE' | 'NO' | 'STRONG_NO';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type DemonstratedLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type ResponseQuality = 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';

// Input types
export interface IMeetingInsightInput {
    interviewId?: string;
    meetingId: string;
}

// Skills Assessment
export interface IMatchedSkill {
    demonstratedLevel: DemonstratedLevel;
    evidence: string;
    meetsRequirement: boolean;
    skillName: string;
}

export interface ISkillsAssessment {
    additionalSkillsDemonstrated: string[];
    matchedSkills: IMatchedSkill[];
    missingSkills: string[];
    overallSkillMatchPercentage: number;
    skillSummary: string;
}

// Communication Analysis
export interface ICommunicationAnalysis {
    areasForImprovement: string[];
    clarityScore: number; // 0-10
    communicationStyle: string;
    confidenceScore: number; // 0-10
    notableQuotes: string[];
    overallAssessment: string;
    professionalismScore: number; // 0-10
    strengths: string[];
}

// Key Topics Summary
export interface ITopicDiscussed {
    candidateResponseQuality: ResponseQuality;
    keyPoints: string[];
    topic: string;
}

export interface IKeyTopicsSummary {
    candidateQuestions: string[];
    mainTopicsDiscussed: ITopicDiscussed[];
    questionsAsked: string[];
    topicsNotCovered: string[];
}

// Red Flags and Concerns
export interface IInconsistency {
    context: string;
    description: string;
    severity: RiskLevel;
}

export interface IRedFlagsAndConcerns {
    behavioralConcerns: string[];
    experienceGaps: string[];
    followUpQuestionsRecommended: string[];
    inconsistencies: IInconsistency[];
    overallRiskLevel: RiskLevel;
}

// Overall Recommendation
export interface IOverallRecommendation {
    concernsSummary: string;
    confidenceLevel: ConfidenceLevel;
    hireRecommendation: HireRecommendation;
    strengthsSummary: string;
    summary: string;
}

// Full Meeting Insight
export interface IMeetingInsight {
    communicationAnalysis?: ICommunicationAnalysis;
    createdAt?: string;
    fullReport?: string;
    generatedAt?: string;
    id: string;
    interviewId?: string;
    keyTopicsSummary?: IKeyTopicsSummary;
    llmModel?: string;
    llmTokensUsed?: number;
    meetingId: string;
    overallRecommendation?: IOverallRecommendation;
    processingTimeMs?: number;
    redFlagsAndConcerns?: IRedFlagsAndConcerns;
    skillsAssessment?: ISkillsAssessment;
    status: InsightStatus;
    transcriptLength?: number;
    version: number;
}

// Subscription response types
export interface IMeetingInsightProcessing {
    __typename: 'MeetingInsightProcessing';
    id: string;
    message: string;
    progress: number;
    status: string;
}

export interface IMeetingInsightSuccess {
    __typename: 'MeetingInsightSuccess';
    id: string;
    insight: IMeetingInsight;
    status: string;
}

export interface IMeetingInsightError {
    code: string;
    message: string;
    recoveryHint: string;
    timestamp?: string;
}

export interface IMeetingInsightFailure {
    __typename: 'MeetingInsightFailure';
    error: IMeetingInsightError;
    id: string;
    status: string;
}

export type MeetingInsightResult = IMeetingInsightProcessing | IMeetingInsightSuccess | IMeetingInsightFailure;

// Component state
export interface IInsightState {
    error: IMeetingInsightError | null;
    insight: IMeetingInsight | null;
    isLoading: boolean;
    progress: number;
    progressMessage: string;
}
