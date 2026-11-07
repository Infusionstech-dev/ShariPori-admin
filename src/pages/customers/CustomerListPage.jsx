import { useEffect, useState } from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty, Input, Result, Select, Table, Tabs, Tag } from 'antd';
import { Link } from 'react-router-dom';

import { formatDhaka } from '../../components/orders/orderText';
import useTableParams from '../../hooks/useTableParams';
import { downloadCsv } from '../../lib/csv';
import { formatBDT } from '../../lib/format';
import {
  useGetCustomersQuery,
  useGetGuestsQuery,
  useLazyGetCustomersQuery,
  useLazyGetGuestsQuery,
} from '../../store/api/customerApi';

const SEARCH_DELAY_MS = 400;
const EXPORT_PAGE = 100;
const EXPORT_MAX_PAGES = 50;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'total_spent', label: 'Spent the most' },
  { value: 'last_order', label: 'Ordered most recently' },
];

const statColumns = [
  { title: 'Orders', dataIndex: 'totalOrders', key: 'totalOrders', align: 'right' },
  { title: 'Delivered', dataIndex: 'deliveredOrders', key: 'deliveredOrders', align: 'right' },
  { title: 'Cancelled', dataIndex: 'cancelledOrders', key: 'cancelledOrders', align: 'right' },
  {
    title: 'Spent',
    dataIndex: 'totalSpent',
    key: 'totalSpent',
    align: 'right',
    render: (value) => <span className="whitespace-nowrap">{formatBDT(value)}</span>,
  },
  {
    title: 'Last order',
    dataIndex: 'lastOrderAt',
    key: 'lastOrderAt',
    render: (value) => (
      <span className="whitespace-nowrap">{value ? formatDhaka(value) : '—'}</span>
    ),
  },
];

const CSV_STATS = [
  { title: 'Orders', value: (row) => row.totalOrders },
  { title: 'Delivered', value: (row) => row.deliveredOrders },
  { title: 'Cancelled', value: (row) => row.cancelledOrders },
  { title: 'Spent (BDT)', value: (row) => row.totalSpent },
  { title: 'Last order', value: (row) => (row.lastOrderAt ? formatDhaka(row.lastOrderAt) : '') },
];

