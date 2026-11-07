import { useEffect, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Table,
} from 'antd';
import { useNavigate } from 'react-router-dom';

import { SOURCES } from '../../components/orders/orderText';
import VariantPicker from '../../components/products/VariantPicker';
import { formatBDT } from '../../lib/format';
import {
  useCreateOrderMutation,
  useGetDeliveryZonesQuery,
  useGetQuoteQuery,
} from '../../store/api/orderApi';

const QUOTE_DELAY_MS = 400;
const MAX_QTY = 10;
const PHONE = /^01[3-9]\d{8}$/;
const round = (value) => Math.round(value * 100) / 100;

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function NewOrderPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [lines, setLines] = useState([]);
  const [picking, setPicking] = useState(false);
  const [problems, setProblems] = useState([]);
  // One key per page visit, so a double click cannot create two orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const { data: zones = [] } = useGetDeliveryZonesQuery();
  const [createOrder, { isLoading }] = useCreateOrderMutation();

  const deliveryZoneId = Form.useWatch('deliveryZoneId', form);
  const couponCode = Form.useWatch('couponCode', form);
  const customCharge = Form.useWatch('deliveryCharge', form);
  const customDiscount = Form.useWatch('discount', form);

  const items = lines
    .filter((line) => line.quantity)
    .map(({ variantId, quantity }) => ({ variantId, quantity }));
  const quoteArgs = useDebounced(
    JSON.stringify({
      items,
      deliveryZoneId: deliveryZoneId ?? 0,
      couponCode: couponCode || null,
    }),
    QUOTE_DELAY_MS
  );
  const { data: quote, isFetching } = useGetQuoteQuery(JSON.parse(quoteArgs), {
    skip: !items.length,
  });

  // Staff may agree a different charge or discount with the customer; the server checks it again.
  const deliveryCharge = customCharge ?? quote?.deliveryCharge ?? 0;
  const discount = Math.min(customDiscount ?? quote?.discount ?? 0, quote?.subtotal ?? 0);
  const total = quote ? round(quote.subtotal - discount + deliveryCharge) : 0;
  const lineErrors = quote?.errors.filter((error) => error.variantId) ?? [];
  const couponError = quote?.errors.find((error) => error.field === 'couponCode')?.message;

  const submit = async (values) => {
    setProblems([]);
    if (!items.length) {
      message.error('Add at least one item');
      return;
    }
    try {
      const order = await createOrder({
        ...values,
        email: values.email || undefined,
        note: values.note || undefined,
        couponCode: values.couponCode || undefined,
        deliveryCharge: values.deliveryCharge ?? undefined,
        discount: values.discount ?? undefined,
        items,
        idempotencyKey,
      }).unwrap();
      message.success(`Order ${order.orderNo} created`);
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      if (Array.isArray(err?.data?.details) && err.data.details[0]?.variantId) {
        const names = new Map(lines.map((line) => [line.variantId, line.name]));
        setProblems(
          err.data.details.map((detail) => `${names.get(detail.variantId)}: ${detail.message}`)
        );
      } else {
        message.error(err?.data?.message ?? 'Could not create the order');
      }
    }
  };

  const columns = [
    {
      title: 'Item',
      key: 'name',
      render: (_, line) => (
        <span>
          <span className="block font-medium">{line.name}</span>
          <span className="text-xs text-text/60">{line.detail}</span>
        </span>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      render: formatBDT,
    },
    {
      title: 'Qty',
      key: 'quantity',
      width: 90,
      render: (_, line) => (
        <InputNumber
          aria-label={`Quantity of ${line.name}`}
          min={1}
          max={Math.min(MAX_QTY, line.stock ?? MAX_QTY)}
          precision={0}
          value={line.quantity}
          onChange={(value) =>
            setLines((current) =>
              current.map((item) =>
                item.variantId === line.variantId ? { ...item, quantity: value } : item
              )
            )
          }
          style={{ width: 72 }}
        />
      ),
    },
    {
      title: '',
      key: 'remove',
      width: 48,
      render: (_, line) => (
        <Button
          type="text"
          danger
          aria-label={`Remove ${line.name}`}
          icon={<DeleteOutlined />}
          onClick={() =>
            setLines((current) => current.filter((item) => item.variantId !== line.variantId))
          }
        />
      ),
    },
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark="optional"
      onFinish={submit}
      initialValues={{
        source: 'phone',
        paymentMethod: 'cod',
        status: 'confirmed',
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-semibold">New order</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Card title="Customer">
            <div className="grid gap-x-3 sm:grid-cols-2">
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
                extra="If a customer account has this phone, the order joins it."
              >
                <Input inputMode="numeric" />
              </Form.Item>
              <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="source" label="Order came from" rules={[{ required: true }]}>
                <Select
                  options={['phone', 'facebook', 'manual'].map((value) => ({
                    value,
                    label: SOURCES[value],
                  }))}
                />
              </Form.Item>
              <Form.Item name="district" label="District" rules={[{ required: true, max: 100 }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="thana"
                label="Thana / Upazila"
                rules={[{ required: true, max: 100 }]}
              >
                <Input />
              </Form.Item>
            </div>
            <Form.Item
              name="addressLine"
              label="Address"
              rules={[{ required: true, min: 3, max: 255 }]}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="note" label="Customer note" rules={[{ max: 500 }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Card>

          <Card
            title="Items"
            extra={
              <Button icon={<PlusOutlined />} onClick={() => setPicking(true)}>
                Add item
              </Button>
            }
          >
            {problems.length > 0 && (
              <Alert
                className="mb-3"
                type="error"
                showIcon
                message="Some items cannot be ordered"
                description={
                  <ul className="m-0 list-disc pl-5">
                    {problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                }
              />
            )}
            {lineErrors.length > 0 && (
              <Alert
                className="mb-3"
                type="warning"
                showIcon
                message={lineErrors.map((error) => error.message).join('. ')}
              />
            )}
            {lines.length ? (
              <Table
                rowKey="variantId"
                size="small"
                pagination={false}
                columns={columns}
                dataSource={lines}
                scroll={{ x: 'max-content' }}
              />
            ) : (
              <Empty description="No items yet">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setPicking(true)}>
                  Add item
                </Button>
              </Empty>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Delivery & payment">
            <Form.Item
              name="deliveryZoneId"
              label="Delivery zone"
              rules={[{ required: true, message: 'Choose a zone' }]}
            >
              <Radio.Group className="flex flex-col gap-2">
                {zones.map((zone) => (
                  <Radio key={zone.id} value={zone.id}>
                    {zone.nameEn} · {formatBDT(zone.charge)}
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
            <Form.Item name="paymentMethod" label="Payment">
              <Select options={[{ value: 'cod', label: 'Cash on delivery' }]} />
            </Form.Item>
            <Form.Item name="status" label="Start as">
              <Radio.Group
                optionType="button"
                options={[
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="couponCode"
              label="Coupon"
              normalize={(value) => value?.toUpperCase()}
              validateStatus={couponError ? 'warning' : undefined}
              help={couponError}
            >
              <Input />
            </Form.Item>
            <div className="grid grid-cols-2 gap-x-3">
              <Form.Item name="deliveryCharge" label="Custom delivery" extra="Blank: zone price">
                <InputNumber min={0} precision={2} className="w-full" />
              </Form.Item>
              <Form.Item name="discount" label="Custom discount" extra="Blank: coupon">
                <InputNumber min={0} precision={2} className="w-full" />
              </Form.Item>
            </div>
          </Card>

          <Card title="Total">
            <dl
              aria-busy={isFetching}
              className={`m-0 space-y-1 text-sm ${isFetching ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="m-0">{formatBDT(quote?.subtotal ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd className="m-0">{formatBDT(deliveryCharge)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd className="m-0">− {formatBDT(discount)}</dd>
              </div>
              <div className="flex justify-between border-t border-soft pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="m-0">{formatBDT(total)}</dd>
              </div>
            </dl>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              className="mt-4"
              loading={isLoading}
              disabled={!items.length || lineErrors.length > 0}
            >
              Create order
            </Button>
          </Card>
        </div>
      </div>

      <VariantPicker
        open={picking}
        onClose={() => setPicking(false)}
        allowPackages
        addedIds={lines.map((line) => line.variantId)}
        onAdd={(item) =>
          setLines((current) => [
            ...current,
            {
              variantId: item.componentVariantId,
              quantity: item.quantity,
              name: item.productName,
              detail: [item.color, item.size].filter(Boolean).join(' / '),
              unitPrice: item.unitPrice,
              stock: item.stock,
            },
          ])
        }
      />
    </Form>
  );
}
