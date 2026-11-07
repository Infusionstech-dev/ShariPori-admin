import { useEffect } from 'react';
import { App, Button, Card, Form, Input, InputNumber, Result, Select, Skeleton, Tabs } from 'antd';

import ImageUrlInput from '../../components/common/ImageUrlInput';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../../store/api/contentApi';

const url = { type: 'url', message: 'Enter a full link starting with https://' };

const TABS = [
  {
    key: 'general',
    label: 'General',
    fields: [
      {
        name: 'shopName',
        label: 'Shop name',
        rules: [{ required: true, min: 2, max: 100 }],
        input: <Input />,
      },
      {
        name: 'logoUrl',
        label: 'Logo image link',
        extra: 'Shown in the header instead of the shop name. A wide image works best.',
        rules: [url],
        input: <ImageUrlInput />,
      },
      {
        name: 'announcementText',
        label: 'Announcement bar',
        extra: 'The thin line at the very top. Leave empty to show free delivery and the hotline.',
        rules: [{ max: 200 }],
        input: <Input showCount maxLength={200} />,
      },
    ],
  },
  {
    key: 'contact',
    label: 'Contact & Social',
    fields: [
      {
        name: 'phone',
        label: 'Hotline',
        rules: [{ pattern: /^01[3-9]\d{8}$/, message: 'Enter a number like 01XXXXXXXXX' }],
        input: <Input inputMode="numeric" placeholder="01XXXXXXXXX" />,
      },
      { name: 'email', label: 'Email', rules: [{ type: 'email' }], input: <Input /> },
      {
        name: 'address',
        label: 'Address',
        rules: [{ max: 300 }],
        input: <Input.TextArea rows={2} />,
      },
      {
        name: 'whatsappNumber',
        label: 'WhatsApp number',
        extra: 'With country code, used for the chat button and "Order on WhatsApp".',
        rules: [{ pattern: /^8801[3-9]\d{8}$/, message: 'Enter it like 8801XXXXXXXXX' }],
        input: <Input inputMode="numeric" placeholder="8801XXXXXXXXX" />,
      },
      {
        name: 'messengerUrl',
        label: 'Messenger link',
        rules: [url],
        input: <Input placeholder="https://m.me/yourpage" />,
      },
      { name: 'facebookUrl', label: 'Facebook page', rules: [url], input: <Input /> },
      { name: 'instagramUrl', label: 'Instagram', rules: [url], input: <Input /> },
      { name: 'youtubeUrl', label: 'YouTube', rules: [url], input: <Input /> },
    ],
  },
  {
    key: 'delivery',
    label: 'Delivery & Payment',
    fields: [
      {
        name: 'freeDeliveryThreshold',
        label: 'Free delivery from',
        extra: 'Orders at or above this subtotal get free delivery. Leave empty to always charge.',
        input: <InputNumber min={0} precision={0} prefix="৳" className="w-full" />,
      },
      {
        name: 'paymentMethods',
        label: 'Payment methods',
        extra: 'bKash, Nagad and card payments arrive with online payment.',
        rules: [{ required: true }],
        input: <Select mode="multiple" options={[{ value: 'cod', label: 'Cash on delivery' }]} />,
      },
      {
        name: 'deliveryInfoText',
        label: 'Delivery information',
        extra: 'Shown in the Delivery & exchange tab of every product.',
        rules: [{ max: 1000 }],
        input: <Input.TextArea rows={4} showCount maxLength={1000} />,
      },
    ],
  },
  {
    key: 'policies',
    label: 'Policies',
    fields: [
      {
        name: 'returnPolicyText',
        label: 'Return policy summary',
        extra: 'A short summary under each product. The full policy is the Return policy page.',
        rules: [{ max: 2000 }],
        input: <Input.TextArea rows={6} showCount maxLength={2000} />,
      },
    ],
  },
];

// Each tab saves only its own fields.
function SettingsTab({ tab, settings }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation();

  useEffect(() => {
    form.setFieldsValue(Object.fromEntries(tab.fields.map(({ name }) => [name, settings[name]])));
  }, [settings, tab, form]);

  const save = async (values) => {
    try {
      await updateSettings(
        Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? null]))
      ).unwrap();
      message.success(`${tab.label} saved. The shop updates within a minute.`);
    } catch (err) {
      const details = err?.data?.details;
      if (Array.isArray(details)) {
        form.setFields(details.map((item) => ({ name: item.field, errors: [item.message] })));
      } else {
        message.error(err?.data?.message ?? 'Could not save');
      }
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark="optional"
      onFinish={save}
      className="max-w-2xl"
    >
      {tab.fields.map((field) => (
        <Form.Item
          key={field.name}
          name={field.name}
          label={field.label}
          extra={field.extra}
          rules={field.rules}
        >
          {field.input}
        </Form.Item>
      ))}
      <Button type="primary" htmlType="submit" loading={isLoading}>
        Save {tab.label.toLowerCase()}
      </Button>
    </Form>
  );
}

export default function SettingsPage() {
  const { data, isLoading, isError, refetch } = useGetSettingsQuery();

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError) {
    return (
      <Result
        status="error"
        title="Could not load settings"
        extra={<Button onClick={refetch}>Try again</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="m-0 text-2xl font-semibold">Settings</h1>
      <Card>
        <Tabs
          items={TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: <SettingsTab tab={tab} settings={data} />,
          }))}
        />
      </Card>
    </div>
  );
}
