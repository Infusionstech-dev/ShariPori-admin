import { Input, Select, TreeSelect } from 'antd';

import RichTextEditor from '../../../components/common/RichTextEditor';
import FormField from '../../../components/FormField';
import { useGetFabricsQuery } from '../../../store/api/attributeApi';
import { TREE_ARGS, useGetCategoriesQuery } from '../../../store/api/categoryApi';
import { toParentOptions } from '../../categories/categoryTree';

export default function BasicInfoTab({ control }) {
  const { data: categories = [] } = useGetCategoriesQuery(TREE_ARGS);
  const { data: fabrics = [] } = useGetFabricsQuery();

  return (
    <>
      <div className="grid gap-x-4 md:grid-cols-2">
        <FormField
          control={control}
          name="nameEn"
          label="Name (English)"
          render={(field) => <Input {...field} placeholder="Dhakai Jamdani Saree" />}
        />
        <FormField
          control={control}
          name="nameBn"
          label="Name (Bangla)"
          render={(field) => <Input {...field} placeholder="ঢাকাই জামদানি শাড়ি" />}
        />
        <FormField
          control={control}
          name="categoryId"
          label="Category"
          render={(field) => (
            <TreeSelect
              {...field}
              treeData={toParentOptions(categories)}
              treeDefaultExpandAll
              placeholder="Choose a category"
            />
          )}
        />
        <FormField
          control={control}
          name="fabricId"
          label="Fabric (optional)"
          render={(field) => (
            <Select
              {...field}
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value ?? null)}
              allowClear
              placeholder="Choose a fabric"
              options={fabrics.map(({ id, nameEn }) => ({ value: id, label: nameEn }))}
            />
          )}
        />
      </div>
      <FormField
        control={control}
        name="description"
        label="Description (optional)"
        render={(field) => <RichTextEditor {...field} />}
      />
    </>
  );
}
