import { useEffect, useState } from 'react';
import { CopyOutlined, EditOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Result,
  Switch,
  Table,
  Tag,
  Tooltip,
  TreeSelect,
} from 'antd';
import dayjs from 'dayjs';

import ConfirmDelete from '../components/common/ConfirmDelete';
import usePermission from '../hooks/usePermission';
import useTableParams from '../hooks/useTableParams';
import { formatBDT } from '../lib/format';
import { toParentOptions } from './categories/categoryTree';
import { TREE_ARGS, useGetCategoriesQuery } from '../store/api/categoryApi';
import {
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useGetCouponsQuery,
  useUpdateCouponMutation,
} from '../store/api/couponApi';

const SEARCH_DELAY_MS = 400;
// antd number boxes size themselves, so the width is set directly.
const FULL_WIDTH = { width: '100%' };
const CODE_PATTERN = /^[A-Z0-9_-]+$/;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Easy to read aloud: no 0/O or 1/I.
const randomCode = () =>
  `SHARI${Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')}`;

const discountText = (coupon) =>
  coupon.type === 'percent'
    ? `${Number(coupon.value)}% off${coupon.maxDiscount !== null ? `, up to ${formatBDT(coupon.maxDiscount)}` : ''}`
    : `${formatBDT(coupon.value)} off`;

const dateText = (value) => (value ? dayjs(value).format('D MMM YYYY, h:mm a') : null);

// What a customer would see if they tried the code right now.
const STATUS = {
  off: { label: 'Off', color: 'default' },
  scheduled: { label: 'Scheduled', color: 'blue' },
  expired: { label: 'Expired', color: 'red' },
  used_up: { label: 'Used up', color: 'orange' },
  live: { label: 'Live', color: 'green' },
};

const statusOf = (coupon) => {
  const now = dayjs();
  if (!coupon.isActive) return 'off';
  if (coupon.endsAt && !dayjs(coupon.endsAt).isAfter(now)) return 'expired';
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return 'used_up';
  if (coupon.startsAt && dayjs(coupon.startsAt).isAfter(now)) return 'scheduled';
  return 'live';
};

const toFormValues = (coupon) =>
  coupon
    ? {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        maxDiscount: coupon.maxDiscount === null ? null : Number(coupon.maxDiscount),
        minOrder: Number(coupon.minOrder),
        categoryId: coupon.categoryId ?? undefined,
        schedule:
          coupon.startsAt || coupon.endsAt
            ? [
                coupon.startsAt ? dayjs(coupon.startsAt) : null,
                coupon.endsAt ? dayjs(coupon.endsAt) : null,
              ]
            : undefined,
        usageLimit: coupon.usageLimit,
        isActive: coupon.isActive,
      }
    : { code: randomCode(), type: 'percent', minOrder: 0, isActive: true };

const toRequestBody = (values) => {
  const [startsAt, endsAt] = values.schedule ?? [];
  const percent = values.type === 'percent';
  return {
    code: values.code.trim().toUpperCase(),
    type: values.type,
    value: values.value,
    // Only percent coupons have a cap.
    maxDiscount: percent ? (values.maxDiscount ?? null) : null,
    minOrder: values.minOrder ?? 0,
    categoryId: values.categoryId ?? null,
    startsAt: startsAt ? startsAt.toISOString() : null,
    endsAt: endsAt ? endsAt.toISOString() : null,
    usageLimit: values.usageLimit ?? null,
    isActive: values.isActive,
  };
};

