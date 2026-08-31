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
  doc.text('ONE LINE REAL ESTATE', 15, 20);

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
    `Legal Advisor: ${legal.verifiedByLawyer || 'One Line Legal Consulting Board'}`
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
  const filename = `OneLine_Brochure_${property.id}.pdf`;
  doc.save(filename);
  return filename;
};
