import { Spin } from 'antd';
import { Route, Routes } from 'react-router-dom';

import useAuthBootstrap from '../hooks/useAuthBootstrap';
import AdminLayout from '../layouts/AdminLayout';
import AttributesPage from '../pages/attributes/AttributesPage';
import BannersPage from '../pages/BannersPage';
import CategoriesPage from '../pages/categories/CategoriesPage';
import ContentPagesPage from '../pages/ContentPagesPage';
import CouponsPage from '../pages/CouponsPage';
import CustomerDetailPage from '../pages/CustomerDetailPage';
import CustomersPage from '../pages/CustomersPage';
import DashboardPage from '../pages/DashboardPage';
import InventoryPage from '../pages/InventoryPage';
import LoginPage from '../pages/LoginPage';
import NotFound from '../pages/NotFound';
import OrderDetailPage from '../pages/OrderDetailPage';
import OrdersPage from '../pages/OrdersPage';
import PackageBuilderPage from '../pages/packages/PackageBuilderPage';
import PackageListPage from '../pages/packages/PackageListPage';
import ProductsPage from '../pages/products/ProductListPage';
import ProductFormPage from '../pages/products/ProductFormPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import UsersPage from '../pages/users/UsersPage';
import ProtectedRoute from './ProtectedRoute';

const PAGES = [
  { path: '/', element: <DashboardPage />, permission: 'dashboard.view' },
  { path: 'orders', element: <OrdersPage />, permission: 'orders.view' },
  { path: 'orders/:id', element: <OrderDetailPage />, permission: 'orders.view' },
  { path: 'products', element: <ProductsPage />, permission: 'products.view' },
  { path: 'products/new', element: <ProductFormPage key="new" />, permission: 'products.create' },
  {
    path: 'products/:id/edit',
    element: <ProductFormPage key="edit" />,
    permission: 'products.update',
  },
  { path: 'packages', element: <PackageListPage />, permission: 'products.view' },
  {
    path: 'packages/new',
    element: <PackageBuilderPage key="new" />,
    permission: 'products.create',
  },
  {
    path: 'packages/:id/edit',
    element: <PackageBuilderPage key="edit" />,
    permission: 'products.update',
  },
  { path: 'categories', element: <CategoriesPage />, permission: 'products.view' },
  { path: 'attributes', element: <AttributesPage />, permission: 'products.view' },
  { path: 'inventory', element: <InventoryPage />, permission: 'inventory.view' },
  { path: 'customers', element: <CustomersPage />, permission: 'customers.view' },
  { path: 'customers/:id', element: <CustomerDetailPage />, permission: 'customers.view' },
  { path: 'coupons', element: <CouponsPage />, permission: 'coupons.view' },
  { path: 'banners', element: <BannersPage />, permission: 'content.view' },
  { path: 'pages', element: <ContentPagesPage />, permission: 'content.view' },
  { path: 'reports', element: <ReportsPage />, permission: 'reports.view' },
  { path: 'settings', element: <SettingsPage />, permission: 'settings.manage' },
  { path: 'users', element: <UsersPage />, permission: 'users.manage' },
];

export default function AppRoutes() {
  const checking = useAuthBootstrap();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {PAGES.map(({ path, element, permission }) => (
            <Route key={path} element={<ProtectedRoute permission={permission} />}>
              <Route path={path} element={element} />
            </Route>
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
