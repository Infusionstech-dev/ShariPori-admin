import { Tag } from 'antd';

import { STATUS_LABELS } from './orderText';

// Matches the storefront: pending grey, confirmed blue, processing amber, shipped purple,
// delivered green, cancelled red, returned dark grey.
const COLORS = {
  pending: 'default',
  confirmed: 'blue',
  processing: 'gold',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
  returned: '#595959',
};

export default function StatusTag({ status }) {
  return (
    <Tag color={COLORS[status] ?? 'default'} style={{ marginInlineEnd: 0 }}>
      {STATUS_LABELS[status] ?? status}
    </Tag>
  );
}
