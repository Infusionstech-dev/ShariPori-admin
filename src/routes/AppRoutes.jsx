import { Route, Routes } from 'react-router-dom';

import AdminLayout from '../layouts/AdminLayout';
import AttributesPage from '../pages/AttributesPage';
import BannersPage from '../pages/BannersPage';
import CategoriesPage from '../pages/CategoriesPage';
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
import PackagesPage from '../pages/PackagesPage';
import ProductEditPage from '../pages/ProductEditPage';
import ProductNewPage from '../pages/ProductNewPage';
import ProductsPage from '../pages/ProductsPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import UsersPage from '../pages/UsersPage';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductNewPage />} />
          <Route path="products/:id/edit" element={<ProductEditPage />} />
          <Route path="packages" element={<PackagesPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="attributes" element={<AttributesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="pages" element={<ContentPagesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
