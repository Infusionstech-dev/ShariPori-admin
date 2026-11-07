import { baseApi } from './baseApi';

// Every change can move totals, stock or status, so each one refreshes all order data.
const TAGS = ['Order'];

const data = (response) => response.data;

const edit = (builder, path) =>
  builder.mutation({
    query: ({ id, ...body }) => ({
      url: `/admin/orders/${id}/${path}`,
      method: 'PATCH',
      body,
    }),
    transformResponse: data,
    // Stock changes with items, status and cancellations, so product lists refresh too.
    invalidatesTags: ['Order', 'Product', 'Package', 'Inventory'],
  });

const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query({
      query: (params) => ({ url: '/admin/orders', params }),
      providesTags: TAGS,
    }),
    getOrder: builder.query({
      query: (id) => `/admin/orders/${id}`,
      transformResponse: data,
      providesTags: TAGS,
    }),
    createOrder: builder.mutation({
      query: (body) => ({ url: '/admin/orders', method: 'POST', body }),
      transformResponse: data,
      invalidatesTags: ['Order', 'Product', 'Package', 'Inventory'],
    }),
    updateOrderStatus: edit(builder, 'status'),
    updateOrderItems: edit(builder, 'items'),
    updateOrderDelivery: edit(builder, 'delivery'),
    updateOrderCustomer: edit(builder, 'customer'),
    updateOrderNote: builder.mutation({
      query: ({ id, adminNote }) => ({
        url: `/admin/orders/${id}/note`,
        method: 'PATCH',
        body: { adminNote },
      }),
      transformResponse: data,
      // Autosave: refreshing the whole page while someone types would be distracting.
    }),
    updateOrderPayment: edit(builder, 'payment'),
    bulkOrderStatus: builder.mutation({
      query: (body) => ({
        url: '/admin/orders/bulk/status',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => ({
        results: response.data,
        message: response.message,
      }),
      invalidatesTags: ['Order', 'Product', 'Package', 'Inventory'],
    }),
    // ids: one order id or several. The PDF becomes an object URL string, because the store
    // must only hold plain data. Each call makes a fresh PDF, so nothing is cached.
    getInvoice: builder.query({
      query: (ids) => {
        const list = [].concat(ids);
        return {
          ...(list.length === 1
            ? { url: `/admin/orders/${list[0]}/invoice` }
            : { url: '/admin/orders/invoices', method: 'POST', body: { ids: list } }),
          responseHandler: async (response) =>
            response.ok ? URL.createObjectURL(await response.blob()) : response.json(),
          cache: 'no-store',
        };
      },
      keepUnusedDataFor: 0,
    }),
    // Public endpoints, used by the new order page for zones and live totals.
    getDeliveryZones: builder.query({
      query: () => '/delivery-zones',
      transformResponse: data,
    }),
    getQuote: builder.query({
      query: (body) => ({ url: '/checkout/quote', method: 'POST', body }),
      transformResponse: data,
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useUpdateOrderItemsMutation,
  useUpdateOrderDeliveryMutation,
  useUpdateOrderCustomerMutation,
  useUpdateOrderNoteMutation,
  useUpdateOrderPaymentMutation,
  useBulkOrderStatusMutation,
  useGetDeliveryZonesQuery,
  useGetQuoteQuery,
  useLazyGetInvoiceQuery,
} = orderApi;
