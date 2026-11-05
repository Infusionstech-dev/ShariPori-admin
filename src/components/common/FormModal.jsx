import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Form, Input, Modal, Select, Switch } from 'antd';
import { useForm } from 'react-hook-form';

import FormField from '../FormField';
import HexColorInput from './HexColorInput';

const renderControl = ({ type = 'text', options, placeholder, className }, field) => {
  switch (type) {
    case 'select':
      return <Select {...field} options={options} placeholder={placeholder} />;
    case 'switch': {
      const { value, ...rest } = field;
      return <Switch {...rest} checked={value} />;
    }
    case 'color':
      return <HexColorInput {...field} />;
    default:
      return <Input {...field} placeholder={placeholder} className={className} />;
  }
};

// fields: [{ name, label, type?: 'text' | 'select' | 'switch' | 'color', options?, placeholder? }]
// onSubmit may throw an API error. Field errors land under their inputs, others in a toast.
export default function FormModal({
  title,
  open,
  fields,
  defaultValues,
  schema,
  onSubmit,
  loading = false,
  onClose,
}) {
  const { message } = App.useApp();
  const { control, handleSubmit, reset, setError } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, defaultValues, reset]);

  const submit = async (values) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      const details = Array.isArray(err?.data?.details) ? err.data.details : [];
      const known = details.filter(({ field }) => fields.some(({ name }) => name === field));
      known.forEach(({ field, message: text }) => setError(field, { message: text }));
      if (!known.length) {
        message.error(err?.data?.message ?? 'Could not save. Please try again.');
      }
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSubmit(submit)}>
          Save
        </Button>,
      ]}
    >
      <Form layout="vertical" component="div">
        {fields.map((config) => (
          <FormField
            key={config.name}
            control={control}
            name={config.name}
            label={config.label}
            render={(field) => renderControl(config, field)}
          />
        ))}
      </Form>
    </Modal>
  );
}
