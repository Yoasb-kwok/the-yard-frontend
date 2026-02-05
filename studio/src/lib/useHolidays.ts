import { useState, useEffect, useMemo } from 'react';
import { api } from './api';
import { getHolidayNameFromList, type HolidayItem } from './utils';

export interface HolidayRecord {
  id: string;
  name: string;
  date: string;
  description?: string;
  created_at: string;
}

/**
 * Fetch holidays from API (admin list) and expose getHolidayName + holiday set for calendars.
 * Use this so all calendar views show the same holidays as Admin → Holidays.
 */
export function useHolidays() {
  const [list, setList] = useState<HolidayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<HolidayRecord[]>('holidays')
      .then((res) => {
        if (cancelled) return;
        setList(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const holidayItems: HolidayItem[] = useMemo(
    () =>
      list
        .filter((h) => h.date && /^\d{4}-\d{2}-\d{2}$/.test(String(h.date).trim().slice(0, 10)))
        .map((h) => ({ date: String(h.date).trim().slice(0, 10), name: h.name || '' })),
    [list]
  );

  const holidayDatesSet = useMemo(
    () => new Set(holidayItems.map((h) => h.date)),
    [holidayItems]
  );

  const getHolidayName = useMemo(
    () => (date: Date) => getHolidayNameFromList(date, holidayItems),
    [holidayItems]
  );

  return { holidays: list, holidayItems, holidayDatesSet, getHolidayName, loading };
}
