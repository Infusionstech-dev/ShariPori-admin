import { baseApi } from './baseApi';

// Packages are products too, so image and delete actions on the product API refresh these.
const TAGS = ['Package', 'Product'];

const packageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPackages: builder.query({
      query: (params) => ({ url: '/admin/packages', params }),
      providesTags: TAGS,
    }),
    getPackage: builder.query({
      query: (id) => `/admin/packages/${id}`,
      transformResponse: (response) => response.data,
      providesTags: TAGS,
    }),
    createPackage: builder.mutation({
      query: (body) => ({ url: '/admin/packages', method: 'POST', body }),
      invalidatesTags: TAGS,
    }),
    updatePackage: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/packages/${id}`, method: 'PUT', body }),
      invalidatesTags: TAGS,
    }),
  }),
});

export const {
  useGetPackagesQuery,
  useGetPackageQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
} = packageApi;
