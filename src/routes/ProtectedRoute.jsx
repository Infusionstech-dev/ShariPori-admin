import { useEffect } from 'react';
import { Spin } from 'antd';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useRefreshSessionMutation } from '../store/api/baseApi';
import { logout, sessionCheckStarted, setCredentials } from '../store/slices/authSlice';

// import.meta.env.DEV is false in production builds, so the flag can never open a live admin.
const devBypass = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

export default function ProtectedRoute() {
  const dispatch = useDispatch();
  const store = useStore();
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const status = useSelector((state) => state.auth.status);
  const [refreshSession] = useRefreshSessionMutation();

  useEffect(() => {
    // Read from the store, not the render, so StrictMode's second effect run sees 'checking'.
    if (devBypass || store.getState().auth.status !== 'idle') {
      return;
    }

    dispatch(sessionCheckStarted());
    refreshSession()
      .unwrap()
      .then((response) => dispatch(setCredentials(response.data)))
      .catch(() => dispatch(logout()));
  }, [dispatch, refreshSession, store]);

  if (devBypass || accessToken) {
    return <Outlet />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spin size="large" />
    </div>
  );
}
