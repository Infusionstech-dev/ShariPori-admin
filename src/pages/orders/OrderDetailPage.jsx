import { useEffect, useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Result,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useParams } from 'react-router-dom';

import ChangeStatusModal from '../../components/orders/ChangeStatusModal';
import DeliveryForm from '../../components/orders/DeliveryForm';
import EditItemsModal from '../../components/orders/EditItemsModal';
import OrderItemsTable from '../../components/orders/OrderItemsTable';
import OrderTimeline from '../../components/orders/OrderTimeline';
import OrderTotals from '../../components/orders/OrderTotals';
import PaymentPanel from '../../components/orders/PaymentPanel';
import InvoiceButton from '../../components/orders/InvoiceButton';
import { SOURCES, formatDhaka } from '../../components/orders/orderText';
import StatusTag from '../../components/orders/StatusTag';
import usePermission from '../../hooks/usePermission';
import {
  useGetOrderQuery,
  useUpdateOrderCustomerMutation,
  useUpdateOrderNoteMutation,
} from '../../store/api/orderApi';

const NOTE_DELAY_MS = 1000;
const ITEM_EDIT = ['pending', 'confirmed'];
const CUSTOMER_EDIT = ['pending', 'confirmed', 'processing'];
const PHONE = /^01[3-9]\d{8}$/;

function CustomerModal({ order, onClose }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [updateCustomer, { isLoading }] = useUpdateOrderCustomerMutation();

  const save = async () => {
    const values = await form.validateFields();
    try {
      await updateCustomer({ id: order.id, ...values }).unwrap();
      message.success('Customer details saved');
      onClose();
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not save the customer details');
    }
  };

  return (
    <Modal
      open
      title="Edit customer and address"
      okText="Save"
      confirmLoading={isLoading}
      onOk={save}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={order.address} requiredMark={false}>
        <Form.Item name="customerName" label="Name" rules={[{ required: true, max: 100 }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Phone"
          rules={[
            {
              required: true,
              pattern: PHONE,
              message: 'Enter a valid 01XXXXXXXXX number',
            },
          ]}
        >
          <Input inputMode="numeric" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
          <Input />
        </Form.Item>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item name="district" label="District" rules={[{ required: true, max: 100 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="thana" label="Thana / Upazila" rules={[{ required: true, max: 100 }]}>
            <Input />
          </Form.Item>
        </div>
        <Form.Item name="addressLine" label="Address" rules={[{ required: true, max: 255 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// Saves a second after typing stops, so no Save button is needed.
function AdminNote({ order, canEdit }) {
  const [text, setText] = useState(order.adminNote ?? '');
  const [saved, setSaved] = useState(order.adminNote ?? '');
  const [updateNote, { isLoading, isError }] = useUpdateOrderNoteMutation();

  useEffect(() => {
    if (text === saved) {
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        await updateNote({ id: order.id, adminNote: text }).unwrap();
        setSaved(text);
      } catch {
        // The status line below says it was not saved.
      }
    }, NOTE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, saved, order.id, updateNote]);

  let state = 'Saved';
  if (text !== saved) state = isError ? 'Not saved. Keep typing to try again.' : 'Saving…';
  if (isLoading) state = 'Saving…';

  return (
    <div>
      <Input.TextArea
        aria-label="Admin note"
        rows={3}
        maxLength={2000}
        placeholder="Only staff see this note"
        disabled={!canEdit}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {canEdit && (
        <Typography.Text
          type={isError ? 'danger' : 'secondary'}
          className="text-xs"
          aria-live="polite"
        >
          {state}
        </Typography.Text>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const can = usePermission();
  const canUpdate = can('orders.update');
  const { data: order, isLoading, isError, error, refetch } = useGetOrderQuery(id);
  const [changingStatus, setChangingStatus] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }
  if (isError) {
    return error?.status === 404 ? (
      <Result status="404" title="Order not found" />
    ) : (
      <Result
        status="error"
        title="Could not load this order"
        extra={<Button onClick={refetch}>Try again</Button>}
      />
    );
  }

  const { address } = order;
  const canEditItems = canUpdate && ITEM_EDIT.includes(order.status);
  const canEditCustomer = canUpdate && CUSTOMER_EDIT.includes(order.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 flex flex-wrap items-center gap-2 text-2xl font-semibold">
            <span className="font-mono">{order.orderNo}</span>
            <StatusTag status={order.status} />
            {order.source !== 'web' && <Tag>{SOURCES[order.source]}</Tag>}
          </h1>
          <Typography.Text type="secondary">{formatDhaka(order.createdAt)}</Typography.Text>
        </div>
        <Space wrap>
          {order.nextStatuses.length > 0 && can('orders.updateStatus') && (
            <Button type="primary" onClick={() => setChangingStatus(true)}>
              Change status
            </Button>
          )}
          {canEditItems && (
            <Button icon={<EditOutlined />} onClick={() => setEditingItems(true)}>
              Edit items
            </Button>
          )}
          <InvoiceButton ids={order.id} />
        </Space>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Card title="Items" className="min-w-0">
            <OrderItemsTable items={order.items} />
            <div className="ml-auto mt-4 max-w-xs">
              <OrderTotals totals={order.totals} />
            </div>
          </Card>

          <Card
            title="Customer & address"
            extra={
              canEditCustomer && (
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => setEditingCustomer(true)}
                >
                  Edit
                </Button>
              )
            }
          >
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="font-medium">{address.customerName}</div>
                <a href={`tel:${address.phone}`}>{address.phone}</a>
                {address.email && <div>{address.email}</div>}
                <div className="mt-1 text-xs text-text/60">
                  {order.customer ? `Account: ${order.customer.name}` : 'Guest order'}
                </div>
              </div>
              <address className="not-italic">
                {address.addressLine}
                <br />
                {address.thana}, {address.district}
                <br />
                <span className="text-text/60">{address.deliveryZone}</span>
              </address>
            </div>
            {order.note && (
              <div className="mt-3 rounded bg-soft p-2 text-sm">
                <span className="font-medium">Customer note: </span>
                {order.note}
              </div>
            )}
          </Card>

          <Card title="Admin note">
            <AdminNote key={order.id} order={order} canEdit={canUpdate} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Payment">
            <PaymentPanel
              key={`${order.id}-${order.paymentStatus}`}
              order={order}
              canEdit={can('orders.payment')}
            />
          </Card>
          <Card title="Delivery">
            <DeliveryForm
              key={`${order.id}-${order.courier}-${order.trackingNo}`}
              order={order}
              canEdit={canUpdate}
            />
          </Card>
          <Card title="Timeline">
            <OrderTimeline history={order.history} />
          </Card>
        </div>
      </div>

      {changingStatus && (
        <ChangeStatusModal
          open
          orders={[order]}
          canEditDelivery={canUpdate}
          onClose={() => setChangingStatus(false)}
        />
      )}
      {editingItems && <EditItemsModal open order={order} onClose={() => setEditingItems(false)} />}
      {editingCustomer && <CustomerModal order={order} onClose={() => setEditingCustomer(false)} />}
    </div>
  );
}
