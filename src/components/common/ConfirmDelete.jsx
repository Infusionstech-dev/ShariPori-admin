import { DeleteOutlined } from '@ant-design/icons';
import { Button, Popconfirm } from 'antd';

// onConfirm may return a promise, and the dialog stays busy until it settles.
export default function ConfirmDelete({ label, title, description, onConfirm }) {
  return (
    <Popconfirm
      title={title}
      description={description}
      okText="Delete"
      okButtonProps={{ danger: true }}
      cancelText="Cancel"
      onConfirm={onConfirm}
    >
      <Button type="text" danger aria-label={label} icon={<DeleteOutlined />} />
    </Popconfirm>
  );
}
