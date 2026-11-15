import { useEffect, useState } from 'react';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Result,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

import ChangeStatusModal from '../../components/orders/ChangeStatusModal';
import InvoiceButton from '../../components/orders/InvoiceButton';
import OrderQuickView from '../../components/orders/OrderQuickView';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  STATUSES,
  STATUS_LABELS,
  formatDhaka,
} from '../../components/orders/orderText';
import StatusTag from '../../components/orders/StatusTag';
import usePermission from '../../hooks/usePermission';
import useTableParams from '../../hooks/useTableParams';
import { formatBDT } from '../../lib/format';
import { useGetDeliveryZonesQuery, useGetOrdersQuery } from '../../store/api/orderApi';

const SEARCH_DELAY_MS = 400;
const REFRESH_MS = 60 * 1000;
const DATE_FORMAT = 'YYYY-MM-DD';

// Date filters cover whole Dhaka days.
const dayStart = (value) => `${value}T00:00:00+06:00`;
const dayEnd = (value) => `${value}T23:59:59+06:00`;

export default function OrderListPage() {
  const can = usePermission();
  const { filters, page, limit, sort, setFilters, setPage, setSort, reset } = useTableParams();
  const {
    status,
    paymentMethod,
    paymentStatus,
    deliveryZoneId,
    from,
    to,
    q: urlSearch = '',
  } = filters;

  const query = {
    page,
    limit,
    sort,
    ...(status ? { status } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(deliveryZoneId ? { deliveryZoneId } : {}),
    ...(from ? { from: dayStart(from) } : {}),
    ...(to ? { to: dayEnd(to) } : {}),
    ...(urlSearch ? { q: urlSearch } : {}),
  };
  const { data, isFetching, isError, refetch } = useGetOrdersQuery(query, {
    pollingInterval: REFRESH_MS,
    skipPollingIfUnfocused: true,
  });
  const { data: zones = [] } = useGetDeliveryZonesQuery();

  const [text, setText] = useState(urlSearch);
  const [selected, setSelected] = useState([]);
  const [quickId, setQuickId] = useState(null);
  const [statusOrders, setStatusOrders] = useState(null);

  // Orders that arrive while the page is open are highlighted until the next visit.
  const [seen, setSeen] = useState(null);
  const [fresh, setFresh] = useState(() => new Set());
  const [lastData, setLastData] = useState(null);
  if (data && data !== lastData) {
    setLastData(data);
    const ids = data.data.map((order) => order.id);
    if (!seen) {
      setSeen(new Set(ids));
    } else {
      const arrived = data.data.filter(
        (order) => !seen.has(order.id) && order.status === 'pending'
      );
      if (arrived.length) {
        setFresh(new Set([...fresh, ...arrived.map((order) => order.id)]));
        setSeen(new Set([...seen, ...ids]));
      }
    }
  }

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

  const counts = data?.meta.statusCounts ?? {};
  const allCount = Object.values(counts).reduce((total, count) => total + count, 0);
  const rows = data?.data ?? [];
  const selectedOrders = rows.filter((order) => selected.includes(order.id));

  const columns = [
    {
      title: 'Order no',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (orderNo, order) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Link to={`/orders/${order.id}`} className="font-mono font-medium">
            {orderNo}
          </Link>
          {fresh.has(order.id) && <Tag color="magenta">New</Tag>}
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      sortOrder: sort === 'oldest' ? 'ascend' : 'descend',
      render: (value) => <span className="whitespace-nowrap">{formatDhaka(value)}</span>,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, order) => (
        <span>
          <span className="block">{order.customerName}</span>
          <a
            href={`tel:${order.phone}`}
            className="text-xs"
            aria-label={`Call ${order.customerName}`}
          >
            {order.phone}
          </a>
        </span>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      align: 'right',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value) => <span className="whitespace-nowrap">{formatBDT(value)}</span>,
    },
    {
      title: 'Payment',
      key: 'payment',
      render: (_, order) => (
        <span className="whitespace-nowrap">
          <span className="block text-xs">{PAYMENT_METHODS[order.paymentMethod]}</span>
          <Tag color={PAYMENT_STATUSES[order.paymentStatus].color}>
            {PAYMENT_STATUSES[order.paymentStatus].label}
          </Tag>
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <StatusTag status={value} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, order) => (
        <Space size={0}>
          <Tooltip title="Quick view">
            <Button
              type="text"
              aria-label={`Quick view ${order.orderNo}`}
              icon={<EyeOutlined />}
              onClick={() => setQuickId(order.id)}
            />
          </Tooltip>
          <InvoiceButton ids={order.id} label={`Print invoice ${order.orderNo}`} iconOnly />
          <Link to={`/orders/${order.id}`}>
            <Button type="link" size="small">
              Open
            </Button>
          </Link>
        </Space>
      ),
    },
  ];

  const hasFilters = Object.keys(filters).some((key) => key !== 'status');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-semibold">Orders</h1>
        {can('orders.create') && (
          <Link to="/orders/new">
            <Button type="primary" icon={<PlusOutlined />}>
              New order
            </Button>
          </Link>
        )}
      </div>

      <Card styles={{ body: { paddingTop: 4 } }}>
        <Tabs
          activeKey={status ?? 'all'}
          onChange={(key) => {
            setSelected([]);
            setFilters({ status: key === 'all' ? undefined : key });
          }}
          items={[
            { key: 'all', label: `All (${allCount})` },
            ...STATUSES.map((value) => ({
              key: value,
              label: `${STATUS_LABELS[value]} (${counts[value] ?? 0})`,
            })),
          ]}
        />

        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Input.Search
            aria-label="Search orders"
            placeholder="Order no, phone or name"
            allowClear
            value={text}
            onChange={(event) => setText(event.target.value)}
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
          <Select
            aria-label="Payment method"
            placeholder="Payment method"
            allowClear
            value={paymentMethod}
            onChange={(value) => setFilters({ paymentMethod: value })}
            options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            aria-label="Payment status"
            placeholder="Payment status"
            allowClear
            value={paymentStatus}
            onChange={(value) => setFilters({ paymentStatus: value })}
            options={Object.entries(PAYMENT_STATUSES).map(([value, { label }]) => ({
              value,
              label,
            }))}
          />
          <Select
            aria-label="Delivery zone"
            placeholder="Delivery zone"
            allowClear
            value={deliveryZoneId ? Number(deliveryZoneId) : undefined}
            onChange={(value) => setFilters({ deliveryZoneId: value })}
            options={zones.map((zone) => ({
              value: zone.id,
              label: zone.nameEn,
            }))}
          />
        </div>

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded bg-soft px-3 py-2">
            <span className="text-sm">{selected.length} selected</span>
            <Button size="small" type="primary" onClick={() => setStatusOrders(selectedOrders)}>
              Change status
            </Button>
            <InvoiceButton size="small" ids={selected} label="Print invoices" />
            <Button size="small" type="text" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </div>
        )}

        {isError ? (
          <Result
            status="error"
            title="Could not load orders"
            extra={<Button onClick={refetch}>Try again</Button>}
          />
        ) : (
          <Table
            rowKey="id"
            loading={!data && isFetching}
            columns={columns}
            dataSource={rows}
            scroll={{ x: 'max-content' }}
            rowClassName={(order) => (fresh.has(order.id) ? 'bg-amber-50' : '')}
            rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
            onChange={(_, __, sorter, { action }) => {
              // Page clicks also arrive here, and must not reset the page through the sort.
              if (action === 'sort' && sorter.columnKey === 'createdAt') {
                setSort(sorter.order === 'ascend' ? 'oldest' : undefined);
              }
            }}
            locale={{
              emptyText: (
                <Empty description={hasFilters ? 'No orders match these filters' : 'No orders yet'}>
                  {hasFilters && <Button onClick={reset}>Clear filters</Button>}
                </Empty>
              ),
            }}
            pagination={{
              current: page,
              pageSize: limit,
              total: data?.meta.total ?? 0,
              showSizeChanger: true,
              onChange: setPage,
              showTotal: (total) => `${total} orders`,
            }}
          />
        )}
      </Card>

      <OrderQuickView
        orderId={quickId}
        onClose={() => setQuickId(null)}
        onChangeStatus={(order) => setStatusOrders([order])}
      />
      {statusOrders && (
        <ChangeStatusModal
          open
          orders={statusOrders}
          canEditDelivery={can('orders.update')}
          onClose={(changed) => {
            setStatusOrders(null);
            if (changed) {
              setSelected([]);
            }
          }}
        />
      )}
    </div>
  );
}
