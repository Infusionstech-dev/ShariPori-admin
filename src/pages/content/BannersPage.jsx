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
import { EditOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Skeleton,
  Switch,
  Tag,
} from 'antd';
import dayjs from 'dayjs';

import ConfirmDelete from '../../components/common/ConfirmDelete';
import ImageUrlInput from '../../components/common/ImageUrlInput';
import usePermission from '../../hooks/usePermission';
import {
  useCreateBannerMutation,
  useDeleteBannerMutation,
  useGetBannersQuery,
  useReorderBannersMutation,
  useUpdateBannerMutation,
} from '../../store/api/contentApi';

const POSITIONS = [
  { value: 'home_hero', label: 'Home: top slider' },
  { value: 'home_middle', label: 'Home: middle banner' },
];

const dateText = (value) => (value ? dayjs(value).format('D MMM YYYY, h:mm a') : null);

// What a banner is doing now, from its switch and dates.
const liveState = (banner) => {
  const now = dayjs();
  if (!banner.isActive) return { label: 'Off', color: 'default' };
  if (banner.startsAt && dayjs(banner.startsAt).isAfter(now))
    return { label: 'Scheduled', color: 'blue' };
  if (banner.endsAt && !dayjs(banner.endsAt).isAfter(now))
    return { label: 'Ended', color: 'orange' };
  return { label: 'Live', color: 'green' };
};

