import { useEffect, useState } from 'react';
import { Button, Collapse, Drawer, Empty, Input, InputNumber, Result, Skeleton, Tag } from 'antd';

import { formatBDT } from '../../lib/format';
import { useGetProductQuery, useGetProductsQuery } from '../../store/api/productApi';

const SEARCH_DELAY_MS = 400;

const unitPrice = (variant, product) =>
  Number(variant.price ?? product.salePrice ?? product.basePrice);

function VariantRow({ variant, product, added, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const label = `${variant.size?.label} / ${variant.color?.name}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-soft py-2 last:border-0">
      <div className="min-w-32">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-text/60">
          {formatBDT(unitPrice(variant, product))} · {variant.stockQty} in stock
        </div>
      </div>
      {added ? (
        <Tag color="green">Added</Tag>
      ) : (
        <span className="flex items-center gap-2">
          <InputNumber
            size="small"
            min={1}
            precision={0}
            style={{ width: 64 }}
            aria-label={`Quantity of ${product.nameEn} ${label}`}
            value={quantity}
            onChange={setQuantity}
          />
          <Button
            size="small"
            type="primary"
            disabled={!quantity}
            aria-label={`Add ${product.nameEn} ${label}`}
            onClick={() => onAdd(product, variant, quantity)}
          >
            Add
          </Button>
        </span>
      )}
    </div>
  );
}

// Loaded only once a product is opened, so searching stays fast.
function ProductVariants({ productId, thumbnail, addedIds, onAdd }) {
  const { data: product, isLoading, isError, refetch } = useGetProductQuery(productId);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 2 }} title={false} />;
  }
  if (isError) {
    return (
      <Button size="small" onClick={refetch}>
        Could not load. Try again
      </Button>
    );
  }

  const active = product.variants.filter((variant) => variant.isActive);
  if (!active.length) {
    return <p className="mb-0 text-sm text-text/60">No active variants.</p>;
  }
  return active.map((variant) => (
    <VariantRow
      key={variant.id}
      variant={variant}
      product={product}
      added={addedIds.includes(variant.id)}
      onAdd={(item, picked, quantity) =>
        onAdd({
          componentVariantId: picked.id,
          quantity,
          productName: item.nameEn,
          image: thumbnail,
          size: picked.size?.label ?? null,
          color: picked.color?.name ?? null,
          unitPrice: unitPrice(picked, item),
          stock: picked.stockQty,
          isActive: true,
          productStatus: item.status,
        })
      }
    />
  ));
}

export default function VariantPicker({ open, onClose, addedIds, onAdd }) {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // Only active single products: a package cannot contain a package or a hidden product.
  const { data, isFetching, isError, refetch } = useGetProductsQuery(
    { type: 'single', status: 'active', q: search, limit: 30, sort: 'name' },
    { skip: !open }
  );
  const products = data?.data ?? [];

  let list;
  if (isError) {
    list = (
      <Result
        status="error"
        title="Could not load products"
        extra={<Button onClick={refetch}>Try again</Button>}
      />
    );
  } else if (!data) {
    list = <Skeleton active paragraph={{ rows: 6 }} />;
  } else if (!products.length) {
    list = <Empty description={isFetching ? 'Searching' : 'No products found'} />;
  } else {
    list = (
      <Collapse
        ghost
        destroyOnHidden
        items={products.map((product) => ({
          key: product.id,
          label: (
            <span className="flex items-center gap-2">
              {product.thumbnail && (
                <img src={product.thumbnail} alt="" className="size-8 rounded object-cover" />
              )}
              <span>{product.nameEn}</span>
            </span>
          ),
          children: (
            <ProductVariants
              productId={product.id}
              thumbnail={product.thumbnail}
              addedIds={addedIds}
              onAdd={onAdd}
            />
          ),
        }))}
      />
    );
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add item" size={420}>
      <div className="mb-3">
        <Input.Search
          aria-label="Search products to add"
          placeholder="Search name or SKU"
          allowClear
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      {list}
    </Drawer>
  );
}
