import type { Holiday } from "@/types/attendance";

const API_BASE = "https://date.nager.at/api/v3/PublicHolidays";
const CACHE_PREFIX = "api_holidays_";

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
}

async function fetchFromApi(year: number): Promise<NagerHoliday[]> {
  try {
    const response = await fetch(`${API_BASE}/${year}/IN`);
    if (!response.ok) throw new Error("Holiday API failed");
    return await response.json();
  } catch (error) {
    console.error("Holiday fetch error:", error);
    return [];
  }
}

function getCached(year: number): Holiday[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${year}`);
    if (!raw) return null;
    return JSON.parse(raw) as Holiday[];
  } catch {
    return null;
  }
}

function setCache(year: number, holidays: Holiday[]): void {
  localStorage.setItem(`${CACHE_PREFIX}${year}`, JSON.stringify(holidays));
}

/**
 * Load Indian public holidays for a given year.
 * Uses localStorage cache first; fetches from Nager.Date API only if not cached.
 */
export async function loadIndianHolidays(year: number): Promise<Holiday[]> {
  const cached = getCached(year);
  if (cached) return cached;

  const apiData = await fetchFromApi(year);
  const holidays: Holiday[] = apiData.map((h) => ({
    date: h.date,
    name: h.localName || h.name,
  }));

  if (holidays.length > 0) {
    setCache(year, holidays);
  }

  return holidays;
}

/**
 * Merge API holidays with manual holidays, deduplicating by date.
 * Manual holidays take precedence (user's name is kept if dates overlap).
 */
export function mergeHolidays(apiHolidays: Holiday[], manualHolidays: Holiday[]): Holiday[] {
  const manualDates = new Set(manualHolidays.map((h) => h.date));
  const merged = [...manualHolidays];

  for (const h of apiHolidays) {
    if (!manualDates.has(h.date)) {
      merged.push(h);
    }
  }

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

/** Clear cached API holidays for a year (useful for refresh). */
export function clearHolidayCache(year: number): void {
  localStorage.removeItem(`${CACHE_PREFIX}${year}`);
}
