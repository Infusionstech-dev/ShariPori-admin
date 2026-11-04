import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';
import { logout, setCredentials } from '../slices/authSlice';

const REFRESH_URL = '/admin/auth/refresh';

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

// A 401 from /admin/auth/* means bad credentials or a dead session, not an expired access token.
const isAuthRequest = (args) => {
  const url = typeof args === 'string' ? args : args.url;
  return url.startsWith('/admin/auth/');
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  await refreshMutex.waitForUnlock();
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status !== 401 || isAuthRequest(args)) {
    return result;
  }

  if (refreshMutex.isLocked()) {
    // Another request is already refreshing: wait for it, then retry with the new token.
    await refreshMutex.waitForUnlock();
    return baseQuery(args, api, extraOptions);
  }

  const release = await refreshMutex.acquire();
  try {
    const refresh = await baseQuery({ url: REFRESH_URL, method: 'POST' }, api, extraOptions);

    if (refresh.data?.data?.accessToken) {
      api.dispatch(setCredentials(refresh.data.data));
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
    }
  } finally {
    release();
  }

  return result;
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
  endpoints: (builder) => ({
    refreshSession: builder.mutation({
      query: () => ({ url: REFRESH_URL, method: 'POST' }),
    }),
  }),
});

export const { useRefreshSessionMutation } = baseApi;
