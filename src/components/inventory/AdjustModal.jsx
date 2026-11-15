import { useState } from 'react';
import { Alert, App, Input, InputNumber, Modal, Radio, Select, Space, Typography } from 'antd';

import { useAdjustStockMutation } from '../../store/api/inventoryApi';

const REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost' },
  { value: 'correction', label: 'Count correction' },
  { value: 'new_added', label: 'New added' },
  { value: 'other', label: 'Other' },
];

// Set the counted number, or add/remove a few. A reason is always required.
export default function AdjustModal({ row, onClose }) {
  const { message } = App.useApp();
  const [mode, setMode] = useState('delta');
  const [value, setValue] = useState(null);
  const [reason, setReason] = useState();
  const [note, setNote] = useState('');
  const [adjust, { isLoading }] = useAdjustStockMutation();

  const after = mode === 'delta' ? row.stockQty + (value ?? 0) : value;
  const belowZero = after !== null && after < 0;
  const unchanged = value === null || after === row.stockQty;

  const save = async () => {
    try {
      await adjust({
        variantId: row.variantId,
        ...(mode === 'delta' ? { delta: value } : { newQty: value }),
        reason,
        note: note.trim(),
      }).unwrap();
      message.success(`Stock is now ${after}`);
      onClose();
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not adjust the stock');
    }
  };

  return (
    <Modal
      open
      title={`Adjust stock: ${row.productName}`}
      okText="Save adjustment"
      okButtonProps={{ disabled: !reason || unchanged || belowZero }}
      confirmLoading={isLoading}
      onOk={save}
      onCancel={onClose}
      destroyOnHidden
    >
      <Space orientation="vertical" size="middle" className="w-full">
        <Typography.Text type="secondary">
          {[row.color, row.size, row.sku].filter(Boolean).join(' · ')} · now{' '}
          <strong>{row.stockQty}</strong> in stock
        </Typography.Text>
        <Radio.Group
          optionType="button"
          value={mode}
          onChange={(event) => {
            setMode(event.target.value);
            setValue(null);
          }}
          options={[
            { value: 'delta', label: 'Add or remove' },
            { value: 'newQty', label: 'Set counted number' },
          ]}
        />
        <InputNumber
          aria-label={mode === 'delta' ? 'Change, use minus to remove' : 'Counted number'}
          placeholder={mode === 'delta' ? 'For example -2 or 5' : 'For example 12'}
          precision={0}
          min={mode === 'delta' ? -row.stockQty : 0}
          value={value}
          onChange={setValue}
          className="w-full"
        />
        {value !== null && !belowZero && (
          <Typography.Text>
            Stock will be <strong>{after}</strong>
          </Typography.Text>
        )}
        {belowZero && <Alert type="error" showIcon message="Stock cannot go below 0." />}
        <Select
          aria-label="Reason"
          placeholder="Reason (required)"
          value={reason}
          onChange={setReason}
          options={REASONS}
        />
        <Input
          aria-label="Note"
          placeholder="Note (optional)"
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Space>
    </Modal>
  );
}
