import { useEffect } from 'react';
import { App, Button, Card, Form, Input, Result, Skeleton, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import RichTextEditor from '../../components/common/RichTextEditor';
import usePermission from '../../hooks/usePermission';
import {
  useCreatePageMutation,
  useGetPageQuery,
  useUpdatePageMutation,
} from '../../store/api/contentApi';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugFrom = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

export default function PageEditorPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const { message } = App.useApp();
  const navigate = useNavigate();
  const can = usePermission();
  const canEdit = can('content.update');
  const [form] = Form.useForm();
  const { data: page, isLoading, isError, refetch } = useGetPageQuery(id, { skip: isNew });
  const [createPage, creating] = useCreatePageMutation();
  const [updatePage, updating] = useUpdatePageMutation();

  useEffect(() => {
    if (page) {
      form.setFieldsValue(page);
    }
  }, [page, form]);

  if (!isNew && isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (!isNew && isError) {
    return (
      <Result
        status="error"
        title="Could not load this page"
        extra={<Button onClick={refetch}>Try again</Button>}
      />
    );
  }

  const save = async (values) => {
    try {
      if (isNew) {
        const created = await createPage(values).unwrap();
        message.success('Page created');
        navigate(`/pages/${created.id}`, { replace: true });
      } else {
        await updatePage({ id, ...values }).unwrap();
        message.success('Page saved. The shop shows it within a few minutes.');
      }
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
      disabled={!canEdit}
      onFinish={save}
      initialValues={{ isPublished: false, contentHtml: '' }}
      onValuesChange={(changed) => {
        // A new page's address follows its title until someone edits the address.
        if (isNew && changed.title !== undefined && !form.isFieldTouched('slug')) {
          form.setFieldValue('slug', slugFrom(changed.title));
        }
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-2xl font-semibold">{isNew ? 'New page' : page.title}</h1>
        {canEdit && (
          <Button
            type="primary"
            htmlType="submit"
            loading={creating.isLoading || updating.isLoading}
          >
            Save page
          </Button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0">
          <Form.Item name="title" label="Title" rules={[{ required: true, min: 2, max: 150 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contentHtml" label="Content">
            <RichTextEditor label="Page content" />
          </Form.Item>
        </Card>
        <Card>
          <Form.Item
            name="slug"
            label="Address"
            extra="The page opens at /pages/ followed by this."
            rules={[
              { required: true },
              { pattern: SLUG, message: 'Lowercase letters, numbers and dashes only' },
            ]}
          >
            <Input prefix="/pages/" />
          </Form.Item>
          <Form.Item
            name="metaDescription"
            label="Search description"
            extra="Shown by Google under the page title. About one sentence."
            rules={[{ max: 300 }]}
          >
            <Input.TextArea rows={3} showCount maxLength={300} />
          </Form.Item>
          <Form.Item
            name="isPublished"
            label="Published"
            valuePropName="checked"
            extra="Drafts are not on the shop."
          >
            <Switch />
          </Form.Item>
        </Card>
      </div>
    </Form>
  );
}
