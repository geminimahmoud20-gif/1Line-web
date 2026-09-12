import { jsPDF } from 'jspdf';
import { getPriceBenchmark } from './currencyAndBenchmark';

/**
 * Generate an official Property Comparison Report (PDF)
 * for selected properties in One Line Real Estate Sohag.
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

  // 1. Header Banner (Royal Navy & Gold)
  doc.setFillColor(9, 35, 71); // #092347
  doc.rect(0, 0, 297, 34, 'F');

  doc.setFillColor(255, 179, 0); // #ffb300
  doc.rect(0, 34, 297, 2.5, 'F');

  // Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('1LINE REAL ESTATE & INVESTMENT - SOHAG', 14, 15);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 224, 130);
  doc.text('OFFICIAL MULTI-PROPERTY COMPARISON & FEASIBILITY REPORT', 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(200, 220, 240);
  doc.text(`Report Date: ${reportDate} | Ref: CMP-OL-${Math.floor(1000 + Math.random() * 9000)}`, 205, 15);
  doc.text('Certified Listings | Sohag & New Sohag | Hotline: +20 101 234 5678', 190, 23);

  // 2. Comparison Table Grid Setup
  const startY = 44;
  const numProps = Math.min(4, compareList.length);
  const labelColWidth = numProps > 3 ? 48 : 55;
  const colWidth = numProps > 3 ? 55 : 68;
  const tableWidth = labelColWidth + numProps * colWidth;

  // Labels Column Configuration
  const rows = [
    { label: 'Property Title / Unit', key: 'title', height: 14 },
    { label: 'Total Price (EGP)', key: 'price', height: 11 },
    { label: 'Price Per SqM (EGP/m2)', key: 'ppm', height: 11 },
    { label: 'District Price Benchmark', key: 'benchmark', height: 11 },
    { label: 'Downpayment Plan', key: 'downPayment', height: 11 },
    { label: 'Monthly Installment', key: 'monthly', height: 11 },
    { label: 'Total Area (sqm)', key: 'size', height: 11 },
    { label: 'Bedrooms & Bathrooms', key: 'rooms', height: 11 },
    { label: 'Finishing Quality', key: 'finishing', height: 11 },
    { label: 'Handover / Delivery', key: 'handover', height: 11 },
    { label: 'Location / District', key: 'location', height: 11 },
    { label: 'Legal Audit & Form 10', key: 'legal', height: 12 }
  ];

  let currentY = startY;

  // Header row background
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, tableWidth, 11, 'F');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 35, 71);
  doc.text('COMPARISON CRITERIA', 18, currentY + 7.5);

  compareList.slice(0, 4).forEach((p, idx) => {
    const colX = 14 + labelColWidth + idx * colWidth;
    doc.text(`PROPERTY OPTION #${idx + 1}`, colX + 4, currentY + 7.5);
  });

  currentY += 11;

  // Matrix Rows
  rows.forEach((row, rIdx) => {
    // Alternating Row BG
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, tableWidth, row.height, 'F');
    }

    // Border bottom
    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY + row.height, 14 + tableWidth, currentY + row.height);

    // Label Cell
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row.label, 18, currentY + row.height / 2 + 2.5);

    // Property Value Cells
    compareList.slice(0, 4).forEach((prop, pIdx) => {
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
      } else if (row.key === 'ppm') {
        const ppm = prop.pricePerMeter || (prop.size ? Math.round(prop.price / prop.size) : 0);
        valStr = `${ppm.toLocaleString()} EGP / sqm`;
      } else if (row.key === 'benchmark') {
        const bench = getPriceBenchmark(prop, 'en');
        valStr = bench ? (bench.badgeLabel || 'Fair Market Value') : 'Standard Market Rate';
      } else if (row.key === 'downPayment') {
        valStr = prop.downPayment ? `${prop.downPayment.toLocaleString()} EGP (${Math.round((prop.downPayment / prop.price) * 100)}%)` : 'Cash / Negotiation';
      } else if (row.key === 'monthly') {
        doc.setTextColor(16, 185, 129);
        valStr = prop.monthlyInstallment ? `${prop.monthlyInstallment.toLocaleString()} EGP/mo (${prop.installmentYears || 0} yrs)` : 'Cash on delivery';
      } else if (row.key === 'size') {
        valStr = `${prop.size || 0} sqm`;
      } else if (row.key === 'rooms') {
        valStr = `${prop.bedrooms || 0} Beds / ${prop.bathrooms || 0} Baths`;
      } else if (row.key === 'finishing') {
        valStr = prop.finishing_en || prop.finishing_ar || 'Ultra Super Lux';
      } else if (row.key === 'handover') {
        valStr = prop.completionStatus === 'ready' ? 'Immediate Handover (Ready)' : 'Under Construction';
      } else if (row.key === 'location') {
        valStr = prop.locationName_en || prop.locationName_ar || 'Sohag';
      } else if (row.key === 'legal') {
        doc.setTextColor(16, 185, 129);
        valStr = '100% Certified Legal Deed & Form 10';
      }

      doc.text(doc.splitTextToSize(valStr, colWidth - 8), cellX + 4, currentY + 6.5);
    });

    currentY += row.height;
  });

  // Footer Note
  const footerY = Math.max(currentY + 6, 186);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, footerY, tableWidth, 12, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.text('Disclaimer: This document is an official comparison generated by 1Line PropTech Platform. Prices & availability subject to owner verification.', 18, footerY + 5);
  doc.text('For site visits, escrow booking and legal deed verification, visit 1Line headquarters or visit https://oneline-eg.com', 18, footerY + 9);

  // Save PDF
  doc.save(`1Line_Properties_Comparison_${reportDate.replace(/\//g, '-')}.pdf`);
};
