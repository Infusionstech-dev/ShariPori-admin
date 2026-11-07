import { PictureOutlined } from '@ant-design/icons';
import { Table } from 'antd';

import { formatBDT } from '../../lib/format';

// Package rows expand to show what was inside when ordered.
export default function OrderItemsTable({ items, compact = false }) {
  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_, item) => (
        <span className="flex items-center gap-3">
          {item.image ? (
            <img src={item.image} alt="" className="size-12 max-w-none rounded object-cover" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded bg-soft text-primary">
              <PictureOutlined />
            </span>
          )}
          <span>
            <span className="block font-medium">{item.name}</span>
            <span className="block text-xs text-text/60">
              {[item.color, item.size, item.sku].filter(Boolean).join(' · ')}
            </span>
          </span>
        </span>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 60,
    },
    ...(compact
      ? []
      : [
          {
            title: 'Price',
            dataIndex: 'unitPrice',
            key: 'unitPrice',
            align: 'right',
            render: formatBDT,
          },
        ]),
    {
      title: 'Total',
      dataIndex: 'lineTotal',
      key: 'lineTotal',
      align: 'right',
      render: formatBDT,
    },
  ];

  return (
    <Table
      rowKey="id"
      size="small"
      pagination={false}
      columns={columns}
      dataSource={items}
      scroll={{ x: 'max-content' }}
      expandable={{
        rowExpandable: (item) => Boolean(item.bundleItems?.length),
        expandedRowRender: (item) => (
          <ul className="m-0 list-disc pl-6 text-sm">
            {item.bundleItems.map((part) => (
              <li key={part.componentVariantId}>
                {part.name} × {part.quantity}
                <span className="text-text/60">
                  {' '}
                  {[part.color, part.size, part.sku].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        ),
      }}
    />
  );
}
