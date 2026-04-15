import type { AgeTag } from '../contexts/AuthContext';

/** Parse "X-Y" age tag to lowest/oldest. Defaults to 5-8 if invalid. */
export function parseAgeRange(ageTag: string | undefined): { lowest: number; oldest: number } {
  if (!ageTag || typeof ageTag !== 'string') return { lowest: 5, oldest: 8 };
  const m = ageTag.match(/^(\d+)-(\d+)$/);
  if (!m) return { lowest: 5, oldest: 8 };
  const low = Math.max(0, Math.min(99, parseInt(m[1], 10)));
  const high = Math.max(0, Math.min(99, parseInt(m[2], 10)));
  return { lowest: low, oldest: Math.max(low, high) };
}

/** Build age tag string from lowest and oldest age. */
export function ageRangeToTag(lowest: number, oldest: number): string {
  const l = Math.max(0, Math.min(99, Math.floor(Number(lowest))));
  const h = Math.max(0, Math.min(99, Math.floor(Number(oldest))));
  return `${l}-${Math.max(l, h)}`;
}

/**
 * Derive age group from date of birth using (today - DOB).
 * Returns '5-8' | '9-12' | '13-16' if age falls in range, otherwise null.
 */
export function getAgeTagFromDateOfBirth(dob: string | null): AgeTag | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age >= 5 && age <= 8) return '5-8';
  if (age >= 9 && age <= 12) return '9-12';
  if (age >= 13 && age <= 16) return '13-16';
  return null;
}

export function formatDate(date: string | Date, locale: string = 'en-US'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date, locale: string = 'en-US'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Course usually has 4, 8 or 16 lessons. Returns dates for lesson 1 to N (weekly from first lesson). */
export function getLessonDates(firstLessonStart: string | Date, totalLessons: number): Date[] {
  const start = new Date(firstLessonStart);
  if (isNaN(start.getTime()) || totalLessons < 1) return [];
  const dates: Date[] = [];
  for (let i = 0; i < totalLessons; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    dates.push(d);
  }
  return dates;
}

/** Same as getLessonDates but skips dates that fall on a holiday (lesson moves to next week). */
export function getLessonDatesSkipHolidays(
  firstLessonStart: string | Date,
  totalLessons: number,
  holidayDatesSet: Set<string>
): Date[] {
  const start = new Date(firstLessonStart);
  if (isNaN(start.getTime()) || totalLessons < 1) return [];
  const dates: Date[] = [];
  let d = new Date(start);
  while (dates.length < totalLessons) {
    const use = isDateHoliday(d, holidayDatesSet) ? getNextNonHolidayDateWithSet(d, holidayDatesSet) : new Date(d);
    dates.push(new Date(use));
    use.setDate(use.getDate() + 7);
    d = use;
  }
  return dates;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format program code for display with lesson number, e.g. HH-SPK-1 + 1 → "HH-SPK-1-L01".
 * If lesson_number is null/undefined, returns the program_code as-is.
 */
export function formatProgramCodeDisplay(
  programCode: string | null | undefined,
  lessonNumber?: number | null
): string {
  const code = (programCode ?? '').trim();
  if (!code) return '';
  if (lessonNumber == null || lessonNumber < 1) return code;
  const pad = String(lessonNumber).padStart(2, '0');
  return `${code}-L${pad}`;
}

/**
 * Get YYYY-MM-DD from a class/lesson start_time (API may return ISO string, "YYYY-MM-DD HH:mm:ss", or Date).
 * Used by calendar and admin classes page so date matching is consistent.
 */
export function getDateStringFromStartTime(
  startTime: string | Date | null | undefined
): string | null {
  if (startTime == null) return null;
  if (typeof startTime === 'string') {
    const s = startTime.trim();
    if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!isNaN(d.getTime()))
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return null;
  }
  if (startTime instanceof Date) {
    if (isNaN(startTime.getTime())) return null;
    return `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`;
  }
  return null;
}

export function isExpiringSoon(date: string, daysThreshold: number = 7): boolean {
  const expiryDate = new Date(date);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold && diffDays >= 0;
}

export function isExpired(date: string): boolean {
  const expiryDate = new Date(date);
  const now = new Date();
  return expiryDate < now;
}

export function calculateDiscount(
  subtotal: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return subtotal * (discountValue / 100);
  }
  return Math.min(discountValue, subtotal);
}

/**
 * Check if a date is a Hong Kong public holiday
 * This includes fixed holidays and common lunar calendar holidays
 * Note: For lunar calendar holidays, we use approximate dates for common years
 * For production, consider using a proper holiday API or library
 */
export function isHongKongPublicHoliday(date: Date): boolean {
  return getHongKongHolidayName(date) !== null;
}

/**
 * Get the name of the Hong Kong public holiday for a given date
 * Returns null if the date is not a holiday
 * Uses 2026 Hong Kong public holidays as the reference calendar
 */
