import { AutoComplete, Input } from 'antd';

import FormField from '../../../components/FormField';
import { useGetMatchGroupsQuery } from '../../../store/api/productApi';

export default function MoreOptions({ control }) {
  const { data: groups = [] } = useGetMatchGroupsQuery();

  return (
    <>
      <FormField
        control={control}
        name="shortDesc"
        label="Short description"
        render={(field) => <Input.TextArea {...field} rows={2} />}
      />
      <FormField
        control={control}
        name="careInfo"
        label="Fabric and care info"
        render={(field) => <Input.TextArea {...field} rows={2} />}
      />
      <FormField
        control={control}
        name="matchGroup"
        label="Matching set"
        render={(field) => (
          <AutoComplete
            {...field}
            options={groups.map((value) => ({ value }))}
            filterOption
            placeholder="Use the same name on a mother and baby product to link them"
          />
        )}
      />
    </>
  );
}
