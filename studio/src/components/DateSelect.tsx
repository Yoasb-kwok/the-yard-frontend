/**
 * Date select with Year / Month / Day dropdowns for easier picking (especially for birth dates).
 * Value and onChange use "YYYY-MM-DD" or "".
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface DateSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** YYYY-MM-DD, default 100 years ago (for birth date) */
  minDate?: string;
  /** YYYY-MM-DD, default today for birthDateMode else ~10 years ahead */
  maxDate?: string;
  /** If true, max defaults to today (suitable for birth date) */
  birthDateMode?: boolean;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

function toParts(value: string): { y: number; m: number; d: number } | null {
  if (!value || value.length < 10) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return { y, m, d };
}

function toValue(y: number, m: number, d: number): string {
  if (!y || !m || !d) return '';
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 31;
  return new Date(year, month, 0).getDate();
}

function clampDateValue(value: string, min: string, max: string): string {
  if (!value) return value;
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function DateSelect({
  value,
  onChange,
  minDate,
  maxDate,
  birthDateMode = false,
  id,
  required,
  disabled,
  className = '',
  ariaLabel,
}: DateSelectProps) {
  const { t } = useTranslation();

  const today = useMemo(() => {
    const d = new Date();
    return toValue(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }, []);

  const min = minDate ?? (birthDateMode ? toValue(new Date().getFullYear() - 100, 1, 1) : toValue(new Date().getFullYear() - 10, 1, 1));
  const max = maxDate ?? (birthDateMode ? today : toValue(new Date().getFullYear() + 10, 12, 31));

  const minY = useMemo(() => (min ? parseInt(min.slice(0, 4), 10) : new Date().getFullYear() - 100), [min]);
  const maxY = useMemo(() => (max ? parseInt(max.slice(0, 4), 10) : new Date().getFullYear() + 10), [max]);

  const minParts = toParts(min);
  const maxParts = toParts(max);

  const parts = toParts(value);
  const year = parts?.y ?? 0;
  const month = parts?.m ?? 0;
  const day = parts?.d ?? 0;

  const emit = (next: string) => onChange(clampDateValue(next, min, max));

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxY; y >= minY; y--) list.push(y);
    return list;
  }, [minY, maxY]);

  const monthOptions = useMemo(() => {
    if (!year) return MONTHS;
    return MONTHS.filter((m) => {
      if (minParts && year === minParts.y && m < minParts.m) return false;
      if (maxParts && year === maxParts.y && m > maxParts.m) return false;
      return true;
    });
  }, [year, minParts, maxParts]);

  const dayOptions = useMemo(() => {
    if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMo = daysInMonth(year, month);
    let start = 1;
    let end = daysInMo;
    if (minParts && year === minParts.y && month === minParts.m) start = Math.max(start, minParts.d);
    if (maxParts && year === maxParts.y && month === maxParts.m) end = Math.min(end, maxParts.d);
    if (start > end) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [year, month, minParts, maxParts]);

  const handleYear = (y: number) => {
    if (!y) {
      if (required && min) {
        emit(min);
        return;
      }
      onChange('');
      return;
    }
    let m = month || 1;
    if (minParts && y === minParts.y && m < minParts.m) m = minParts.m;
    if (maxParts && y === maxParts.y && m > maxParts.m) m = maxParts.m;
    let d = day ? Math.min(day, daysInMonth(y, m)) : 1;
    if (minParts && y === minParts.y && m === minParts.m && d < minParts.d) d = minParts.d;
    if (maxParts && y === maxParts.y && m === maxParts.m && d > maxParts.d) d = maxParts.d;
    emit(toValue(y, m, d));
  };

  const handleMonth = (m: number) => {
    if (!m) {
      if (required && min) {
        emit(min);
        return;
      }
      onChange(year ? toValue(year, 1, 1) : '');
      return;
    }
    const y = year || new Date().getFullYear();
    let d = day ? Math.min(day, daysInMonth(y, m)) : 1;
    if (minParts && y === minParts.y && m === minParts.m && d < minParts.d) d = minParts.d;
    if (maxParts && y === maxParts.y && m === maxParts.m && d > maxParts.d) d = maxParts.d;
    emit(toValue(y, m, d));
  };

  const handleDay = (d: number) => {
    if (!d) {
      if (required && min) {
        emit(min);
        return;
      }
      onChange(year && month ? toValue(year, month, 1) : '');
      return;
    }
    emit(toValue(year || new Date().getFullYear(), month || 1, d));
  };

  const baseClass = 'rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary bg-white ' + (disabled ? 'opacity-60 cursor-not-allowed ' : '');
  const selectClass = baseClass + (className ? ` ${className}` : '');

  return (
    <div className="flex flex-nowrap items-center gap-2" role="group" aria-label={ariaLabel}>
      <select
        id={id}
        value={year || ''}
        onChange={(e) => handleYear(Number(e.target.value) || 0)}
        required={required}
        disabled={disabled}
        className={selectClass}
        aria-label={t('common.year', '年')}
      >
        <option value="">{t('common.year', '年')}</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={month || ''}
        onChange={(e) => handleMonth(Number(e.target.value) || 0)}
        required={required && !!year}
        disabled={disabled}
        className={selectClass}
        aria-label={t('common.month', '月')}
      >
        <option value="">{t('common.month', '月')}</option>
        {monthOptions.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select
        value={day || ''}
        onChange={(e) => handleDay(Number(e.target.value) || 0)}
        required={required && !!year && !!month}
        disabled={disabled}
        className={selectClass}
        aria-label={t('common.day', '日')}
      >
        <option value="">{t('common.day', '日')}</option>
        {dayOptions.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}
