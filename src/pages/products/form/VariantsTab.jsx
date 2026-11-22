import { useState } from 'react';
import { Alert, Button, Input, InputNumber, Select, Space, Switch, Table } from 'antd';
import { Controller, useWatch } from 'react-hook-form';

import { formatBDT } from '../../../lib/format';
import { useGetColorsQuery, useGetSizesQuery } from '../../../store/api/attributeApi';

const GROUPS = [
  { value: 'baby', label: 'Baby' },
  { value: 'kids', label: 'Kids' },
  { value: 'adult', label: 'Adult' },
  { value: 'free', label: 'Free' },
];
const DEFAULT_THRESHOLD = 5;
const ALL_ROWS = 'all';
const PRICE_WIDTH = { width: 104 };

const comboKey = (row) => `${row.sizeId}:${row.colorId}`;

function Swatch({ hex }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 rounded-full border border-black/20"
      style={{ backgroundColor: hex }}
    />
  );
}

function CellError({ error }) {
  return error ? <div className="mt-1 max-w-28 text-xs text-red-700">{error.message}</div> : null;
}

const activeIds = (rows, key) => [
  ...new Set(rows.filter((row) => row.isActive).map((row) => row[key])),
];

// Which rows the price tool changes: every row, one size or one colour.
const inTarget = (row, target) => {
  if (target === ALL_ROWS) return true;
  const [kind, id] = target.split(':');
  return row[kind === 'size' ? 'sizeId' : 'colorId'] === Number(id);
};

