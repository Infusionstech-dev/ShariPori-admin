import { baseApi } from './baseApi';

const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query({
      query: (params) => ({ url: '/admin/customers', params }),
      providesTags: ['Customer'],
    }),
    getGuests: builder.query({
      query: (params) => ({ url: '/admin/customers/guests', params }),
      providesTags: ['Customer', 'Order'],
    }),
    getCustomer: builder.query({
      query: (id) => `/admin/customers/${id}`,
      transformResponse: (response) => response.data,
      providesTags: ['Customer', 'Order'],
    }),
    setCustomerBlocked: builder.mutation({
      query: ({ id, isBlocked, reason }) => ({
        url: `/admin/customers/${id}/block`,
        method: 'PATCH',
        body: { isBlocked, reason },
      }),
      invalidatesTags: ['Customer'],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetGuestsQuery,
  useLazyGetCustomersQuery,
  useLazyGetGuestsQuery,
  useGetCustomerQuery,
  useSetCustomerBlockedMutation,
} = customerApi;
