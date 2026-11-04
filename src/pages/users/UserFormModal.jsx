import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Form, Input, Modal, Select } from 'antd';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import FormField from '../../components/FormField';
import { useCreateUserMutation, useUpdateUserMutation } from '../../store/api/usersApi';
import { applyServerErrors, passwordRule } from './userFormHelpers';

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

const baseSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid 01XXXXXXXXX number'),
  role: z.string(),
});

const createSchema = baseSchema.extend({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: passwordRule,
});

const EMPTY = { name: '', email: '', phone: '', role: 'staff', password: '' };

export default function UserFormModal({ open, user, currentAdminId, onClose }) {
  const { message } = App.useApp();
  const isEdit = Boolean(user);
  // The API refuses role changes to yourself, and owners have no manager/staff role to pick.
  const canEditRole = !isEdit || (user.role !== 'owner' && user.id !== currentAdminId);
  const [createUser, createState] = useCreateUserMutation();
  const [updateUser, updateState] = useUpdateUserMutation();
  const { control, handleSubmit, reset, setError } = useForm({
    resolver: zodResolver(isEdit ? baseSchema : createSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      reset(user ? { ...EMPTY, name: user.name, phone: user.phone, role: user.role } : EMPTY);
    }
  }, [open, user, reset]);

  const onSubmit = async ({ name, phone, role, email, password }) => {
    try {
      if (isEdit) {
        await updateUser({
          id: user.id,
          name,
          phone,
          ...(canEditRole ? { role } : {}),
        }).unwrap();
      } else {
        await createUser({ name, phone, role, email, password }).unwrap();
      }
      message.success(isEdit ? 'User updated' : 'User created');
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) {
        message.error(err?.data?.message ?? 'Could not save the user');
      }
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit user' : 'Add user'}
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
          name="name"
          label="Name"
          render={(field) => <Input {...field} />}
        />
        {!isEdit && (
          <FormField
            control={control}
            name="email"
            label="Email"
            render={(field) => <Input {...field} type="email" />}
          />
        )}
        <FormField
          control={control}
          name="phone"
          label="Phone"
          render={(field) => <Input {...field} inputMode="tel" />}
        />
        {canEditRole && (
          <FormField
            control={control}
            name="role"
            label="Role"
            render={(field) => <Select {...field} options={ROLE_OPTIONS} />}
          />
        )}
        {!isEdit && (
          <FormField
            control={control}
            name="password"
            label="Password"
            render={(field) => <Input.Password {...field} autoComplete="new-password" />}
          />
        )}
      </Form>
    </Modal>
  );
}