export function getHongKongHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  
  // Create a map of holidays by year-month-day for accurate lookup
  // Using 2026 as the reference calendar
  const holidays2026: Record<string, string> = {
    '2026-1-1': 'New Year\'s Day',
    '2026-2-17': 'Lunar New Year\'s Day',
    '2026-2-18': 'The Second Day of Lunar New Year',
    '2026-2-19': 'The Third Day of Lunar New Year',
    '2026-4-3': 'Good Friday',
    '2026-4-4': 'The Day Following Good Friday',
    '2026-4-6': 'Day Following Ching Ming Festival',
    '2026-4-7': 'Day Following Easter Monday',
    '2026-5-1': 'Labour Day',
    '2026-5-25': 'Day Following the Birthday of the Buddha',
    '2026-6-19': 'Tuen Ng Festival (Dragon Boat Festival)',
    '2026-7-1': 'Hong Kong SAR Establishment Day',
    '2026-9-26': 'Day Following Chinese Mid-Autumn Festival',
    '2026-10-1': 'National Day',
    '2026-10-19': 'Day Following Chung Yeung Festival',
    '2026-12-25': 'Christmas Day',
    '2026-12-26': 'First Weekday after Christmas Day',
  };
  
  // Check if the date matches a 2026 holiday
  const dateKey = `${year}-${month}-${day}`;
  if (holidays2026[dateKey]) {
    return holidays2026[dateKey];
  }
  
  // For other years, check fixed holidays (same date every year)
  const fixedHolidays: Array<{ month: number; day: number; name: string }> = [
    { month: 1, day: 1, name: 'New Year\'s Day' },
    { month: 5, day: 1, name: 'Labour Day' },
    { month: 7, day: 1, name: 'Hong Kong SAR Establishment Day' },
    { month: 10, day: 1, name: 'National Day' },
    { month: 12, day: 25, name: 'Christmas Day' },
    { month: 12, day: 26, name: 'Boxing Day' },
  ];
  
  // Check fixed holidays for non-2026 years
  if (year !== 2026) {
    for (const holiday of fixedHolidays) {
      if (month === holiday.month && day === holiday.day) {
        return holiday.name;
      }
    }
  }
  
  return null;
}

/**
 * Get the next non-holiday date for a given date, postponing to the same day next week if it's a holiday
 * @param date The original date
 * @returns The same date if not a holiday, or the same day next week if it is a holiday
 */
export function getNextNonHolidayDate(date: Date): Date {
  const checkDate = new Date(date);
  
  // If it's not a holiday, return the same date
  if (!isHongKongPublicHoliday(checkDate)) {
    return checkDate;
  }
  
  // If it's a holiday, postpone to next week (same day of week)
  const nextWeek = new Date(checkDate);
  nextWeek.setDate(checkDate.getDate() + 7);
  
  // Recursively check if next week is also a holiday (shouldn't happen often, but handle it)
  if (isHongKongPublicHoliday(nextWeek)) {
    return getNextNonHolidayDate(nextWeek);
  }
  
  return nextWeek;
}

/**
 * Check if a date falls on a Hong Kong public holiday and should be postponed
 * This is a convenience function that combines the check and postponement logic
 */
export function shouldPostponeClass(date: Date): { shouldPostpone: boolean; newDate: Date } {
  const isHoliday = isHongKongPublicHoliday(date);
  if (isHoliday) {
    const newDate = getNextNonHolidayDate(date);
    return { shouldPostpone: true, newDate };
  }
  return { shouldPostpone: false, newDate: date };
}

/** Holiday from API: date (YYYY-MM-DD), name. */
export type HolidayItem = { date: string; name: string };

/** Get holiday name for a date from a list (from admin holidays API). */
export function getHolidayNameFromList(date: Date, list: HolidayItem[]): string | null {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const key = `${y}-${m}-${d}`;
  const found = list.find((h) => h.date === key);
  return found ? found.name : null;
}

/** Check if date is in the holiday set (YYYY-MM-DD strings). */
export function isDateHoliday(date: Date, holidayDates: Set<string>): boolean {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return holidayDates.has(`${y}-${m}-${d}`);
}

/** Get next non-holiday date (same weekday) using admin holiday set. */
export function getNextNonHolidayDateWithSet(date: Date, holidayDates: Set<string>): Date {
  if (!isDateHoliday(date, holidayDates)) return new Date(date);
  const next = new Date(date);
  next.setDate(date.getDate() + 7);
  return isDateHoliday(next, holidayDates) ? getNextNonHolidayDateWithSet(next, holidayDates) : next;
}

/** Use admin holiday list for postpone check when creating a single class. */
export function shouldPostponeClassWithHolidays(
  date: Date,
  holidayDates: Set<string>
): { shouldPostpone: boolean; newDate: Date } {
  if (!isDateHoliday(date, holidayDates)) return { shouldPostpone: false, newDate: date };
  const newDate = getNextNonHolidayDateWithSet(date, holidayDates);
  return { shouldPostpone: true, newDate };
}

/** If the server returns an HTML error page (e.g. Express), pull text from &lt;pre&gt; when present. */
export function extractServerErrorText(htmlOrText: string): string {
  const m = htmlOrText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (m) return m[1].trim();
  const t = htmlOrText.trim();
  if (t.startsWith('<!DOCTYPE') || t.startsWith('<html')) {
    return t.length > 280 ? `${t.slice(0, 280)}…` : t;
  }
  return t;
}

/** Build CSV string from rows and trigger download (UTF-8 with BOM for Excel). */
export function downloadCsv(rows: (string | number)[][], filename: string): void {
  const escape = (c: string | number): string => {
    const s = String(c);
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
