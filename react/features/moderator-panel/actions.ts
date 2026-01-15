import {
    INSIGHTS_SIDEBAR_CLOSE,
    INSIGHTS_SIDEBAR_OPEN,
    INSIGHTS_SIDEBAR_TOGGLE,
    PARTICIPANTS_PANEL_CLOSE,
    PARTICIPANTS_PANEL_OPEN,
    PARTICIPANTS_PANEL_TOGGLE
} from './actionTypes';

/**
 * Action to close the insights sidebar.
 *
 * @returns {Object}
 */
export function closeInsightsSidebar() {
    return {
        type: INSIGHTS_SIDEBAR_CLOSE
    };
}

/**
 * Action to open the insights sidebar.
 *
 * @returns {Object}
 */
export function openInsightsSidebar() {
    return {
        type: INSIGHTS_SIDEBAR_OPEN
    };
}

/**
 * Action to toggle the insights sidebar.
 *
 * @returns {Object}
 */
export function toggleInsightsSidebar() {
    return {
        type: INSIGHTS_SIDEBAR_TOGGLE
    };
}

/**
 * Action to close the participants panel.
 *
 * @returns {Object}
 */
export function closeParticipantsPanel() {
    return {
        type: PARTICIPANTS_PANEL_CLOSE
    };
}

/**
 * Action to open the participants panel.
 *
 * @returns {Object}
 */
export function openParticipantsPanel() {
    return {
        type: PARTICIPANTS_PANEL_OPEN
    };
}

/**
 * Action to toggle the participants panel.
 *
 * @returns {Object}
 */
export function toggleParticipantsPanel() {
    return {
        type: PARTICIPANTS_PANEL_TOGGLE
    };
}
