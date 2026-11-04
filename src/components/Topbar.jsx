import { BellOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Badge, Button, Dropdown, Input, Layout } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { logout } from '../store/slices/authSlice';

export default function Topbar({ onToggleMenu }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const admin = useSelector((state) => state.auth.admin);

  const profileMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout' }],
    onClick: () => {
      dispatch(logout());
      navigate('/login');
    },
  };

  return (
    <Layout.Header
      className="flex items-center gap-3 border-b border-soft leading-normal"
      style={{ position: 'sticky', top: 0, zIndex: 10 }}
    >
      <Button type="text" aria-label="Toggle menu" icon={<MenuOutlined />} onClick={onToggleMenu} />
      <Input.Search
        aria-label="Search"
        placeholder="Search"
        allowClear
        className="max-w-md min-w-0 flex-1"
      />
      <div className="ml-auto flex items-center gap-2">
        <Badge dot>
          <Button type="text" aria-label="Notifications" icon={<BellOutlined />} />
        </Badge>
        <Dropdown menu={profileMenu} trigger={['click']} placement="bottomRight">
          <Button type="text" aria-label="Profile menu" className="flex items-center gap-2">
            <Avatar size="small" icon={<UserOutlined />} />
            <span className="hidden sm:inline">{admin?.name ?? 'Admin'}</span>
          </Button>
        </Dropdown>
      </div>
    </Layout.Header>
  );
}
