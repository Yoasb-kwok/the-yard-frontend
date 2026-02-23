import { useState, useEffect, useMemo } from 'react';
import { api } from './api';
import { getHolidayNameFromList, type HolidayItem } from './utils';
import { HK_PUBLIC_HOLIDAYS } from './hkPublicHolidays';

export interface HolidayRecord {
  id: string;
  name: string;
  date: string;
  description?: string;
  created_at: string;
}

/**
 * Fetch holidays from API (admin list), merge with HK statutory holidays, expose for calendars.
 * Calendar always has 香港法定假期; admin list can override names or add academy-only dates.
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

  const holidayItems: HolidayItem[] = useMemo(() => {
    const fromApi = list
      .filter((h) => h.date && /^\d{4}-\d{2}-\d{2}$/.test(String(h.date).trim().slice(0, 10)))
      .map((h) => ({ date: String(h.date).trim().slice(0, 10), name: h.name || '' }));
    const apiDates = new Set(fromApi.map((h) => h.date));
    const fromHK = HK_PUBLIC_HOLIDAYS.filter((h) => !apiDates.has(h.date));
    return [...fromApi, ...fromHK];
  }, [list]);

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
