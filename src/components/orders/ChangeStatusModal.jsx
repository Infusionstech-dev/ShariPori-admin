import { useState } from 'react';
import { Alert, App, Input, Modal, Radio, Select, Space, Typography } from 'antd';

import {
  useBulkOrderStatusMutation,
  useUpdateOrderDeliveryMutation,
  useUpdateOrderStatusMutation,
} from '../../store/api/orderApi';
import { COURIERS, STATUS_LABELS } from './orderText';

const OTHER = 'Other';

// orders: [{ id, orderNo, status, nextStatuses, courier?, trackingNo? }]. One order or many.
// Only moves allowed for at least one selected order are offered; the API reports the rest.
export default function ChangeStatusModal({ open, orders, onClose, canEditDelivery }) {
  const { message, modal } = App.useApp();
  const single = orders.length === 1 ? orders[0] : null;
  const options = [...new Set(orders.flatMap((order) => order.nextStatuses))];
  const [status, setStatus] = useState(options[0]);
  const [note, setNote] = useState('');
  const known = single?.courier && !COURIERS.includes(single.courier);
  const [courier, setCourier] = useState(known ? OTHER : (single?.courier ?? undefined));
  const [otherCourier, setOtherCourier] = useState(known ? single.courier : '');
  const [trackingNo, setTrackingNo] = useState(single?.trackingNo ?? '');

  const [updateStatus, updating] = useUpdateOrderStatusMutation();
  const [bulkStatus, bulking] = useBulkOrderStatusMutation();
  const [updateDelivery, savingDelivery] = useUpdateOrderDeliveryMutation();

  // Shipping one order is when the courier and tracking number are usually known.
  const askDelivery = single && status === 'shipped' && canEditDelivery;
  const courierName = courier === OTHER ? otherCourier.trim() : courier;

  const submit = async () => {
    try {
      if (single) {
        if (askDelivery && (courierName || trackingNo.trim())) {
          await updateDelivery({
            id: single.id,
            courier: courierName || null,
            trackingNo: trackingNo.trim() || null,
          }).unwrap();
        }
        await updateStatus({
          id: single.id,
          status,
          note: note.trim(),
        }).unwrap();
        message.success(`Order is now ${STATUS_LABELS[status].toLowerCase()}`);
      } else {
        const { results, message: summary } = await bulkStatus({
          ids: orders.map((order) => order.id),
          status,
          note: note.trim(),
        }).unwrap();
        const failed = results.filter((result) => !result.ok);
        if (failed.length) {
          const byId = new Map(orders.map((order) => [order.id, order.orderNo]));
          modal.warning({
            title: summary,
            content: (
              <ul className="list-disc pl-5">
                {failed.map((result) => (
                  <li key={result.id}>
                    {byId.get(result.id)}: {result.message}
                  </li>
                ))}
              </ul>
            ),
          });
        } else {
          message.success(summary);
        }
      }
      onClose(true);
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not change the status');
    }
  };

  return (
    <Modal
      open={open}
      title={
        single ? `Change status: ${single.orderNo}` : `Change status of ${orders.length} orders`
      }
      okText="Change status"
      okButtonProps={{ disabled: !status }}
      confirmLoading={updating.isLoading || bulking.isLoading || savingDelivery.isLoading}
      onOk={submit}
      onCancel={() => onClose(false)}
      destroyOnHidden
    >
      {options.length ? (
        <Space orientation="vertical" size="middle" className="w-full">
          <Radio.Group
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={options.map((value) => ({
              value,
              label: STATUS_LABELS[value],
            }))}
          />
          {!single && (
            <Typography.Text type="secondary">
              Orders that cannot move to this status are skipped and listed afterwards.
            </Typography.Text>
          )}
          {askDelivery && (
            <Space orientation="vertical" className="w-full">
              <Typography.Text strong>Courier</Typography.Text>
              <Select
                aria-label="Courier"
                placeholder="Choose a courier"
                value={courier}
                onChange={setCourier}
                options={[...COURIERS, OTHER].map((value) => ({
                  value,
                  label: value,
                }))}
                allowClear
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
            </Space>
          )}
          {['cancelled', 'returned'].includes(status) && (
            <Alert type="info" showIcon message="The items go back into stock." />
          )}
          <Input.TextArea
            aria-label="Note"
            placeholder="Note (optional), for example why"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Space>
      ) : (
        <Alert type="info" showIcon message="These orders cannot change status any more." />
      )}
    </Modal>
  );
}
