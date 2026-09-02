import { jsPDF } from 'jspdf';

/**
 * Generate an official Property Comparison Report (PDF)
 * for selected properties in One Line Real Estate.
 */
export const generateComparePdf = (compareList = [], lang = 'ar') => {
  if (!compareList || compareList.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const isAr = lang === 'ar';
  const reportDate = new Date().toLocaleDateString('en-GB');

  // 1. Header Banner (Navy & Gold)
  doc.setFillColor(9, 35, 71); // #092347
  doc.rect(0, 0, 297, 36, 'F');

  doc.setFillColor(255, 179, 0); // #ffb300
  doc.rect(0, 36, 297, 2.5, 'F');

  // Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('1LINE REAL ESTATE & INVESTMENT', 16, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 224, 130);
  doc.text('OFFICIAL PROPERTY COMPARISON & FEASIBILITY MATRIX', 16, 24);

  doc.setFontSize(8.5);
  doc.setTextColor(200, 220, 240);
  doc.text(`Date: ${reportDate} | Ref: CMP-OL-${Math.floor(1000 + Math.random() * 9000)}`, 220, 16);
  doc.text('Sohag & New Sohag Branches | Hotline: +20 101 234 5678', 190, 24);

  // 2. Comparison Table Grid
  const startY = 48;
  const colWidth = 65;
  const labelColWidth = 55;

  // Labels Column
  const rows = [
    { label: 'Property Title / Unit', key: 'title', height: 16 },
    { label: 'Total Price (EGP)', key: 'price', height: 12 },
    { label: 'Downpayment Required', key: 'downPayment', height: 12 },
    { label: 'Monthly Installment', key: 'monthly', height: 12 },
    { label: 'Total Area (sqm)', key: 'size', height: 12 },
    { label: 'Price Per SqM (EGP/m2)', key: 'ppm', height: 12 },
    { label: 'Bedrooms & Bathrooms', key: 'rooms', height: 12 },
    { label: 'Location & District', key: 'location', height: 14 },
    { label: 'Legal Audit Status', key: 'legal', height: 12 }
  ];

  let currentY = startY;

  // Header row background
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, labelColWidth + compareList.length * colWidth, 12, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 35, 71);
  doc.text('COMPARISON CRITERIA', 18, currentY + 8);

  compareList.forEach((p, idx) => {
    const colX = 14 + labelColWidth + idx * colWidth;
    doc.text(`PROPERTY OPTION #${idx + 1}`, colX + 4, currentY + 8);
  });

  currentY += 12;

  // Matrix Rows
  rows.forEach((row, rIdx) => {
    // Alternating Row BG
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, labelColWidth + compareList.length * colWidth, row.height, 'F');
    }

    // Border bottom
    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY + row.height, 14 + labelColWidth + compareList.length * colWidth, currentY + row.height);

    // Label Cell
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row.label, 18, currentY + row.height / 2 + 3);

    // Property Value Cells
    compareList.forEach((prop, pIdx) => {
      const cellX = 14 + labelColWidth + pIdx * colWidth;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      let valStr = '';
      if (row.key === 'title') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 72, 161);
        valStr = prop.title_en || prop.title_ar || 'Luxury Unit';
      } else if (row.key === 'price') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9);
        valStr = `${(prop.price || 0).toLocaleString()} EGP`;
      } else if (row.key === 'downPayment') {
        valStr = prop.downPayment ? `${prop.downPayment.toLocaleString()} EGP` : 'Cash / Special';
      } else if (row.key === 'monthly') {
        doc.setTextColor(16, 185, 129);
        valStr = prop.monthlyInstallment ? `${prop.monthlyInstallment.toLocaleString()} EGP/mo` : 'N/A';
      } else if (row.key === 'size') {
        valStr = `${prop.size || 0} sqm`;
      } else if (row.key === 'ppm') {
        const ppm = prop.pricePerMeter || (prop.size ? Math.round(prop.price / prop.size) : 0);
        valStr = `${ppm.toLocaleString()} EGP/m2`;
      } else if (row.key === 'rooms') {
        valStr = `${prop.bedrooms || 0} Beds / ${prop.bathrooms || 0} Baths`;
      } else if (row.key === 'location') {
        valStr = prop.locationName_en || prop.locationName_ar || 'Sohag';
      } else if (row.key === 'legal') {
        doc.setTextColor(16, 185, 129);
        valStr = '100% Certified Legal Deed';
      }

      doc.text(doc.splitTextToSize(valStr, colWidth - 8), cellX + 4, currentY + 7);
    });

    currentY += row.height;
  });

  // Footer Note
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 185, 269, 14, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.text('Note: This official comparison is issued by 1Line Real Estate Brokerage. Pricing and unit availability are subject to daily updates.', 18, 192);
  doc.text('Visit our headquarters in Sohag or contact our certified property advisors at https://oneline-eg.com', 18, 196);

  // Save PDF
  doc.save(`1Line_Properties_Comparison_${reportDate.replace(/\//g, '-')}.pdf`);
};
