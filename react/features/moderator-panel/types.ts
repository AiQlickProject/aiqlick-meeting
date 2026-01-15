/**
 * Types for meeting insight generation.
 */

export interface IMeetingInsightInput {
    interviewId?: string;
    meetingId: string;
}

export interface IMatchedSkill {
    demonstratedLevel: string;
    evidence: string;
    skillName: string;
}

export interface ISkillsAssessment {
    matchedSkills: IMatchedSkill[];
    missingSkills: string[];
    overallSkillMatchPercentage: number;
}

export interface ICommunicationAnalysis {
    clarityScore: number;
    confidenceScore: number;
    professionalismScore: number;
}

export interface IOverallRecommendation {
    concernsSummary: string;
    confidenceLevel: string;
    hireRecommendation: string;
    strengthsSummary: string;
    summary: string;
}

export interface IMeetingInsight {
    communicationAnalysis: ICommunicationAnalysis;
    fullReport: string;
    overallRecommendation: IOverallRecommendation;
    skillsAssessment: ISkillsAssessment;
}

export interface IMeetingInsightProcessing {
    __typename: 'MeetingInsightProcessing';
    id: string;
    message: string;
    progress: number;
}

export interface IMeetingInsightSuccess {
    __typename: 'MeetingInsightSuccess';
    id: string;
    insight: IMeetingInsight;
}

export interface IMeetingInsightError {
    code: string;
    message: string;
    recoveryHint: string;
}

export interface IMeetingInsightFailure {
    __typename: 'MeetingInsightFailure';
    error: IMeetingInsightError;
    id: string;
}

export type MeetingInsightResult = IMeetingInsightProcessing | IMeetingInsightSuccess | IMeetingInsightFailure;

export interface IInsightState {
    error: IMeetingInsightError | null;
    insight: IMeetingInsight | null;
    isLoading: boolean;
    progress: number;
    progressMessage: string;
}
