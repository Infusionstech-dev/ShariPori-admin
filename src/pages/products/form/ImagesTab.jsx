import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import { App, Button, Empty, Input, Select, Tag } from 'antd';

import ConfirmDelete from '../../../components/common/ConfirmDelete';
import { parseImageLinks } from './imageLinks';
import { useGetColorsQuery } from '../../../store/api/attributeApi';
import {
  useAddImagesMutation,
  useDeleteImageMutation,
  useReorderImagesMutation,
  useUpdateImageMutation,
} from '../../../store/api/productApi';

function ImageCard({ image, index, colorOptions, onColor, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  const [failed, setFailed] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-image-id={image.id}
      className={`rounded-lg border border-soft bg-white p-2 ${isDragging ? 'z-10 shadow-lg' : ''}`}
    >
      <div className="relative">
        {failed ? (
          <div className="flex aspect-[3/4] items-center justify-center rounded bg-soft p-2 text-center text-xs text-red-700">
            This image could not be loaded
          </div>
        ) : (
          <img
            src={image.url}
            alt={`Product view ${index + 1}`}
            onError={() => setFailed(true)}
            className="aspect-[3/4] w-full rounded object-cover"
          />
        )}
        {index === 0 && (
          <Tag color="gold" style={{ position: 'absolute', left: 4, top: 4 }}>
            Main
          </Tag>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          aria-label={`Move image ${index + 1}`}
          className="cursor-grab touch-none rounded p-1 focus-visible:outline-2 focus-visible:outline-primary"
          {...attributes}
          {...listeners}
        >
          <HolderOutlined />
        </button>
        <ConfirmDelete
          label={`Delete image ${index + 1}`}
          title="Delete this image?"
          onConfirm={() => onDelete(image)}
        />
      </div>
      <Select
        aria-label={`Colour for image ${index + 1}`}
        size="small"
        className="mt-1 w-full"
        allowClear
        placeholder="Any colour"
        options={colorOptions}
        value={image.colorId ?? undefined}
        onChange={(colorId) => onColor(image, colorId ?? null)}
      />
    </div>
  );
}

export default function ImagesTab({
  productId,
  images = [],
  pendingText,
  onPendingText,
  pendingError,
}) {
  const { message } = App.useApp();
  const { data: colors = [] } = useGetColorsQuery();
  const [addImages, addState] = useAddImagesMutation();
  const [deleteImage] = useDeleteImageMutation();
  const [reorderImages] = useReorderImagesMutation();
  const [updateImage] = useUpdateImageMutation();
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  // While a new order is being saved, this shows it instead of the last loaded one.
  const [pendingOrder, setPendingOrder] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // A new product has nowhere to attach images yet, so these are sent right after it is created.
  if (!productId) {
    const { urls } = parseImageLinks(pendingText);
    return (
      <div className="space-y-3">
        <Input.TextArea
          aria-label="Image links"
          rows={3}
          value={pendingText}
          status={pendingError ? 'error' : undefined}
          placeholder="Paste image links, one per line, up to 10. The first is the main image."
          onChange={(event) => onPendingText(event.target.value)}
        />
        {pendingError && (
          <p role="alert" className="mb-0 text-sm text-red-700">
            {pendingError}
          </p>
        )}
        {urls.length > 0 && !pendingError && (
          <div className="flex flex-wrap gap-2">
            {urls.map((url, index) => (
              <img
                key={`${url}-${index}`}
                src={url}
                alt={`New product view ${index + 1}`}
                className="h-24 w-[72px] rounded border border-soft object-cover"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const ordered = pendingOrder ?? images;
  const colorOptions = colors.map(({ id, name }) => ({ value: id, label: name }));

  const onAdd = async () => {
    const { urls, error: linkError } = parseImageLinks(text);
    if (!urls.length) {
      setError('Paste at least one image link');
      return;
    }
    if (linkError) {
      setError(linkError);
      return;
    }

    setError(null);
    try {
      await addImages({ id: productId, urls }).unwrap();
      setText('');
      message.success(urls.length === 1 ? 'Image added' : `${urls.length} images added`);
    } catch (err) {
      setError(err?.data?.message ?? 'Could not add the images');
    }
  };

  const onDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) {
      return;
    }
    const from = ordered.findIndex((image) => image.id === active.id);
    const to = ordered.findIndex((image) => image.id === over.id);
    const next = arrayMove(ordered, from, to);

    setPendingOrder(next);
    try {
      await reorderImages({
        id: productId,
        items: next.map((image, index) => ({ id: image.id, sortOrder: index })),
      }).unwrap();
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not save the new order');
    } finally {
      setPendingOrder(null);
    }
  };

  const onDelete = async (image) => {
    try {
      await deleteImage({ id: productId, imageId: image.id }).unwrap();
      message.success('Image deleted');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not delete the image');
    }
  };

  const onColor = async (image, colorId) => {
    try {
      await updateImage({ id: productId, imageId: image.id, colorId }).unwrap();
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not set the colour');
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Image links</span>
        <Input.TextArea
          aria-label="Image links"
          rows={3}
          value={text}
          status={error ? 'error' : undefined}
          placeholder="Paste one link per line, up to 10 at a time"
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button loading={addState.isLoading} onClick={onAdd}>
        Add images
      </Button>

      {ordered.length ? (
        <>
          <p className="text-sm text-text/60">
            Drag by the handle to reorder. The first image is the main one customers see.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={ordered.map((image) => image.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {ordered.map((image, index) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    index={index}
                    colorOptions={colorOptions}
                    onColor={onColor}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <Empty description="No images yet" />
      )}
    </div>
  );
}
