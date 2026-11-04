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

import usePermission from '../hooks/usePermission';

const link = (to, label, permission, icon) => ({
  key: to,
  icon,
  permission,
  label: <Link to={to}>{label}</Link>,
});

const MENU_ITEMS = [
  link('/', 'Dashboard', 'dashboard.view', <DashboardOutlined />),
  link('/orders', 'Orders', 'orders.view', <ShoppingCartOutlined />),
  {
    key: 'products-group',
    icon: <AppstoreOutlined />,
    label: 'Products',
    children: [
      link('/products', 'All', 'products.view'),
      link('/products/new', 'Add new', 'products.create'),
      link('/packages', 'Packages', 'products.view'),
      link('/categories', 'Categories', 'products.view'),
      link('/attributes', 'Fabrics/Sizes/Colours', 'products.view'),
    ],
  },
  link('/inventory', 'Inventory', 'inventory.view', <DatabaseOutlined />),
  link('/customers', 'Customers', 'customers.view', <TeamOutlined />),
  link('/coupons', 'Coupons', 'coupons.view', <GiftOutlined />),
  {
    key: 'content-group',
    icon: <FileTextOutlined />,
    label: 'Content',
    children: [link('/banners', 'Banners', 'content.view'), link('/pages', 'Pages', 'content.view')],
  },
  link('/reports', 'Reports', 'reports.view', <BarChartOutlined />),
  link('/settings', 'Settings', 'settings.manage', <SettingOutlined />),
  link('/users', 'Users', 'users.manage', <UserOutlined />),
];

// Hides what the role cannot open, and any group left with no items. The permission key
// is removed because antd would otherwise pass it to the DOM.
const visibleItems = (items, can) =>
  items.flatMap(({ permission, children, ...item }) => {
    if (children) {
      const visible = visibleItems(children, can);
      return visible.length ? [{ ...item, children: visible }] : [];
    }
    return can(permission) ? [item] : [];
  });

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
  const can = usePermission();

  const menu = (
    <Menu
      mode="inline"
      items={visibleItems(MENU_ITEMS, can)}
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
