export const STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export const PAYMENT_METHODS = {
  cod: 'Cash on delivery',
  bkash: 'bKash',
  nagad: 'Nagad',
  sslcommerz: 'Card',
};

export const PAYMENT_STATUSES = {
  unpaid: { label: 'Unpaid', color: 'default' },
  paid: { label: 'Paid', color: 'green' },
  refunded: { label: 'Refunded', color: 'purple' },
  failed: { label: 'Failed', color: 'red' },
};

export const SOURCES = {
  web: 'Website',
  manual: 'Manual',
  phone: 'Phone',
  facebook: 'Facebook',
};

export const COURIERS = ['Steadfast', 'Pathao', 'RedX'];

const dhakaTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Dhaka',
});

export const formatDhaka = (value) => (value ? dhakaTime.format(new Date(value)) : '');

// T7.3 builds invoices. Until then the print buttons say so.
export const printInvoicePlaceholder = (message) =>
  message.info('Invoice printing arrives with the next update');
