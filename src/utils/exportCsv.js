// =============================================================
//  ONE LINE REAL ESTATE - EXCEL / CSV EXPORT UTILITY (UTF-8)
// =============================================================

/**
 * Export array of data objects to Excel-friendly CSV with UTF-8 BOM
 */
export const exportToCsv = (filename, dataArray, columnHeaders) => {
  if (!dataArray || dataArray.length === 0) return;

  const keys = Object.keys(columnHeaders);
  const headerRow = keys.map((k) => `"${columnHeaders[k]}"`).join(',');

  const rows = dataArray.map((item) => {
    return keys
      .map((k) => {
        let val = item[k];
        if (val === undefined || val === null) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        // Escape double quotes
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
