import { Card, Typography } from 'antd';

export default function PagePlaceholder({ title }) {
  return (
    <Card>
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </Typography.Title>
      <Typography.Text type="secondary">This page is a placeholder.</Typography.Text>
    </Card>
  );
}
