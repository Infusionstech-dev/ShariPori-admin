import { Breadcrumb } from 'antd';
import { Link, matchPath, useLocation } from 'react-router-dom';

const CRUMBS = [
  { path: '/orders', trail: [['Orders']] },
  { path: '/orders/new', trail: [['Orders', '/orders'], ['New order']] },
  { path: '/orders/:id', trail: [['Orders', '/orders'], ['Order details']] },
  { path: '/products', trail: [['Products']] },
  { path: '/products/new', trail: [['Products', '/products'], ['Add new']] },
  { path: '/products/:id/edit', trail: [['Products', '/products'], ['Edit']] },
  { path: '/packages', trail: [['Products', '/products'], ['Packages']] },
  { path: '/packages/new', trail: [['Packages', '/packages'], ['Add package']] },
  { path: '/packages/:id/edit', trail: [['Packages', '/packages'], ['Edit package']] },
  { path: '/categories', trail: [['Products', '/products'], ['Categories']] },
  { path: '/attributes', trail: [['Products', '/products'], ['Fabrics/Sizes/Colours']] },
  { path: '/inventory', trail: [['Inventory']] },
  { path: '/inventory/movements', trail: [['Inventory', '/inventory'], ['Stock movements']] },
  { path: '/customers', trail: [['Customers']] },
  { path: '/customers/:id', trail: [['Customers', '/customers'], ['Customer details']] },
  { path: '/coupons', trail: [['Coupons']] },
  { path: '/banners', trail: [['Content'], ['Banners']] },
  { path: '/pages', trail: [['Content'], ['Pages']] },
  { path: '/pages/new', trail: [['Content'], ['Pages', '/pages'], ['New page']] },
  { path: '/pages/:id', trail: [['Content'], ['Pages', '/pages'], ['Edit page']] },
  { path: '/reports', trail: [['Reports']] },
  { path: '/settings', trail: [['Settings']] },
  { path: '/users', trail: [['Users']] },
];

export default function AppBreadcrumb() {
  const { pathname } = useLocation();
  const crumb = CRUMBS.find(({ path }) => matchPath(path, pathname));

  const items = [
    { title: pathname === '/' ? 'Dashboard' : <Link to="/">Dashboard</Link> },
    ...(crumb?.trail ?? []).map(([label, to]) => ({
      title: to ? <Link to={to}>{label}</Link> : label,
    })),
  ];

  return (
    <div className="mb-4">
      <Breadcrumb items={items} />
    </div>
  );
}
