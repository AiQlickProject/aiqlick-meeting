import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { isMobileBrowser } from '../../../base/environment/utils';
import { IconArrowLeft, IconArrowRight } from '../../../base/icons/svg';
import { isLocalParticipantModerator } from '../../../base/participants/functions';
import Icon from '../../../base/icons/components/Icon';
import { toggleParticipantsPanel } from '../../actions';
import { COLUMN_WIDTH, SM_BREAKPOINT } from '../../constants';
import { isParticipantsPanelOpen } from '../../functions';

import ParticipantColumn from './ParticipantColumn';

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

        moderatorPanel: {
            backgroundColor: theme.palette.ui01,
            display: 'flex',
            flexDirection: 'column',
            width: `${COLUMN_WIDTH}px`,
            height: '100%',
            flexShrink: 0,
            borderRight: `1px solid ${theme.palette.ui03}`,
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
            top: '30%',
            right: '-16px',
            transform: 'translateY(-50%)',
            zIndex: 2,
            backgroundColor: theme.palette.ui01,
            borderRadius: '0 4px 4px 0',
            border: `1px solid ${theme.palette.ui03}`,
            borderLeft: 'none',
            padding: '8px 4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'right .2s ease-in-out',

            '&:hover': {
                backgroundColor: theme.palette.ui02
            }
        },

        toggleButtonCollapsed: {
            right: '-32px',
            borderLeft: `1px solid ${theme.palette.ui03}`,
            borderRadius: '4px'
        }
    };
});

/**
 * Component that renders the moderator panel with participants list.
 * Only visible to moderators. Positioned on the left side. Can be collapsed.
 *
 * @returns {React.ReactElement|null}
 */
const ModeratorPanel = () => {
    const { classes, cx } = useStyles();
    const dispatch = useDispatch();
    const isModerator = useSelector(isLocalParticipantModerator);
    const isOpen = useSelector(isParticipantsPanelOpen);
    const reducedUI = useSelector((state: IReduxState) => state['features/base/responsive-ui'].reducedUI);

    const onToggle = useCallback(() => {
        dispatch(toggleParticipantsPanel());
    }, [ dispatch ]);

    // Only render for moderators on non-mobile devices
    if (!isModerator || reducedUI || isMobileBrowser()) {
        return null;
    }

    return (
        <div className = { classes.wrapper }>
            <div
                className = { cx(classes.moderatorPanel, !isOpen && classes.collapsed) }
                id = 'moderator-panel'>
                <ParticipantColumn />
            </div>
            <div
                aria-label = { isOpen ? 'Hide participants' : 'Show participants' }
                className = { cx(classes.toggleButton, !isOpen && classes.toggleButtonCollapsed) }
                onClick = { onToggle }
                role = 'button'
                tabIndex = { 0 }>
                <Icon
                    size = { 20 }
                    src = { isOpen ? IconArrowLeft : IconArrowRight } />
            </div>
        </div>
    );
};

export default ModeratorPanel;
