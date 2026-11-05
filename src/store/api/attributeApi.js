import { baseApi } from './baseApi';

const data = (response) => response.data;

const crudEndpoints = (builder, path, tag) => ({
  list: builder.query({
    query: () => `/admin/${path}`,
    transformResponse: data,
    providesTags: [tag],
  }),
  create: builder.mutation({
    query: (body) => ({ url: `/admin/${path}`, method: 'POST', body }),
    invalidatesTags: [tag],
  }),
  update: builder.mutation({
    query: ({ id, ...body }) => ({ url: `/admin/${path}/${id}`, method: 'PUT', body }),
    invalidatesTags: [tag],
  }),
  remove: builder.mutation({
    query: (id) => ({ url: `/admin/${path}/${id}`, method: 'DELETE' }),
    invalidatesTags: [tag],
  }),
});

const attributeApi = baseApi.injectEndpoints({
  endpoints: (builder) => {
    const fabrics = crudEndpoints(builder, 'fabrics', 'Fabric');
    const sizes = crudEndpoints(builder, 'sizes', 'Size');
    const colors = crudEndpoints(builder, 'colors', 'Color');

    return {
      getFabrics: fabrics.list,
      createFabric: fabrics.create,
      updateFabric: fabrics.update,
      deleteFabric: fabrics.remove,
      getSizes: sizes.list,
      createSize: sizes.create,
      updateSize: sizes.update,
      deleteSize: sizes.remove,
      getColors: colors.list,
      createColor: colors.create,
      updateColor: colors.update,
      deleteColor: colors.remove,
    };
  },
});

export const {
  useGetFabricsQuery,
  useCreateFabricMutation,
  useUpdateFabricMutation,
  useDeleteFabricMutation,
  useGetSizesQuery,
  useCreateSizeMutation,
  useUpdateSizeMutation,
  useDeleteSizeMutation,
  useGetColorsQuery,
  useCreateColorMutation,
  useUpdateColorMutation,
  useDeleteColorMutation,
} = attributeApi;
