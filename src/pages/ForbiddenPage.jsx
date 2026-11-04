import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <Result
      status="403"
      title="403"
      subTitle="You do not have permission to view this page."
      extra={
        <Link to="/">
          <Button type="primary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}
