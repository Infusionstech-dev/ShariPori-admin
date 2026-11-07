import { useState } from 'react';
import { App, Button, Input, InputNumber, Select, Space, Tag } from 'antd';

import { formatBDT } from '../../lib/format';
import { useUpdateOrderPaymentMutation } from '../../store/api/orderApi';
import { PAYMENT_METHODS, PAYMENT_STATUSES, formatDhaka } from './orderText';

// Everyone sees the payment; only staff with orders.payment can change it.
export default function PaymentPanel({ order, canEdit }) {
  const { message } = App.useApp();
  const latest = order.payments.at(-1);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [transactionId, setTransactionId] = useState(latest?.transactionId ?? '');
  const [amount, setAmount] = useState(latest?.amount ?? order.totals.total);
  const [updatePayment, { isLoading }] = useUpdateOrderPaymentMutation();
  const status = PAYMENT_STATUSES[order.paymentStatus];

  const save = async () => {
    try {
      await updatePayment({
        id: order.id,
        paymentStatus,
        transactionId: transactionId.trim() || null,
        amount,
      }).unwrap();
      message.success('Payment updated');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not update the payment');
    }
  };

  return (
    <Space direction="vertical" className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{PAYMENT_METHODS[order.paymentMethod]}</span>
        <Tag color={status.color}>{status.label}</Tag>
      </div>
      {order.payments.map((payment) => (
        <div key={payment.id} className="text-xs text-text/60">
          {formatBDT(payment.amount)} · {payment.status}
          {payment.transactionId && ` · ${payment.transactionId}`} · {formatDhaka(payment.at)}
        </div>
      ))}
      {canEdit && (
        <>
          <Select
            aria-label="Payment status"
            value={paymentStatus}
            onChange={setPaymentStatus}
            options={Object.entries(PAYMENT_STATUSES).map(([value, { label }]) => ({
              value,
              label,
            }))}
          />
          <Input
            aria-label="Transaction ID"
            placeholder="Transaction ID (optional)"
            value={transactionId}
            onChange={(event) => setTransactionId(event.target.value)}
          />
          <InputNumber
            aria-label="Amount"
            addonBefore="৳"
            min={0}
            precision={2}
            value={amount}
            onChange={(value) => setAmount(value ?? 0)}
            className="w-full"
          />
          <Button loading={isLoading} onClick={save}>
            Save payment
          </Button>
        </>
      )}
    </Space>
  );
}
