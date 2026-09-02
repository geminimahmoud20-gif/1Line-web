import { jsPDF } from 'jspdf';

/**
 * Generate an official Arabic / Bilingual Unit Reservation Contract & Deposit Agreement
 * formatted according to Egyptian real estate legal standards in Sohag & New Sohag.
 */
export const generateReservationContractPdf = (contractData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const {
    buyerName = 'العميل الفاضل / المستثمر',
    buyerPhone = '+20 101 234 5678',
    buyerNationalId = '29001012600000',
    buyerAddress = 'سوهاج - جمهورية مصر العربية',
    property = {},
    depositAmount = 50000,
    paymentMethod = 'تحويل بنكي / إنستاباي (InstaPay)',
    transactionRef = `REF-OL-${Math.floor(100000 + Math.random() * 900000)}`,
    contractDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
  } = contractData;

  const propertyTitle = property.title_ar || property.title_en || 'وحدة سكنية فاخرة';
  const propertyLocation = property.locationName_ar || property.locationName_en || 'سوهاج الجديدة';
  const propertyPrice = Number(property.price || 3500000);
  const propertySize = property.size || 165;
  const propertyDownpayment = Number(property.downPayment || (propertyPrice * 0.2));
  const propertyMonthly = Number(property.monthlyInstallment || 35000);

  // 1. Top Luxury Header Banner
  doc.setFillColor(9, 35, 71); // Navy #092347
  doc.rect(0, 0, 210, 42, 'F');

  // Gold Accent Strip
  doc.setFillColor(255, 179, 0); // Gold #ffb300
  doc.rect(0, 42, 210, 3, 'F');

  // Company Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('1LINE REAL ESTATE DEVELOPMENT', 15, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 224, 130);
  doc.text('PRELIMINARY UNIT RESERVATION & DEPOSIT AGREEMENT', 15, 26);
  doc.text('SOHAG & NEW SOHAG GOVERNORATE - EGYPT', 15, 32);

  // Document Metadata Box (Right Side)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`REFERENCE: ${transactionRef}`, 145, 18);
  doc.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, 145, 26);
  doc.text('STATUS: VERIFIED & ACTIVE', 145, 34);

  // 2. Arabic Document Title
  doc.setTextColor(9, 35, 71);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTMARAT HAJZ WAHDA AQARIA & SANAD ESTELAM MOBTADA', 105, 54, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Real Estate Unit Reservation & Deposit Agreement', 105, 60, { align: 'center' });

  // 3. Section 1: Buyer Information Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 66, 180, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 66, 180, 32, 2, 2, 'D');

  doc.setTextColor(9, 35, 71);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1. BUYER & CLIENT INFORMATION / BAYANAT AL-MOSHTARY', 20, 73);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Buyer Name: ${buyerName}`, 20, 80);
  doc.text(`National ID: ${buyerNationalId}`, 20, 86);
  doc.text(`Telephone / WhatsApp: ${buyerPhone}`, 20, 92);

  doc.text(`Address: ${buyerAddress}`, 110, 80);
  doc.text(`Payment Channel: ${paymentMethod}`, 110, 86);
  doc.text(`Contract Date: ${contractDate}`, 110, 92);

  // 4. Section 2: Property Specifications Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 103, 180, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 103, 180, 38, 2, 2, 'D');

  doc.setTextColor(9, 35, 71);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('2. PROPERTY SPECIFICATIONS & LOCATION / MWASAFAT AL-WAHDA', 20, 110);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Unit Reference Code: ${property.id ? property.id.toUpperCase() : 'OL-UNIT-2026'}`, 20, 117);
  doc.text(`Property Name: ${propertyTitle}`, 20, 123);
  doc.text(`Location / City: ${propertyLocation}`, 20, 129);
  doc.text(`Area Size: ${propertySize} Square Meters (sqm)`, 20, 135);

  doc.text(`Bedrooms: ${property.bedrooms || 3} Rooms`, 110, 117);
  doc.text(`Bathrooms: ${property.bathrooms || 2} Bathrooms`, 110, 123);
  doc.text(`Building Status: Licensed & Registered`, 110, 129);
  doc.text(`Handover Timeline: 2026 - Ready / Semi-Finished`, 110, 135);

  // 5. Section 3: Financial Schedule & Deposit Breakdown
  doc.setFillColor(238, 242, 255); // Indigo Tint
  doc.roundedRect(15, 146, 180, 44, 2, 2, 'F');
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(15, 146, 180, 44, 2, 2, 'D');

  doc.setTextColor(13, 72, 161);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('3. FINANCIAL SCHEDULE & DEPOSIT RECEIPT / GADWAL AL-SADAD', 20, 153);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  // Financial Items
  doc.text('Total Agreed Price:', 20, 161);
  doc.setFont('helvetica', 'bold');
  doc.text(`${propertyPrice.toLocaleString()} EGP`, 75, 161);

  doc.setFont('helvetica', 'normal');
  doc.text('Reservation Deposit Paid:', 20, 168);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`${depositAmount.toLocaleString()} EGP (CONFIRMED)`, 75, 168);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text('Remaining Downpayment:', 20, 175);
  doc.setFont('helvetica', 'bold');
  doc.text(`${Math.max(0, propertyDownpayment - depositAmount).toLocaleString()} EGP`, 75, 175);

  doc.setFont('helvetica', 'normal');
  doc.text('Estimated Monthly Installment:', 20, 182);
  doc.setFont('helvetica', 'bold');
  doc.text(`${propertyMonthly.toLocaleString()} EGP / Month`, 75, 182);

  // Right Side Financial Verification Stamp Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(125, 158, 62, 26, 2, 2, 'F');
  doc.setDrawColor(255, 179, 0);
  doc.roundedRect(125, 158, 62, 26, 2, 2, 'D');

  doc.setTextColor(217, 119, 6);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL VERIFIED DEPOSIT', 130, 165);
  doc.setFontSize(11);
  doc.text(`${depositAmount.toLocaleString()} EGP`, 130, 172);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Receipt: ${transactionRef}`, 130, 178);

  // 6. Section 4: Legal Terms & Buyer Protection
  doc.setTextColor(9, 35, 71);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('4. LEGAL CONDITIONS & CLIENT RIGHTS / SHOROT WA AHKAAM', 15, 198);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('1. This preliminary reservation holds the specified unit for (15) calendar days to complete final contract signing.', 15, 204);
  doc.text('2. 1Line guarantees legal title deed audit, building license validity, and zero municipal encumbrances.', 15, 209);
  doc.text('3. The reservation deposit is officially credited toward the unit downpayment upon final contract execution.', 15, 214);
  doc.text('4. All transactions are backed by Dr. Mahmoud Elbaz legal advisory and registered brokerage charter in Sohag.', 15, 219);

  // 7. Signatures & Official Endorsement Section
  doc.setDrawColor(203, 213, 225);
  doc.line(15, 226, 195, 226);

  // First Party (1Line)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 35, 71);
  doc.text('FIRST PARTY: 1LINE REAL ESTATE', 20, 233);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Chairman & Founder: Dr. Mahmoud Elbaz', 20, 239);
  doc.text('Official Seal: [ VERIFIED DIGITAL SEAL ]', 20, 245);
  doc.text('Signature: __________________________', 20, 255);

  // Second Party (Buyer)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 35, 71);
  doc.text('SECOND PARTY: BUYER & APPLICANT', 120, 233);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Applicant Name: ${buyerName}`, 120, 239);
  doc.text(`National ID: ${buyerNationalId}`, 120, 245);
  doc.text('Signature: __________________________', 120, 255);

  // 8. Footer Legal Bar
  doc.setFillColor(9, 35, 71);
  doc.rect(0, 280, 210, 17, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('1Line Real Estate Development & Brokerage - Sohag & New Sohag, Egypt', 15, 287);
  doc.text('Hotline: +20 101 234 5678  |  Website: www.oneline-egypt.com  |  CR: 489201', 15, 292);

  // Save the PDF file
  const filename = `1Line_Contract_${transactionRef}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
};
