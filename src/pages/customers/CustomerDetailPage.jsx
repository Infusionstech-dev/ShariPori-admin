import { useState } from 'react';
import { StopOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Result,
  Skeleton,
  Statistic,
  Table,
  Tag,
} from 'antd';
import { Link, useParams } from 'react-router-dom';

import StatusTag from '../../components/orders/StatusTag';
import { formatDhaka } from '../../components/orders/orderText';
import usePermission from '../../hooks/usePermission';
import { formatBDT } from '../../lib/format';
import { useGetCustomerQuery, useSetCustomerBlockedMutation } from '../../store/api/customerApi';

function BlockModal({ customer, onClose }) {
  const { message } = App.useApp();
  const [reason, setReason] = useState('');
  const [setBlocked, { isLoading }] = useSetCustomerBlockedMutation();
  const blocking = !customer.isBlocked;

  const save = async () => {
    try {
      await setBlocked({ id: customer.id, isBlocked: blocking, reason: reason.trim() }).unwrap();
      message.success(blocking ? 'Customer blocked and logged out' : 'Customer unblocked');
      onClose();
    } catch (err) {
      message.error(err?.data?.details?.[0]?.message ?? err?.data?.message ?? 'Could not save');
    }
  };

  return (
    <Modal
      open
      title={blocking ? `Block ${customer.name}?` : `Unblock ${customer.name}?`}
      okText={blocking ? 'Block customer' : 'Unblock customer'}
      okButtonProps={{ danger: blocking, disabled: blocking && !reason.trim() }}
      confirmLoading={isLoading}
      onOk={save}
      onCancel={onClose}
      destroyOnHidden
    >
      <p>
        {blocking
          ? 'They are logged out everywhere and cannot log in or place orders with this phone, even as a guest.'
          : 'They can log in and order again.'}
      </p>
      <Input.TextArea
        aria-label="Reason"
        rows={3}
        maxLength={300}
        placeholder={
          blocking ? 'Reason (required), for example repeated fake orders' : 'Note (optional)'
        }
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const can = usePermission();
  const { data: customer, isLoading, isError, error, refetch } = useGetCustomerQuery(id);
  const [blocking, setBlocking] = useState(false);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }
  if (isError) {
    return error?.status === 404 ? (
      <Result status="404" title="Customer not found" />
    ) : (
      <Result
        status="error"
        title="Could not load this customer"
        extra={<Button onClick={refetch}>Try again</Button>}
      />
    );
  }

  const stats = [
    { title: 'Orders', value: customer.totalOrders },
    { title: 'Delivered', value: customer.deliveredOrders },
    { title: 'Cancelled', value: customer.cancelledOrders },
    { title: 'Spent (delivered)', value: formatBDT(customer.totalSpent) },
  ];

  const orderColumns = [
    {
      title: 'Order',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (orderNo, order) => (
        <Link to={`/orders/${order.id}`} className="font-mono">
          {orderNo}
        </Link>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => <span className="whitespace-nowrap">{formatDhaka(value)}</span>,
    },
    { title: 'Items', dataIndex: 'itemCount', key: 'itemCount', align: 'right' },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: formatBDT },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <StatusTag status={value} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {customer.name}
            {customer.isBlocked && <Tag color="red">Blocked</Tag>}
          </h1>
          <div className="text-sm text-text/60">
            <a href={`tel:${customer.phone}`}>{customer.phone}</a>
            {customer.email && ` · ${customer.email}`}
          </div>
          <div className="text-xs text-text/60">
            Registered {formatDhaka(customer.registeredAt)}
            {customer.lastLoginAt && ` · Last login ${formatDhaka(customer.lastLoginAt)}`}
          </div>
        </div>
        {can('customers.block') && (
          <Button
            danger={!customer.isBlocked}
            icon={<StopOutlined />}
            onClick={() => setBlocking(true)}
          >
            {customer.isBlocked ? 'Unblock' : 'Block'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} size="small">
            <Statistic title={stat.title} value={stat.value} />
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card title="Recent orders" className="min-w-0">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            columns={orderColumns}
            dataSource={customer.recentOrders}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty description="No orders yet" /> }}
          />
          {customer.totalOrders > customer.recentOrders.length && (
            <Link to={`/orders?q=${customer.phone}`}>
              <Button type="link">See all {customer.totalOrders} orders</Button>
            </Link>
          )}
        </Card>
        <Card title="Addresses">
          {customer.addresses.length ? (
            <ul className="m-0 list-none space-y-3 p-0 text-sm">
              {customer.addresses.map((address) => (
                <li key={address.id}>
                  <span className="font-medium">{address.name}</span>
                  {address.isDefault && (
                    <Tag color="blue" className="ml-2">
                      Default
                    </Tag>
                  )}
                  <div>{address.phone}</div>
                  <div className="text-text/70">
                    {address.addressLine}, {address.thana}, {address.district}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty description="No saved addresses" />
          )}
        </Card>
      </div>

      {blocking && <BlockModal customer={customer} onClose={() => setBlocking(false)} />}
    </div>
  );
}
