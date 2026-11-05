import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { App, Button, Empty, Result, Skeleton, Typography } from 'antd';
import { z } from 'zod';

import CrudTable from '../../components/common/CrudTable';
import FormModal from '../../components/common/FormModal';
import {
  useCreateSizeMutation,
  useDeleteSizeMutation,
  useGetSizesQuery,
  useUpdateSizeMutation,
} from '../../store/api/attributeApi';
import useAttributeTab from './useAttributeTab';

const GROUPS = [
  { value: 'baby', label: 'Baby' },
  { value: 'kids', label: 'Kids' },
  { value: 'adult', label: 'Adult' },
  { value: 'free', label: 'Free' },
];

const schema = z.object({
  label: z.string().trim().min(1, 'Enter the size name').max(30),
  group: z.enum(['baby', 'kids', 'adult', 'free'], { error: 'Choose a group' }),
});

const FIELDS = [
  { name: 'label', label: 'Name', placeholder: 'For example 0-6M or 52' },
  { name: 'group', label: 'Group', type: 'select', options: GROUPS },
];

const EMPTY = { label: '', group: 'baby' };
const toForm = ({ label, group }) => ({ label, group });
const searchText = (row) => `${row.label} ${row.group}`;

const inGroup = (rows, group) =>
  rows
    .filter((row) => row.group === group)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

const nextSortOrder = (rows, group) =>
  rows.filter((row) => row.group === group).reduce((max, row) => Math.max(max, row.sortOrder), 0) +
  1;

export default function SizesTab() {
  const { message } = App.useApp();
  const { data = [], isLoading, isError, refetch } = useGetSizesQuery();
  const [create, createState] = useCreateSizeMutation();
  const [update, updateState] = useUpdateSizeMutation();
  const [remove] = useDeleteSizeMutation();
  const tab = useAttributeTab({
    label: 'Size',
    create,
    update,
    remove,
    rows: data,
    searchText,
    empty: EMPTY,
    toForm,
  });

  // A new size, or one moved to another group, goes to the end of that group.
  const onSubmit = (values) =>
    tab.save(
      tab.editingRow?.group === values.group
        ? values
        : { ...values, sortOrder: nextSortOrder(data, values.group) }
    );

  // There is no bulk endpoint, so each size whose position changed is saved on its own.
  const move = async (group, row, step) => {
    const list = inGroup(data, group);
    const from = list.findIndex((item) => item.id === row.id);
    const reordered = [...list];
    [reordered[from], reordered[from + step]] = [reordered[from + step], reordered[from]];

    try {
      await Promise.all(
        reordered
          .map((item, index) => ({ item, sortOrder: index + 1 }))
          .filter(({ item, sortOrder }) => item.sortOrder !== sortOrder)
          .map(({ item, sortOrder }) => update({ id: item.id, sortOrder }).unwrap())
      );
      message.success('Order saved');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not save the new order');
    }
  };

  const columnsFor = (group) => {
    const list = inGroup(data, group);
    const columns = [{ title: 'Name', dataIndex: 'label' }];
    // Moving needs the whole group in view, so it pauses while a search hides some sizes.
    if (tab.canUpdate && !tab.isSearching) {
      columns.push({
        title: 'Order',
        key: 'order',
        width: 110,
        render: (_, row) => {
          const index = list.findIndex((item) => item.id === row.id);
          return (
            <>
              <Button
                type="text"
                aria-label={`Move ${row.label} up`}
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => move(group, row, -1)}
              />
              <Button
                type="text"
                aria-label={`Move ${row.label} down`}
                icon={<ArrowDownOutlined />}
                disabled={index === list.length - 1}
                onClick={() => move(group, row, 1)}
              />
            </>
          );
        },
      });
    }
    return columns;
  };

  let groups;
  if (isError) {
    groups = (
      <Result
        status="error"
        title="Could not load sizes"
        extra={
          <Button type="primary" onClick={refetch}>
            Try again
          </Button>
        }
      />
    );
  } else if (isLoading) {
    groups = <Skeleton active paragraph={{ rows: 8 }} />;
  } else {
    const visible = GROUPS.filter(({ value }) => inGroup(tab.filtered, value).length);
    groups = visible.length ? (
      visible.map(({ value, label }) => (
        <section key={value} className="space-y-2">
          <Typography.Title level={4} style={{ margin: 0 }}>
            {label}
          </Typography.Title>
          <CrudTable
            columns={columnsFor(value)}
            data={inGroup(tab.filtered, value)}
            onEdit={tab.onEdit}
            onDelete={tab.onDelete}
            nameOf={(row) => row.label}
          />
        </section>
      ))
    ) : (
      <Empty description={tab.isSearching ? 'No sizes match your search' : 'No sizes yet'} />
    );
  }

  return (
    <div className="space-y-6">
      {tab.toolbar}
      {groups}
      <FormModal
        {...tab.modalProps}
        fields={FIELDS}
        schema={schema}
        onSubmit={onSubmit}
        loading={createState.isLoading || updateState.isLoading}
      />
    </div>
  );
}
