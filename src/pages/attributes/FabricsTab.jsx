import { Tag } from 'antd';
import { z } from 'zod';

import CrudTable from '../../components/common/CrudTable';
import FormModal from '../../components/common/FormModal';
import {
  useCreateFabricMutation,
  useDeleteFabricMutation,
  useGetFabricsQuery,
  useUpdateFabricMutation,
} from '../../store/api/attributeApi';
import useAttributeTab from './useAttributeTab';

const schema = z.object({
  nameEn: z.string().trim().min(2, 'Enter the English name').max(100),
  nameBn: z.string().trim().min(2, 'Enter the Bangla name').max(100),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9-]*$/, 'Use lowercase letters, numbers and hyphens'),
  isActive: z.boolean(),
});

const FIELDS = [
  { name: 'nameEn', label: 'Name (English)' },
  { name: 'nameBn', label: 'Name (Bangla)' },
  { name: 'isActive', label: 'Show in shop', type: 'switch' },
  {
    name: 'slug',
    label: 'Web address (optional)',
    placeholder: 'Created automatically from the English name',
  },
];

const COLUMNS = [
  { title: 'Name', dataIndex: 'nameEn' },
  {
    title: 'Bangla',
    dataIndex: 'nameBn',
    render: (value) => <span className="font-bangla">{value}</span>,
  },
  { title: 'Web address', dataIndex: 'slug' },
  {
    title: 'In shop',
    dataIndex: 'isActive',
    render: (value) => (value ? <Tag color="green">Shown</Tag> : <Tag>Hidden</Tag>),
  },
];

const EMPTY = { nameEn: '', nameBn: '', slug: '', isActive: true };
const toForm = ({ nameEn, nameBn, slug, isActive }) => ({ nameEn, nameBn, slug, isActive });
const searchText = (row) => `${row.nameEn} ${row.nameBn} ${row.slug}`;

export default function FabricsTab() {
  const { data = [], isLoading, isError, refetch } = useGetFabricsQuery();
  const [create, createState] = useCreateFabricMutation();
  const [update, updateState] = useUpdateFabricMutation();
  const [remove] = useDeleteFabricMutation();
  const tab = useAttributeTab({
    label: 'Fabric',
    create,
    update,
    remove,
    rows: data,
    searchText,
    empty: EMPTY,
    toForm,
  });

  // A blank or unchanged web address lets the API keep managing it from the name.
  const onSubmit = ({ slug, ...values }) =>
    tab.save(slug && slug !== tab.editingRow?.slug ? { ...values, slug } : values);

  return (
    <>
      <CrudTable
        columns={COLUMNS}
        data={tab.filtered}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        onEdit={tab.onEdit}
        onDelete={tab.onDelete}
        nameOf={(row) => row.nameEn}
        toolbar={tab.toolbar}
        emptyText={tab.isSearching ? 'No fabrics match your search' : 'No fabrics yet'}
      />
      <FormModal
        {...tab.modalProps}
        fields={FIELDS}
        schema={schema}
        onSubmit={onSubmit}
        loading={createState.isLoading || updateState.isLoading}
      />
    </>
  );
}
