import { useEffect, useState } from 'react';
import { EditOutlined, ExportOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Popconfirm,
  Result,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  TreeSelect,
  Typography,
} from 'antd';
import { Link } from 'react-router-dom';

import ConfirmDelete from '../../components/common/ConfirmDelete';
import usePermission from '../../hooks/usePermission';
import useTableParams from '../../hooks/useTableParams';
import { formatBDT } from '../../lib/format';
import { useGetFabricsQuery } from '../../store/api/attributeApi';
import { TREE_ARGS, useGetCategoriesQuery } from '../../store/api/categoryApi';
import {
  useDeleteProductMutation,
  useGetProductsQuery,
  useToggleFeaturedMutation,
  useUpdateStatusMutation,
} from '../../store/api/productApi';
import { toParentOptions } from '../categories/categoryTree';

const SEARCH_DELAY_MS = 400;
const SITE_URL = import.meta.env.VITE_SITE_URL;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];
const TYPE_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'bundle', label: 'Package' },
];
const STATUS_COLORS = { active: 'green', draft: 'default', archived: 'orange' };

// Which sort value each sortable column uses for ascending and descending.
const SORT_COLUMNS = {
  name: { ascend: 'name', descend: 'name' },
  price: { ascend: 'price_asc', descend: 'price_desc' },
  stock: { ascend: 'stock_asc', descend: 'stock_desc' },
};

const sortOrderFor = (key, sort) => {
  const { ascend, descend } = SORT_COLUMNS[key];
  if (sort === ascend) return 'ascend';
  return sort === descend ? 'descend' : null;
};

const editPath = (product, isBundle) => (isBundle ? '/packages' : `/products/${product.id}/edit`);

function Thumbnail({ src }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded bg-soft text-primary">
        <PictureOutlined />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className="size-12 max-w-none shrink-0 rounded object-cover"
    />
  );
}

function StockCell({ product }) {
  if (product.totalStock === 0) {
    return <Tag>Out</Tag>;
  }
  return product.lowStock ? <Tag color="red">{product.totalStock}</Tag> : product.totalStock;
}

function PriceCell({ product }) {
  if (product.salePrice === null) {
    return formatBDT(product.basePrice);
  }
  return (
    <span className="whitespace-nowrap">
      {formatBDT(product.salePrice)}
      <del className="block text-xs text-text/50">{formatBDT(product.basePrice)}</del>
    </span>
  );
}

