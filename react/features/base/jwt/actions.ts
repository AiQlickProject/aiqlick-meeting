import { SET_DELAYED_LOAD_OF_AVATAR_URL, SET_JWT, SET_KNOWN_AVATAR_URL, SET_PENDING_FEATURES } from './actionTypes';

/**
 * Sets an avatar URL for delayed loading.
 *
 * @param {string} avatarUrl - The avatar URL to set for delayed loading.
 * @returns {{
 *     type: SET_DELAYED_LOAD_OF_AVATAR_URL,
 *     avatarUrl: string
 * }}
 */
export function setDelayedLoadOfAvatarUrl(avatarUrl?: string) {
    return {
        type: SET_DELAYED_LOAD_OF_AVATAR_URL,
        avatarUrl
    };
}

/**
 * Stores a specific JSON Web Token (JWT) into the redux store.
 *
 * @param {string} [jwt] - The JSON Web Token (JWT) to store.
 * @returns {{
 *     type: SET_JWT,
 *     jwt: (string|undefined)
 * }}
 */
export function setJWT(jwt?: string) {
    return {
        type: SET_JWT,
        jwt
    };
}

/**
 * Sets a known avatar URL.
 *
 * @param {string} avatarUrl - The avatar URL to set as known.
 * @returns {{
 *     type: SET_KNOWN_AVATAR_URL,
 *     avatarUrl: string
 * }}
 */
export function setKnownAvatarUrl(avatarUrl: string) {
    return {
        type: SET_KNOWN_AVATAR_URL,
        avatarUrl
    };
}

/**
 * Stores pending JWT features that couldn't be applied because local
 * participant didn't exist yet.
 *
 * @param {Record<string, boolean | string>} [features] - The features to store.
 * @returns {{
 *     type: SET_PENDING_FEATURES,
 *     features: Record<string, boolean | string> | undefined
 * }}
 */
export function setPendingFeatures(features?: Record<string, boolean | string>) {
    return {
        type: SET_PENDING_FEATURES,
        features
    };
}
