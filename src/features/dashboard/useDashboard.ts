import { useQuery } from '@tanstack/react-query';
import { dashboardService, DashboardMetrics } from './dashboard.service';
import { DateFilter, getDateRange } from './dateUtils';

export function useDashboard(
  filter: DateFilter = 'TODAY',
  customRange?: { from: string; to: string },
) {
  const dateRange = getDateRange(filter, customRange);

  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard', filter, dateRange.startDate, dateRange.endDate],
    queryFn: () => dashboardService.getDashboardData(dateRange),
    staleTime: 1000 * 30, // 30 seconds
  });
}
