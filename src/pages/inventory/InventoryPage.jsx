import { useEffect, useState } from 'react';
import { HistoryOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Result,
  Select,
  Skeleton,
  Statistic,
  Table,
  Tag,
} from 'antd';
import { Link } from 'react-router-dom';

import AdjustModal from '../../components/inventory/AdjustModal';
import StockInModal from '../../components/inventory/StockInModal';
import usePermission from '../../hooks/usePermission';
import useTableParams from '../../hooks/useTableParams';
import { formatBDT } from '../../lib/format';
import { useGetCategoriesQuery } from '../../store/api/categoryApi';
import {
  useGetInventoryQuery,
  useGetInventorySummaryQuery,
  useUpdateThresholdMutation,
} from '../../store/api/inventoryApi';

const SEARCH_DELAY_MS = 400;
const STATUS = {
  in_stock: { label: 'In stock', color: 'green' },
  low: { label: 'Low', color: 'gold' },
  out: { label: 'Out', color: 'red' },
};

// Saves when the box loses focus or Enter is pressed, and only if the number changed.
function ThresholdCell({ row, canEdit }) {
  const { message } = App.useApp();
  const [value, setValue] = useState(row.lowStockThreshold);
  const [updateThreshold, { isLoading }] = useUpdateThresholdMutation();

  if (!canEdit) {
    return row.lowStockThreshold;
  }

  const save = async () => {
    if (value === null || value === row.lowStockThreshold) {
      setValue(row.lowStockThreshold);
      return;
    }
    try {
      await updateThreshold({ variantId: row.variantId, lowStockThreshold: value }).unwrap();
      message.success('Low-stock level saved');
    } catch (err) {
      setValue(row.lowStockThreshold);
      message.error(err?.data?.message ?? 'Could not save the low-stock level');
    }
  };

  return (
    <InputNumber
      aria-label={`Low-stock level for ${row.productName} ${row.sku}`}
      size="small"
      min={0}
      precision={0}
      disabled={isLoading}
      value={value}
      onChange={setValue}
      onBlur={save}
      onPressEnter={(event) => event.currentTarget.blur()}
      style={{ width: 72 }}
    />
  );
}

function SummaryCards({ onFilter }) {
  const { data, isLoading, isError } = useGetInventorySummaryQuery();
  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 1 }} />;
  }
  if (isError) {
    return null;
  }
  const cards = [
    { title: 'Variants', value: data.totalVariants },
    { title: 'Low stock', value: data.lowCount, status: 'low', color: '#ad6800' },
    { title: 'Out of stock', value: data.outCount, status: 'out', color: '#cf1322' },
    { title: 'Units in stock', value: data.totalUnits },
    { title: 'Stock value', value: formatBDT(data.stockValue) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <Card
          key={card.title}
          size="small"
          hoverable={Boolean(card.status)}
          onClick={card.status ? () => onFilter(card.status) : undefined}
        >
          <Statistic
            title={card.title}
            value={card.value}
            styles={card.color ? { content: { color: card.color } } : undefined}
          />
        </Card>
      ))}
    </div>
  );
}