function BannerModal({ banner, position, onClose }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [createBanner, creating] = useCreateBannerMutation();
  const [updateBanner, updating] = useUpdateBannerMutation();

  const save = async () => {
    const values = await form.validateFields();
    const [startsAt, endsAt] = values.schedule ?? [];
    const body = {
      ...values,
      schedule: undefined,
      startsAt: startsAt ? startsAt.toISOString() : null,
      endsAt: endsAt ? endsAt.toISOString() : null,
    };
    try {
      if (banner) {
        await updateBanner({ id: banner.id, ...body }).unwrap();
      } else {
        await createBanner(body).unwrap();
      }
      message.success('Banner saved. It shows on the shop within a minute.');
      onClose();
    } catch (err) {
      message.error(err?.data?.details?.[0]?.message ?? err?.data?.message ?? 'Could not save');
    }
  };

  return (
    <Modal
      open
      width={620}
      title={banner ? 'Edit banner' : 'Add banner'}
      okText="Save banner"
      confirmLoading={creating.isLoading || updating.isLoading}
      onOk={save}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={{
          position,
          isActive: true,
          ...banner,
          schedule:
            banner?.startsAt || banner?.endsAt
              ? [
                  banner.startsAt ? dayjs(banner.startsAt) : null,
                  banner.endsAt ? dayjs(banner.endsAt) : null,
                ]
              : undefined,
        }}
      >
        <Form.Item
          name="imageUrl"
          label="Image link (desktop)"
          extra="Shown in full, never cropped. A wide image works best, for example 1600 × 600."
          rules={[{ required: true, type: 'url' }]}
        >
          <ImageUrlInput />
        </Form.Item>
        <Form.Item
          name="mobileImageUrl"
          label="Image link for phones"
          extra="Optional. A taller image for small screens, for example 800 × 1000."
          rules={[{ type: 'url' }]}
        >
          <ImageUrlInput />
        </Form.Item>
        <Form.Item
          name="title"
          label="Title"
          extra="Slider: shown beside the image. Middle banner: shown on the image."
          rules={[{ required: true, min: 2, max: 150 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="subtitle" label="Subtitle" rules={[{ max: 255 }]}>
          <Input />
        </Form.Item>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item name="buttonText" label="Button text" rules={[{ max: 50 }]}>
            <Input placeholder="Shop now" />
          </Form.Item>
          <Form.Item
            name="link"
            label="Button link"
            extra="A shop page like /packages, or a full link"
            rules={[
              {
                pattern: /^(\/(?!\/)\S*|https?:\/\/\S+)$/,
                message: 'Use /packages or https://…',
              },
            ]}
          >
            <Input placeholder="/category/mothers-saree" />
          </Form.Item>
        </div>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Form.Item name="position" label="Where">
            <Select options={POSITIONS} />
          </Form.Item>
          <Form.Item name="isActive" label="Show on the shop" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
        <Form.Item
          name="schedule"
          label="Schedule"
          extra="Optional. Leave empty to show it until you switch it off."
        >
          <DatePicker.RangePicker
            showTime={{ format: 'h:mm a' }}
            allowEmpty={[true, true]}
            className="w-full"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function BannerCard({ banner, canEdit, onEdit }) {
  const { message } = App.useApp();
  const [deleteBanner] = useDeleteBannerMutation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: banner.id,
    disabled: !canEdit,
  });
  const state = liveState(banner);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border border-soft bg-white ${isDragging ? 'z-10 shadow-lg' : ''}`}
    >
      <div className="relative">
        <img
          src={banner.imageUrl}
          alt=""
          className="aspect-[16/7] w-full rounded-t-lg object-cover"
        />
        <Tag color={state.color} style={{ position: 'absolute', left: 8, top: 8 }}>
          {state.label}
        </Tag>
        {canEdit && (
          <button
            type="button"
            aria-label={`Drag to reorder ${banner.title}`}
            className="absolute right-2 top-2 cursor-grab rounded bg-white/90 p-1.5"
            {...attributes}
            {...listeners}
          >
            <HolderOutlined />
          </button>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="font-medium">{banner.title}</div>
        {banner.subtitle && <div className="text-sm text-text/70">{banner.subtitle}</div>}
        <div className="text-xs text-text/60">
          {banner.buttonText && banner.link ? `${banner.buttonText} → ${banner.link}` : 'No button'}
        </div>
        {(banner.startsAt || banner.endsAt) && (
          <div className="text-xs text-text/60">
            {dateText(banner.startsAt) ?? 'Now'} – {dateText(banner.endsAt) ?? 'no end'}
          </div>
        )}
        {canEdit && (
          <div className="flex gap-2 pt-1">
            <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(banner)}>
              Edit
            </Button>
            <ConfirmDelete
              title="Delete this banner?"
              onConfirm={async () => {
                try {
                  await deleteBanner(banner.id).unwrap();
                  message.success('Banner deleted');
                } catch (err) {
                  message.error(err?.data?.message ?? 'Could not delete');
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PositionSection({ position, banners, canEdit, onAdd, onEdit }) {
  const { message } = App.useApp();
  const [reorder] = useReorderBannersMutation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = banners.map((banner) => banner.id);
    const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
    try {
      await reorder({ position: position.value, ids: next }).unwrap();
      message.success('Order saved');
    } catch (err) {
      message.error(err?.data?.message ?? 'Could not save the order');
    }
  };

  return (
    <Card
      title={position.label}
      extra={
        canEdit && (
          <Button icon={<PlusOutlined />} onClick={() => onAdd(position.value)}>
            Add banner
          </Button>
        )
      }
    >
      {banners.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={banners.map((banner) => banner.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {banners.map((banner) => (
                <BannerCard key={banner.id} banner={banner} canEdit={canEdit} onEdit={onEdit} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Empty
          description={
            position.value === 'home_hero'
              ? 'No banners yet. The shop shows its built-in slides until you add one.'
              : 'No banner yet. The shop shows the Mother & Baby section here.'
          }
        />
      )}
    </Card>
  );
}

export default function BannersPage() {
  const can = usePermission();
  const canEdit = can('content.update');
  const { data, isLoading, isError, refetch } = useGetBannersQuery();
  // null: closed; { position }: adding; { banner }: editing.
  const [editing, setEditing] = useState(null);

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError) {
    return (
      <Result
        status="error"
        title="Could not load banners"
        extra={<Button onClick={refetch}>Try again</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="m-0 text-2xl font-semibold">Banners</h1>
        <p className="m-0 text-sm text-text/60">
          Drag the handle to change the order. The first one shows first.
        </p>
      </div>
      {POSITIONS.map((position) => (
        <PositionSection
          key={position.value}
          position={position}
          banners={data.filter((banner) => banner.position === position.value)}
          canEdit={canEdit}
          onAdd={(value) => setEditing({ position: value })}
          onEdit={(banner) => setEditing({ banner })}
        />
      ))}
      {editing && (
        <BannerModal
          banner={editing.banner}
          position={editing.banner?.position ?? editing.position}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
