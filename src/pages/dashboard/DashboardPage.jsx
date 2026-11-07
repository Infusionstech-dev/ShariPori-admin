import { Button } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';

import usePermission from '../../hooks/usePermission';
import { formatBDT } from '../../lib/format';
import {
  useGetDashboardSummaryQuery,
  useGetLowStockQuery,
  useGetRecentOrdersQuery,
  useGetSalesChartQuery,
  useGetStatusBreakdownQuery,
  useGetTopProductsQuery,
} from '../../store/api/dashboardApi';
import {
  KpiCard,
  LowStock,
  RangeSwitcher,
  RecentOrders,
  SalesChart,
  StatusDonut,
  TopProducts,
  Widget,
} from './widgets';

const CHART_DAYS = 30;
const RANGES = ['today', '7d', '30d'];

export default function DashboardPage() {
  const can = usePermission();
  // Money is part of reports; staff without it see counts only. The API hides it too.
  const showRevenue = can('reports.view');
  const [searchParams, setSearchParams] = useSearchParams();
  const range = RANGES.includes(searchParams.get('range')) ? searchParams.get('range') : 'today';

  const summary = useGetDashboardSummaryQuery(range);
  const chart = useGetSalesChartQuery(CHART_DAYS);
  const statuses = useGetStatusBreakdownQuery();
  const top = useGetTopProductsQuery({ days: CHART_DAYS, limit: 5 });
  const recent = useGetRecentOrdersQuery(10);
  const low = useGetLowStockQuery(10);

  const s = summary.data;
  const kpiState = { loading: summary.isLoading, error: summary.isError, onRetry: summary.refetch };
  const kpis = [
    ...(showRevenue
      ? [{ title: 'Sales', value: s && formatBDT(s.sales), change: s?.comparison.sales }]
      : []),
    { title: 'Orders', value: s?.orders, change: s?.comparison.orders },
    { title: 'Pending now', value: s?.pendingOrders, change: false, to: '/orders?status=pending' },
    {
      title: 'Low / out of stock',
      value: s && `${s.lowStockCount} / ${s.outOfStockCount}`,
      change: false,
      to: '/inventory?status=low',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-semibold">Dashboard</h1>
        <RangeSwitcher
          value={range}
          onChange={(value) =>
            setSearchParams(value === 'today' ? {} : { range: value }, { replace: true })
          }
        />
      </div>

      <div
        className={`grid grid-cols-2 gap-3 ${showRevenue ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
      >
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} {...kpiState} />
        ))}
      </div>
      {s && (
        <div className="text-xs text-text/60">
          {showRevenue && `Average order ${formatBDT(s.avgOrderValue)} · `}
          {s.newCustomers} new customer{s.newCustomers === 1 ? '' : 's'}
          {' · '}Cancelled orders are not counted in sales.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Widget
            title={showRevenue ? 'Sales, last 30 days' : 'Orders, last 30 days'}
            query={chart}
          >
            {(rows) => <SalesChart rows={rows} showSales={showRevenue} />}
          </Widget>
        </div>
        <Widget title="Orders by status" query={statuses}>
          {(rows) => <StatusDonut rows={rows} />}
        </Widget>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Widget
            title="Recent orders"
            query={recent}
            extra={
              <Link to="/orders">
                <Button type="link" size="small">
                  All orders
                </Button>
              </Link>
            }
          >
            {(rows) => <RecentOrders rows={rows} showTotal={showRevenue} />}
          </Widget>
        </div>
        <div className="space-y-4">
          <Widget title="Top products, 30 days" query={top}>
            {(rows) => <TopProducts rows={rows} showRevenue={showRevenue} />}
          </Widget>
          <Widget
            title="Low stock"
            query={low}
            extra={
              <Link to="/inventory?status=low">
                <Button type="link" size="small">
                  Inventory
                </Button>
              </Link>
            }
          >
            {(rows) => <LowStock rows={rows} />}
          </Widget>
        </div>
      </div>
    </div>
  );
}
