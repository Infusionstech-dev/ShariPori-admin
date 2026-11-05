import { baseApi } from './baseApi';

const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params) => ({ url: '/admin/products', params }),
      providesTags: ['Product'],
    }),
    getProduct: builder.query({
      query: (id) => `/admin/products/${id}`,
      transformResponse: (response) => response.data,
      providesTags: ['Product'],
    }),
    createProduct: builder.mutation({
      query: (body) => ({ url: '/admin/products', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/products/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Product'],
    }),
    updateStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/admin/products/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Product'],
    }),
    toggleFeatured: builder.mutation({
      query: ({ id, isFeatured }) => ({
        url: `/admin/products/${id}/featured`,
        method: 'PATCH',
        body: { isFeatured },
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/admin/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    addImages: builder.mutation({
      query: ({ id, urls, colorId }) => ({
        url: `/admin/products/${id}/images`,
        method: 'POST',
        body: { urls, colorId },
      }),
      invalidatesTags: ['Product'],
    }),
    reorderImages: builder.mutation({
      query: ({ id, items }) => ({
        url: `/admin/products/${id}/images/reorder`,
        method: 'PATCH',
        body: items,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteImage: builder.mutation({
      query: ({ id, imageId }) => ({
        url: `/admin/products/${id}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateStatusMutation,
  useToggleFeaturedMutation,
  useDeleteProductMutation,
  useAddImagesMutation,
  useReorderImagesMutation,
  useDeleteImageMutation,
} = productApi;
