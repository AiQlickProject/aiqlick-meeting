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
            padding: theme.spacing(3),
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
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2)
        },

        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing(2)
        },

        section: {
            backgroundColor: theme.palette.ui02,
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(2)
        },

        sectionTitle: {
            ...theme.typography.labelBold,
            color: theme.palette.text01,
            marginBottom: theme.spacing(1)
        },

        scoreRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${theme.spacing(1)} 0`,
            borderBottom: `1px solid ${theme.palette.ui03}`,

            '&:last-child': {
                borderBottom: 'none'
            }
        },

        scoreLabel: {
            color: theme.palette.text02,
            ...theme.typography.bodyShortRegular
        },

        scoreValue: {
            color: theme.palette.text01,
            ...theme.typography.bodyShortBold
        },

        recommendationBadge: {
            display: 'inline-block',
            padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
            borderRadius: theme.shape.borderRadius,
            ...theme.typography.labelBold,
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
            marginTop: theme.spacing(1)
        },

        skillsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(1)
        },

        skillItem: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing(1),
            backgroundColor: theme.palette.ui01,
            borderRadius: theme.shape.borderRadius
        },

        skillName: {
            color: theme.palette.text01,
            ...theme.typography.bodyShortRegular
        },

        skillLevel: {
            color: theme.palette.text02,
            ...theme.typography.labelRegular
        },

        missingSkills: {
            color: theme.palette.textError,
            ...theme.typography.bodyShortRegular
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
    const graphqlWsUrl = useSelector((state: IReduxState) =>
        state['features/base/config'].moderatorPanel?.graphqlWsUrl);

    const [ state, setState ] = useState<IInsightState>(initialState);

    // Configure the insight service with the WebSocket URL
    useEffect(() => {
        if (graphqlWsUrl) {
            insightService.setWsUrl(graphqlWsUrl);
        }
    }, [ graphqlWsUrl ]);

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
        const lower = recommendation.toLowerCase();

        if (lower.includes('hire') && !lower.includes('no')) {
            return classes.recommendHire;
        }
        if (lower.includes('no') || lower.includes('reject')) {
            return classes.recommendNoHire;
        }

        return classes.recommendMaybe;
    };

    const renderInsight = (insight: IMeetingInsight) => (
        <div className = { classes.insightContainer }>
            <div className = { classes.header }>
                <span>{ t('moderatorPanel.analysisComplete', 'Analysis Complete') }</span>
                <Button
                    accessibilityLabel = { t('moderatorPanel.regenerate', 'Regenerate') }
                    icon = { IconRestore }
                    onClick = { handleGenerateInsight }
                    size = 'small'
                    type = 'secondary' />
            </div>

            {/* Recommendation Section */}
            <div className = { classes.section }>
                <div className = { classes.sectionTitle }>
                    { t('moderatorPanel.recommendation', 'Recommendation') }
                </div>
                <span className = { cx(
                    classes.recommendationBadge,
                    getRecommendationClass(insight.overallRecommendation.hireRecommendation)
                ) }>
                    { insight.overallRecommendation.hireRecommendation }
                </span>
                <div className = { classes.summary }>
                    { insight.overallRecommendation.summary }
                </div>
            </div>

            {/* Communication Scores */}
            <div className = { classes.section }>
                <div className = { classes.sectionTitle }>
                    { t('moderatorPanel.communication', 'Communication') }
                </div>
                <div className = { classes.scoreRow }>
                    <span className = { classes.scoreLabel }>
                        { t('moderatorPanel.clarity', 'Clarity') }
                    </span>
                    <span className = { classes.scoreValue }>
                        { insight.communicationAnalysis.clarityScore }%
                    </span>
                </div>
                <div className = { classes.scoreRow }>
                    <span className = { classes.scoreLabel }>
                        { t('moderatorPanel.confidence', 'Confidence') }
                    </span>
                    <span className = { classes.scoreValue }>
                        { insight.communicationAnalysis.confidenceScore }%
                    </span>
                </div>
                <div className = { classes.scoreRow }>
                    <span className = { classes.scoreLabel }>
                        { t('moderatorPanel.professionalism', 'Professionalism') }
                    </span>
                    <span className = { classes.scoreValue }>
                        { insight.communicationAnalysis.professionalismScore }%
                    </span>
                </div>
            </div>

            {/* Skills Assessment */}
            <div className = { classes.section }>
                <div className = { classes.sectionTitle }>
                    { t('moderatorPanel.skills', 'Skills') } ({insight.skillsAssessment.overallSkillMatchPercentage}% { t('moderatorPanel.match', 'match') })
                </div>
                <div className = { classes.skillsList }>
                    {insight.skillsAssessment.matchedSkills.slice(0, 5).map((skill, index) => (
                        <div
                            className = { classes.skillItem }
                            key = { index }>
                            <span className = { classes.skillName }>{ skill.skillName }</span>
                            <span className = { classes.skillLevel }>{ skill.demonstratedLevel }</span>
                        </div>
                    ))}
                </div>
                {insight.skillsAssessment.missingSkills.length > 0 && (
                    <div className = { classes.missingSkills }>
                        { t('moderatorPanel.missingSkills', 'Missing') }: {insight.skillsAssessment.missingSkills.join(', ')}
                    </div>
                )}
            </div>
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
