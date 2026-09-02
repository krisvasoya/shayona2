/**
 * Local Date Range Calculation Utilities for Dashboard
 * Uses local calendar dates to avoid UTC offset / midnight drift issues.
 */

export type DateFilter = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

/**
 * Format Date object to local YYYY-MM-DD string
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start and end date strings for a given DateFilter
 */
export function getDateRange(
  filter: DateFilter,
  customRange?: { from: string; to: string },
): DateRange {
  const now = new Date();

  switch (filter) {
    case 'TODAY': {
      const todayStr = formatLocalDate(now);
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: 'Today',
      };
    }

    case 'THIS_WEEK': {
      // Monday to Sunday in local time
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        startDate: formatLocalDate(monday),
        endDate: formatLocalDate(sunday),
        label: 'This Week',
      };
    }

    case 'THIS_MONTH': {
      // 1st of month to last day of month in local time
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        startDate: formatLocalDate(firstDay),
        endDate: formatLocalDate(lastDay),
        label: 'This Month',
      };
    }

    case 'THIS_YEAR': {
      // Jan 1 to Dec 31 in local time
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);

      return {
        startDate: formatLocalDate(firstDay),
        endDate: formatLocalDate(lastDay),
        label: 'This Year',
      };
    }

    case 'CUSTOM': {
      if (customRange?.from && customRange?.to) {
        let from = customRange.from.trim();
        let to = customRange.to.trim();

        if (from > to) {
          const temp = from;
          from = to;
          to = temp;
        }

        return {
          startDate: from,
          endDate: to,
          label: `${from} to ${to}`,
        };
      }

      // Default fallback if custom dates not provided yet
      const todayStr = formatLocalDate(now);
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: 'Custom Range',
      };
    }

    default: {
      const todayStr = formatLocalDate(now);
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: 'Today',
      };
    }
  }
}
