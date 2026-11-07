import { Button, Card, DatePicker, Empty, Result, Select, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

import { formatDhaka } from '../../components/orders/orderText';
import useTableParams from '../../hooks/useTableParams';
import { useGetMovementsQuery } from '../../store/api/inventoryApi';

const DATE_FORMAT = 'YYYY-MM-DD';
const TYPES = {
  in: { label: 'Stock in', color: 'green' },
  out: { label: 'Order', color: 'blue' },
  adjust: { label: 'Adjust', color: 'gold' },
  return: { label: 'Returned', color: 'purple' },
};

export default function MovementsPage() {
  const { filters, page, limit, setFilters, setPage, reset } = useTableParams({ defaultLimit: 30 });
  const { variantId, type, from, to } = filters;
  const { data, isFetching, isError, refetch } = useGetMovementsQuery({
    page,
    limit,
    ...(variantId ? { variantId } : {}),
    ...(type ? { type } : {}),
    ...(from ? { from: `${from}T00:00:00+06:00` } : {}),
    ...(to ? { to: `${to}T23:59:59+06:00` } : {}),
  });

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (value) => <span className="whitespace-nowrap">{formatDhaka(value)}</span>,
    },
    {
      title: 'Variant',
      key: 'variant',
      render: (_, row) => (
        <span>
          <span className="block font-medium">{row.productName ?? 'Deleted product'}</span>
          <span className="text-xs text-text/60">
            {[row.color, row.size, row.sku].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (value) => <Tag color={TYPES[value].color}>{TYPES[value].label}</Tag>,
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      key: 'qty',
      align: 'right',
      render: (qty) => (
        <strong style={{ color: qty > 0 ? '#389e0d' : '#cf1322' }}>
          {qty > 0 ? `+${qty}` : qty}
        </strong>
      ),
    },
    { title: 'After', dataIndex: 'balanceAfter', key: 'after', align: 'right' },
    { title: 'Reason', dataIndex: 'reason', key: 'reason' },
    {
      title: 'Order',
      key: 'order',
      render: (_, row) =>
        row.order ? (
          <Link to={`/orders/${row.order.id}`} className="font-mono">
            {row.order.orderNo}
          </Link>
        ) : (
          '—'
        ),
    },
    { title: 'By', key: 'user', render: (_, row) => row.user?.name ?? 'Customer' },
  ];

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      <h1 className="m-0 text-2xl font-semibold">Stock movements</h1>
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select
            aria-label="Movement type"
            placeholder="Any type"
            allowClear
            value={type}
            onChange={(value) => setFilters({ type: value })}
            options={Object.entries(TYPES).map(([value, { label }]) => ({ value, label }))}
            style={{ minWidth: 160 }}
          />
          <DatePicker.RangePicker
            aria-label="Date range"
            value={from && to ? [dayjs(from), dayjs(to)] : null}
            onChange={(range) =>
              setFilters({
                from: range?.[0]?.format(DATE_FORMAT),
                to: range?.[1]?.format(DATE_FORMAT),
              })
            }
          />
          {variantId && (
            <Tag closable onClose={() => setFilters({ variantId: undefined })}>
              One variant only
            </Tag>
          )}
          {hasFilters && (
            <Button type="link" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
        {isError ? (
          <Result
            status="error"
            title="Could not load stock movements"
            extra={<Button onClick={refetch}>Try again</Button>}
          />
        ) : (
          <Table
            rowKey="id"
            loading={!data && isFetching}
            columns={columns}
            dataSource={data?.data ?? []}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: (
                <Empty
                  description={hasFilters ? 'No movements match these filters' : 'No movements yet'}
                />
              ),
            }}
            pagination={{
              current: page,
              pageSize: limit,
              total: data?.meta.total ?? 0,
              onChange: setPage,
              showTotal: (total) => `${total} movements`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
