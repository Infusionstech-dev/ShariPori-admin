import { baseApi } from './baseApi';

const TREE_ARGS = { tree: true };

const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: (params) => ({ url: '/admin/categories', params }),
      transformResponse: (response) => response.data,
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation({
      query: (body) => ({ url: '/admin/categories', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/categories/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({ url: `/admin/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Category'],
    }),
    reorderCategories: builder.mutation({
      query: ({ items }) => ({ url: '/admin/categories/reorder', method: 'PATCH', body: items }),
      // Shows the new order at once, and puts the old one back if the API refuses it.
      async onQueryStarted({ nextTree }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          categoryApi.util.updateQueryData('getCategories', TREE_ARGS, () => nextTree)
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['Category'],
    }),
  }),
});

export { TREE_ARGS };
export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useReorderCategoriesMutation,
} = categoryApi;
