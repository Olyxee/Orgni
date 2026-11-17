/**
 * Reporting-date inference for knowledge facts.
 *
 * A reporting date is the period a fact DESCRIBES, not the date it was
 * uploaded.  It is extracted from worksheet names and section headings
 * when a recognisable pattern is present.
 *
 * Rules:
 *  - Return null rather than guess.  If no pattern is recognised, the
 *    caller receives null and must not invent a date.
 *  - Return an ISO-8601 date string ("YYYY-MM-DD") representing the
 *    first day of the inferred reporting period.
 *  - Never use the document upload time as a reporting date.
 *  - Case-insensitive matching throughout.
 *
 * Supported patterns (examples):
 *
 *   Explicit ISO date in name
 *     "2026-07-01 Actuals"      → "2026-07-01"
 *     "Pricing 2025-01-01"      → "2025-01-01"
 *
 *   Fiscal year (FY) with optional quarter
 *     "FY2026 Q1 Revenue"       → "2026-01-01"
 *     "FY2026 Q2"               → "2026-04-01"
 *     "FY2026 Q3"               → "2026-07-01"
 *     "FY2026 Q4"               → "2026-10-01"
 *     "FY2026 Actual"           → "2026-01-01"  (whole year → Jan 1)
 *     "FY25"                    → "2025-01-01"
 *
 *   Calendar year with optional quarter or month
 *     "2026 Q2"                 → "2026-04-01"
 *     "2026 Budget"             → "2026-01-01"
 *     "Revenue 2025"            → "2025-01-01"
 *
 *   Month + year
 *     "July 2026"               → "2026-07-01"
 *     "Jan 2026"                → "2026-01-01"
 *     "2026 July"               → "2026-07-01"
 *
 * Cases that return null:
 *   "Sales Data"               → null (no date signal)
 *   "Sheet1"                   → null
 *   "Revenue Summary"          → null
 */

/** Quarter-to-month mapping (quarter starts). */
const QUARTER_START: Record<string, number> = {
  "1": 1, "2": 4, "3": 7, "4": 10,
};

/** Month names → 1-based month number. */
const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function isoDate(year: number, month: number, day = 1): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Expand a two-digit year to four digits.
 * 00–49 → 2000–2049; 50–99 → 1950–1999.
 * Returns the number unchanged if it already has four digits.
 */
function expandYear(y: number): number {
  if (y >= 100) return y;
  return y <= 49 ? 2000 + y : 1900 + y;
}

/**
 * Attempt to infer a reporting date from a worksheet name or section heading.
 *
 * Returns an ISO-8601 date string ("YYYY-MM-DD") or null.
 *
 * The input is typically a worksheet display name like "FY2026 Q1 Revenue"
 * or a section heading extracted from the spreadsheet content by the Python
 * DI service.
 */
export function inferReportingDate(text: string | null | undefined): string | null {
  if (!text || !text.trim()) return null;

  const s = text.trim();

  // ── 1. Explicit ISO date anywhere in the string ───────────────────────────
  const isoMatch = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return isoDate(year, month, day);
    }
  }

  const lower = s.toLowerCase();

  // ── 2. FY + 2-or-4-digit year + optional quarter ──────────────────────────
  // e.g. "FY2026 Q1", "FY26 Q4", "FY2025 Actual"
  const fyMatch = lower.match(/\bfy\s*(\d{2,4})\b(?:\s*q([1-4]))?/);
  if (fyMatch) {
    const year = expandYear(Number(fyMatch[1]));
    const qStr = fyMatch[2];
    const month = qStr ? (QUARTER_START[qStr] ?? 1) : 1;
    return isoDate(year, month);
  }

  // ── 3. Calendar year + quarter ────────────────────────────────────────────
  // e.g. "2026 Q2", "Q3 2025"
  const yrQMatch = lower.match(/\b(\d{4})\s*q([1-4])\b|\bq([1-4])\s*(\d{4})\b/);
  if (yrQMatch) {
    const year = Number(yrQMatch[1] ?? yrQMatch[4]);
    const q = yrQMatch[2] ?? yrQMatch[3];
    const month = QUARTER_START[q] ?? 1;
    if (year >= 1900 && year <= 2100) return isoDate(year, month);
  }

  // ── 4. Month name + 4-digit year ──────────────────────────────────────────
  // e.g. "July 2026", "2026 July", "Jan 2026"
  for (const [name, month] of Object.entries(MONTH_NAMES)) {
    // "Month YYYY" or "YYYY Month"
    const fwdRe = new RegExp(`\\b${name}\\s+(\\d{4})\\b`);
    const revRe = new RegExp(`\\b(\\d{4})\\s+${name}\\b`);
    const fwd = lower.match(fwdRe);
    const rev = lower.match(revRe);
    const yearStr = fwd?.[1] ?? rev?.[1];
    if (yearStr) {
      const year = Number(yearStr);
      if (year >= 1900 && year <= 2100) return isoDate(year, month);
    }
  }

  // ── 5. Bare 4-digit calendar year ────────────────────────────────────────
  // e.g. "2026 Budget", "Revenue 2025", "2026"
  // Only match if the year is on its own or surrounded by non-digit chars
  // (avoids matching part of a longer number).
  const bareYear = lower.match(/(?:^|[^0-9])(\d{4})(?:[^0-9]|$)/);
  if (bareYear) {
    const year = Number(bareYear[1]);
    if (year >= 1900 && year <= 2100) return isoDate(year, 1);
  }

  return null;
}
