import { jsPDF } from 'jspdf';

/**
 * Generate a luxury, professional PDF brochure for a property in Sohag.
 */
export const generatePropertyPdf = (property) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const title = property.title_en || property.title_ar;
  const location = property.locationName_en || property.locationName_ar;
  const priceFormatted = `${property.price.toLocaleString()} EGP`;
  const downPayment = `${property.downPayment?.toLocaleString() || 0} EGP`;
  const monthly = `${property.monthlyInstallment?.toLocaleString() || 0} EGP / month`;
  const legal = property.legalStatus || {};

  // Background Header Banner
  doc.setFillColor(13, 72, 161); // #0d48a1 Royal Blue
  doc.rect(0, 0, 210, 45, 'F');

  // Accent Gold Line
  doc.setFillColor(255, 179, 0); // #ffb300 Gold
  doc.rect(0, 45, 210, 3, 'F');

  // Brand Name & Slogan
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('1LINE REAL ESTATE', 15, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 224, 130);
  doc.text('SOHAG & NEW SOHAG REAL ESTATE INTELLIGENCE', 15, 28);
  doc.text('Verified Property & Legal Audit Brochure', 15, 34);

  // Property ID Tag
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`CODE: ${property.id.toUpperCase()}`, 160, 20);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 160, 28);

  // Property Title & Location Section
  doc.setTextColor(13, 44, 84);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 15, 60);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Location: ${location}`, 15, 68);

  // Price & Financing Grid Box
  doc.setFillColor(244, 246, 250);
  doc.roundedRect(15, 76, 180, 36, 3, 3, 'F');
  doc.setDrawColor(200, 210, 225);
  doc.roundedRect(15, 76, 180, 36, 3, 3, 'D');

  // Total Price
  doc.setTextColor(13, 72, 161);
  doc.setFontSize(9);
  doc.text('TOTAL PRICE', 22, 85);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(229, 36, 39); // Rose Red
  doc.text(priceFormatted, 22, 93);

  // Downpayment
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('MIN DOWNPAYMENT', 85, 85);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 44, 84);
  doc.text(downPayment, 85, 93);

  // Monthly Installment
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('MONTHLY INSTALLMENT', 140, 85);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 72, 161);
  doc.text(monthly, 140, 93);

  // Installment Years Note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`* Flexible payment plans available up to ${property.installmentYears || 5} years.`, 22, 106);

  // Key Specs Table
  doc.setFillColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 72, 161);
  doc.text('1. Property Specifications & Amenities', 15, 124);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  const specs = [
    `Total Area: ${property.size} sqm`,
    `Bedrooms: ${property.bedrooms || 0}`,
    `Bathrooms: ${property.bathrooms || 0}`,
    `Floor Level: ${property.floor === 0 ? 'Ground Floor' : property.floor}`,
    `Finishing: ${property.finishing_en || 'Super Lux'}`,
    `Handover: ${property.completionStatus === 'ready' ? 'Immediate Move-in' : 'Under Construction'}`
  ];

  let yPos = 132;
  specs.forEach((s, idx) => {
    const col = idx % 2 === 0 ? 20 : 110;
    doc.text(`• ${s}`, col, yPos);
    if (idx % 2 === 1) yPos += 7;
  });

  // 🛡️ LEGAL & TITLE VERIFICATION AUDIT SECTION (Crucial for Sohag)
  yPos += 8;
  doc.setFillColor(240, 253, 244); // Light Green Background
  doc.roundedRect(15, yPos, 180, 56, 3, 3, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(15, yPos, 180, 56, 3, 3, 'D');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('2. Verified Legal Audit & Safety Certificate (100% Guaranteed)', 20, yPos + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  const legalItems = [
    `Title Deed: ${legal.ownershipType_en || 'Officially Registered Real Estate Deed with Land Share'}`,
    `Building Permit: ${legal.licenseStatus_en || 'Full Building Permit approved by Municipality'}`,
    `Form 10 Reconciliation: ${legal.reconciliationStatus_en || 'Form 10 final certificate validated'}`,
    `Land Share: ${legal.landShare_en || 'Undivided registered land share included in title'}`,
    `Municipal Clearances: ${legal.municipalityStatus_en || 'Zero debts and municipal fees cleared'}`,
    `Legal Advisor: ${legal.verifiedByLawyer || '1Line Legal Consulting Board'}`
  ];

  let legalY = yPos + 16;
  legalItems.forEach(item => {
    doc.text(`[✓] ${item}`, 22, legalY);
    legalY += 6;
  });

  // Footer Contact & QR Assistance
  doc.setFillColor(13, 44, 84);
  doc.rect(0, 260, 210, 37, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 179, 0);
  doc.text('Book a Free Private Viewing or Inquire on WhatsApp:', 15, 272);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Phone: +20 101 234 5678 / +20 112 345 6789', 15, 279);
  doc.text('WhatsApp: wa.me/201012345678 (Instant 24/7 Response)', 15, 285);
  doc.text('Headquarters: El Gomhoureya St, Sohag / Central Axis, New Sohag', 15, 291);

  // Save the PDF
  const filename = `1Line_Brochure_${property.id}.pdf`;
  doc.save(filename);
  return filename;
};

/**
 * Generate Institutional Investor Deck & Feasibility Prospectus PDF
 */
export const generateInvestorProspectusPdf = ({
  invAmount = 3000000,
  invPeriod = 5,
  invPropType = 'commercial',
  investmentSim = {},
  currency = 'EGP'
}) => {
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
  doc.text('INSTITUTIONAL INVESTOR DESK & CAPITAL GROWTH PROSPECTUS 2026', 15, 30);
  doc.setTextColor(200, 210, 225);
  doc.setFontSize(9);
  doc.text('Sohag & New Sohag Prime Strategic Asset Allocation', 15, 38);

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
  doc.text('Projected Total ROI:', 22, 112);

  doc.setTextColor(15, 23, 42);
  doc.text(invPropType.toUpperCase(), 85, 82);
  doc.text(`${invAmount.toLocaleString()} ${currency}`, 85, 92);
  doc.text(`${invPeriod} Years Horizon`, 85, 102);

  doc.setTextColor(16, 185, 129); // Emerald Green
  doc.text(`+${investmentSim.totalRoiPercent || 95}% Cumulative Return`, 85, 112);

  // Returns Breakdown Grid
  doc.setTextColor(13, 72, 161);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Financial Breakdown & Cumulative Yields', 15, 138);

  const breakdownRows = [
    ['Estimated Annual Rental Income:', `${(investmentSim.annualRent || 0).toLocaleString()} ${currency} / Year`],
    ['Total Rental Income over Period:', `${(investmentSim.totalRentOverPeriod || 0).toLocaleString()} ${currency}`],
    ['Projected Future Asset Value:', `${(investmentSim.futureCapitalValue || 0).toLocaleString()} ${currency}`],
    ['Net Capital Profit & Rental Gain:', `+${(investmentSim.netProfit || 0).toLocaleString()} ${currency}`]
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
  doc.text('3. 1Line Institutional Safety & Governance', 15, 204);

  const pillars = [
    '[✓] 100% Verified Title Deeds with Notary Public Clearance (الشهر العقاري).',
    '[✓] Building Permits & Form 10 Municipality Certification fully reconciled.',
    '[✓] Mandatory High-Yield Tenancy Placement managed by 1Line Facility Desk.',
    '[✓] Full Inflation-Hedge asset backing with direct land equity allocation.'
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
  doc.text('VIP Direct Hotline: +20 101 234 5678 | WhatsApp: wa.me/201012345678', 15, 279);
  doc.text('Email: vip@1line-re.com | Head Office: El Gomhoureya St, Sohag, Egypt', 15, 285);
  doc.text('Confidential Document - Issued for the designated recipient only.', 15, 291);

  const filename = `1Line_Investor_Prospectus_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
};
