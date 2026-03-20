const STORAGE_KEY = "userState";

interface IpApiResponse {
  region?: string;
  country_code?: string;
  error?: boolean;
}

/**
 * Detects the user's Indian state using IP geolocation (no GPS, no permission prompt).
 * Returns the state name (e.g. "Telangana") or null if detection fails / user is not in India.
 * Caches the result in localStorage as "userState".
 */
export async function detectUserState(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;

    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) return null;

    const data: IpApiResponse = await response.json();

    if (data.error || data.country_code !== "IN" || !data.region) return null;

    const state = data.region.trim();
    localStorage.setItem(STORAGE_KEY, state);
    return state;
  } catch {
    return null;
  }
}

/** Read the cached state without making a network call. */
export function getCachedUserState(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/** Clear the cached state (useful for testing or reset). */
export function clearUserState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
