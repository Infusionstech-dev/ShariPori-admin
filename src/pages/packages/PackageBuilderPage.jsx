import { useCallback, useEffect, useRef, useState } from 'react';
import { DeleteOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Result,
  Select,
  Skeleton,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import RichTextEditor from '../../components/common/RichTextEditor';
import FormField from '../../components/FormField';
import InlineItemAdder from '../../components/products/InlineItemAdder';
import { formatBDT } from '../../lib/format';
import { useGetSizesQuery } from '../../store/api/attributeApi';
import { TREE_ARGS, useGetCategoriesQuery } from '../../store/api/categoryApi';
import {
  useCreatePackageMutation,
  useGetPackageQuery,
  useUpdatePackageMutation,
} from '../../store/api/packageApi';
import { useAddImagesMutation } from '../../store/api/productApi';
import { parseImageLinks } from '../products/form/imageLinks';
import ImagesTab from '../products/form/ImagesTab';

const COMBO_ROOT_SLUG = 'combo-packages';
const ERROR_SELECTOR =
  '.ant-form-item-has-error, .ant-input-number-status-error, .ant-alert-error, [role="alert"]';
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const money = (message) => z.number({ error: message }).positive(message).max(99999999.99);

const schema = z
  .object({
    nameEn: z.string().trim().min(2, 'Enter the English name').max(150),
    nameBn: z.string().trim().min(2, 'Enter the Bangla name').max(150),
    categoryId: z.number({ error: 'Choose a package type' }),
    description: z.string().max(60000, 'The description is too long'),
    basePrice: money('Enter a package price above 0'),
    salePrice: money('Sale price must be above 0').nullable(),
    status: z.enum(['draft', 'active', 'archived']),
    isFeatured: z.boolean(),
    packageLimit: z.number({ error: 'Enter the most you can sell' }).int().min(0),
    sizeOptions: z.array(z.number()),
    items: z
      .array(
        // A text item has only a name. Product items, saved before, also carry their variant.
        z.object({
          componentVariantId: z.number().nullable().optional(),
          name: z.string().min(1, 'Enter a name for every item'),
          quantity: z.number({ error: 'Enter a quantity for every item' }).int().min(1),
          image: z.string().nullable().optional(),
          size: z.string().nullable().optional(),
          color: z.string().nullable().optional(),
          unitPrice: z.number().nullable().optional(),
          stock: z.number().nullable().optional(),
          isActive: z.boolean().optional(),
          productStatus: z.string().optional(),
        })
      )
      .min(2, 'A package needs at least 2 items'),
  })
  .refine((values) => values.salePrice === null || values.salePrice < values.basePrice, {
    path: ['salePrice'],
    message: 'Sale price must be less than the package price',
  });

const EMPTY = {
  nameEn: '',
  nameBn: '',
  categoryId: undefined,
  description: '',
  basePrice: null,
  salePrice: null,
  status: 'draft',
  isFeatured: false,
  packageLimit: 10,
  sizeOptions: [],
  items: [],
};

const toFormValues = (pkg) => ({
  nameEn: pkg.nameEn,
  nameBn: pkg.nameBn,
  categoryId: pkg.categoryId,
  description: pkg.description ?? '',
  basePrice: pkg.basePrice,
  salePrice: pkg.salePrice,
  status: pkg.status,
  isFeatured: pkg.isFeatured,
  packageLimit: pkg.packageLimit,
  sizeOptions: pkg.sizeOptions ?? [],
  items: pkg.items.map((item) =>
    item.componentVariantId
      ? {
          componentVariantId: item.componentVariantId,
          name: item.productName,
          quantity: item.quantity,
          image: item.image,
          size: item.size,
          color: item.color,
          unitPrice: item.unitPrice,
          stock: item.stock,
          isActive: item.isActive,
          productStatus: item.productStatus,
        }
      : { name: item.name, quantity: item.quantity }
  ),
});

const toRequestBody = ({ items, ...values }) => ({
  ...values,
  items: items.map(({ componentVariantId, name, quantity }) =>
    componentVariantId ? { componentVariantId, quantity } : { name, quantity }
  ),
});

// Text items hold no stock, so they never limit how many packages can be sold.
const capacity = (item) => {
  if (!item.componentVariantId) {
    return Infinity;
  }
  return item.isActive && item.productStatus === 'active' && item.quantity > 0
    ? Math.floor(item.stock / item.quantity)
    : 0;
};

function Section({ id, title, hint, action, children }) {
  return (
    <Card id={id} className="min-w-0 scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="mb-0 text-base font-semibold">{title}</h2>
        {action}
      </div>
      {hint && <p className="mb-0 mt-1 text-sm text-text/60">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function SummaryRow({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-2 py-1 text-sm ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-text/70'}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function PackageBuilderPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const packageId = id ? Number(id) : null;

  const {
    data: pkg,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useGetPackageQuery(packageId, { skip: !packageId });
  const { data: categories = [] } = useGetCategoriesQuery(TREE_ARGS);
  const { data: sizes = [] } = useGetSizesQuery();
  const [createPackage, createState] = useCreatePackageMutation();
  const [updatePackage, updateState] = useUpdatePackageMutation();
  const [addImages, addImagesState] = useAddImagesMutation();
  const saving = createState.isLoading || updateState.isLoading || addImagesState.isLoading;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const items = useWatch({ control, name: 'items' }) ?? [];
  const basePrice = useWatch({ control, name: 'basePrice' });
  const salePrice = useWatch({ control, name: 'salePrice' });
  const packageLimit = useWatch({ control, name: 'packageLimit' });

  const [adding, setAdding] = useState(false);
  const [imageText, setImageText] = useState('');
  const [imageError, setImageError] = useState(null);
  const [leaveTo, setLeaveTo] = useState(null);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const loadForm = useCallback((values) => reset(values), [reset]);

  // Saving an image refreshes the package too, and must not wipe unsaved edits elsewhere.
  useEffect(() => {
    if (pkg && !isDirtyRef.current) {
      loadForm(toFormValues(pkg));
    }
  }, [pkg, loadForm]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !leaveTo && currentLocation.pathname !== nextLocation.pathname
  );

  // Declared after useBlocker, so the blocker already knows the form is clean when this runs.
  useEffect(() => {
    if (leaveTo && !isDirty) {
      navigate(leaveTo);
    }
  }, [leaveTo, isDirty, navigate]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const updateItems = (next) =>
    setValue('items', next, { shouldDirty: true, shouldValidate: Boolean(errors.items) });

  const goToFirstError = () =>
    setTimeout(
      () =>
        document
          .querySelector(ERROR_SELECTOR)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      100
    );

  const save = async (values) => {
    const links = packageId ? { urls: [], error: null } : parseImageLinks(imageText);
    setImageError(links.error);
    if (links.error) {
      goToFirstError();
      return;
    }

    try {
      const body = toRequestBody(values);
      const response = packageId
        ? await updatePackage({ id: packageId, ...body }).unwrap()
        : await createPackage(body).unwrap();

      let imagesFailed = false;
      if (links.urls.length) {
        imagesFailed = await addImages({ id: response.data.id, urls: links.urls })
          .unwrap()
          .then(() => false)
          .catch(() => true);
      }

      if (imagesFailed) {
        message.warning(
          'Package created, but its images could not be added. Please add them again.'
        );
      } else {
        message.success(packageId ? 'Package saved' : 'Package created');
      }
      if (response.data.warning) {
        message.warning(response.data.warning);
      }
      setImageText('');
      loadForm(toFormValues(response.data));
      if (!packageId) {
        setLeaveTo(`/packages/${response.data.id}/edit`);
      }
    } catch (err) {
      const details = Array.isArray(err?.data?.details) ? err.data.details : [];
      const known = details.filter(({ field }) =>
        [
          'nameEn',
          'nameBn',
          'categoryId',
          'basePrice',
          'salePrice',
          'packageLimit',
          'items',
          'sizeOptions',
        ].includes(field.split('.')[0])
      );
      known.forEach(({ field, message: text }) => setError(field.split('.')[0], { message: text }));
      if (known.length) {
        goToFirstError();
      } else {
        message.error(err?.data?.message ?? 'Could not save the package');
      }
    }
  };

  if (packageId && isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }
  if (packageId && isError) {
    const notFound = loadError?.status === 404;
    return (
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? 'Package not found' : 'Could not load this package'}
        extra={
          notFound ? (
            <Link to="/packages">
              <Button type="primary">Back to packages</Button>
            </Link>
          ) : (
            <Button type="primary" onClick={refetch}>
              Try again
            </Button>
          )
        }
      />
    );
  }

  const comboRoot = categories.find((category) => category.slug === COMBO_ROOT_SLUG);
  const typeOptions = (comboRoot?.children ?? []).map(({ id: value, nameEn }) => ({
    value,
    label: nameEn,
  }));

  const separateTotal = items.reduce(
    (total, item) => total + (item.unitPrice ?? 0) * (item.quantity ?? 0),
    0
  );
  const onSale = salePrice > 0 && salePrice < basePrice;
  const packagePrice = (onSale ? salePrice : basePrice) || 0;
  const savings = Math.max(separateTotal - packagePrice, 0);
  const savingsPercent = separateTotal > 0 ? Math.round((savings / separateTotal) * 100) : 0;
  const available = items.length ? Math.min(packageLimit ?? 0, ...items.map(capacity)) : 0;
  const noSaving = items.length > 0 && packagePrice > 0 && packagePrice >= separateTotal;

  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_, item) =>
        item.componentVariantId ? (
          <span className="flex min-w-44 items-center gap-2">
            {item.image ? (
              <img src={item.image} alt="" className="size-10 max-w-none rounded object-cover" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded bg-soft text-primary">
                <PictureOutlined />
              </span>
            )}
            <span>
              <span className="block font-medium">{item.name}</span>
              <span className="block text-xs text-text/60">
                {item.size} / {item.color}
              </span>
            </span>
          </span>
        ) : (
          <span className="block min-w-44 font-medium">{item.name}</span>
        ),
    },
    {
      title: 'Price',
      key: 'unit',
      render: (_, item) => (item.componentVariantId ? formatBDT(item.unitPrice) : '—'),
    },
    {
      title: 'Qty',
      key: 'quantity',
      render: (_, item, index) => (
        <InputNumber
          size="small"
          min={1}
          precision={0}
          style={{ width: 64 }}
          aria-label={`Quantity of ${item.name}`}
          value={item.quantity}
          onChange={(value) =>
            updateItems(items.map((row, at) => (at === index ? { ...row, quantity: value } : row)))
          }
        />
      ),
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (_, item) => {
        if (!item.componentVariantId) {
          return '—';
        }
        return capacity(item) > 0 ? (
          item.stock
        ) : (
          <Tag color="red">{item.isActive ? 'Short' : 'Off'}</Tag>
        );
      },
    },
    {
      title: '',
      key: 'remove',
      render: (_, item, index) => (
        <Button
          type="text"
          danger
          aria-label={`Remove ${item.name}`}
          icon={<DeleteOutlined />}
          onClick={() => updateItems(items.filter((_row, at) => at !== index))}
        />
      ),
    },
  ];

  const errorCount = Object.keys(errors).length;

  return (
    <Form layout="vertical" component="div">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-display)' }}>
        {packageId ? pkg?.nameEn : 'Add package'}
      </Typography.Title>

      {errorCount > 0 && (
        <div className="mb-4">
          <Alert
            type="error"
            showIcon
            title={
              errorCount === 1
                ? 'Please fix the highlighted field.'
                : `Please fix the ${errorCount} highlighted fields.`
            }
          />
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Package details">
            <div className="grid gap-x-4 md:grid-cols-2">
              <FormField
                control={control}
                name="nameEn"
                label="Name (English)"
                render={(field) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="nameBn"
                label="Name (Bangla)"
                render={(field) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="categoryId"
                label="Package type"
                render={(field) => (
                  <Select {...field} options={typeOptions} placeholder="Choose a type" />
                )}
              />
              <FormField
                control={control}
                name="sizeOptions"
                label="Size choices for customers (optional)"
                render={(field) => (
                  <Select
                    {...field}
                    mode="multiple"
                    optionFilterProp="label"
                    placeholder="None"
                    options={sizes.map(({ id: value, label }) => ({ value, label }))}
                  />
                )}
              />
            </div>
            <FormField
              control={control}
              name="description"
              label="Description (optional)"
              render={(field) => <RichTextEditor {...field} />}
            />
          </Section>

          <Section
            id="items"
            title="Items in this package"
            hint="At least 2 items. Stock comes from each item's own product."
            action={
              <Button icon={<PlusOutlined />} onClick={() => setAdding(true)} disabled={adding}>
                Add item
              </Button>
            }
          >
            {errors.items && (
              <div className="mb-3">
                <Alert
                  type="error"
                  showIcon
                  title={errors.items.message ?? 'Enter a quantity for every item'}
                />
              </div>
            )}
            {adding && (
              <InlineItemAdder
                onAdd={(item) => updateItems([...items, item])}
                onCancel={() => setAdding(false)}
              />
            )}
            {items.length > 0 ? (
              <Table
                rowKey={(item) => items.indexOf(item)}
                size="small"
                columns={columns}
                dataSource={items}
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            ) : (
              <p className="mb-0 text-sm text-text/60">
                {adding ? 'No items yet.' : 'No items yet. Click Add item to start.'}
              </p>
            )}
          </Section>

          <Section id="images" title="Images">
            <ImagesTab
              productId={packageId}
              images={pkg?.images}
              pendingText={imageText}
              onPendingText={setImageText}
              pendingError={imageError}
            />
          </Section>
        </div>

        <div className="lg:sticky lg:top-20">
          <Card>
            <SummaryRow label="Bought separately">{formatBDT(separateTotal)}</SummaryRow>
            <div className="mt-3">
              <FormField
                control={control}
                name="basePrice"
                label="Package price (৳)"
                render={(field) => <InputNumber {...field} min={0} style={{ width: '100%' }} />}
              />
              <FormField
                control={control}
                name="salePrice"
                label="Sale price (৳, optional)"
                render={(field) => <InputNumber {...field} min={0} style={{ width: '100%' }} />}
              />
            </div>
            <SummaryRow label="Customer saves" strong>
              <span data-testid="savings">
                {formatBDT(savings)} ({savingsPercent}%)
              </span>
            </SummaryRow>
            {noSaving && (
              <p className="mb-0 mt-1 text-xs text-red-700">
                This costs the same or more than buying the items separately.
              </p>
            )}
            <div className="mt-3">
              <FormField
                control={control}
                name="packageLimit"
                label="Most you can sell"
                render={(field) => (
                  <InputNumber {...field} min={0} precision={0} style={{ width: '100%' }} />
                )}
              />
            </div>
            <SummaryRow label="Available now" strong>
              <span data-testid="available">{available}</span>
            </SummaryRow>
            <div className="mt-3">
              <FormField
                control={control}
                name="status"
                label="Status"
                render={(field) => <Select {...field} options={STATUS_OPTIONS} />}
              />
            </div>
            <div className="mb-4 flex items-center justify-between">
              <label htmlFor="isFeatured">Show as featured</label>
              <Controller
                control={control}
                name="isFeatured"
                render={({ field: { value, ...field } }) => (
                  <Switch {...field} id="isFeatured" checked={value} />
                )}
              />
            </div>
            <Button
              type="primary"
              block
              size="large"
              loading={saving}
              onClick={handleSubmit(save, goToFirstError)}
            >
              Save
            </Button>
            {isDirty && <p className="mb-0 mt-2 text-xs">You have unsaved changes</p>}
          </Card>
        </div>
      </div>


      <Modal
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        okText="Leave"
        cancelText="Stay"
        okButtonProps={{ danger: true }}
        onOk={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        Your changes to this package will be lost.
      </Modal>
    </Form>
  );
}
