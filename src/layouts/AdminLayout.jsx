import { useState } from 'react';
import { Grid, Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import AppBreadcrumb from '../components/AppBreadcrumb';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function AdminLayout() {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleMenu = () => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      setCollapsed((value) => !value);
    }
  };

  return (
    <Layout className="min-h-screen">
      <Sidebar
        isMobile={isMobile}
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
      />
      <Layout>
        <Topbar onToggleMenu={toggleMenu} />
        <Layout.Content className="p-4 lg:p-6">
          <AppBreadcrumb />
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
