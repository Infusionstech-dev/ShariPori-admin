import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import usePermission from '../hooks/usePermission';
import ForbiddenPage from '../pages/ForbiddenPage';

export default function ProtectedRoute({ permission }) {
  const location = useLocation();
  const status = useSelector((state) => state.auth.status);
  const can = usePermission();

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (permission && !can(permission)) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}
