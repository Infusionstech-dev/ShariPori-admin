import { baseApi } from './baseApi';

// Stock shows on product and order pages too, so changes refresh those as well.
const CHANGED = ['Inventory', 'Product', 'Package'];

const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventory: builder.query({
      query: (params) => ({ url: '/admin/inventory', params }),
      providesTags: ['Inventory'],
    }),
    getInventorySummary: builder.query({
      query: () => '/admin/inventory/summary',
      transformResponse: (response) => response.data,
      providesTags: ['Inventory'],
    }),
    getMovements: builder.query({
      query: (params) => ({ url: '/admin/inventory/movements', params }),
      providesTags: ['Inventory'],
    }),
    stockIn: builder.mutation({
      query: (body) => ({ url: '/admin/inventory/stock-in', method: 'POST', body }),
      invalidatesTags: CHANGED,
    }),
    adjustStock: builder.mutation({
      query: (body) => ({ url: '/admin/inventory/adjust', method: 'POST', body }),
      invalidatesTags: CHANGED,
    }),
    updateThreshold: builder.mutation({
      query: ({ variantId, lowStockThreshold }) => ({
        url: `/admin/inventory/${variantId}/threshold`,
        method: 'PATCH',
        body: { lowStockThreshold },
      }),
      invalidatesTags: ['Inventory'],
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useGetInventorySummaryQuery,
  useGetMovementsQuery,
  useStockInMutation,
  useAdjustStockMutation,
  useUpdateThresholdMutation,
} = inventoryApi;
