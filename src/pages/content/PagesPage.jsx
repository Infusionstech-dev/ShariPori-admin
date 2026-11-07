import { EditOutlined, ExportOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty, Result, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';

import ConfirmDelete from '../../components/common/ConfirmDelete';
import { formatDhaka } from '../../components/orders/orderText';
import usePermission from '../../hooks/usePermission';
import { useDeletePageMutation, useGetPagesQuery } from '../../store/api/contentApi';

const SITE_URL = import.meta.env.VITE_SITE_URL;

export default function PagesPage() {
  const { message } = App.useApp();
  const can = usePermission();
  const canEdit = can('content.update');
  const { data, isLoading, isError, refetch } = useGetPagesQuery();
  const [deletePage] = useDeletePageMutation();

  const columns = [
    {
      title: 'Page',
      key: 'title',
      render: (_, page) => (
        <span>
          <Link to={`/pages/${page.id}`} className="block font-medium">
            {page.title}
          </Link>
          <code className="text-xs">/pages/{page.slug}</code>
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isPublished',
      key: 'isPublished',
      render: (published) => (published ? <Tag color="green">Published</Tag> : <Tag>Draft</Tag>),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value) => <span className="whitespace-nowrap">{formatDhaka(value)}</span>,
    },
    {
      title: '',
      key: 'actions',
      render: (_, page) => (
        <span className="flex gap-1">
          <Link to={`/pages/${page.id}`}>
            <Button size="small" icon={<EditOutlined />}>
              {canEdit ? 'Edit' : 'View'}
            </Button>
          </Link>
          {SITE_URL && page.isPublished && (
            <a href={`${SITE_URL}/pages/${page.slug}`} target="_blank" rel="noopener noreferrer">
              <Button
                size="small"
                type="text"
                icon={<ExportOutlined />}
                aria-label={`View ${page.title} on the shop`}
              />
            </a>
          )}
          {canEdit && (
            <ConfirmDelete
              title={`Delete "${page.title}"?`}
              onConfirm={async () => {
                try {
                  await deletePage(page.id).unwrap();
                  message.success('Page deleted');
                } catch (err) {
                  message.error(err?.data?.message ?? 'Could not delete');
                }
              }}
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-semibold">Pages</h1>
        {canEdit && (
          <Link to="/pages/new">
            <Button type="primary" icon={<PlusOutlined />}>
              New page
            </Button>
          </Link>
        )}
      </div>
      <Card>
        {isError ? (
          <Result
            status="error"
            title="Could not load pages"
            extra={<Button onClick={refetch}>Try again</Button>}
          />
        ) : (
          <Table
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={data ?? []}
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty description="No pages yet" /> }}
          />
        )}
      </Card>
    </div>
  );
}
