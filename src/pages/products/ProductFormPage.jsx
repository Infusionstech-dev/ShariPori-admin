import { useCallback, useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Form,
  Modal,
  Result,
  Select,
  Skeleton,
  Switch,
  Typography,
} from 'antd';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import FormField from '../../components/FormField';
import {
  useAddImagesMutation,
  useCreateProductMutation,
  useGetProductQuery,
  useUpdateProductMutation,
} from '../../store/api/productApi';
import BasicInfoTab from './form/BasicInfoTab';
import { parseImageLinks } from './form/imageLinks';
import ImagesTab from './form/ImagesTab';
import MoreOptions from './form/MoreOptions';
import PricingTab from './form/PricingTab';
import {
  EMPTY_PRODUCT,
  productSchema,
  TAB_FIELDS,
  toFormValues,
  toRequestBody,
} from './form/productSchema';
import SeoTab from './form/SeoTab';
import VariantsTab from './form/VariantsTab';

const ERROR_SELECTOR =
  '.ant-form-item-has-error, .ant-input-number-status-error, .ant-input-status-error, .ant-alert-error, [role="alert"]';
const MORE_FIELDS = ['shortDesc', 'careInfo', 'matchGroup', 'seoTitle', 'seoDesc'];
const KNOWN_FIELDS = Object.values(TAB_FIELDS).flat();
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];
const STATUS_HELP = {
  draft: 'Hidden from customers while you work on it.',
  active: 'Customers can see and buy this product.',
  archived: 'Hidden from customers and kept for your records.',
};

const updatedFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Dhaka',
});

