import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { getRoomName } from '../../../base/conference/functions';
import { IconRestore } from '../../../base/icons/svg';
import Button from '../../../base/ui/components/web/Button';
import { insightService } from '../../insightService';
import {
    IInsightState,
    IMeetingInsight,
    MeetingInsightResult
} from '../../types';

const useStyles = makeStyles()(theme => {
    return {
        container: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: theme.spacing(2),
            overflow: 'auto'
        },

        placeholder: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: theme.palette.text02,
            ...theme.typography.bodyShortRegular
        },

        generateButton: {
            marginTop: theme.spacing(2)
        },

        progressContainer: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
        },

        progressBar: {
            width: '100%',
            maxWidth: '200px',
            height: '8px',
            backgroundColor: theme.palette.ui03,
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: theme.spacing(2)
        },

        progressFill: {
            height: '100%',
            backgroundColor: theme.palette.action01,
            transition: 'width 0.3s ease-in-out'
        },

        progressText: {
            color: theme.palette.text02,
            ...theme.typography.bodyShortRegular
        },

        errorContainer: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: theme.palette.textError
        },

        errorMessage: {
            marginBottom: theme.spacing(2)
        },

        insightContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2)
        },

        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing(1)
        },

        headerTitle: {
            ...theme.typography.labelBold,
            color: theme.palette.text01
        },

        section: {
            backgroundColor: theme.palette.ui02,
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(1.5)
        },

        sectionTitle: {
            ...theme.typography.labelBold,
            color: theme.palette.text01,
            marginBottom: theme.spacing(1),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },

        scoreRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${theme.spacing(0.5)} 0`,
            borderBottom: `1px solid ${theme.palette.ui03}`,

            '&:last-child': {
                borderBottom: 'none'
            }
        },

        scoreLabel: {
            color: theme.palette.text02,
            ...theme.typography.bodyShortRegular,
            fontSize: '12px'
        },

        scoreValue: {
            color: theme.palette.text01,
            ...theme.typography.bodyShortBold,
            fontSize: '12px'
        },

        recommendationBadge: {
            display: 'inline-block',
            padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
            borderRadius: theme.shape.borderRadius,
            ...theme.typography.labelBold,
            fontSize: '11px',
            textTransform: 'uppercase'
        },

        recommendHire: {
            backgroundColor: theme.palette.success02,
            color: theme.palette.text01
        },

        recommendNoHire: {
            backgroundColor: theme.palette.actionDanger,
            color: theme.palette.text01
        },

        recommendMaybe: {
            backgroundColor: theme.palette.warning02,
            color: theme.palette.text01
        },

        summary: {
            color: theme.palette.text02,
            ...theme.typography.bodyShortRegular,
            fontSize: '12px',
            marginTop: theme.spacing(1)
        },

        skillsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.5)
        },

        skillItem: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing(0.5),
            backgroundColor: theme.palette.ui01,
            borderRadius: theme.shape.borderRadius,
            fontSize: '12px'
        },

        skillName: {
            color: theme.palette.text01,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(0.5)
        },

        skillLevel: {
            color: theme.palette.text02,
            fontSize: '11px'
        },

        skillMet: {
            color: theme.palette.success02
        },

        skillNotMet: {
            color: theme.palette.textError
        },

        missingSkills: {
            color: theme.palette.textError,
            fontSize: '12px',
            marginTop: theme.spacing(1)
        },

        riskBadge: {
            display: 'inline-block',
            padding: `2px ${theme.spacing(1)}`,
            borderRadius: theme.shape.borderRadius,
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
        },

        riskLow: {
            backgroundColor: theme.palette.success02,
            color: theme.palette.text01
        },

        riskMedium: {
            backgroundColor: theme.palette.warning02,
            color: theme.palette.text01
        },

        riskHigh: {
            backgroundColor: theme.palette.actionDanger,
            color: theme.palette.text01
        },

        topicItem: {
            padding: theme.spacing(0.5),
            marginBottom: theme.spacing(0.5),
            backgroundColor: theme.palette.ui01,
            borderRadius: theme.shape.borderRadius,
            fontSize: '12px'
        },

        topicHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing(0.5)
        },

        topicName: {
            color: theme.palette.text01,
            fontWeight: 'bold'
        },

        qualityBadge: {
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px'
        },

        qualityExcellent: {
            backgroundColor: theme.palette.success02,
            color: theme.palette.text01
        },

        qualityGood: {
            backgroundColor: theme.palette.action01,
            color: theme.palette.text01
        },

        qualityFair: {
            backgroundColor: theme.palette.warning02,
            color: theme.palette.text01
        },

        qualityPoor: {
            backgroundColor: theme.palette.actionDanger,
            color: theme.palette.text01
        },

        keyPoints: {
            color: theme.palette.text02,
            fontSize: '11px',
            paddingLeft: theme.spacing(1)
        },

        concernItem: {
            color: theme.palette.text02,
            fontSize: '12px',
            padding: `${theme.spacing(0.5)} 0`,
            borderBottom: `1px solid ${theme.palette.ui03}`,

            '&:last-child': {
                borderBottom: 'none'
            }
        }
    };
});

const initialState: IInsightState = {
    error: null,
    insight: null,
    isLoading: false,
    progress: 0,
    progressMessage: ''
};

/**
 * Component that renders the insights content with generate button.
 *
 * @returns {React.ReactElement}
 */
const InsightColumn = () => {
    const { classes, cx } = useStyles();
    const { t } = useTranslation();

    const roomName = useSelector((state: IReduxState) => getRoomName(state));
    const apiUrl = useSelector((state: IReduxState) =>
        state['features/base/config'].moderatorPanel?.apiUrl);

    const [ state, setState ] = useState<IInsightState>(initialState);

    // Configure the insight service with the API URL
    useEffect(() => {
        if (apiUrl) {
            insightService.setApiUrl(apiUrl);
        }
    }, [ apiUrl ]);

    const handleGenerateInsight = useCallback(() => {
        if (!roomName) {
            setState(prev => ({
                ...prev,
                error: {
                    code: 'NO_ROOM',
                    message: t('moderatorPanel.noRoomError', 'No meeting room available'),
                    recoveryHint: t('moderatorPanel.joinMeeting', 'Please join a meeting first')
                }
            }));

            return;
        }

        setState({
            ...initialState,
            isLoading: true,
            progressMessage: t('moderatorPanel.startingAnalysis', 'Starting analysis...')
        });

        insightService.generateInsight(
            { meetingId: roomName },
            {
                onComplete: () => {
                    setState(prev => ({
                        ...prev,
                        isLoading: false
                    }));
                },
                onError: error => {
                    setState(prev => ({
                        ...prev,
                        error: {
                            code: 'SUBSCRIPTION_ERROR',
                            message: error.message,
                            recoveryHint: t('moderatorPanel.tryAgain', 'Please try again')
                        },
                        isLoading: false
                    }));
                },
                onResult: (result: MeetingInsightResult) => {
                    switch (result.__typename) {
                    case 'MeetingInsightProcessing':
                        setState(prev => ({
                            ...prev,
                            progress: result.progress,
                            progressMessage: result.message
                        }));
                        break;

                    case 'MeetingInsightSuccess':
                        setState(prev => ({
                            ...prev,
                            insight: result.insight,
                            isLoading: false,
                            progress: 100
                        }));
                        break;

                    case 'MeetingInsightFailure':
                        setState(prev => ({
                            ...prev,
                            error: result.error,
                            isLoading: false
                        }));
                        break;
                    }
                }
            }
        );
    }, [ roomName, t ]);

    const getRecommendationClass = (recommendation: string) => {
        const upper = recommendation.toUpperCase();

        if (upper === 'STRONG_YES' || upper === 'YES') {
            return classes.recommendHire;
        }
        if (upper === 'STRONG_NO' || upper === 'NO') {
            return classes.recommendNoHire;
        }

        return classes.recommendMaybe;
    };

    const getRiskClass = (risk: string) => {
        switch (risk.toUpperCase()) {
        case 'LOW': return classes.riskLow;
        case 'MEDIUM': return classes.riskMedium;
        case 'HIGH': return classes.riskHigh;
        default: return classes.riskMedium;
        }
    };

    const getQualityClass = (quality: string) => {
        switch (quality.toUpperCase()) {
        case 'EXCELLENT': return classes.qualityExcellent;
        case 'GOOD': return classes.qualityGood;
        case 'FAIR': return classes.qualityFair;
        case 'POOR': return classes.qualityPoor;
        default: return classes.qualityFair;
        }
    };

    const renderInsight = (insight: IMeetingInsight) => (
        <div className = { classes.insightContainer }>
            <div className = { classes.header }>
                <span className = { classes.headerTitle }>
                    { t('moderatorPanel.analysisComplete', 'Analysis Complete') }
                </span>
                <Button
                    accessibilityLabel = { t('moderatorPanel.regenerate', 'Regenerate') }
                    icon = { IconRestore }
                    onClick = { handleGenerateInsight }
                    size = 'small'
                    type = 'secondary' />
            </div>

            {/* Recommendation Section */}
            {insight.overallRecommendation && (
                <div className = { classes.section }>
                    <div className = { classes.sectionTitle }>
                        { t('moderatorPanel.recommendation', 'Recommendation') }
                    </div>
                    <span
                        className = { cx(
                            classes.recommendationBadge,
                            getRecommendationClass(insight.overallRecommendation.hireRecommendation)
                        ) }>
                        { insight.overallRecommendation.hireRecommendation.replace('_', ' ') }
                    </span>
                    <div className = { classes.summary }>
                        { insight.overallRecommendation.summary }
                    </div>
                </div>
            )}

            {/* Communication Scores - scores are 0-10 */}
            {insight.communicationAnalysis && (
                <div className = { classes.section }>
                    <div className = { classes.sectionTitle }>
                        { t('moderatorPanel.communication', 'Communication') }
                    </div>
                    <div className = { classes.scoreRow }>
                        <span className = { classes.scoreLabel }>
                            { t('moderatorPanel.clarity', 'Clarity') }
                        </span>
                        <span className = { classes.scoreValue }>
                            { insight.communicationAnalysis.clarityScore }/10
                        </span>
                    </div>
                    <div className = { classes.scoreRow }>
                        <span className = { classes.scoreLabel }>
                            { t('moderatorPanel.confidence', 'Confidence') }
                        </span>
                        <span className = { classes.scoreValue }>
                            { insight.communicationAnalysis.confidenceScore }/10
                        </span>
                    </div>
                    <div className = { classes.scoreRow }>
                        <span className = { classes.scoreLabel }>
                            { t('moderatorPanel.professionalism', 'Professionalism') }
                        </span>
                        <span className = { classes.scoreValue }>
                            { insight.communicationAnalysis.professionalismScore }/10
                        </span>
                    </div>
                    {insight.communicationAnalysis.communicationStyle && (
                        <div className = { classes.summary }>
                            <strong>Style:</strong> { insight.communicationAnalysis.communicationStyle }
                        </div>
                    )}
                </div>
            )}

            {/* Skills Assessment */}
            {insight.skillsAssessment && (
                <div className = { classes.section }>
                    <div className = { classes.sectionTitle }>
                        <span>{ t('moderatorPanel.skills', 'Skills') }</span>
                        <span>{ insight.skillsAssessment.overallSkillMatchPercentage }%</span>
                    </div>
                    <div className = { classes.skillsList }>
                        {insight.skillsAssessment.matchedSkills?.slice(0, 5).map((skill, index) => (
                            <div
                                className = { classes.skillItem }
                                key = { index }>
                                <span className = { classes.skillName }>
                                    <span className = { skill.meetsRequirement ? classes.skillMet : classes.skillNotMet }>
                                        { skill.meetsRequirement ? '✓' : '✗' }
                                    </span>
                                    { skill.skillName }
                                </span>
                                <span className = { classes.skillLevel }>{ skill.demonstratedLevel }</span>
                            </div>
                        ))}
                    </div>
                    {insight.skillsAssessment.missingSkills?.length > 0 && (
                        <div className = { classes.missingSkills }>
                            Missing: { insight.skillsAssessment.missingSkills.slice(0, 3).join(', ') }
                        </div>
                    )}
                </div>
            )}

            {/* Key Topics */}
            {insight.keyTopicsSummary
                && insight.keyTopicsSummary.mainTopicsDiscussed
                && insight.keyTopicsSummary.mainTopicsDiscussed.length > 0 && (
                <div className = { classes.section }>
                    <div className = { classes.sectionTitle }>
                        { t('moderatorPanel.keyTopics', 'Key Topics') }
                    </div>
                    {insight.keyTopicsSummary.mainTopicsDiscussed.slice(0, 3).map((topic, index) => (
                        <div
                            className = { classes.topicItem }
                            key = { index }>
                            <div className = { classes.topicHeader }>
                                <span className = { classes.topicName }>{ topic.topic }</span>
                                <span
                                    className = { cx(
                                        classes.qualityBadge,
                                        getQualityClass(topic.candidateResponseQuality)
                                    ) }>
                                    { topic.candidateResponseQuality }
                                </span>
                            </div>
                            {topic.keyPoints?.length > 0 && (
                                <div className = { classes.keyPoints }>
                                    • { topic.keyPoints[0] }
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Red Flags & Concerns */}
            {insight.redFlagsAndConcerns && (
                <div className = { classes.section }>
                    <div className = { classes.sectionTitle }>
                        <span>{ t('moderatorPanel.concerns', 'Concerns') }</span>
                        <span
                            className = { cx(
                                classes.riskBadge,
                                getRiskClass(insight.redFlagsAndConcerns.overallRiskLevel)
                            ) }>
                            { insight.redFlagsAndConcerns.overallRiskLevel } RISK
                        </span>
                    </div>
                    {insight.redFlagsAndConcerns.behavioralConcerns?.slice(0, 2).map((concern, index) => (
                        <div
                            className = { classes.concernItem }
                            key = { index }>
                            • { concern }
                        </div>
                    ))}
                    {insight.redFlagsAndConcerns.experienceGaps?.slice(0, 2).map((gap, index) => (
                        <div
                            className = { classes.concernItem }
                            key = { `gap-${index}` }>
                            • Gap: { gap }
                        </div>
                    ))}
                    {(insight.redFlagsAndConcerns.behavioralConcerns?.length === 0
                        && insight.redFlagsAndConcerns.experienceGaps?.length === 0) && (
                        <div className = { classes.summary }>No significant concerns identified.</div>
                    )}
                </div>
            )}
        </div>
    );

    // Show loading/progress state
    if (state.isLoading) {
        return (
            <div className = { classes.container }>
                <div className = { classes.progressContainer }>
                    <div className = { classes.progressBar }>
                        <div
                            className = { classes.progressFill }
                            style = {{ width: `${state.progress}%` }} />
                    </div>
                    <span className = { classes.progressText }>
                        { state.progressMessage || t('moderatorPanel.analyzing', 'Analyzing...') }
                    </span>
                </div>
            </div>
        );
    }

    // Show error state
    if (state.error) {
        return (
            <div className = { classes.container }>
                <div className = { classes.errorContainer }>
                    <p className = { classes.errorMessage }>{ state.error.message }</p>
                    {state.error.recoveryHint && <p>{ state.error.recoveryHint }</p>}
                    <Button
                        accessibilityLabel = { t('moderatorPanel.tryAgain', 'Try Again') }
                        label = { t('moderatorPanel.tryAgain', 'Try Again') }
                        onClick = { handleGenerateInsight }
                        type = 'secondary' />
                </div>
            </div>
        );
    }

    // Show insight results
    if (state.insight) {
        return (
            <div className = { classes.container }>
                { renderInsight(state.insight) }
            </div>
        );
    }

    // Show placeholder with generate button
    return (
        <div className = { classes.container }>
            <div className = { classes.placeholder }>
                <p>{ t('moderatorPanel.insightsPlaceholder', 'Generate AI-powered insights from this meeting') }</p>
                <Button
                    accessibilityLabel = { t('moderatorPanel.generateInsights', 'Generate Insights') }
                    className = { classes.generateButton }
                    label = { t('moderatorPanel.generateInsights', 'Generate Insights') }
                    onClick = { handleGenerateInsight } />
            </div>
        </div>
    );
};

export default InsightColumn;
