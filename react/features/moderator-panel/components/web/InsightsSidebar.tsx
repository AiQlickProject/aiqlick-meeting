import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { isMobileBrowser } from '../../../base/environment/utils';
import Icon from '../../../base/icons/components/Icon';
import { IconArrowLeft, IconArrowRight } from '../../../base/icons/svg';
import { isLocalParticipantModerator } from '../../../base/participants/functions';
import { toggleInsightsSidebar } from '../../actions';
import { COLUMN_WIDTH, SM_BREAKPOINT } from '../../constants';
import { isInsightsSidebarOpen } from '../../functions';

import InsightColumn from './InsightColumn';

const useStyles = makeStyles()(theme => {
    return {
        wrapper: {
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
            flexShrink: 0,
            position: 'relative',

            [`@media (max-width: ${SM_BREAKPOINT}px)`]: {
                display: 'none'
            }
        },

        insightsSidebar: {
            backgroundColor: theme.palette.ui01,
            display: 'flex',
            flexDirection: 'column',
            width: `${COLUMN_WIDTH}px`,
            height: '100%',
            flexShrink: 0,
            borderLeft: `1px solid ${theme.palette.ui03}`,
            zIndex: 1,
            transition: 'width .2s ease-in-out, opacity .2s ease-in-out',
            overflow: 'hidden'
        },

        collapsed: {
            width: 0,
            opacity: 0,
            border: 'none'
        },

        toggleButton: {
            position: 'absolute',
            top: '70%',
            left: '-16px',
            transform: 'translateY(-50%)',
            zIndex: 2,
            backgroundColor: theme.palette.ui01,
            borderRadius: '4px 0 0 4px',
            border: `1px solid ${theme.palette.ui03}`,
            borderRight: 'none',
            padding: '8px 4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'left .2s ease-in-out',

            '&:hover': {
                backgroundColor: theme.palette.ui02
            }
        },

        toggleButtonCollapsed: {
            left: '-32px',
            borderRight: `1px solid ${theme.palette.ui03}`,
            borderRadius: '4px'
        },

        header: {
            alignItems: 'center',
            boxSizing: 'border-box',
            display: 'flex',
            height: '60px',
            padding: `0 ${theme.spacing(3)}`,
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.palette.ui03}`,
            ...theme.typography.heading6,
            color: theme.palette.text01
        },

        content: {
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }
    };
});

/**
 * Component that renders the insights sidebar.
 * Only visible to moderators. Can be collapsed.
 *
 * @returns {React.ReactElement|null}
 */
const InsightsSidebar = () => {
    const { classes, cx } = useStyles();
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const isModerator = useSelector(isLocalParticipantModerator);
    const isOpen = useSelector(isInsightsSidebarOpen);
    const reducedUI = useSelector((state: IReduxState) => state['features/base/responsive-ui'].reducedUI);

    const onToggle = useCallback(() => {
        dispatch(toggleInsightsSidebar());
    }, [ dispatch ]);

    // Only render for moderators on non-mobile devices
    if (!isModerator || reducedUI || isMobileBrowser()) {
        return null;
    }

    return (
        <div className = { classes.wrapper }>
            <div
                aria-label = { isOpen ? t('moderatorPanel.hideInsights', 'Hide insights') : t('moderatorPanel.showInsights', 'Show insights') }
                className = { cx(classes.toggleButton, !isOpen && classes.toggleButtonCollapsed) }
                onClick = { onToggle }
                role = 'button'
                tabIndex = { 0 }>
                <Icon
                    size = { 20 }
                    src = { isOpen ? IconArrowRight : IconArrowLeft } />
            </div>
            <div
                className = { cx(classes.insightsSidebar, !isOpen && classes.collapsed) }
                id = 'insights-sidebar'>
                <div className = { classes.header }>
                    <span>{ t('moderatorPanel.insights', 'Insights') }</span>
                </div>
                <div className = { classes.content }>
                    <InsightColumn />
                </div>
            </div>
        </div>
    );
};

export default InsightsSidebar;
