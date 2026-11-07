import { formatBDT } from '../../lib/format';

export default function OrderTotals({ totals }) {
  const rows = [
    ['Subtotal', formatBDT(totals.subtotal)],
    ['Delivery', totals.deliveryCharge ? formatBDT(totals.deliveryCharge) : 'Free'],
    ...(totals.discount > 0
      ? [
          [
            `Discount${totals.couponCode ? ` (${totals.couponCode})` : ''}`,
            `− ${formatBDT(totals.discount)}`,
          ],
        ]
      : []),
  ];

  return (
    <dl className="m-0 space-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt>{label}</dt>
          <dd className="m-0">{value}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-soft pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd className="m-0">{formatBDT(totals.total)}</dd>
      </div>
    </dl>
  );
}
