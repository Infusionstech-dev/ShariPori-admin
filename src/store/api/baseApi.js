import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';
import { logout, setCredentials } from '../slices/authSlice';

const REFRESH_URL = '/admin/auth/refresh';
// A 401 from these means bad credentials or a dead session, not an expired access token.
const NO_REAUTH_URLS = ['/admin/auth/login', REFRESH_URL, '/admin/auth/logout'];

const refreshMutex = new Mutex();

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const { accessToken } = getState().auth;
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return headers;
  },
});

const needsRefresh = (args, error) => {
  const url = typeof args === 'string' ? args : args.url;
  if (NO_REAUTH_URLS.includes(url)) {
    return false;
  }
  return error?.status === 401 || error?.data?.code === 'TOKEN_EXPIRED';
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  await refreshMutex.waitForUnlock();
  const tokenUsed = api.getState().auth.accessToken;
  const result = await baseQuery(args, api, extraOptions);

  if (!needsRefresh(args, result.error)) {
    return result;
  }

  if (refreshMutex.isLocked()) {
    // Another request is already refreshing: wait for it, then retry with the new token.
    await refreshMutex.waitForUnlock();
    return baseQuery(args, api, extraOptions);
  }

  const release = await refreshMutex.acquire();
  try {
    // A refresh may have finished while this request was in flight.
    if (api.getState().auth.accessToken !== tokenUsed) {
      return await baseQuery(args, api, extraOptions);
    }

    const refresh = await baseQuery({ url: REFRESH_URL, method: 'POST' }, api, extraOptions);

    if (refresh.data?.data?.accessToken) {
      api.dispatch(setCredentials(refresh.data.data));
      return await baseQuery(args, api, extraOptions);
    }

    api.dispatch(logout());
    return result;
  } finally {
    release();
  }
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Me',
    'Dashboard',
    'Order',
    'Product',
    'Package',
    'Category',
    'Fabric',
    'Size',
    'Color',
    'Inventory',
    'Customer',
    'Coupon',
    'Banner',
    'Page',
    'Report',
    'Setting',
    'User',
  ],
  endpoints: () => ({}),
});
