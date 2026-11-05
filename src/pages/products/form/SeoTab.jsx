import { Input } from 'antd';
import { useWatch } from 'react-hook-form';

import FormField from '../../../components/FormField';

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;
const SITE_URL = import.meta.env.VITE_SITE_URL ?? '';

const slugPreview = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Search engines cut off longer text. It is only advice, so going over still saves.
function Counter({ length, limit }) {
  return (
    <p
      className={`-mt-4 mb-4 text-right text-xs ${length > limit ? 'text-red-700' : 'text-text/60'}`}
    >
      {length} / {limit}
      {length > limit && ' (search engines may cut this off)'}
    </p>
  );
}

export default function SeoTab({ control, savedSlug }) {
  const nameEn = useWatch({ control, name: 'nameEn' }) ?? '';
  const seoTitle = useWatch({ control, name: 'seoTitle' }) ?? '';
  const seoDesc = useWatch({ control, name: 'seoDesc' }) ?? '';
  const slug = savedSlug ?? slugPreview(nameEn);

  return (
    <>
      <FormField
        control={control}
        name="seoTitle"
        label="Search title (optional)"
        render={(field) => <Input {...field} placeholder={nameEn} />}
      />
      <Counter length={seoTitle.length} limit={TITLE_LIMIT} />
      <FormField
        control={control}
        name="seoDesc"
        label="Search description (optional)"
        render={(field) => <Input.TextArea {...field} rows={3} />}
      />
      <Counter length={seoDesc.length} limit={DESCRIPTION_LIMIT} />
      <p className="text-sm text-text/60">Web address</p>
      <p className="break-all text-sm">
        {SITE_URL}/products/{slug || 'your-product-name'}
      </p>
      {!savedSlug && (
        <p className="mt-1 text-xs text-text/60">
          Created when you save, and a number is added if the name is already taken.
        </p>
      )}
    </>
  );
}