export default function VariantsTab({ control, setValue, getValues, errors }) {
  const { data: sizes = [] } = useGetSizesQuery();
  const { data: colors = [] } = useGetColorsQuery();
  const rows = useWatch({ control, name: 'variants' }) ?? [];
  const basePrice = useWatch({ control, name: 'basePrice' });
  const productSale = useWatch({ control, name: 'salePrice' });

  // The parent gives this section a new key after each load, so these start from the saved rows.
  const [selectedSizes, setSelectedSizes] = useState(() =>
    activeIds(getValues('variants'), 'sizeId')
  );
  const [selectedColors, setSelectedColors] = useState(() =>
    activeIds(getValues('variants'), 'colorId')
  );
  const [bulkStock, setBulkStock] = useState(null);
  const [priceTarget, setPriceTarget] = useState(ALL_ROWS);
  const [bulkPrice, setBulkPrice] = useState(null);
  const [bulkSale, setBulkSale] = useState(null);
  const [wantsAdvanced, setWantsAdvanced] = useState(false);

  const rowErrors = Array.isArray(errors.variants) ? errors.variants : [];
  const hasHiddenErrors = rowErrors.some((error) => error?.sku || error?.lowStockThreshold);
  const showAdvanced = wantsAdvanced || hasHiddenErrors;

  const sizeById = new Map(sizes.map((size) => [size.id, size]));
  const colorById = new Map(colors.map((color) => [color.id, color]));
  const sizeOptions = GROUPS.map(({ value, label }) => ({
    label,
    options: sizes
      .filter((size) => size.group === value)
      .map((size) => ({ value: size.id, label: size.label })),
  })).filter((group) => group.options.length);

  // Rechecks only if this list already shows an error, so fixing it clears the message.
  const updateRows = (next) =>
    setValue('variants', next, { shouldDirty: true, shouldValidate: Boolean(errors.variants) });

  // Rows follow the pickers. Saved rows keep their id, stock and prices. One no longer picked is
  // turned off, not deleted, because orders and stock history may point at it.
  const rebuild = (nextSizes, nextColors) => {
    const existing = new Map(rows.map((row) => [comboKey(row), row]));
    const wanted = nextSizes.flatMap((sizeId) =>
      nextColors.map((colorId) => ({ sizeId, colorId }))
    );
    const wantedKeys = new Set(wanted.map(comboKey));

    const kept = wanted.map((combo) => {
      const row = existing.get(comboKey(combo));
      return row
        ? { ...row, isActive: true }
        : {
            ...combo,
            sku: '',
            price: null,
            salePrice: null,
            stockQty: 0,
            lowStockThreshold: DEFAULT_THRESHOLD,
            isActive: true,
          };
    });
    const turnedOff = rows
      .filter((row) => row.id && !wantedKeys.has(comboKey(row)))
      .map((row) => ({ ...row, isActive: false }));

    updateRows([...kept, ...turnedOff]);
  };

  const changeSizes = (next) => {
    setSelectedSizes(next);
    rebuild(next, selectedColors);
  };
  const changeColors = (next) => {
    setSelectedColors(next);
    rebuild(selectedSizes, next);
  };

  const priceTargets = [
    { value: ALL_ROWS, label: 'All rows' },
    ...selectedSizes
      .filter((id) => sizeById.has(id))
      .map((id) => ({ value: `size:${id}`, label: `Size ${sizeById.get(id).label}` })),
    ...selectedColors
      .filter((id) => colorById.has(id))
      .map((id) => ({ value: `color:${id}`, label: `Colour ${colorById.get(id).name}` })),
  ];
  // A removed size or colour drops out of the list, so the tool falls back to all rows.
  const target = priceTargets.some((option) => option.value === priceTarget)
    ? priceTarget
    : ALL_ROWS;

  const bulkSaleTooHigh = bulkPrice !== null && bulkSale !== null && bulkSale >= bulkPrice;
  const applyPrices = (price, salePrice) =>
    updateRows(
      rows.map((row) =>
        row.isActive && inTarget(row, target) ? { ...row, price, salePrice } : row
      )
    );

  const numberColumn = (title, field, label, extra = {}) => ({
    title,
    key: field,
    render: (_, row, index) => (
      <Controller
        control={control}
        name={`variants.${index}.${field}`}
        render={({ field: input, fieldState }) => (
          <>
            <InputNumber
              {...input}
              size="small"
              min={0}
              style={{ width: 84 }}
              aria-label={`${label} for row ${index + 1}`}
              status={fieldState.error ? 'error' : undefined}
              {...extra}
            />
            <CellError error={fieldState.error} />
          </>
        )}
      />
    ),
  });

  const priceColumn = {
    title: 'Price (৳)',
    key: 'price',
    render: (_, row, index) => (
      <Controller
        control={control}
        name={`variants.${index}.price`}
        render={({ field, fieldState }) => (
          <>
            <InputNumber
              {...field}
              size="small"
              min={0}
              style={PRICE_WIDTH}
              aria-label={`Price for row ${index + 1}`}
              // An empty row shows the product's price in grey, which is what it sells for.
              placeholder={basePrice > 0 ? String(basePrice) : 'Same'}
              status={fieldState.error ? 'error' : undefined}
              onChange={(value) => {
                field.onChange(value);
                // Without its own price a row also loses its own sale price.
                if (value === null && row.salePrice !== null) {
                  setValue(`variants.${index}.salePrice`, null, { shouldDirty: true });
                }
              }}
            />
            <CellError error={fieldState.error} />
          </>
        )}
      />
    ),
  };

  const saleColumn = {
    title: 'Sale price (৳)',
    key: 'salePrice',
    render: (_, row, index) => {
      const ownPrice = row.price !== null && row.price !== undefined;
      return (
        <Controller
          control={control}
          name={`variants.${index}.salePrice`}
          render={({ field, fieldState }) => (
            <>
              <InputNumber
                {...field}
                size="small"
                min={0}
                style={PRICE_WIDTH}
                disabled={!ownPrice}
                aria-label={`Sale price for row ${index + 1}`}
                title={
                  ownPrice ? undefined : 'Uses the product sale price. Add a price to change it.'
                }
                placeholder={ownPrice ? 'None' : productSale > 0 ? String(productSale) : '—'}
                status={fieldState.error ? 'error' : undefined}
              />
              <CellError error={fieldState.error} />
            </>
          )}
        />
      );
    },
  };

  const columns = [
    {
      title: 'Variant',
      key: 'variant',
      render: (_, row) => {
        const color = colorById.get(row.colorId);
        return (
          <span className="flex items-center gap-2 whitespace-nowrap">
            {color && <Swatch hex={color.hex} />}
            {sizeById.get(row.sizeId)?.label} / {color?.name}
          </span>
        );
      },
    },
    numberColumn('Stock', 'stockQty', 'Stock', { precision: 0 }),
    priceColumn,
    saleColumn,
    ...(showAdvanced
      ? [
          {
            title: 'SKU',
            key: 'sku',
            render: (_, row, index) => (
              <Controller
                control={control}
                name={`variants.${index}.sku`}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      size="small"
                      style={{ width: 130 }}
                      aria-label={`SKU for row ${index + 1}`}
                      placeholder="Automatic"
                      status={fieldState.error ? 'error' : undefined}
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    />
                    <CellError error={fieldState.error} />
                  </>
                )}
              />
            ),
          },
          numberColumn('Low stock at', 'lowStockThreshold', 'Low stock level', { precision: 0 }),
        ]
      : []),
    {
      title: 'On sale',
      key: 'isActive',
      render: (_, row, index) => (
        <Controller
          control={control}
          name={`variants.${index}.isActive`}
          render={({ field: { value, ...field } }) => (
            <Switch
              {...field}
              size="small"
              checked={value}
              aria-label={`On sale for row ${index + 1}`}
            />
          )}
        />
      ),
    },
  ];

  const listError = errors.variants?.message ?? errors.variants?.root?.message;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block">Sizes</span>
          <Select
            aria-label="Sizes"
            mode="multiple"
            className="w-full"
            placeholder="Choose sizes"
            optionFilterProp="label"
            options={sizeOptions}
            value={selectedSizes}
            onChange={changeSizes}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">Colours</span>
          <Select
            aria-label="Colours"
            mode="multiple"
            className="w-full"
            placeholder="Choose colours"
            optionFilterProp="label"
            options={colors.map(({ id, name, hex }) => ({ value: id, label: name, hex }))}
            optionRender={({ data }) => (
              <span className="flex items-center gap-2">
                <Swatch hex={data.hex} />
                {data.label}
              </span>
            )}
            value={selectedColors}
            onChange={changeColors}
          />
        </label>
      </div>

      {listError && <Alert type="error" showIcon title={listError} />}

      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Space.Compact>
              <InputNumber
                aria-label="Stock for all rows"
                min={0}
                precision={0}
                placeholder="Stock"
                value={bulkStock}
                onChange={setBulkStock}
              />
              <Button
                disabled={bulkStock === null}
                onClick={() =>
                  updateRows(
                    rows.map((row) => (row.isActive ? { ...row, stockQty: bulkStock } : row))
                  )
                }
              >
                Apply to all
              </Button>
            </Space.Compact>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                size="small"
                aria-label="Show SKU and low stock"
                checked={showAdvanced}
                disabled={hasHiddenErrors}
                onChange={setWantsAdvanced}
              />
              SKU and low stock
            </label>
          </div>

          <div className="rounded-lg bg-soft/50 p-3">
            <p className="mb-2 text-sm">
              A size or colour can cost more or less than the product price. Leave a price empty to
              use the product price
              {basePrice > 0 && (
                <>
                  {' '}
                  (<strong>{formatBDT(productSale > 0 ? productSale : basePrice)}</strong>)
                </>
              )}
              .
            </p>
            <div className="flex flex-wrap items-start gap-2">
              <Select
                aria-label="Which rows get the price"
                style={{ minWidth: 150 }}
                options={priceTargets}
                value={target}
                onChange={setPriceTarget}
              />
              <InputNumber
                aria-label="Price for the chosen rows"
                min={0}
                placeholder="Price"
                style={PRICE_WIDTH}
                value={bulkPrice}
                onChange={(value) => {
                  setBulkPrice(value);
                  if (value === null) setBulkSale(null);
                }}
              />
              <div>
                <InputNumber
                  aria-label="Sale price for the chosen rows"
                  min={0}
                  placeholder="Sale (optional)"
                  style={{ width: 128 }}
                  disabled={bulkPrice === null}
                  status={bulkSaleTooHigh ? 'error' : undefined}
                  value={bulkSale}
                  onChange={setBulkSale}
                />
                {bulkSaleTooHigh && (
                  <div className="mt-1 text-xs text-red-700">Must be below the price</div>
                )}
              </div>
              <Button
                disabled={bulkPrice === null || bulkSaleTooHigh}
                onClick={() => applyPrices(bulkPrice, bulkSale)}
              >
                Set price
              </Button>
              <Button type="link" onClick={() => applyPrices(null, null)}>
                Use product price
              </Button>
            </div>
          </div>

          <Table
            rowKey={comboKey}
            columns={columns}
            dataSource={rows}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            rowClassName={(row) => (row.isActive ? '' : 'opacity-50')}
          />
          {rows.some((row) => row.id && !row.isActive) && (
            <p className="text-sm text-text/60">
              Greyed rows are turned off but kept, so past orders stay correct.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-text/60">
          Choose at least one size and one colour, and the stock rows appear here.
        </p>
      )}
    </div>
  );
}
