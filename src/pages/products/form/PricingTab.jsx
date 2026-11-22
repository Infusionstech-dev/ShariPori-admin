import { InputNumber } from 'antd';
import { useWatch } from 'react-hook-form';

import FormField from '../../../components/FormField';
import { formatBDT } from '../../../lib/format';

export default function PricingTab({ control }) {
  const basePrice = useWatch({ control, name: 'basePrice' });
  const salePrice = useWatch({ control, name: 'salePrice' });

  const onSale = basePrice > 0 && salePrice > 0 && salePrice < basePrice;
  const discount = onSale ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;
  const effective = onSale ? salePrice : basePrice;

  return (
    <>
      <div className="grid gap-x-4 md:grid-cols-2">
        <FormField
          control={control}
          name="basePrice"
          label="Base price (৳)"
          render={(field) => <InputNumber {...field} min={0} style={{ width: '100%' }} />}
        />
        <FormField
          control={control}
          name="salePrice"
          label="Sale price (৳, optional)"
          render={(field) => <InputNumber {...field} min={0} style={{ width: '100%' }} />}
        />
      </div>
      <p className="mb-0 rounded-lg bg-soft/50 px-4 py-3 text-sm">
        {effective > 0 ? (
          <>
            Customers pay <strong>{formatBDT(effective)}</strong>
            {discount > 0 && ` (${discount}% off)`}
          </>
        ) : (
          'Enter a base price to see what customers pay.'
        )}
        <span className="mt-1 block text-text/60">
          Sizes or colours that cost more or less get their own price under “Sizes, colours and
          stock”.
        </span>
      </p>
    </>
  );
}