function Section({ id, title, hint, children }) {
  return (
    <Card id={id} className="min-w-0 scroll-mt-20">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mb-0 mt-1 text-sm text-text/60">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export default function ProductFormPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const productId = id ? Number(id) : null;
  const [searchParams] = useSearchParams();

  const {
    data: product,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useGetProductQuery(productId, { skip: !productId });
  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const [addImages, addImagesState] = useAddImagesMutation();
  const saving = createState.isLoading || updateState.isLoading || addImagesState.isLoading;
  const [imageText, setImageText] = useState('');
  const [imageError, setImageError] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(productSchema), defaultValues: EMPTY_PRODUCT });
  const status = useWatch({ control, name: 'status' });

  const [loadCount, setLoadCount] = useState(0);
  // After a save the form is cleaned first and only then leaves, so nothing warns about it.
  const [leaveTo, setLeaveTo] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const loadForm = useCallback(
    (values) => {
      reset(values);
      // Remounts the variants section, so its size and colour pickers match the new rows.
      setLoadCount((count) => count + 1);
    },
    [reset]
  );

  // Saving an image refreshes the product too, and must not wipe unsaved edits elsewhere.
  useEffect(() => {
    if (product && !isDirtyRef.current) {
      loadForm(toFormValues(product));
    }
  }, [product, loadForm]);

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
    const warn = (event) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  // A new product arrives here to add its images, so that is where the page opens.
  const openImages = searchParams.get('section') === 'images' && Boolean(product);
  useEffect(() => {
    if (openImages) {
      // Waits for the form to finish filling in, because that changes the page height.
      const timer = setTimeout(
        () => document.getElementById('images')?.scrollIntoView({ block: 'start' }),
        150
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [openImages]);

  const goToFirstError = (fields) => {
    if (fields.some((field) => MORE_FIELDS.includes(field))) {
      setMoreOpen(true);
    }
    // Waits for the highlighted fields to appear before looking for them.
    setTimeout(() => {
      document
        .querySelector(ERROR_SELECTOR)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const onInvalid = (invalid) => goToFirstError(Object.keys(invalid));

  const save = async (values, { addAnother }) => {
    // Checked first, so a bad link cannot leave behind a product without its images.
    const links = productId ? { urls: [], error: null } : parseImageLinks(imageText);
    setImageError(links.error);
    if (links.error) {
      goToFirstError([]);
      return;
    }

    try {
      const body = toRequestBody(values);
      const response = productId
        ? await updateProduct({ id: productId, ...body }).unwrap()
        : await createProduct(body).unwrap();

      // The product is safe by now, so a problem here only needs a retry from the edit page.
      let imagesFailed = false;
      if (links.urls.length) {
        imagesFailed = await addImages({ id: response.data.id, urls: links.urls })
          .unwrap()
          .then(() => false)
          .catch(() => true);
      }
      setImageText('');

      if (imagesFailed) {
        message.warning(
          'Product created, but its images could not be added. Please add them again.'
        );
      } else if (productId) {
        message.success('Product saved');
      } else {
        message.success(links.urls.length ? 'Product created with its images' : 'Product created');
      }
      const needsImages = !links.urls.length || imagesFailed;

      if (addAnother) {
        loadForm(EMPTY_PRODUCT);
        setLeaveTo(productId ? '/products/new' : null);
        window.scrollTo(0, 0);
      } else {
        loadForm(toFormValues(response.data));
        if (!productId) {
          setLeaveTo(`/products/${response.data.id}/edit${needsImages ? '?section=images' : ''}`);
        }
      }
    } catch (err) {
      const details = Array.isArray(err?.data?.details) ? err.data.details : [];
      const known = details.filter(({ field }) => KNOWN_FIELDS.includes(field.split('.')[0]));
      known.forEach(({ field, message: text }) => setError(field, { message: text }));
      if (known.length) {
        goToFirstError(known.map(({ field }) => field));
      } else {
        message.error(err?.data?.message ?? 'Could not save the product');
      }
    }
  };

  if (productId && isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }
  if (productId && isError) {
    const notFound = loadError?.status === 404;
    return (
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? 'Product not found' : 'Could not load this product'}
        extra={
          notFound ? (
            <Link to="/products">
              <Button type="primary">Back to products</Button>
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
  if (product?.type === 'bundle') {
    return (
      <Result
        title="This is a package"
        subTitle="Packages are edited on the Packages page."
        extra={
          <Link to="/packages">
            <Button type="primary">Go to Packages</Button>
          </Link>
        }
      />
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <Form layout="vertical" component="div">
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-display)' }}>
        {productId ? product?.nameEn : 'Add product'}
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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section id="details" title="Product details">
            <BasicInfoTab control={control} />
          </Section>

          <Section id="price" title="Price">
            <PricingTab control={control} />
          </Section>

          <Section
            id="stock"
            title="Sizes, colours and stock"
            hint="Choose what you sell, then enter how many you have of each."
          >
            <VariantsTab
              key={loadCount}
              control={control}
              setValue={setValue}
              getValues={getValues}
              errors={errors}
            />
          </Section>

          <Section id="images" title="Images">
            <ImagesTab
              productId={productId}
              images={product?.images}
              pendingText={imageText}
              onPendingText={setImageText}
              pendingError={imageError}
            />
          </Section>

          <Card className="min-w-0" styles={{ body: { padding: 0 } }}>
            <Collapse
              ghost
              activeKey={moreOpen ? ['more'] : []}
              onChange={(keys) => setMoreOpen(keys.length > 0)}
              items={[
                {
                  key: 'more',
                  label: <span className="font-semibold">More options (optional)</span>,
                  forceRender: true,
                  children: (
                    <>
                      <MoreOptions control={control} />
                      <h3 className="mb-3 mt-2 text-sm font-semibold">Search engine listing</h3>
                      <SeoTab control={control} savedSlug={product?.slug} />
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </div>

        <div className="lg:sticky lg:top-20">
          <Card>
            <FormField
              control={control}
              name="status"
              label="Status"
              render={(field) => <Select {...field} options={STATUS_OPTIONS} />}
            />
            <p className="-mt-4 mb-4 text-xs text-text/60">{STATUS_HELP[status]}</p>
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
            <div className="space-y-2">
              <Button
                type="primary"
                block
                size="large"
                loading={saving}
                onClick={handleSubmit((values) => save(values, { addAnother: false }), onInvalid)}
              >
                Save
              </Button>
              <Button
                block
                type="text"
                disabled={saving}
                onClick={handleSubmit((values) => save(values, { addAnother: true }), onInvalid)}
              >
                Save & add another
              </Button>
            </div>
            {isDirty && <p className="mb-0 mt-2 text-xs">You have unsaved changes</p>}
            {product && (
              <p className="mb-0 mt-2 text-xs text-text/60">
                Last updated {updatedFormat.format(new Date(product.updatedAt))}
              </p>
            )}
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
        Your changes to this product will be lost.
      </Modal>
    </Form>
  );
}
