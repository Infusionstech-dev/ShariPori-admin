import { useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, InputNumber, Modal, Table } from 'antd';

import { formatBDT } from '../../lib/format';
import { useUpdateOrderItemsMutation } from '../../store/api/orderApi';
import VariantPicker from '../products/VariantPicker';

const MAX_QTY = 10;

// Lines are kept as { variantId, quantity, name, detail, unitPrice } while editing.
const fromOrder = (items) =>
  items.map((item) => ({
    variantId: item.variantId,
    quantity: item.quantity,
    name: item.name,
    detail: [item.color, item.size].filter(Boolean).join(' / '),
    unitPrice: item.unitPrice,
  }));

export default function EditItemsModal({ order, open, onClose }) {
  const { message } = App.useApp();
  const [lines, setLines] = useState(() => fromOrder(order.items));
  const [picking, setPicking] = useState(false);
  const [updateItems, { isLoading }] = useUpdateOrderItemsMutation();
  const [problems, setProblems] = useState([]);

  const setQuantity = (variantId, quantity) =>
    setLines((current) =>
      current.map((line) => (line.variantId === variantId ? { ...line, quantity } : line))
    );

  const save = async () => {
    setProblems([]);
    try {
      await updateItems({
        id: order.id,
        items: lines.map(({ variantId, quantity }) => ({
          variantId,
          quantity,
        })),
      }).unwrap();
      message.success('Items updated. Stock and totals were recalculated.');
      onClose();
    } catch (err) {
      if (Array.isArray(err?.data?.details)) {
        const names = new Map(lines.map((line) => [line.variantId, line.name]));
        setProblems(
          err.data.details.map((detail) => `${names.get(detail.variantId)}: ${detail.message}`)
        );
      } else {
        message.error(err?.data?.message ?? 'Could not update the items');
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
          max={MAX_QTY}
          precision={0}
          value={line.quantity}
          onChange={(value) => setQuantity(line.variantId, value)}
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

  const invalid = !lines.length || lines.some((line) => !line.quantity);

  return (
    <Modal
      open={open}
      title={`Edit items: ${order.orderNo}`}
      width={640}
      okText="Save items"
      okButtonProps={{ disabled: invalid }}
      confirmLoading={isLoading}
      onOk={save}
      onCancel={onClose}
      destroyOnHidden
    >
      <Alert
        className="mb-3"
        type="info"
        showIcon
        message="Saving puts the old items back in stock, takes the new ones, and recalculates the totals at today's prices."
      />
      {problems.length > 0 && (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          message="Some items cannot be added"
          description={
            <ul className="m-0 list-disc pl-5">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          }
        />
      )}
      <Table
        rowKey="variantId"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={lines}
        scroll={{ x: 'max-content' }}
      />
      <Button className="mt-3" icon={<PlusOutlined />} onClick={() => setPicking(true)}>
        Add item
      </Button>
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
            },
          ])
        }
      />
    </Modal>
  );
}
