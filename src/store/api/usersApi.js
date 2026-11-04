import { baseApi } from './baseApi';

const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: (params) => ({ url: '/admin/users', params }),
      providesTags: ['User'],
    }),
    createUser: builder.mutation({
      query: (body) => ({ url: '/admin/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}`, method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    updateUserStatus: builder.mutation({
      query: ({ id, isActive }) => ({
        url: `/admin/users/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: ['User'],
    }),
    updateUserPassword: builder.mutation({
      query: ({ id, newPassword }) => ({
        url: `/admin/users/${id}/password`,
        method: 'PATCH',
        body: { newPassword },
      }),
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
  useUpdateUserPasswordMutation,
} = usersApi;