function CouponModal({ open, coupon, categoryOptions, onClose }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [createCoupon, creating] = useCreateCouponMutation();
  const [updateCoupon, updating] = useUpdateCouponMutation();
  const type = Form.useWatch('type', form);
  const percent = type === 'percent';

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(toFormValues(coupon));
    }
  }, [open, coupon, form]);

  const save = async (values) => {
    try {
      const body = toRequestBody(values);
      if (coupon) {
        await updateCoupon({ id: coupon.id, ...body }).unwrap();
        message.success('Coupon saved');
      } else {
        await createCoupon(body).unwrap();
        message.success(`Coupon ${body.code} created`);
      }
      onClose();
    } catch (err) {
      const details = Array.isArray(err?.data?.details) ? err.data.details : [];
      if (err?.status === 409) {
        form.setFields([{ name: 'code', errors: [err.data.message] }]);
      } else if (details.length) {
        form.setFields(details.map((item) => ({ name: item.field, errors: [item.message] })));
      } else {
        message.error(err?.data?.message ?? 'Could not save the coupon');
      }
    }
  };

  return (
    <Modal
      open={open}
      title={coupon ? `Edit ${coupon.code}` : 'New coupon'}
      okText={coupon ? 'Save coupon' : 'Create coupon'}
      onOk={form.submit}
      confirmLoading={creating.isLoading || updating.isLoading}
      onCancel={onClose}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" requiredMark="optional" onFinish={save}>
        <Form.Item
          name="code"
          label="Code"
          extra={
            coupon?.usedCount
              ? 'Already used by customers. Changing it stops the old code working.'
              : 'What customers type at checkout. Letters, numbers, - and _.'
          }
          normalize={(value) => value?.toUpperCase()}
          rules={[
            { required: true, message: 'Enter a code' },
            { min: 3, max: 40, message: 'Use 3 to 40 characters' },
            { pattern: CODE_PATTERN, message: 'Use only letters, numbers, - and _' },
          ]}
        >
          <Input
            className="font-mono"
            suffix={
              <Tooltip title="Make a random code">
                <Button
                  type="text"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  aria-label="Make a random code"
                  onClick={() => form.setFieldValue('code', randomCode())}
                />
              </Tooltip>
            }
          />
        </Form.Item>

        <Form.Item name="type" label="Discount type" rules={[{ required: true }]}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[
              { value: 'percent', label: 'Percent (%)' },
              { value: 'fixed', label: 'Fixed amount (৳)' },
            ]}
          />
        </Form.Item>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="value"
            label={percent ? 'Discount (%)' : 'Discount (৳)'}
            rules={[
              { required: true, message: 'Enter the discount' },
              {
                type: 'number',
                min: 1,
                max: percent ? 100 : 99999999,
                message: percent ? 'Between 1 and 100' : 'Must be at least 1',
              },
            ]}
          >
            <InputNumber
              style={FULL_WIDTH}
              min={1}
              max={percent ? 100 : undefined}
              precision={percent ? 2 : 0}
              {...(percent ? { suffix: '%' } : { prefix: '৳' })}
            />
          </Form.Item>
          {percent && (
            <Form.Item
              name="maxDiscount"
              label="Maximum discount"
              extra="Optional cap, for example ৳500."
            >
              <InputNumber style={FULL_WIDTH} min={1} precision={0} prefix="৳" />
            </Form.Item>
          )}
          <Form.Item name="minOrder" label="Minimum order" extra="0 means any order.">
            <InputNumber style={FULL_WIDTH} min={0} precision={0} prefix="৳" />
          </Form.Item>
          <Form.Item
            name="usageLimit"
            label="Total uses"
            extra="Optional. Leave empty for no limit."
          >
            <InputNumber style={FULL_WIDTH} min={1} precision={0} />
          </Form.Item>
        </div>

        <Form.Item
          name="categoryId"
          label="Only for a category"
          extra="Optional. The discount counts only items from this category and the ones under it."
        >
          <TreeSelect
            allowClear
            treeDefaultExpandAll
            placeholder="All products"
            treeData={categoryOptions}
          />
        </Form.Item>

        <Form.Item
          name="schedule"
          label="Valid dates"
          extra="Optional. Leave empty to keep it valid until you switch it off."
          rules={[
            {
              validator: (_, value) =>
                value?.[0] && value?.[1] && !value[1].isAfter(value[0])
                  ? Promise.reject(new Error('The end must be after the start'))
                  : Promise.resolve(),
            },
          ]}
        >
          <DatePicker.RangePicker
            showTime={{ format: 'h:mm a' }}
            format="D MMM YYYY, h:mm a"
            allowEmpty={[true, true]}
            className="w-full"
          />
        </Form.Item>

        <Form.Item name="isActive" label="On" valuePropName="checked" className="mb-0">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function CouponsPage() {
  const { message } = App.useApp();
  const can = usePermission();
  const canCreate = can('coupons.create');
  const canUpdate = can('coupons.update');
  const canDelete = can('coupons.delete');
  const { filters, page, limit, setFilters, setPage } = useTableParams();
  const { q: urlSearch = '' } = filters;
  const { data, isFetching, isError, refetch } = useGetCouponsQuery({
    page,
    limit,
    ...(urlSearch ? { q: urlSearch } : {}),
  });
  const { data: categories = [] } = useGetCategoriesQuery(TREE_ARGS);
  const [updateCoupon] = useUpdateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();
  const [text, setText] = useState(urlSearch);
  const [editing, setEditing] = useState(null);
  const [toggling, setToggling] = useState(null);

  // Typing updates the address bar after a short pause, so the list follows the search.
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

  const setActive = async (coupon, isActive) => {
    setToggling(coupon.id);
    try {
      await updateCoupon({ id: coupon.id, isActive }).unwrap();
      message.success(isActive ? `${coupon.code} is on` : `${coupon.code} is off`);
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not change the coupon');
    } finally {
      setToggling(null);
    }
  };

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      message.success(`${code} copied`);
    } catch {
      message.error('Could not copy');
    }
  };

  const columns = [
    {
      title: 'Code',
      key: 'code',
      render: (_, coupon) => (
        <span className="flex items-center gap-1 whitespace-nowrap">
          <code className="font-semibold">{coupon.code}</code>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            aria-label={`Copy ${coupon.code}`}
            onClick={() => copy(coupon.code)}
          />
        </span>
      ),
    },
    {
      title: 'Discount',
      key: 'discount',
      render: (_, coupon) => (
        <span>
          <span className="block whitespace-nowrap font-medium">{discountText(coupon)}</span>
          <span className="text-xs text-text/70">
            {Number(coupon.minOrder) > 0
              ? `Orders from ${formatBDT(coupon.minOrder)}`
              : 'Any order'}
            {' · '}
            {coupon.Category?.nameEn ?? 'All products'}
          </span>
        </span>
      ),
    },
    {
      title: 'Valid',
      key: 'valid',
      render: (_, coupon) =>
        coupon.startsAt || coupon.endsAt ? (
          <span className="text-sm">
            <span className="block whitespace-nowrap">{dateText(coupon.startsAt) ?? 'Now'}</span>
            <span className="block whitespace-nowrap text-text/70">
              to {dateText(coupon.endsAt) ?? 'no end'}
            </span>
          </span>
        ) : (
          <span className="text-text/70">Always</span>
        ),
    },
    {
      title: 'Used',
      key: 'used',
      align: 'right',
      render: (_, coupon) => (
        <span className="whitespace-nowrap">
          {coupon.usedCount}
          {coupon.usageLimit !== null && (
            <span className="text-text/70"> / {coupon.usageLimit}</span>
          )}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, coupon) => {
        const status = STATUS[statusOf(coupon)];
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: 'On',
      key: 'isActive',
      render: (_, coupon) => (
        <Switch
          size="small"
          checked={coupon.isActive}
          disabled={!canUpdate}
          loading={toggling === coupon.id}
          onChange={(checked) => setActive(coupon, checked)}
          aria-label={`${coupon.code} on or off`}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_, coupon) => (
        <span className="flex gap-1">
          {canUpdate && (
            <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(coupon)}>
              Edit
            </Button>
          )}
          {canDelete &&
            (coupon.usedCount > 0 ? (
              <Tooltip title="Used in orders, so it can only be switched off">
                <Button size="small" type="text" disabled>
                  Delete
                </Button>
              </Tooltip>
            ) : (
              <ConfirmDelete
                label={`Delete ${coupon.code}`}
                title={`Delete ${coupon.code}?`}
                onConfirm={async () => {
                  try {
                    await deleteCoupon(coupon.id).unwrap();
                    message.success('Coupon deleted');
                  } catch (err) {
                    message.error(err?.data?.message ?? 'Could not delete');
                  }
                }}
              />
            ))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-semibold">Coupons</h1>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>
            New coupon
          </Button>
        )}
      </div>
      <Card>
        <Input.Search
          allowClear
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Search by code"
          aria-label="Search coupons by code"
          className="mb-4 max-w-sm"
        />
        {isError ? (
          <Result
            status="error"
            title="Could not load coupons"
            extra={<Button onClick={refetch}>Try again</Button>}
          />
        ) : (
          <Table
            rowKey="id"
            loading={!data && isFetching}
            columns={columns}
            dataSource={data?.data ?? []}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: (
                <Empty
                  description={urlSearch ? `No coupon matches "${urlSearch}"` : 'No coupons yet'}
                >
                  {!urlSearch && canCreate && (
                    <Button type="primary" onClick={() => setEditing('new')}>
                      Create your first coupon
                    </Button>
                  )}
                </Empty>
              ),
            }}
            pagination={{
              current: page,
              pageSize: limit,
              total: data?.meta.total ?? 0,
              showSizeChanger: true,
              onChange: setPage,
              showTotal: (total) => `${total} coupons`,
            }}
          />
        )}
      </Card>
      <CouponModal
        open={editing !== null}
        coupon={editing === 'new' ? null : editing}
        categoryOptions={toParentOptions(categories)}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
