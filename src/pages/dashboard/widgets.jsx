import { ArrowDownOutlined, ArrowUpOutlined, PictureOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Result, Segmented, Skeleton, Table } from 'antd';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import StatusTag from '../../components/orders/StatusTag';
import { STATUS_LABELS, formatDhaka } from '../../components/orders/orderText';
import { formatBDT } from '../../lib/format';

const PRIMARY = '#7A1F3D';
const ACCENT = '#C9A227';
const STATUS_COLORS = {
  pending: '#8c8c8c',
  confirmed: '#1677ff',
  processing: '#faad14',
  shipped: '#722ed1',
  delivered: '#52c41a',
  cancelled: '#f5222d',
  returned: '#434343',
};

// Every widget loads on its own, with its own skeleton and retry.
export function Widget({ title, query, extra, children, height = 240 }) {
  let body;
  if (query.isLoading) {
    body = <Skeleton active paragraph={{ rows: 4 }} title={false} style={{ minHeight: height }} />;
  } else if (query.isError) {
    body = (
      <Result
        status="warning"
        title="Could not load"
        extra={
          <Button size="small" onClick={query.refetch}>
            Try again
          </Button>
        }
      />
    );
  } else {
    body = children(query.data);
  }
  return (
    <Card title={title} extra={extra} className="min-w-0">
      {body}
    </Card>
  );
}

export function RangeSwitcher({ value, onChange }) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={[
        { value: 'today', label: 'Today' },
        { value: '7d', label: '7 days' },
        { value: '30d', label: '30 days' },
      ]}
    />
  );
}

// change is a % against the previous period, or null when there was nothing to compare with.
export function KpiCard({ title, value, change, loading, error, onRetry, invert = false, to }) {
  let trend = <span className="text-xs text-text/50">No earlier data</span>;
  if (change !== null && change !== undefined) {
    const up = change >= 0;
    const good = invert ? !up : up;
    trend = (
      <span className="text-xs" style={{ color: good ? '#389e0d' : '#cf1322' }}>
        {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(change)}% vs previous
      </span>
    );
  }
  const content = (
    <Card size="small" hoverable={Boolean(to)} className="h-full">
      <div className="text-sm text-text/60">{title}</div>
      {loading && <Skeleton.Input active size="large" className="mt-1" />}
      {error && (
        <Button size="small" type="link" className="px-0" onClick={onRetry}>
          Could not load. Retry
        </Button>
      )}
      {!loading && !error && (
        <>
          <div className="text-2xl font-semibold">{value}</div>
          {change !== false && trend}
        </>
      )}
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

const shortDate = (date) =>
  new Date(`${date}T00:00:00+06:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Dhaka',
  });

export function SalesChart({ rows, showSales }) {
  if (!rows.some((row) => row.orders)) {
    return <Empty description="No orders in this period" />;
  }
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} fontSize={12} />
          {showSales && (
            <YAxis
              yAxisId="sales"
              fontSize={12}
              width={64}
              tickFormatter={(value) => `৳${Number(value).toLocaleString('en-IN')}`}
            />
          )}
          <YAxis
            yAxisId="orders"
            orientation={showSales ? 'right' : 'left'}
            allowDecimals={false}
            fontSize={12}
            width={32}
          />
          <Tooltip
            labelFormatter={shortDate}
            formatter={(value, name) => (name === 'Sales' ? formatBDT(value) : value)}
          />
          <Legend />
          {showSales && (
            <Area
              yAxisId="sales"
              type="monotone"
              dataKey="sales"
              name="Sales"
              dot={{ r: 2 }}
              stroke={PRIMARY}
              fill={PRIMARY}
              fillOpacity={0.15}
            />
          )}
          <Area
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            name="Orders"
            dot={{ r: 2 }}
            stroke={ACCENT}
            fill={ACCENT}
            fillOpacity={0.15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonut({ rows }) {
  const used = rows.filter((row) => row.count > 0);
  if (!used.length) {
    return <Empty description="No orders yet" />;
  }
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            isAnimationActive={false}
            data={used}
            dataKey="count"
            nameKey="status"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
          >
            {used.map((row) => (
              <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, STATUS_LABELS[name] ?? name]} />
          <Legend formatter={(name) => STATUS_LABELS[name] ?? name} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProducts({ rows, showRevenue }) {
  if (!rows.length) {
    return <Empty description="No sales in the last 30 days" />;
  }
  return (
    <ol className="m-0 list-none space-y-3 p-0">
      {rows.map((row, index) => (
        <li key={row.productId} className="flex items-center gap-3">
          <span className="w-4 text-sm text-text/50">{index + 1}</span>
          {row.image ? (
            <img src={row.image} alt="" className="size-10 max-w-none rounded object-cover" />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-soft text-primary">
              <PictureOutlined />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{row.name}</span>
            <span className="text-xs text-text/60">{row.qtySold} sold</span>
          </span>
          {showRevenue && (
            <span className="whitespace-nowrap text-sm">{formatBDT(row.revenue)}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function RecentOrders({ rows, showTotal }) {
  const columns = [
    {
      title: 'Order',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (orderNo, row) => (
        <Link to={`/orders/${row.id}`} className="font-mono">
          {orderNo}
        </Link>
      ),
    },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    {
      title: 'Placed',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => <span className="whitespace-nowrap">{formatDhaka(value)}</span>,
    },
    ...(showTotal
      ? [{ title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: formatBDT }]
      : []),
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <StatusTag status={value} />,
    },
  ];
  return (
    <Table
      rowKey="id"
      size="small"
      pagination={false}
      columns={columns}
      dataSource={rows}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: <Empty description="No orders yet" /> }}
    />
  );
}

export function LowStock({ rows }) {
  if (!rows.length) {
    return <Empty description="Everything is well stocked" />;
  }
  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {rows.map((row) => (
        <li key={row.variantId} className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.name}</span>
            <span className="text-xs text-text/60">
              {[row.color, row.size, row.sku].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span
            className="whitespace-nowrap font-semibold"
            style={{ color: row.stockQty === 0 ? '#cf1322' : '#ad6800' }}
          >
            {row.stockQty === 0 ? 'Out' : `${row.stockQty} left`}
          </span>
        </li>
      ))}
    </ul>
  );
}
