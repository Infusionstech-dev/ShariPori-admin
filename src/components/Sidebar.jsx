import {
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  GiftOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Drawer, Layout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';

const link = (to, label, icon) => ({ key: to, icon, label: <Link to={to}>{label}</Link> });

const MENU_ITEMS = [
  link('/', 'Dashboard', <DashboardOutlined />),
  link('/orders', 'Orders', <ShoppingCartOutlined />),
  {
    key: 'products-group',
    icon: <AppstoreOutlined />,
    label: 'Products',
    children: [
      link('/products', 'All'),
      link('/products/new', 'Add new'),
      link('/packages', 'Packages'),
      link('/categories', 'Categories'),
      link('/attributes', 'Fabrics/Sizes/Colours'),
    ],
  },
  link('/inventory', 'Inventory', <DatabaseOutlined />),
  link('/customers', 'Customers', <TeamOutlined />),
  link('/coupons', 'Coupons', <GiftOutlined />),
  {
    key: 'content-group',
    icon: <FileTextOutlined />,
    label: 'Content',
    children: [link('/banners', 'Banners'), link('/pages', 'Pages')],
  },
  link('/reports', 'Reports', <BarChartOutlined />),
  link('/settings', 'Settings', <SettingOutlined />),
  link('/users', 'Users', <UserOutlined />),
];

const PRODUCT_PATHS = ['/products', '/packages', '/categories', '/attributes'];
const CONTENT_PATHS = ['/banners', '/pages'];

const matches = (pathname, base) => pathname === base || pathname.startsWith(`${base}/`);

// Detail pages such as /orders/5 highlight their parent item.
const selectedKey = (pathname) => {
  if (pathname === '/products/new') return pathname;
  const first = pathname.split('/')[1];
  return first ? `/${first}` : '/';
};

const openGroup = (pathname) => {
  if (PRODUCT_PATHS.some((base) => matches(pathname, base))) return ['products-group'];
  if (CONTENT_PATHS.some((base) => matches(pathname, base))) return ['content-group'];
  return [];
};

export default function Sidebar({ isMobile, collapsed, drawerOpen, onCloseDrawer }) {
  const { pathname } = useLocation();

  const menu = (
    <Menu
      mode="inline"
      items={MENU_ITEMS}
      selectedKeys={[selectedKey(pathname)]}
      defaultOpenKeys={openGroup(pathname)}
      onClick={onCloseDrawer}
      className="border-e-0"
    />
  );

  const brand = (short) => (
    <div className="flex h-16 items-center justify-center gap-2 px-4 font-display text-xl text-primary">
      <TagsOutlined />
      {!short && 'Shari Shop'}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={drawerOpen}
        onClose={onCloseDrawer}
        placement="left"
        size={280}
        title="Shari Shop"
        styles={{ body: { padding: 0 } }}
      >
        {menu}
      </Drawer>
    );
  }

  return (
    <Layout.Sider
      theme="light"
      width={250}
      collapsible
      trigger={null}
      collapsed={collapsed}
      style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
    >
      {brand(collapsed)}
      {menu}
    </Layout.Sider>
  );
}
