import { Card, Tabs, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';

import ColorsTab from './ColorsTab';
import FabricsTab from './FabricsTab';
import SizesTab from './SizesTab';

const TABS = [
  { key: 'fabrics', label: 'Fabrics', children: <FabricsTab /> },
  { key: 'sizes', label: 'Sizes', children: <SizesTab /> },
  { key: 'colors', label: 'Colours', children: <ColorsTab /> },
];

export default function AttributesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const activeKey = TABS.some((tab) => tab.key === requested) ? requested : TABS[0].key;

  return (
    <Card>
      <Typography.Title level={2} style={{ fontFamily: 'var(--font-display)' }}>
        Fabrics, Sizes and Colours
      </Typography.Title>
      <Tabs
        activeKey={activeKey}
        destroyOnHidden
        items={TABS}
        onChange={(tab) => setSearchParams({ tab })}
      />
    </Card>
  );
}
