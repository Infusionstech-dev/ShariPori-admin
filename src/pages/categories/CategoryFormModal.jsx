import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Form, Input, Modal, Switch, TreeSelect } from 'antd';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import ImageUrlInput from '../../components/common/ImageUrlInput';
import FormField from '../../components/FormField';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from '../../store/api/categoryApi';
import { applyServerErrors } from '../users/userFormHelpers';
import { findNode, toParentOptions } from './categoryTree';

const schema = z.object({
  parentId: z.number().nullable(),
  nameEn: z.string().trim().min(2, 'Enter the English name').max(100),
  nameBn: z.string().trim().min(2, 'Enter the Bangla name').max(100),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9-]*$/, 'Use lowercase letters, numbers and hyphens'),
  isActive: z.boolean(),
  image: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .max(500)
      .regex(/^https?:\/\/\S+$/i, 'Enter a full http or https link'),
  ]),
});

const EMPTY = {
  parentId: null,
  nameEn: '',
  nameBn: '',
  slug: '',
  isActive: true,
  image: '',
};

// A new or moved category goes to the end of its new list.
const nextSortOrder = (tree, parentId) => {
  const siblings = parentId === null ? tree : (findNode(tree, parentId)?.children ?? []);
  return siblings.reduce((max, node) => Math.max(max, node.sortOrder), 0) + 1;
};

const toFormValues = (category) => ({
  parentId: category.parentId,
  nameEn: category.nameEn,
  nameBn: category.nameBn,
  slug: category.slug,
  isActive: category.isActive,
  image: category.image ?? '',
});

export default function CategoryFormModal({ open, category, tree, onClose }) {
  const { message } = App.useApp();
  const isEdit = Boolean(category);
  const [createCategory, createState] = useCreateCategoryMutation();
  const [updateCategory, updateState] = useUpdateCategoryMutation();
  const { control, handleSubmit, reset, setError } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      reset(category ? toFormValues(category) : EMPTY);
    }
  }, [open, category, reset]);

  const onSubmit = async ({ slug, image, ...values }) => {
    const body = { ...values, image: image || null };
    if (!isEdit || values.parentId !== category.parentId) {
      body.sortOrder = nextSortOrder(tree, values.parentId);
    }
    // Left blank, or unchanged, the API keeps managing the slug from the name.
    if (slug && slug !== category?.slug) {
      body.slug = slug;
    }

    try {
      if (isEdit) {
        await updateCategory({ id: category.id, ...body }).unwrap();
      } else {
        await createCategory(body).unwrap();
      }
      message.success(isEdit ? 'Category updated' : 'Category created');
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) {
        message.error(err?.data?.message ?? 'Could not save the category');
      }
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit category' : 'Add category'}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={createState.isLoading || updateState.isLoading}
          onClick={handleSubmit(onSubmit)}
        >
          Save
        </Button>,
      ]}
    >
      <Form layout="vertical" component="div">
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
          render={(field) => <Input {...field} className="font-bangla" />}
        />
        <FormField
          control={control}
          name="parentId"
          label="Parent category"
          render={(field) => (
            <TreeSelect
              {...field}
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value ?? null)}
              treeData={toParentOptions(tree, category?.id)}
              treeDefaultExpandAll
              allowClear
              placeholder="None (show at the top level)"
            />
          )}
        />
        <FormField
          control={control}
          name="image"
          label="Image link (optional)"
          render={(field) => <ImageUrlInput {...field} />}
        />
        <FormField
          control={control}
          name="isActive"
          label="Show in shop"
          render={({ value, ...field }) => <Switch {...field} checked={value} />}
        />
        <FormField
          control={control}
          name="slug"
          label="Web address (optional)"
          render={(field) => (
            <Input {...field} placeholder="Created automatically from the English name" />
          )}
        />
      </Form>
    </Modal>
  );
}
