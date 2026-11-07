import { PrinterOutlined } from '@ant-design/icons';
import { App, Button, Tooltip } from 'antd';

import { useLazyGetInvoiceQuery } from '../../store/api/orderApi';

// The PDF needs the Bearer token, so a plain link cannot open it. The tab opens first,
// inside the click, so popup blockers allow it; the PDF is loaded into it afterwards.
export default function InvoiceButton({ ids, label = 'Print invoice', iconOnly = false, size }) {
  const { message } = App.useApp();
  const [getInvoice, { isFetching }] = useLazyGetInvoiceQuery();

  const open = async () => {
    const tab = window.open('', '_blank');
    try {
      const url = await getInvoice(ids).unwrap();
      if (tab) {
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      tab?.close();
      message.error(err?.data?.message ?? 'Could not create the invoice');
    }
  };

  const button = (
    <Button
      size={size}
      type={iconOnly ? 'text' : 'default'}
      icon={<PrinterOutlined />}
      loading={isFetching}
      aria-label={label}
      onClick={open}
    >
      {iconOnly ? null : label}
    </Button>
  );
  return iconOnly ? <Tooltip title={label}>{button}</Tooltip> : button;
}
