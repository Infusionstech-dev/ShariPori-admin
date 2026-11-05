import { useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Input } from 'antd';

import usePermission from '../../hooks/usePermission';

// What every tab shares: search, the add/edit form's state, permissions and delete messages.
export default function useAttributeTab({
  label,
  create,
  update,
  remove,
  rows,
  searchText,
  empty,
  toForm,
}) {
  const { message } = App.useApp();
  const can = usePermission();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, row: null });

  const closeModal = () => setModal({ open: false, row: null });
  const defaultValues = useMemo(
    () => (modal.row ? toForm(modal.row) : empty),
    [modal.row, toForm, empty]
  );

  const term = search.trim().toLowerCase();
  const filtered = term ? rows.filter((row) => searchText(row).toLowerCase().includes(term)) : rows;

  const save = async (body) => {
    if (modal.row) {
      await update({ id: modal.row.id, ...body }).unwrap();
      message.success(`${label} updated`);
    } else {
      await create(body).unwrap();
      message.success(`${label} added`);
    }
  };

  const onDelete = async (row) => {
    try {
      await remove(row.id).unwrap();
      message.success(`${label} deleted`);
    } catch (err) {
      message.error(err?.data?.message ?? `Could not delete this ${label.toLowerCase()}`);
    }
  };

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="w-full max-w-xs">
        <Input.Search
          aria-label={`Search ${label.toLowerCase()}s`}
          placeholder="Search"
          allowClear
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {can('products.create') && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModal({ open: true, row: null })}
        >
          Add {label.toLowerCase()}
        </Button>
      )}
    </div>
  );

  return {
    filtered,
    isSearching: Boolean(term),
    toolbar,
    canUpdate: can('products.update'),
    onEdit: can('products.update') ? (row) => setModal({ open: true, row }) : undefined,
    onDelete: can('products.delete') ? onDelete : undefined,
    modalProps: {
      title: `${modal.row ? 'Edit' : 'Add'} ${label.toLowerCase()}`,
      open: modal.open,
      defaultValues,
      onClose: closeModal,
    },
    editingRow: modal.row,
    save,
  };
}
