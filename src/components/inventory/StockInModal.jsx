import { useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Empty, Input, InputNumber, Modal, Table } from 'antd';

import { useStockInMutation } from '../../store/api/inventoryApi';
import VariantPicker from '../products/VariantPicker';

const MAX_QTY = 10000;

// One delivery: several variants, each with how many arrived.
export default function StockInModal({ open, onClose }) {
  const { message } = App.useApp();
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState('');
  const [picking, setPicking] = useState(false);
  const [stockIn, { isLoading }] = useStockInMutation();

  const total = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);

  const save = async () => {
    try {
      await stockIn({
        items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
        note: note.trim(),
      }).unwrap();
      message.success(`Added ${total} units to stock`);
      onClose();
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not add the stock');
    }
  };

  const columns = [
    {
      title: 'Item',
      key: 'name',
      render: (_, line) => (
        <span>
          <span className="block font-medium">{line.name}</span>
          <span className="text-xs text-text/60">
            {line.detail} · now {line.stock} in stock
          </span>
        </span>
      ),
    },
    {
      title: 'Arrived',
      key: 'quantity',
      width: 110,
      render: (_, line) => (
        <InputNumber
          aria-label={`Units arrived of ${line.name} ${line.detail}`}
          min={1}
          max={MAX_QTY}
          precision={0}
          value={line.quantity}
          onChange={(value) =>
            setLines((current) =>
              current.map((item) =>
                item.variantId === line.variantId ? { ...item, quantity: value } : item
              )
            )
          }
          style={{ width: 90 }}
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
    <Modal
      open={open}
      title="Stock in"
      width={640}
      okText={total ? `Add ${total} units` : 'Add stock'}
      okButtonProps={{ disabled: !lines.length || lines.some((line) => !line.quantity) }}
      confirmLoading={isLoading}
      onOk={save}
      onCancel={onClose}
      destroyOnHidden
    >
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
        <Empty description="Add the items that arrived" />
      )}
      <Button className="mt-3" icon={<PlusOutlined />} onClick={() => setPicking(true)}>
        Add item
      </Button>
      <Input
        className="mt-3"
        aria-label="Note"
        placeholder="Note (optional), for example the supplier or invoice"
        maxLength={200}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
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
              detail: [item.color, item.size].filter(Boolean).join(' / ') || 'Package',
              stock: item.stock,
            },
          ])
        }
      />
    </Modal>
  );
}
