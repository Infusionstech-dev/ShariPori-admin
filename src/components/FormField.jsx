import { Form } from 'antd';
import { Controller } from 'react-hook-form';

// Connects a react-hook-form field to an antd input, with its label and error message.
export default function FormField({ control, name, label, render }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
        >
          {render({ ...field, id: name })}
        </Form.Item>
      )}
    />
  );
}
