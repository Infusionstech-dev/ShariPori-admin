import { z } from 'zod';

import CrudTable from '../../components/common/CrudTable';
import FormModal from '../../components/common/FormModal';
import {
  useCreateColorMutation,
  useDeleteColorMutation,
  useGetColorsQuery,
  useUpdateColorMutation,
} from '../../store/api/attributeApi';
import useAttributeTab from './useAttributeTab';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the colour name').max(50),
  hex: z.string().regex(/^#[0-9A-F]{6}$/i, 'Enter a colour like #7A1F3D'),
});

const FIELDS = [
  { name: 'name', label: 'Name' },
  { name: 'hex', label: 'Colour', type: 'color' },
];

const COLUMNS = [
  {
    title: 'Colour',
    dataIndex: 'name',
    render: (name, row) => (
      <span className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-block size-6 shrink-0 rounded-full border border-black/20"
          style={{ backgroundColor: row.hex }}
        />
        {name}
      </span>
    ),
  },
  { title: 'Hex', dataIndex: 'hex' },
];

const EMPTY = { name: '', hex: '#7A1F3D' };
const toForm = ({ name, hex }) => ({ name, hex });
const searchText = (row) => `${row.name} ${row.hex}`;

export default function ColorsTab() {
  const { data = [], isLoading, isError, refetch } = useGetColorsQuery();
  const [create, createState] = useCreateColorMutation();
  const [update, updateState] = useUpdateColorMutation();
  const [remove] = useDeleteColorMutation();
  const tab = useAttributeTab({
    label: 'Colour',
    create,
    update,
    remove,
    rows: data,
    searchText,
    empty: EMPTY,
    toForm,
  });

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
        toolbar={tab.toolbar}
        emptyText={tab.isSearching ? 'No colours match your search' : 'No colours yet'}
      />
      <FormModal
        {...tab.modalProps}
        fields={FIELDS}
        schema={schema}
        onSubmit={tab.save}
        loading={createState.isLoading || updateState.isLoading}
      />
    </>
  );
}
