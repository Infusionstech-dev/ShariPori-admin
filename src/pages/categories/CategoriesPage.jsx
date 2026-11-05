import { useState } from 'react';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  EditOutlined,
  HolderOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Empty, Result, Skeleton, Switch, Tree, Typography } from 'antd';

import ConfirmDelete from '../../components/common/ConfirmDelete';
import usePermission from '../../hooks/usePermission';
import {
  TREE_ARGS,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useReorderCategoriesMutation,
  useUpdateCategoryMutation,
} from '../../store/api/categoryApi';
import { allIds, findNode, moveCategory } from './categoryTree';
import CategoryFormModal from './CategoryFormModal';

function CategoryThumb({ src }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-soft text-primary">
        <PictureOutlined />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailedSrc(src)}
      className="h-10 w-10 shrink-0 rounded object-cover"
    />
  );
}

const toTreeData = (nodes) =>
  nodes.map((node) => ({ key: node.id, data: node, children: toTreeData(node.children) }));

export default function CategoriesPage() {
  const { message } = App.useApp();
  const can = usePermission();
  const canCreate = can('products.create');
  const canUpdate = can('products.update');
  const canDelete = can('products.delete');
  const { data: tree = [], isLoading, isError, refetch } = useGetCategoriesQuery(TREE_ARGS);
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [reorderCategories] = useReorderCategoriesMutation();
  const [formState, setFormState] = useState({ open: false, category: null });
  const [collapsedIds, setCollapsedIds] = useState([]);

  const ids = allIds(tree);

  const toggleActive = async (category, isActive) => {
    try {
      await updateCategory({ id: category.id, isActive }).unwrap();
      message.success(isActive ? 'Category activated' : 'Category hidden from the shop');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not update the category');
    }
  };

  const remove = async (category) => {
    try {
      await deleteCategory(category.id).unwrap();
      message.success('Category deleted');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not delete the category');
    }
  };

  const applyMove = async (move) => {
    if (!move?.items.length) {
      return;
    }
    try {
      await reorderCategories(move).unwrap();
      message.success('Order saved');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not reorder. The previous order is back.');
    }
  };

  const siblingsOf = (category) =>
    category.parentId === null ? tree : (findNode(tree, category.parentId)?.children ?? []);

  const moveBy = (category, step) => {
    const siblings = siblingsOf(category);
    const neighbour = siblings[siblings.findIndex((node) => node.id === category.id) + step];
    applyMove(moveCategory(tree, category.id, neighbour.id, step < 0 ? 'before' : 'after'));
  };

  const onDrop = ({ node, dragNode, dropPosition, dropToGap }) => {
    const siblingIndex = Number(node.pos.split('-').pop());
    // The gap right below an expanded row is that row's first-child slot.
    const opensIntoChildren = dropPosition > siblingIndex && node.expanded && node.children?.length;
    let position = dropPosition < siblingIndex ? 'before' : 'after';
    if (!dropToGap || opensIntoChildren) {
      position = 'inside';
    }
    applyMove(moveCategory(tree, dragNode.key, node.key, position));
  };

  const renderRow = ({ data: category }) => {
    const siblings = siblingsOf(category);
    const index = siblings.findIndex((node) => node.id === category.id);

    return (
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-1 sm:flex-nowrap">
        <CategoryThumb src={category.image} />
        <div className="min-w-0 flex-1 basis-40">
          {/* Inline because antd dims the title of a tree that is not selectable. */}
          <div className="truncate font-medium" style={{ color: 'var(--color-text)' }}>
            {category.nameEn} <span className="font-bangla font-normal">/ {category.nameBn}</span>
          </div>
          <div className="truncate text-xs text-text/60">
            {category.slug} · {category.productCount}{' '}
            {category.productCount === 1 ? 'product' : 'products'}
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
          {canUpdate && (
            <>
              <Button
                type="text"
                aria-label={`Move ${category.nameEn} up`}
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => moveBy(category, -1)}
              />
              <Button
                type="text"
                aria-label={`Move ${category.nameEn} down`}
                icon={<ArrowDownOutlined />}
                disabled={index === siblings.length - 1}
                onClick={() => moveBy(category, 1)}
              />
            </>
          )}
          <Switch
            size="small"
            aria-label={`Show ${category.nameEn} in shop`}
            title="Show in shop"
            checked={category.isActive}
            disabled={!canUpdate}
            onChange={(checked) => toggleActive(category, checked)}
          />
          {canUpdate && (
            <Button
              type="text"
              aria-label={`Edit ${category.nameEn}`}
              icon={<EditOutlined />}
              onClick={() => setFormState({ open: true, category })}
            />
          )}
          {canDelete && (
            <ConfirmDelete
              label={`Delete ${category.nameEn}`}
              title={`Delete ${category.nameEn}?`}
              description="This cannot be undone from the admin."
              onConfirm={() => remove(category)}
            />
          )}
        </div>
      </div>
    );
  };

  let content;
  if (isLoading) {
    content = <Skeleton active paragraph={{ rows: 8 }} />;
  } else if (isError) {
    content = (
      <Result
        status="error"
        title="Could not load categories"
        extra={
          <Button type="primary" onClick={refetch}>
            Try again
          </Button>
        }
      />
    );
  } else if (!tree.length) {
    content = <Empty description="No categories yet" />;
  } else {
    content = (
      <Tree
        blockNode
        selectable={false}
        draggable={canUpdate ? { icon: <HolderOutlined /> } : false}
        treeData={toTreeData(tree)}
        titleRender={renderRow}
        expandedKeys={ids.filter((id) => !collapsedIds.includes(id))}
        onExpand={(keys) => setCollapsedIds(ids.filter((id) => !keys.includes(id)))}
        onDrop={onDrop}
      />
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
          Categories
        </Typography.Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setFormState({ open: true, category: null })}
          >
            Add category
          </Button>
        )}
      </div>
      {canUpdate && tree.length > 0 && (
        <Typography.Paragraph type="secondary">
          Drag a row, or use the arrows, to change the order customers see.
        </Typography.Paragraph>
      )}
      {content}
      <CategoryFormModal
        open={formState.open}
        category={formState.category}
        tree={tree}
        onClose={() => setFormState({ open: false, category: null })}
      />
    </Card>
  );
}
