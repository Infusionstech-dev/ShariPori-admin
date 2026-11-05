import { EditOutlined } from '@ant-design/icons';
import { Button, Empty, Result, Skeleton, Space, Table } from 'antd';

import ConfirmDelete from './ConfirmDelete';

// onEdit and onDelete are optional, so a read-only user simply gets no action buttons.
// nameOf labels the buttons and the delete question for each row.
export default function CrudTable({
  columns,
  data = [],
  loading = false,
  error = false,
  onRetry,
  onEdit,
  onDelete,
  nameOf = (row) => row.name,
  toolbar,
  rowKey = 'id',
  emptyText = 'Nothing here yet',
  title,
}) {
  const actionColumn =
    onEdit || onDelete
      ? [
          {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, row) => (
              <Space size={0}>
                {onEdit && (
                  <Button
                    type="text"
                    aria-label={`Edit ${nameOf(row)}`}
                    icon={<EditOutlined />}
                    onClick={() => onEdit(row)}
                  />
                )}
                {onDelete && (
                  <ConfirmDelete
                    label={`Delete ${nameOf(row)}`}
                    title={`Delete ${nameOf(row)}?`}
                    onConfirm={() => onDelete(row)}
                  />
                )}
              </Space>
            ),
          },
        ]
      : [];

  let body;
  if (error) {
    body = (
      <Result
        status="error"
        title="Could not load this list"
        extra={
          <Button type="primary" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    );
  } else if (loading && !data.length) {
    body = <Skeleton active paragraph={{ rows: 6 }} />;
  } else {
    body = (
      <Table
        rowKey={rowKey}
        columns={[...columns, ...actionColumn]}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description={emptyText} /> }}
        title={title ? () => title : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}
      {body}
    </div>
  );
}
