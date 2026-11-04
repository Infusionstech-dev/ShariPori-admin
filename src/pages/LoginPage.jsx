import { Card, Typography } from 'antd';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Typography.Title level={2}>Login</Typography.Title>
        <Typography.Text type="secondary">The login form arrives in T1.3.</Typography.Text>
      </Card>
    </div>
  );
}