export default function CustomerListPage() {
  const { message } = App.useApp();
  const { filters, page, limit, sort, setFilters, setPage, setSort, reset } = useTableParams();
  const { tab = 'registered', q: urlSearch = '', blocked } = filters;
  const guests = tab === 'guests';
  const query = { page, limit, sort, ...(urlSearch ? { q: urlSearch } : {}) };

  const registered = useGetCustomersQuery(
    { ...query, ...(blocked ? { blocked: blocked === 'yes' } : {}) },
    { skip: guests }
  );
  const guestList = useGetGuestsQuery(query, { skip: !guests });
  const current = guests ? guestList : registered;
  const [fetchCustomers] = useLazyGetCustomersQuery();
  const [fetchGuests] = useLazyGetGuestsQuery();
  const [exporting, setExporting] = useState(false);
  const [text, setText] = useState(urlSearch);

  useEffect(() => {
    if (text.trim() === urlSearch) {
      return undefined;
    }
    const timer = setTimeout(
      () => setFilters({ q: text.trim() }, { replace: true }),
      SEARCH_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [text, urlSearch, setFilters]);

  // Exports every row that matches the current filters, page by page.
  const exportCsv = async () => {
    setExporting(true);
    try {
      const fetchPage = guests ? fetchGuests : fetchCustomers;
      const rows = [];
      for (let p = 1; p <= EXPORT_MAX_PAGES; p += 1) {
        const result = await fetchPage({
          ...query,
          ...(!guests && blocked ? { blocked: blocked === 'yes' } : {}),
          page: p,
          limit: EXPORT_PAGE,
        }).unwrap();
        rows.push(...result.data);
        if (p >= result.meta.totalPages) break;
      }
      const columns = guests
        ? [
            { title: 'Name', value: (row) => row.name },
            { title: 'Phone', value: (row) => row.phone },
            ...CSV_STATS,
          ]
        : [
            { title: 'Name', value: (row) => row.name },
            { title: 'Phone', value: (row) => row.phone },
            { title: 'Email', value: (row) => row.email },
            { title: 'Registered', value: (row) => formatDhaka(row.registeredAt) },
            { title: 'Blocked', value: (row) => (row.isBlocked ? 'Yes' : 'No') },
            ...CSV_STATS,
          ];
      downloadCsv(`${guests ? 'guest-buyers' : 'customers'}.csv`, columns, rows);
      message.success(`Exported ${rows.length} rows`);
    } catch {
      message.error('Could not export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const columns = guests
    ? [
        {
          title: 'Guest',
          key: 'guest',
          render: (_, row) => (
            <span>
              <span className="block">{row.name}</span>
              <a href={`tel:${row.phone}`} className="text-xs">
                {row.phone}
              </a>
            </span>
          ),
        },
        ...statColumns,
        {
          title: '',
          key: 'orders',
          render: (_, row) => (
            <Link to={`/orders?q=${row.phone}`}>
              <Button type="link" size="small">
                Orders
              </Button>
            </Link>
          ),
        },
      ]
    : [
        {
          title: 'Customer',
          key: 'customer',
          render: (_, row) => (
            <span>
              <Link to={`/customers/${row.id}`} className="block font-medium">
                {row.name}
              </Link>
              <a href={`tel:${row.phone}`} className="text-xs">
                {row.phone}
              </a>
              {row.isBlocked && (
                <Tag color="red" className="ml-2">
                  Blocked
                </Tag>
              )}
            </span>
          ),
        },
        ...statColumns,
        {
          title: 'Registered',
          dataIndex: 'registeredAt',
          key: 'registeredAt',
          render: (value) => <span className="whitespace-nowrap">{formatDhaka(value)}</span>,
        },
      ];

  const hasFilters = Boolean(urlSearch || blocked);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-semibold">Customers</h1>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <Card styles={{ body: { paddingTop: 4 } }}>
        <Tabs
          activeKey={tab}
          onChange={(key) =>
            setFilters({ tab: key === 'registered' ? undefined : key, blocked: undefined })
          }
          items={[
            { key: 'registered', label: 'Registered' },
            { key: 'guests', label: 'Guests' },
          ]}
        />
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <Input.Search
            aria-label="Search customers"
            placeholder={guests ? 'Name or phone' : 'Name, phone or email'}
            allowClear
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Select aria-label="Sort" value={sort} onChange={setSort} options={SORT_OPTIONS} />
          {!guests && (
            <Select
              aria-label="Blocked"
              placeholder="Blocked or not"
              allowClear
              value={blocked}
              onChange={(value) => setFilters({ blocked: value })}
              options={[
                { value: 'yes', label: 'Blocked only' },
                { value: 'no', label: 'Active only' },
              ]}
            />
          )}
        </div>
        {current.isError ? (
          <Result
            status="error"
            title="Could not load customers"
            extra={<Button onClick={current.refetch}>Try again</Button>}
          />
        ) : (
          <Table
            rowKey={guests ? 'phone' : 'id'}
            loading={!current.data && current.isFetching}
            columns={columns}
            dataSource={current.data?.data ?? []}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: (
                <Empty
                  description={hasFilters ? 'No customers match these filters' : 'No customers yet'}
                >
                  {hasFilters && <Button onClick={reset}>Clear filters</Button>}
                </Empty>
              ),
            }}
            pagination={{
              current: page,
              pageSize: limit,
              total: current.data?.meta.total ?? 0,
              showSizeChanger: true,
              onChange: setPage,
              showTotal: (total) => `${total} ${guests ? 'guests' : 'customers'}`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