export default function InventoryPage() {
  const can = usePermission();
  const canEdit = can('inventory.update');
  const { filters, page, limit, sort, setFilters, setPage, setSort, reset } = useTableParams({
    defaultSort: 'newest',
  });
  const { q: urlSearch = '', status, categoryId } = filters;
  const { data, isFetching, isError, refetch } = useGetInventoryQuery({
    page,
    limit,
    sort,
    ...(urlSearch ? { q: urlSearch } : {}),
    ...(status ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
  });
  const { data: categories } = useGetCategoriesQuery();
  const totalPages = data?.meta.totalPages ?? 0;
  // A shorter list (a new filter or a shared link) can leave the page past the end.
  useEffect(() => {
    if (!isFetching && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [isFetching, totalPages, page, setPage]);
  const [text, setText] = useState(urlSearch);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(null);

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

  const categoryOptions = (categories ?? []).map((category) => ({
    value: category.id,
    label: category.parentName ? `${category.parentName} › ${category.nameEn}` : category.nameEn,
  }));

  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_, row) => (
        <span className="flex items-center gap-3">
          {row.image ? (
            <img src={row.image} alt="" className="size-10 max-w-none rounded object-cover" />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-soft text-primary">
              <PictureOutlined />
            </span>
          )}
          <span>
            <span className="block font-medium">{row.productName}</span>
            <span className="block text-xs text-text/60">
              {[row.color, row.size].filter(Boolean).join(' / ') ||
                (row.productType === 'bundle' ? 'Package limit' : '')}
            </span>
          </span>
        </span>
      ),
    },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (sku) => <code>{sku}</code> },
    {
      title: 'Stock',
      dataIndex: 'stockQty',
      key: 'stock',
      align: 'right',
      sorter: true,
      sortOrder: sort === 'stock_desc' ? 'descend' : sort === 'stock_asc' ? 'ascend' : null,
      render: (qty) => <strong>{qty}</strong>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <Tag color={STATUS[value].color}>{STATUS[value].label}</Tag>,
    },
    {
      title: 'Low at',
      key: 'threshold',
      render: (_, row) => (
        <ThresholdCell
          key={`${row.variantId}-${row.lowStockThreshold}`}
          row={row}
          canEdit={canEdit}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <span className="flex gap-1">
          {canEdit && (
            <Button size="small" onClick={() => setAdjusting(row)}>
              Adjust
            </Button>
          )}
          <Link to={`/inventory/movements?variantId=${row.variantId}`}>
            <Button size="small" type="link">
              History
            </Button>
          </Link>
        </span>
      ),
    },
  ];

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-semibold">Inventory</h1>
        <span className="flex gap-2">
          <Link to="/inventory/movements">
            <Button icon={<HistoryOutlined />}>All movements</Button>
          </Link>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setStockInOpen(true)}>
              Stock in
            </Button>
          )}
        </span>
      </div>

      <SummaryCards onFilter={(value) => setFilters({ status: value })} />

      <Card>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <Input.Search
            aria-label="Search inventory"
            placeholder="Product name or SKU"
            allowClear
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Select
            aria-label="Stock status"
            placeholder="Any stock status"
            allowClear
            value={status}
            onChange={(value) => setFilters({ status: value })}
            options={Object.entries(STATUS).map(([value, { label }]) => ({ value, label }))}
          />
          <Select
            aria-label="Category"
            placeholder="Any category"
            allowClear
            showSearch
            optionFilterProp="label"
            value={categoryId ? Number(categoryId) : undefined}
            onChange={(value) => setFilters({ categoryId: value })}
            options={categoryOptions}
          />
        </div>

        {isError ? (
          <Result
            status="error"
            title="Could not load inventory"
            extra={<Button onClick={refetch}>Try again</Button>}
          />
        ) : (
          <Table
            rowKey="variantId"
            loading={!data && isFetching}
            columns={columns}
            dataSource={data?.data ?? []}
            scroll={{ x: 'max-content' }}
            onChange={(_, __, sorter, { action }) => {
              // Page clicks also arrive here, and must not reset the page through the sort.
              if (action === 'sort' && sorter.columnKey === 'stock') {
                // Clicking a third time clears the sort and goes back to newest first.
                const byStock = { ascend: 'stock_asc', descend: 'stock_desc' };
                setSort(byStock[sorter.order] ?? 'newest');
              }
            }}
            locale={{
              emptyText: (
                <Empty description={hasFilters ? 'Nothing matches these filters' : 'No stock yet'}>
                  {hasFilters && <Button onClick={reset}>Clear filters</Button>}
                </Empty>
              ),
            }}
            pagination={{
              current: page,
              pageSize: limit,
              total: data?.meta.total ?? 0,
              showSizeChanger: true,
              onChange: setPage,
              showTotal: (total) => `${total} variants`,
            }}
          />
        )}
      </Card>

      {stockInOpen && <StockInModal open onClose={() => setStockInOpen(false)} />}
      {adjusting && <AdjustModal row={adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  );
}
