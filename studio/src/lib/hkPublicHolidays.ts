/**
 * Hong Kong statutory / general public holidays (香港法定／公眾假期).
 * Used so the calendar always shows HK holidays even when the admin API returns none.
 * Sources: GovHK general holidays, Labour Dept statutory holidays.
 * Format: YYYY-MM-DD; names in English (admin list can override with Chinese).
 */
export interface HKHolidayItem {
  date: string;
  name: string;
}

/** HK public holidays 2024–2027 (general holidays). */
export const HK_PUBLIC_HOLIDAYS: HKHolidayItem[] = [
  // 2024
  { date: '2024-01-01', name: "New Year's Day" },
  { date: '2024-02-10', name: "Lunar New Year's Day" },
  { date: '2024-02-11', name: 'The Second Day of Lunar New Year' },
  { date: '2024-02-12', name: 'The Third Day of Lunar New Year' },
  { date: '2024-03-29', name: 'Good Friday' },
  { date: '2024-03-30', name: 'The Day Following Good Friday' },
  { date: '2024-04-01', name: 'Easter Monday' },
  { date: '2024-04-04', name: 'Ching Ming Festival' },
  { date: '2024-05-01', name: 'Labour Day' },
  { date: '2024-05-15', name: "The Buddha's Birthday" },
  { date: '2024-06-10', name: 'Tuen Ng Festival (Dragon Boat)' },
  { date: '2024-07-01', name: 'HKSAR Establishment Day' },
  { date: '2024-09-18', name: 'Day Following Mid-Autumn Festival' },
  { date: '2024-10-01', name: 'National Day' },
  { date: '2024-10-11', name: 'Chung Yeung Festival' },
  { date: '2024-12-25', name: 'Christmas Day' },
  { date: '2024-12-26', name: 'First Weekday after Christmas Day' },
  // 2025
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-29', name: "Lunar New Year's Day" },
  { date: '2025-01-30', name: 'The Second Day of Lunar New Year' },
  { date: '2025-01-31', name: 'The Third Day of Lunar New Year' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-04-19', name: 'The Day Following Good Friday' },
  { date: '2025-04-21', name: 'Easter Monday' },
  { date: '2025-04-04', name: 'Ching Ming Festival' },
  { date: '2025-04-05', name: 'Day Following Ching Ming Festival' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-05', name: "The Buddha's Birthday" },
  { date: '2025-05-31', name: 'Tuen Ng Festival (Dragon Boat)' },
  { date: '2025-07-01', name: 'HKSAR Establishment Day' },
  { date: '2025-10-07', name: 'Day Following Mid-Autumn Festival' },
  { date: '2025-10-01', name: 'National Day' },
  { date: '2025-10-29', name: 'Chung Yeung Festival' },
  { date: '2025-12-25', name: 'Christmas Day' },
  { date: '2025-12-26', name: 'First Weekday after Christmas Day' },
  // 2026
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: "Lunar New Year's Day" },
  { date: '2026-02-18', name: 'The Second Day of Lunar New Year' },
  { date: '2026-02-19', name: 'The Third Day of Lunar New Year' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-04', name: 'The Day Following Good Friday' },
  { date: '2026-04-06', name: 'Ching Ming Festival' },
  { date: '2026-04-07', name: 'Easter Monday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-25', name: "The Buddha's Birthday" },
  { date: '2026-06-19', name: 'Tuen Ng Festival (Dragon Boat)' },
  { date: '2026-07-01', name: 'HKSAR Establishment Day' },
  { date: '2026-09-26', name: 'Day Following Mid-Autumn Festival' },
  { date: '2026-10-01', name: 'National Day' },
  { date: '2026-10-19', name: 'Chung Yeung Festival' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-26', name: 'First Weekday after Christmas Day' },
  // 2027
  { date: '2027-01-01', name: "New Year's Day" },
  { date: '2027-02-06', name: "Lunar New Year's Day" },
  { date: '2027-02-07', name: 'The Second Day of Lunar New Year' },
  { date: '2027-02-08', name: 'The Third Day of Lunar New Year' },
  { date: '2027-03-26', name: 'Good Friday' },
  { date: '2027-03-27', name: 'The Day Following Good Friday' },
  { date: '2027-03-29', name: 'Easter Monday' },
  { date: '2027-04-05', name: 'Ching Ming Festival' },
  { date: '2027-05-01', name: 'Labour Day' },
  { date: '2027-05-12', name: "The Buddha's Birthday" },
  { date: '2027-06-09', name: 'Tuen Ng Festival (Dragon Boat)' },
  { date: '2027-07-01', name: 'HKSAR Establishment Day' },
  { date: '2027-09-17', name: 'Day Following Mid-Autumn Festival' },
  { date: '2027-10-01', name: 'National Day' },
  { date: '2027-10-08', name: 'Chung Yeung Festival' },
  { date: '2027-12-25', name: 'Christmas Day' },
  { date: '2027-12-26', name: 'First Weekday after Christmas Day' },
];
