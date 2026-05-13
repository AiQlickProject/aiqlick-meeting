import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Cross-platform key/value storage. Native uses `expo-secure-store`
 * (Keychain on iOS, Keystore on Android) for the auth token. Web
 * uses `localStorage` to stay compatible with how aiqlick-frontend
 * persists the token under the `"token"` key — that way if someone
 * already signed in via the web frontend on the same origin, our
 * client picks the existing session up automatically.
 *
 * SecureStore is synchronous on web (falls back to localStorage
 * internally) but async on native; we expose the async surface so
 * the caller doesn't have to branch.
 */
export async function readItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writeItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* ignore */
  }
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export const TOKEN_KEY = "token";
