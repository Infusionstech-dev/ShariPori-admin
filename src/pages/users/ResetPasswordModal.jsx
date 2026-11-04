import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Form, Input, Modal } from 'antd';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import FormField from '../../components/FormField';
import { useUpdateUserPasswordMutation } from '../../store/api/usersApi';
import { applyServerErrors, passwordRule } from './userFormHelpers';

const schema = z.object({ newPassword: passwordRule });

export default function ResetPasswordModal({ user, onClose }) {
  const { message } = App.useApp();
  const [updatePassword, { isLoading }] = useUpdateUserPasswordMutation();
  const { control, handleSubmit, reset, setError } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '' },
  });

  useEffect(() => {
    if (user) {
      reset({ newPassword: '' });
    }
  }, [user, reset]);

  const onSubmit = async ({ newPassword }) => {
    try {
      await updatePassword({ id: user.id, newPassword }).unwrap();
      message.success('Password reset. This user has been logged out everywhere.');
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError)) {
        message.error(err?.data?.message ?? 'Could not reset the password');
      }
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      title={`Reset password${user ? `: ${user.name}` : ''}`}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={isLoading} onClick={handleSubmit(onSubmit)}>
          Reset password
        </Button>,
      ]}
    >
      <Form layout="vertical" component="div">
        <FormField
          control={control}
          name="newPassword"
          label="New password"
          render={(field) => <Input.Password {...field} autoComplete="new-password" />}
        />
      </Form>
    </Modal>
  );
}
