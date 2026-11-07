import { useState } from 'react';
import { App, Button, Input, InputNumber, Select, Space } from 'antd';

import { useUpdateOrderDeliveryMutation } from '../../store/api/orderApi';
import { COURIERS } from './orderText';

const OTHER = 'Other';
const LOCKED = ['delivered', 'cancelled', 'returned'];

// Courier and tracking number, plus the delivery charge while it can still change.
export default function DeliveryForm({ order, canEdit }) {
  const { message } = App.useApp();
  const custom = order.courier && !COURIERS.includes(order.courier);
  const [courier, setCourier] = useState(custom ? OTHER : (order.courier ?? undefined));
  const [otherCourier, setOtherCourier] = useState(custom ? order.courier : '');
  const [trackingNo, setTrackingNo] = useState(order.trackingNo ?? '');
  const [charge, setCharge] = useState(order.totals.deliveryCharge);
  const [updateDelivery, { isLoading }] = useUpdateOrderDeliveryMutation();
  const chargeLocked = LOCKED.includes(order.status);

  const save = async () => {
    try {
      await updateDelivery({
        id: order.id,
        courier: (courier === OTHER ? otherCourier.trim() : courier) || null,
        trackingNo: trackingNo.trim() || null,
        ...(chargeLocked || charge === order.totals.deliveryCharge
          ? {}
          : { deliveryCharge: charge }),
      }).unwrap();
      message.success('Delivery details saved');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not save the delivery details');
    }
  };

  if (!canEdit) {
    return (
      <dl className="m-0 space-y-1 text-sm">
        <div>
          <dt className="inline text-text/60">Courier: </dt>
          <dd className="inline">{order.courier ?? 'Not set'}</dd>
        </div>
        <div>
          <dt className="inline text-text/60">Tracking no: </dt>
          <dd className="inline">{order.trackingNo ?? 'Not set'}</dd>
        </div>
      </dl>
    );
  }

  return (
    <Space direction="vertical" className="w-full">
      <Select
        aria-label="Courier"
        placeholder="Courier"
        allowClear
        value={courier}
        onChange={setCourier}
        options={[...COURIERS, OTHER].map((value) => ({ value, label: value }))}
        className="w-full"
      />
      {courier === OTHER && (
        <Input
          aria-label="Courier name"
          placeholder="Courier name"
          value={otherCourier}
          onChange={(event) => setOtherCourier(event.target.value)}
        />
      )}
      <Input
        aria-label="Tracking number"
        placeholder="Tracking number"
        value={trackingNo}
        onChange={(event) => setTrackingNo(event.target.value)}
      />
      <InputNumber
        aria-label="Delivery charge"
        addonBefore="Delivery ৳"
        min={0}
        precision={2}
        disabled={chargeLocked}
        value={charge}
        onChange={(value) => setCharge(value ?? 0)}
        className="w-full"
      />
      <Button type="primary" loading={isLoading} onClick={save}>
        Save delivery
      </Button>
    </Space>
  );
}
