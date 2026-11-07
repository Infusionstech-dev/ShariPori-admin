import { baseApi } from './baseApi';

const data = (response) => response.data;

const contentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBanners: builder.query({
      query: () => '/admin/banners',
      transformResponse: data,
      providesTags: ['Banner'],
    }),
    createBanner: builder.mutation({
      query: (body) => ({ url: '/admin/banners', method: 'POST', body }),
      invalidatesTags: ['Banner'],
    }),
    updateBanner: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/banners/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Banner'],
    }),
    deleteBanner: builder.mutation({
      query: (id) => ({ url: `/admin/banners/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Banner'],
    }),
    // The new order shows at once; a failure puts the old order back.
    reorderBanners: builder.mutation({
      query: (body) => ({ url: '/admin/banners/reorder', method: 'PATCH', body }),
      onQueryStarted: async ({ position, ids }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          contentApi.util.updateQueryData('getBanners', undefined, (banners) => {
            ids.forEach((id, index) => {
              const banner = banners.find((item) => item.id === id && item.position === position);
              if (banner) banner.sortOrder = index + 1;
            });
            banners.sort(
              (a, b) => a.position.localeCompare(b.position) || a.sortOrder - b.sortOrder
            );
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    getPages: builder.query({
      query: () => '/admin/pages',
      transformResponse: data,
      providesTags: ['Page'],
    }),
    getPage: builder.query({
      query: (id) => `/admin/pages/${id}`,
      transformResponse: data,
      providesTags: ['Page'],
    }),
    createPage: builder.mutation({
      query: (body) => ({ url: '/admin/pages', method: 'POST', body }),
      transformResponse: data,
      invalidatesTags: ['Page'],
    }),
    updatePage: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/pages/${id}`, method: 'PUT', body }),
      transformResponse: data,
      invalidatesTags: ['Page'],
    }),
    deletePage: builder.mutation({
      query: (id) => ({ url: `/admin/pages/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Page'],
    }),
    getSettings: builder.query({
      query: () => '/admin/settings',
      transformResponse: data,
      providesTags: ['Setting'],
    }),
    updateSettings: builder.mutation({
      query: (body) => ({ url: '/admin/settings', method: 'PUT', body }),
      transformResponse: data,
      invalidatesTags: ['Setting'],
    }),
  }),
});

export const {
  useGetBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useReorderBannersMutation,
  useGetPagesQuery,
  useGetPageQuery,
  useCreatePageMutation,
  useUpdatePageMutation,
  useDeletePageMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = contentApi;
