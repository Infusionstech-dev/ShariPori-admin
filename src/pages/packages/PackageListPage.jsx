import { useEffect, useState } from 'react';
import { EditOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  Result,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Link } from 'react-router-dom';

import ConfirmDelete from '../../components/common/ConfirmDelete';
import usePermission from '../../hooks/usePermission';
import useTableParams from '../../hooks/useTableParams';
import { formatBDT } from '../../lib/format';
import { useGetPackagesQuery } from '../../store/api/packageApi';
import { useDeleteProductMutation } from '../../store/api/productApi';

const SEARCH_DELAY_MS = 400;
const STATUS_COLORS = { active: 'green', draft: 'default', archived: 'orange' };
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

export default function PackageListPage() {
  const { message } = App.useApp();
  const can = usePermission();
  const canUpdate = can('products.update');
  const { filters, page, limit, setFilters, setPage, reset } = useTableParams();
  const { q: urlSearch = '', status } = filters;
  const queryParams = {
    page,
    limit,
    ...(urlSearch ? { q: urlSearch } : {}),
    ...(status ? { status } : {}),
  };
  const { data, isError, refetch } = useGetPackagesQuery(queryParams);
  const [deleteProduct] = useDeleteProductMutation();
  const [text, setText] = useState(urlSearch);

  useEffect(() => {
    if (text.trim() === urlSearch) {
      return undefined;
    }
    const timer = setTimeout(
      () => setFilters({ q: text.trim() }, { replace: true }),
      SEARCH_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [text, urlSearch, setFilters]);

  const onDelete = async (row) => {
    try {
      await deleteProduct(row.id).unwrap();
      message.success('Package deleted');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not delete this package');
    }
  };

  const columns = [
    {
      title: '',
      key: 'image',
      width: 72,
      render: (_, row) =>
        row.thumbnail ? (
          <img src={row.thumbnail} alt="" className="size-12 max-w-none rounded object-cover" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded bg-soft text-primary">
            <PictureOutlined />
          </span>
        ),
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, row) => (
        <div className="min-w-40">
          {canUpdate ? (
            <Link to={`/packages/${row.id}/edit`} className="font-medium">
              {row.nameEn}
            </Link>
          ) : (
            <span className="font-medium">{row.nameEn}</span>
          )}
          <div className="font-bangla text-xs text-text/60">{row.nameBn}</div>
        </div>
      ),
    },
    { title: 'Type', key: 'type', render: (_, row) => row.category?.nameEn },
    { title: 'Items', dataIndex: 'itemCount' },
    { title: 'Separate', key: 'separate', render: (_, row) => formatBDT(row.separatePrice) },
    { title: 'Package', key: 'package', render: (_, row) => formatBDT(row.packagePrice) },
    {
      title: 'Saves',
      key: 'savings',
      render: (_, row) =>
        row.savings > 0 ? formatBDT(row.savings) : <Tag color="orange">None</Tag>,
    },
    {
      title: 'Available',
      key: 'availability',
      render: (_, row) => (row.availability > 0 ? row.availability : <Tag>Out</Tag>),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, row) => (
        <Tag color={STATUS_COLORS[row.status]} className="capitalize">
          {row.status}
        </Tag>
      ),
    },
    ...(canUpdate || can('products.delete')
      ? [
          {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, row) => (
              <Space size={0}>
                {canUpdate && (
                  <Link to={`/packages/${row.id}/edit`} aria-label={`Edit ${row.nameEn}`}>
                    <Button type="text" tabIndex={-1} icon={<EditOutlined />} />
                  </Link>
                )}
                {can('products.delete') && (
                  <ConfirmDelete
                    label={`Delete ${row.nameEn}`}
                    title={`Delete ${row.nameEn}?`}
                    onConfirm={() => onDelete(row)}
                  />
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  const hasFilters = Boolean(urlSearch || status);
  let content;
  if (isError) {
    content = (
      <Result
        status="error"
        title="Could not load packages"
        extra={
          <Button type="primary" onClick={refetch}>
            Try again
          </Button>
        }
      />
    );
  } else if (!data) {
    content = <Skeleton active paragraph={{ rows: 6 }} />;
  } else {
    content = (
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={data.data}
        scroll={{ x: 'max-content' }}
        onChange={(pagination, _f, _s, { action }) => {
          if (action === 'paginate') setPage(pagination.current, pagination.pageSize);
        }}
        pagination={{
          current: page,
          pageSize: limit,
          total: data.meta.total,
          showSizeChanger: true,
        }}
        locale={{
          emptyText: (
            <Empty description={hasFilters ? 'No packages match' : 'No packages yet'}>
              {hasFilters && <Button onClick={reset}>Reset filters</Button>}
            </Empty>
          ),
        }}
      />
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
          Packages
        </Typography.Title>
        {can('products.create') && (
          <Link to="/packages/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Add package
            </Button>
          </Link>
        )}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input.Search
          aria-label="Search packages"
          placeholder="Search packages"
          allowClear
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <Select
          aria-label="Filter by status"
          placeholder="All statuses"
          allowClear
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => setFilters({ status: value })}
        />
      </div>
      {content}
    </Card>
  );
}
