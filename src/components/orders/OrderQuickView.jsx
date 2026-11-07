import { Button, Drawer, Result, Skeleton, Space } from 'antd';
import { Link } from 'react-router-dom';

import { useGetOrderQuery } from '../../store/api/orderApi';
import OrderItemsTable from './OrderItemsTable';
import OrderTimeline from './OrderTimeline';
import OrderTotals from './OrderTotals';
import { PAYMENT_METHODS, formatDhaka } from './orderText';
import StatusTag from './StatusTag';

export default function OrderQuickView({ orderId, onClose, onChangeStatus }) {
  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useGetOrderQuery(orderId, {
    skip: !orderId,
  });

  let content = null;
  if (isLoading) {
    content = <Skeleton active paragraph={{ rows: 8 }} />;
  } else if (isError) {
    content = (
      <Result
        status="error"
        title="Could not load this order"
        extra={<Button onClick={refetch}>Try again</Button>}
      />
    );
  } else if (order) {
    const { address } = order;
    content = (
      <Space orientation="vertical" size="large" className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusTag status={order.status} />
          <span className="text-sm text-text/60">{formatDhaka(order.createdAt)}</span>
        </div>
        <div className="text-sm">
          <div className="font-medium">{address.customerName}</div>
          <a href={`tel:${address.phone}`}>{address.phone}</a>
          <div>
            {address.addressLine}, {address.thana}, {address.district}
          </div>
          <div className="text-text/60">
            {address.deliveryZone} · {PAYMENT_METHODS[order.paymentMethod]}
          </div>
        </div>
        <OrderItemsTable items={order.items} compact />
        <OrderTotals totals={order.totals} />
        <OrderTimeline history={order.history} />
      </Space>
    );
  }

  return (
    <Drawer
      open={Boolean(orderId)}
      onClose={onClose}
      title={order?.orderNo ?? 'Order'}
      size={480}
      extra={
        order && (
          <Space>
            {order.nextStatuses.length > 0 && (
              <Button onClick={() => onChangeStatus(order)}>Change status</Button>
            )}
            <Link to={`/orders/${order.id}`}>
              <Button type="primary">Open</Button>
            </Link>
          </Space>
        )
      }
    >
      {content}
    </Drawer>
  );
}
