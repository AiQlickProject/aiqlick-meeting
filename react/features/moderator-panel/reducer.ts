import ReducerRegistry from '../base/redux/ReducerRegistry';

import {
    INSIGHTS_SIDEBAR_CLOSE,
    INSIGHTS_SIDEBAR_OPEN,
    INSIGHTS_SIDEBAR_TOGGLE,
    PARTICIPANTS_PANEL_CLOSE,
    PARTICIPANTS_PANEL_OPEN,
    PARTICIPANTS_PANEL_TOGGLE
} from './actionTypes';

export interface IModeratorPanelState {
    insightsSidebarOpen: boolean;
    participantsPanelOpen: boolean;
}

const DEFAULT_STATE: IModeratorPanelState = {
    insightsSidebarOpen: true, // Open by default for moderators
    participantsPanelOpen: true // Open by default for moderators
};

/**
 * Listen for actions that mutate the moderator panel state.
 */
ReducerRegistry.register<IModeratorPanelState>(
    'features/moderator-panel',
    (state = DEFAULT_STATE, action): IModeratorPanelState => {
        switch (action.type) {
        case INSIGHTS_SIDEBAR_CLOSE:
            return {
                ...state,
                insightsSidebarOpen: false
            };

        case INSIGHTS_SIDEBAR_OPEN:
            return {
                ...state,
                insightsSidebarOpen: true
            };

        case INSIGHTS_SIDEBAR_TOGGLE:
            return {
                ...state,
                insightsSidebarOpen: !state.insightsSidebarOpen
            };

        case PARTICIPANTS_PANEL_CLOSE:
            return {
                ...state,
                participantsPanelOpen: false
            };

        case PARTICIPANTS_PANEL_OPEN:
            return {
                ...state,
                participantsPanelOpen: true
            };

        case PARTICIPANTS_PANEL_TOGGLE:
            return {
                ...state,
                participantsPanelOpen: !state.participantsPanelOpen
            };

        default:
            return state;
        }
    }
);
