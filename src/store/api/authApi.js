import { baseApi } from './baseApi';

const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: '/admin/auth/login', method: 'POST', body }),
    }),
    refresh: builder.mutation({
      query: () => ({ url: '/admin/auth/refresh', method: 'POST' }),
    }),
    logout: builder.mutation({
      query: () => ({ url: '/admin/auth/logout', method: 'POST' }),
    }),
    me: builder.query({
      query: () => '/admin/auth/me',
      providesTags: ['Me'],
    }),
  }),
});

export const { useLoginMutation, useRefreshMutation, useLogoutMutation, useMeQuery } = authApi;
