import { IReduxState } from '../app/types';

/**
 * Returns whether the insights sidebar is open.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {boolean}
 */
export function isInsightsSidebarOpen(state: IReduxState): boolean {
    return state['features/moderator-panel']?.insightsSidebarOpen ?? true;
}

/**
 * Returns whether the participants panel is open.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {boolean}
 */
export function isParticipantsPanelOpen(state: IReduxState): boolean {
    return state['features/moderator-panel']?.participantsPanelOpen ?? true;
}
