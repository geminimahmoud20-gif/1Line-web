import { getDynamicPhone, getDynamicWhatsApp } from './founderCmsData';

// The property brochure (Arabic, one locked page with a baked-in logo watermark)
export { generatePropertyPdf } from './brochure/propertyBrochure.js';

/**
 * Generate Institutional Investor Deck & Feasibility Prospectus PDF
 */
export const generateInvestorProspectusPdf = async ({
  invAmount = 3000000,
  invPeriod = 5,
  invPropType = 'commercial',
  investmentSim = {},
  currency = 'EGP'
}) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Background Header Banner
  doc.setFillColor(8, 18, 38); // Deep Royal Navy #081226
  doc.rect(0, 0, 210, 50, 'F');

  // Accent Gold Line
  doc.setFillColor(255, 202, 40); // Amber Gold #ffca28
  doc.rect(0, 50, 210, 3, 'F');

  // Brand Name & Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('1LINE REAL ESTATE INTELLIGENCE', 15, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 202, 40);
  doc.text('INDICATIVE INVESTMENT SIMULATION', 15, 30);
  doc.setTextColor(200, 210, 225);
  doc.setFontSize(9);
  doc.text('Estimates for guidance only - not an offer or a guarantee', 15, 38);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, 160, 22);
  doc.text(`CURRENCY: ${currency}`, 160, 30);

  // Executive Overview Section
  doc.setTextColor(13, 72, 161);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Executive Portfolio Simulation', 15, 66);

  // Financial Metrics Summary Box
  doc.setFillColor(248, 250, 255);
  doc.roundedRect(15, 72, 180, 54, 3, 3, 'F');
  doc.setDrawColor(220, 230, 245);
  doc.roundedRect(15, 72, 180, 54, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Target Asset Class:', 22, 82);
  doc.text('Initial Capital Deployed:', 22, 92);
  doc.text('Investment Horizon:', 22, 102);
  doc.text('Indicative Total Return:', 22, 112);

  doc.setTextColor(15, 23, 42);
  doc.text(invPropType.toUpperCase(), 85, 82);
  doc.text(`${invAmount.toLocaleString('en-US')} ${currency}`, 85, 92);
  doc.text(`${invPeriod} Years Horizon`, 85, 102);

  doc.setTextColor(16, 185, 129); // Emerald Green
  // Only the simulator's own figure; never a made-up default
  doc.text(Number.isFinite(Number(investmentSim.totalRoiPercent)) ? `+${investmentSim.totalRoiPercent}% Cumulative Return (simulation)` : 'Not calculated', 85, 112);

  // Returns Breakdown Grid
  doc.setTextColor(13, 72, 161);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Financial Breakdown & Cumulative Yields', 15, 138);

  const breakdownRows = [
    ['Estimated Annual Rental Income:', `${(investmentSim.annualRent || 0).toLocaleString('en-US')} ${currency} / Year`],
    ['Total Rental Income over Period:', `${(investmentSim.totalRentOverPeriod || 0).toLocaleString('en-US')} ${currency}`],
    ['Indicative Future Asset Value:', `${(investmentSim.futureCapitalValue || 0).toLocaleString('en-US')} ${currency}`],
    ['Net Capital Profit & Rental Gain:', `+${(investmentSim.netProfit || 0).toLocaleString('en-US')} ${currency}`]
  ];

  let currentY = 148;
  breakdownRows.forEach(([lbl, val], idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 245, idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 255);
    doc.rect(15, currentY - 5, 180, 9, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(lbl, 20, currentY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(idx === 3 ? 16 : 15, idx === 3 ? 185 : 23, idx === 3 ? 129 : 42);
    doc.text(val, 130, currentY);

    currentY += 11;
  });

  // Risk Mitigation & Legal Assurance Section
  doc.setTextColor(13, 72, 161);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. How 1Line Works With You', 15, 204);

  // Service commitments only — no guarantees about any specific asset
  const pillars = [
    '- Title documents and permits reviewed before listing; written summary before contract.',
    '- Brokerage fees and all costs agreed in writing before any service starts.',
    '- Tenant placement and rental management available on request.',
    '- Free on-site viewing before any commitment.'
  ];

  let pY = 214;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  pillars.forEach(p => {
    doc.text(p, 18, pY);
    pY += 8;
  });

  // Footer Contact & Concierge Call-To-Action
  doc.setFillColor(8, 18, 38);
  doc.rect(0, 260, 210, 37, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 202, 40);
  doc.text('1Line Private Wealth & Institutional Concierge Desk:', 15, 272);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(`VIP Direct Hotline: ${getDynamicPhone()} | WhatsApp: wa.me/${getDynamicWhatsApp()}`, 15, 279);
  doc.text('Head Office: El Gomhoureya St, Sohag, Egypt', 15, 285);
  doc.text('Indicative simulation based on user assumptions. Not an offer, advice, or a guarantee of any return by 1Line.', 15, 291);

  const filename = `1Line_Investment_Simulation_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
};
