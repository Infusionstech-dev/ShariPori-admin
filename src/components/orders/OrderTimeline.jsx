import { Timeline, Typography } from 'antd';

import { formatDhaka, STATUS_LABELS } from './orderText';
import StatusTag from './StatusTag';

const COLORS = { cancelled: 'red', returned: 'gray', delivered: 'green' };

// history: [{ from, to, note, at, by: { name, role } | null }], oldest first.
export default function OrderTimeline({ history }) {
  return (
    <Timeline
      items={history.map((row) => ({
        color: COLORS[row.to] ?? 'blue',
        content: (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag status={row.to} />
              {row.from && (
                <Typography.Text type="secondary" className="text-xs">
                  from {STATUS_LABELS[row.from] ?? row.from}
                </Typography.Text>
              )}
            </div>
            <div className="mt-1 text-xs text-text/60">
              {formatDhaka(row.at)} · {row.by ? `${row.by.name} (${row.by.role})` : 'Customer'}
            </div>
            {row.note && <div className="mt-1 text-sm">{row.note}</div>}
          </div>
        ),
      }))}
    />
  );
}
