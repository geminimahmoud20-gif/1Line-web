import { useState, useRef } from 'react';
import useTeamMembers from '../../../hooks/useTeamMembers';
import { assigneeValue, assignmentUpdates } from '../../../utils/assignees';
import { isValidPhoneNumber } from '../../../utils/securityShield';
import { phoneProblem } from '../../../utils/contactValidation';
import CustomerOverviewTab from '../lead-profile/CustomerOverviewTab';
import '../client-profile.css';

const AVAILABLE_TAGS = [
  { id: 'vip', name_ar: 'VIP كاش', name_en: 'VIP Cash' },
  { id: 'expat', name_ar: 'مغترب بالخليج', name_en: 'Gulf Expat' },
  { id: 'investor', name_ar: 'مستثمر تجاري', name_en: 'Commercial Investor' },
  { id: 'urgent', name_ar: 'مستعجل للشراء', name_en: 'Urgent Buyer' },
  { id: 'installment', name_ar: 'يفضل التقسيط', name_en: 'Installments Preferred' },
  { id: 'negotiator', name_ar: 'مفاوض جاد', name_en: 'Serious Negotiator' }
];

/**
 * «التفاصيل»: the client's own data (phones, city, budget, area, temperature, owner, tags) as one form, view first,
 * edit on demand. It used to live in a separate full-profile window; the drawer is the only client screen now.
 */
export default function ClientDetails({ lead, onUpdateLead, isAr, lang, triggerToast, userRole }) {
  const [isEditing, setIsEditing] = useState(false);
  const isSubmittingRef = useRef(false);
  const teamMembers = useTeamMembers(lead ? [lead] : []);
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    whatsapp: lead?.whatsapp || lead?.phone || '',
    altPhone: lead?.altPhone || '',
    cityOrExpat: (!lead?.cityOrExpat || lead?.cityOrExpat === 'undefined') ? 'سوهاج' : lead.cityOrExpat,
    type: lead?.type || 'buyer',
    status: lead?.status || 'new',
    temperature: lead?.temperature || '',
    assignedTo: assigneeValue(lead || {}),
    budget: lead?.details?.budget || lead?.details?.expectedPrice || '',
    // No saved area stays empty (it used to become 'east', saved back on the next edit)
    area: (!lead?.details?.area || lead?.details?.area === 'undefined') ? (lead?.area || '') : lead.details.area,
    propertyType: (!lead?.details?.propertyType || lead?.details?.propertyType === 'undefined') ? 'apartment' : lead.details.propertyType,
    financing: lead?.financing || 'cash',
    tags: Array.isArray(lead?.tags) ? lead.tags : [],
    nextActionDate: lead?.nextActionDate || '',
    nextActionNote: lead?.nextActionNote || lead?.followUp || ''
  });

  const handleToggleTag = (tagText) => {
    const current = formData.tags || [];
    setFormData({ ...formData, tags: current.includes(tagText) ? current.filter((t) => t !== tagText) : [...current, tagText] });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    const toast = (m, t = 'error') => triggerToast?.(m, t);
    const name = (formData.name || '').trim();
    const whatsapp = (formData.whatsapp || formData.phone || '').trim();
    if (!name) return toast(isAr ? 'اسم العميل إلزامي!' : 'Name is required!');
    if (!whatsapp) return toast(isAr ? 'رقم الواتساب إلزامي!' : 'WhatsApp number is required!');
    if (formData.phone && !isValidPhoneNumber(formData.phone)) return toast(`${isAr ? 'الرقم الأساسي' : 'Primary phone'}: ${phoneProblem(formData.phone, null, isAr)}`);
    if (!isValidPhoneNumber(whatsapp)) return toast(`${isAr ? 'الواتساب' : 'WhatsApp'}: ${phoneProblem(whatsapp, null, isAr)}`);
    if (!formData.area) return toast(isAr ? 'حدد المنطقة!' : 'Area is required!');
    if (!formData.propertyType) return toast(isAr ? 'حدد نوع العقار!' : 'Property type is required!');
    try {
      isSubmittingRef.current = true;
      const updated = {
        name,
        phone: (formData.phone || '').trim() || whatsapp,
        whatsapp,
        altPhone: formData.altPhone,
        cityOrExpat: formData.cityOrExpat,
        type: formData.type,
        status: formData.status,
        temperature: formData.temperature,
        // Only a changed owner is written, so saving other fields never reassigns the client
        ...(formData.assignedTo !== assigneeValue(lead) ? assignmentUpdates(lead, formData.assignedTo, teamMembers) : {}),
        financing: formData.financing,
        tags: formData.tags,
        nextActionDate: formData.nextActionDate,
        nextActionNote: formData.nextActionNote,
        followUp: formData.nextActionNote,
        // The clients table, filters and reports read the top-level area / budget / property type first, so an edit
        // is written there too, not only inside details (it used to leave the old area showing in the table)
        area: formData.area,
        budget: formData.budget,
        propertyType: formData.propertyType,
        details: { ...(lead.details || {}), budget: formData.budget, expectedPrice: formData.budget, area: formData.area, propertyType: formData.propertyType }
      };
      const saved = onUpdateLead ? await onUpdateLead(lead.id, updated, lead.version) : true;
      if (saved === false) return;
      setIsEditing(false);
      toast(isAr ? 'اتحفظت بيانات العميل' : 'Client details saved', 'success');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <CustomerOverviewTab
      AVAILABLE_TAGS={AVAILABLE_TAGS}
      formData={formData}
      handleSaveProfile={handleSaveProfile}
      handleToggleTag={handleToggleTag}
      isAr={isAr}
      isEditing={isEditing}
      lang={lang}
      lead={lead}
      setFormData={setFormData}
      setIsEditing={setIsEditing}
      userRole={userRole}
      people={teamMembers}
    />
  );
}
