import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import participantsPaneTheme from '../../../base/components/themes/participantsPaneTheme.json';
import { openDialog } from '../../../base/dialog/actions';
import { IconDotsHorizontal } from '../../../base/icons/svg';
import Button from '../../../base/ui/components/web/Button';
import { BUTTON_TYPES } from '../../../base/ui/constants.web';
import { findAncestorByClass } from '../../../base/ui/functions.web';
import { isAddBreakoutRoomButtonVisible } from '../../../breakout-rooms/functions';
import { AddBreakoutRoomButton } from '../../../participants-pane/components/breakout-rooms/components/web/AddBreakoutRoomButton';
import { RoomList } from '../../../participants-pane/components/breakout-rooms/components/web/RoomList';
import { FooterContextMenu } from '../../../participants-pane/components/web/FooterContextMenu';
import LobbyParticipants from '../../../participants-pane/components/web/LobbyParticipants';
import MeetingParticipants from '../../../participants-pane/components/web/MeetingParticipants';
import VisitorsList from '../../../participants-pane/components/web/VisitorsList';
import { isMoreActionsVisible, isMuteAllVisible } from '../../../participants-pane/functions';
import MuteEveryoneDialog from '../../../video-menu/components/web/MuteEveryoneDialog';
import { PANEL_PADDING } from '../../constants';

const useStyles = makeStyles()(theme => {
    return {
        header: {
            alignItems: 'center',
            boxSizing: 'border-box',
            display: 'flex',
            height: '60px',
            padding: `0 ${PANEL_PADDING}px`,
            borderBottom: `1px solid ${theme.palette.ui03}`,
            ...theme.typography.heading6,
            color: theme.palette.text01
        },

        container: {
            boxSizing: 'border-box',
            flex: 1,
            overflowY: 'auto',
            position: 'relative',
            padding: `0 ${participantsPaneTheme.panePadding}px`,
            display: 'flex',
            flexDirection: 'column',

            '&::-webkit-scrollbar': {
                display: 'none'
            }
        },

        antiCollapse: {
            fontSize: 0,

            '&:first-child': {
                display: 'none'
            },

            '&:first-child + *': {
                marginTop: 0
            }
        },

        footer: {
            display: 'flex',
            justifyContent: 'flex-end',
            padding: `${theme.spacing(4)} ${participantsPaneTheme.panePadding}px`,
            borderTop: `1px solid ${theme.palette.ui03}`,

            '& > *:not(:last-child)': {
                marginRight: theme.spacing(3)
            }
        },

        footerMoreContainer: {
            position: 'relative'
        }
    };
});

/**
 * Component that renders the participant list column in the moderator panel.
 *
 * @returns {React.ReactElement}
 */
const ParticipantColumn = () => {
    const { classes } = useStyles();
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const [ contextOpen, setContextOpen ] = useState(false);
    const [ searchString, setSearchString ] = useState('');

    const isBreakoutRoomsSupported = useSelector((state: IReduxState) =>
        state['features/base/conference'].conference?.getBreakoutRooms()?.isSupported());
    const showAddRoomButton = useSelector(isAddBreakoutRoomButtonVisible);
    const showMuteAllButton = useSelector(isMuteAllVisible);
    const showMoreActionsButton = useSelector(isMoreActionsVisible);

    const onMuteAll = useCallback(() => {
        dispatch(openDialog('MuteEveryoneDialog', MuteEveryoneDialog));
    }, [ dispatch ]);

    const onToggleContext = useCallback(() => {
        setContextOpen(open => !open);
    }, []);

    const onDrawerClose = useCallback(() => {
        setContextOpen(false);
    }, []);

    const onWindowClickListener = useCallback((e: MouseEvent) => {
        if (contextOpen && !findAncestorByClass(e.target as HTMLElement, classes.footerMoreContainer)) {
            setContextOpen(false);
        }
    }, [ contextOpen, classes.footerMoreContainer ]);

    React.useEffect(() => {
        window.addEventListener('click', onWindowClickListener);

        return () => {
            window.removeEventListener('click', onWindowClickListener);
        };
    }, [ onWindowClickListener ]);

    return (
        <>
            <div className = { classes.header }>
                { t('participantsPane.title') }
            </div>
            <div className = { classes.container }>
                <VisitorsList />
                <br className = { classes.antiCollapse } />
                <LobbyParticipants />
                <br className = { classes.antiCollapse } />
                <MeetingParticipants
                    searchString = { searchString }
                    setSearchString = { setSearchString } />
                { isBreakoutRoomsSupported && <RoomList searchString = { searchString } /> }
                { showAddRoomButton && <AddBreakoutRoomButton /> }
            </div>
            <div className = { classes.footer }>
                { showMuteAllButton && (
                    <Button
                        accessibilityLabel = { t('participantsPane.actions.muteAll') }
                        labelKey = { 'participantsPane.actions.muteAll' }
                        onClick = { onMuteAll }
                        type = { BUTTON_TYPES.SECONDARY } />
                )}
                { showMoreActionsButton && (
                    <div className = { classes.footerMoreContainer }>
                        <Button
                            accessibilityLabel = { t('participantsPane.actions.moreModerationActions') }
                            icon = { IconDotsHorizontal }
                            id = 'moderator-panel-context-menu'
                            onClick = { onToggleContext }
                            type = { BUTTON_TYPES.SECONDARY } />
                        <FooterContextMenu
                            isOpen = { contextOpen }
                            onDrawerClose = { onDrawerClose }
                            onMouseLeave = { onToggleContext } />
                    </div>
                )}
            </div>
        </>
    );
};

export default ParticipantColumn;
