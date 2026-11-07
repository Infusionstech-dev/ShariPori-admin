// Quotes every cell, and starts the file with a byte-order mark so Excel reads Bangla correctly.
// Cells starting with = + - @ are prefixed so a spreadsheet never runs them as formulas.
const cell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

// columns: [{ title, value: (row) => any }]
export function downloadCsv(filename, columns, rows) {
  const lines = [
    columns.map((column) => cell(column.title)).join(','),
    ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(',')),
  ];
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
