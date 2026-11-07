import { baseApi } from './baseApi';

const data = (response) => response.data;

// Orders and stock change all the time, so these refresh with them.
const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query({
      query: (range) => ({ url: '/admin/dashboard/summary', params: { range } }),
      transformResponse: data,
      providesTags: ['Dashboard', 'Order', 'Inventory'],
    }),
    getSalesChart: builder.query({
      query: (days) => ({ url: '/admin/dashboard/sales-chart', params: { days } }),
      transformResponse: data,
      providesTags: ['Dashboard', 'Order'],
    }),
    getStatusBreakdown: builder.query({
      query: () => '/admin/dashboard/status-breakdown',
      transformResponse: data,
      providesTags: ['Dashboard', 'Order'],
    }),
    getTopProducts: builder.query({
      query: (params) => ({ url: '/admin/dashboard/top-products', params }),
      transformResponse: data,
      providesTags: ['Dashboard', 'Order'],
    }),
    getRecentOrders: builder.query({
      query: (limit) => ({ url: '/admin/dashboard/recent-orders', params: { limit } }),
      transformResponse: data,
      providesTags: ['Dashboard', 'Order'],
    }),
    getLowStock: builder.query({
      query: (limit) => ({ url: '/admin/dashboard/low-stock', params: { limit } }),
      transformResponse: data,
      providesTags: ['Dashboard', 'Inventory'],
    }),
  }),
});

export const {
  useGetDashboardSummaryQuery,
  useGetSalesChartQuery,
  useGetStatusBreakdownQuery,
  useGetTopProductsQuery,
  useGetRecentOrdersQuery,
  useGetLowStockQuery,
} = dashboardApi;
