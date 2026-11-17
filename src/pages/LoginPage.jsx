import { TagsOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, Form, Input } from 'antd';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';

import FormField from '../components/FormField';
import { useLoginMutation } from '../store/api/authApi';
import { baseApi } from '../store/api/baseApi';
import { setCredentials } from '../store/slices/authSlice';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { message } = App.useApp();
  const status = useSelector((state) => state.auth.status);
  const [login, { isLoading }] = useLoginMutation();
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated') {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  const onSubmit = async (values) => {
    try {
      const response = await login(values).unwrap();
      // Drop anything cached by a previous account before this one's data loads.
      dispatch(baseApi.util.resetApiState());
      dispatch(setCredentials(response.data));
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not reach the server. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 font-display text-2xl text-primary">
          <TagsOutlined />
          ShariPori
        </div>
        <Form layout="vertical" component="div">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormField
              control={control}
              name="email"
              label="Email"
              render={(field) => <Input {...field} type="email" autoComplete="username" />}
            />
            <FormField
              control={control}
              name="password"
              label="Password"
              render={(field) => <Input.Password {...field} autoComplete="current-password" />}
            />
            <Button type="primary" htmlType="submit" block size="large" loading={isLoading}>
              Log in
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}