export default function ProductListPage() {
  const { message } = App.useApp();
  const can = usePermission();
  const canCreate = can('products.create');
  const canUpdate = can('products.update');
  const canDelete = can('products.delete');
  const table = useTableParams();
  const { filters, params, page, limit, sort, setFilters, setPage, setSort, reset } = table;

  const { data, currentData, isFetching, isError, refetch } = useGetProductsQuery(params);
  const { data: categories = [] } = useGetCategoriesQuery(TREE_ARGS);
  const { data: fabrics = [] } = useGetFabricsQuery();
  const [updateStatus] = useUpdateStatusMutation();
  const [toggleFeatured] = useToggleFeaturedMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [selection, setSelection] = useState({ params, ids: [] });
  // A selection only makes sense for the rows it was made on.
  const selectedIds = selection.params === params ? selection.ids : [];
  const setSelectedIds = (ids) => setSelection({ params, ids });
  const [bulkBusy, setBulkBusy] = useState(false);
  const urlSearch = filters.q ?? '';
  const [searchText, setSearchText] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);

  // The box follows the URL, so Reset and the back button also update it. The URL value is
  // trimmed, so this leaves a space the admin is still typing alone.
  if (syncedSearch !== urlSearch) {
    setSyncedSearch(urlSearch);
    if (searchText.trim() !== urlSearch) {
      setSearchText(urlSearch);
    }
  }

  useEffect(() => {
    if (searchText.trim() === urlSearch) {
      return undefined;
    }
    const timer = setTimeout(
      () => setFilters({ q: searchText.trim() }, { replace: true }),
      SEARCH_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [searchText, urlSearch, setFilters]);

  const hasFilters = Object.keys(filters).length > 0;
  const rows = data?.data ?? [];

  const onFeatured = async (product, isFeatured) => {
    try {
      await toggleFeatured({ id: product.id, isFeatured }).unwrap();
      message.success(isFeatured ? 'Marked as featured' : 'Removed from featured');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not update this product');
    }
  };

  const onDelete = async (product) => {
    try {
      await deleteProduct(product.id).unwrap();
      message.success('Product deleted');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not delete this product');
    }
  };

  // There is no bulk endpoint, so one failed product must not hide the others' result.
  const applyBulkStatus = async (status) => {
    setBulkBusy(true);
    const results = await Promise.allSettled(
      selectedIds.map((id) => updateStatus({ id, status }).unwrap())
    );
    setBulkBusy(false);

    const failed = results.filter((result) => result.status === 'rejected').length;
    const done = results.length - failed;
    if (failed) {
      message.warning(`${done} updated, ${failed} could not be updated`);
    } else {
      message.success(`${done} ${done === 1 ? 'product' : 'products'} updated`);
    }
    setSelectedIds([]);
  };

  const columns = [
    {
      title: '',
      key: 'thumbnail',
      width: 72,
      render: (_, product) => <Thumbnail src={product.thumbnail} />,
    },
    {
      title: 'Name',
      key: 'name',
      sorter: true,
      sortDirections: ['ascend'],
      sortOrder: sortOrderFor('name', sort),
      render: (_, product) => {
        const isBundle = product.type === 'bundle';
        return (
          <div className="w-48 lg:w-52">
            {canUpdate ? (
              <Link to={editPath(product, isBundle)} className="font-medium">
                {product.nameEn}
              </Link>
            ) : (
              <span className="font-medium">{product.nameEn}</span>
            )}
            <div className="font-bangla text-xs text-text/60">{product.nameBn}</div>
            {isBundle && <Tag color="purple">Package</Tag>}
          </div>
        );
      },
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, product) => <div className="w-24">{product.category?.nameEn}</div>,
    },
    {
      title: 'Fabric',
      key: 'fabric',
      render: (_, product) => <div className="w-16">{product.fabric?.nameEn ?? '-'}</div>,
    },
    {
      title: 'Price',
      key: 'price',
      sorter: true,
      sortOrder: sortOrderFor('price', sort),
      render: (_, product) => <PriceCell product={product} />,
    },
    {
      title: 'Stock',
      key: 'stock',
      sorter: true,
      sortOrder: sortOrderFor('stock', sort),
      render: (_, product) => <StockCell product={product} />,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, product) => (
        <Tag color={STATUS_COLORS[product.status]} className="capitalize">
          {product.status}
        </Tag>
      ),
    },
    {
      title: 'Featured',
      key: 'featured',
      render: (_, product) =>
        canUpdate ? (
          <Switch
            size="small"
            aria-label={`Feature ${product.nameEn}`}
            checked={product.isFeatured}
            onChange={(checked) => onFeatured(product, checked)}
          />
        ) : (
          (product.isFeatured && <Tag color="gold">Featured</Tag>) || '-'
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, product) => (
        <Space size={0}>
          {canUpdate && (
            <Link
              to={editPath(product, product.type === 'bundle')}
              aria-label={`Edit ${product.nameEn}`}
            >
              <Button type="text" tabIndex={-1} icon={<EditOutlined />} />
            </Link>
          )}
          <Button
            type="text"
            aria-label={`View ${product.nameEn} on site`}
            icon={<ExportOutlined />}
            disabled={product.status !== 'active' || !SITE_URL}
            title={
              product.status === 'active' ? 'View on site' : 'Only active products are on the site'
            }
            href={product.status === 'active' ? `${SITE_URL}/products/${product.slug}` : undefined}
            target="_blank"
            rel="noreferrer"
          />
          {canDelete && (
            <ConfirmDelete
              label={`Delete ${product.nameEn}`}
              title={`Delete ${product.nameEn}?`}
              description="It disappears from the shop and this list."
              onConfirm={() => onDelete(product)}
            />
          )}
        </Space>
      ),
    },
  ];

  const onTableChange = (pagination, _filters, sorter, { action }) => {
    if (action === 'paginate') {
      setPage(pagination.current, pagination.pageSize);
    } else if (action === 'sort') {
      setSort(sorter.order ? SORT_COLUMNS[sorter.columnKey][sorter.order] : undefined);
    }
  };

  let content;
  if (isError) {
    content = (
      <Result
        status="error"
        title="Could not load products"
        extra={
          <Space>
            <Button type="primary" onClick={refetch}>
              Try again
            </Button>
            <Button onClick={reset}>Reset filters</Button>
          </Space>
        }
      />
    );
  } else if (!data) {
    content = <Skeleton active paragraph={{ rows: 8 }} />;
  } else if (!rows.length && !hasFilters) {
    content = (
      <Empty description="No products yet">
        {canCreate && (
          <Link to="/products/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Add your first product
            </Button>
          </Link>
        )}
      </Empty>
    );
  } else {
    content = (
      <>
        {selectedIds.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-soft px-3 py-2">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Button size="small" loading={bulkBusy} onClick={() => applyBulkStatus('active')}>
              Set Active
            </Button>
            <Button size="small" loading={bulkBusy} onClick={() => applyBulkStatus('draft')}>
              Set Draft
            </Button>
            <Popconfirm
              title={`Archive ${selectedIds.length} products?`}
              description="They disappear from the shop."
              okText="Archive"
              onConfirm={() => applyBulkStatus('archived')}
            >
              <Button size="small" loading={bulkBusy}>
                Archive
              </Button>
            </Popconfirm>
          </div>
        )}
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={rows}
          // Only a new page or filter shows the spinner, so saving a switch does not flash the table.
          loading={isFetching && currentData === undefined}
          scroll={{ x: 'max-content' }}
          onChange={onTableChange}
          rowSelection={
            canUpdate
              ? { selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys) }
              : undefined
          }
          pagination={{
            current: page,
            pageSize: limit,
            total: data.meta.total,
            showSizeChanger: true,
            showTotal: (total) => `${total} ${total === 1 ? 'product' : 'products'}`,
          }}
          locale={{
            emptyText: (
              <Empty description="No products match these filters">
                <Button onClick={reset}>Reset filters</Button>
              </Empty>
            ),
          }}
        />
      </>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
          Products
        </Typography.Title>
        {canCreate && (
          <Link to="/products/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Add product
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input.Search
          aria-label="Search products by name or SKU"
          placeholder="Search name or SKU"
          allowClear
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <TreeSelect
          aria-label="Filter by category"
          placeholder="All categories"
          allowClear
          treeDefaultExpandAll
          treeData={toParentOptions(categories)}
          value={filters.categoryId ? Number(filters.categoryId) : undefined}
          onChange={(categoryId) => setFilters({ categoryId })}
        />
        <Select
          aria-label="Filter by fabric"
          placeholder="All fabrics"
          allowClear
          options={fabrics.map(({ id, nameEn }) => ({ value: id, label: nameEn }))}
          value={filters.fabricId ? Number(filters.fabricId) : undefined}
          onChange={(fabricId) => setFilters({ fabricId })}
        />
        <Select
          aria-label="Filter by status"
          placeholder="All statuses"
          allowClear
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(status) => setFilters({ status })}
        />
        <Select
          aria-label="Filter by type"
          placeholder="All types"
          allowClear
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(type) => setFilters({ type })}
        />
        <div className="flex items-center gap-3 sm:col-span-1 lg:col-span-3">
          <Checkbox
            checked={filters.lowStock === 'true'}
            onChange={(event) => setFilters({ lowStock: event.target.checked })}
          >
            Low stock only
          </Checkbox>
          <Button onClick={reset} disabled={!hasFilters && sort === 'newest'}>
            Reset
          </Button>
        </div>
      </div>

      {content}
    </Card>
  );
}
