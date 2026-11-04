import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Input, Result, Space, Switch, Table, Tag, Typography } from 'antd';
import { useSelector } from 'react-redux';

import { useGetUsersQuery, useUpdateUserStatusMutation } from '../../store/api/usersApi';
import ResetPasswordModal from './ResetPasswordModal';
import UserFormModal from './UserFormModal';

const ROLE_COLORS = { owner: 'gold', manager: 'magenta', staff: 'blue' };

const lastLoginFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Dhaka',
});

export default function UsersPage() {
  const { message } = App.useApp();
  const currentAdminId = useSelector((state) => state.auth.admin?.id);
  const [params, setParams] = useState({ page: 1, limit: 20, search: '' });
  const [formState, setFormState] = useState({ open: false, user: null });
  const [passwordUser, setPasswordUser] = useState(null);
  const { data, isLoading, isFetching, isError, refetch } = useGetUsersQuery(params);
  const [updateStatus] = useUpdateUserStatusMutation();

  const changeStatus = async (user, isActive) => {
    try {
      await updateStatus({ id: user.id, isActive }).unwrap();
      message.success(isActive ? 'User activated' : 'User deactivated and logged out');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not update the status');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Phone', dataIndex: 'phone' },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role) => <Tag color={ROLE_COLORS[role]}>{role}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (isActive, user) => (
        <Switch
          aria-label={`Active status for ${user.name}`}
          checked={isActive}
          disabled={user.id === currentAdminId}
          onChange={(checked) => changeStatus(user, checked)}
        />
      ),
    },
    {
      title: 'Last login',
      dataIndex: 'lastLoginAt',
      render: (value) => (value ? lastLoginFormat.format(new Date(value)) : 'Never'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, user) => (
        <Space>
          <Button size="small" onClick={() => setFormState({ open: true, user })}>
            Edit
          </Button>
          <Button size="small" onClick={() => setPasswordUser(user)}>
            Reset password
          </Button>
        </Space>
      ),
    },
  ];

  if (isError) {
    return (
      <Result
        status="error"
        title="Could not load users"
        extra={
          <Button type="primary" onClick={refetch}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
          Users
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setFormState({ open: true, user: null })}
        >
          Add user
        </Button>
      </div>
      <div className="mb-4 max-w-md">
        <Input.Search
          aria-label="Search users"
          placeholder="Search name, email or phone"
          allowClear
          onSearch={(search) => setParams((prev) => ({ ...prev, page: 1, search }))}
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data}
        loading={isLoading || isFetching}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'No users found' }}
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total: data?.meta?.total,
          showSizeChanger: true,
          onChange: (page, limit) => setParams((prev) => ({ ...prev, page, limit })),
        }}
      />
      <UserFormModal
        open={formState.open}
        user={formState.user}
        currentAdminId={currentAdminId}
        onClose={() => setFormState({ open: false, user: null })}
      />
      <ResetPasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />
    </Card>
  );
}
