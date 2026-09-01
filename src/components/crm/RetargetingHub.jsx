import { useState, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Users, 
  DollarSign, 
  TrendingDown, 
  Flame, 
  Clock, 
  MessageSquare, 
  Copy, 
  Check, 
  CheckCircle2, 
  Building, 
  Filter, 
  RefreshCw,
  Award,
  Zap
} from 'lucide-react';

export default function RetargetingHub({
  leads = [],
  properties = [],
  onUpdateLead,
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';

  // Active Audience Segment Tab
  // 'vip_cash' | 'installment' | 'investors' | 'dormant' | 'price_drop'
  const [activeSegment, setActiveSegment] = useState('vip_cash');
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
  const [copiedId, setCopiedId] = useState(null);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || properties[0] || {};
  const propTitle = isAr ? selectedProperty.title_ar : selectedProperty.title_en;
  const propLocation = isAr ? selectedProperty.locationName_ar : selectedProperty.locationName_en;
  const propPrice = selectedProperty.price ? selectedProperty.price.toLocaleString() + ' ج.م' : 'سعر مميز';
  const propDownPayment = selectedProperty.downPayment ? selectedProperty.downPayment.toLocaleString() + ' ج.م' : 'مقدم ميسر';
  const propInstallment = selectedProperty.monthlyInstallment ? selectedProperty.monthlyInstallment.toLocaleString() + ' ج.م' : 'أقساط مرنة';

  // Dynamic Segmentation Engine
  const segmentedLeads = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return {
      vip_cash: leads.filter(l => {
        const budget = parseInt(l.details?.budget) || parseInt(l.details?.expectedPrice) || 0;
        return (budget >= 3500000 || l.score >= 90) && l.status !== 'closed';
      }),
      installment: leads.filter(l => {
        const budget = parseInt(l.details?.budget) || parseInt(l.details?.expectedPrice) || 0;
        return (budget > 0 && budget < 3500000) && l.status !== 'closed';
      }),
      investors: leads.filter(l => {
        return (l.type === 'investor' || l.type === 'broker' || (l.notes && l.notes.includes('استثمار'))) && l.status !== 'closed';
      }),
      dormant: leads.filter(l => {
        if (l.status === 'closed') return false;
        const leadTime = l.timestamp ? new Date(l.timestamp).getTime() : 0;
        return (now - leadTime) > thirtyDaysMs || l.status === 'contacted';
      }),
      price_drop: leads.filter(l => {
        // Leads looking in the same area as selected property
        const leadArea = (l.details?.area || '').toLowerCase();
        const propArea = (selectedProperty.areaKey || '').toLowerCase();
        return (leadArea === propArea || leadArea === 'all') && l.status !== 'closed';
      })
    };
  }, [leads, selectedProperty]);

  const currentList = segmentedLeads[activeSegment] || [];

  // Total purchasing power of current segment
  const segmentTotalVolume = currentList.reduce((acc, curr) => {
    const budget = parseInt(curr.details?.budget) || parseInt(curr.details?.expectedPrice) || 2500000;
    return acc + budget;
  }, 0);

  // Generate Personalized WhatsApp Copy per Segment
  const getWhatsAppMessage = (lead) => {
    const name = lead.name || (isAr ? 'العميل الموقر' : 'Valued Client');
    const area = lead.details?.area || (isAr ? 'سوهاج' : 'Sohag');

    if (activeSegment === 'vip_cash') {
      return isAr
        ? `💎 *فرصة حصرية لكبار العملاء — شركة ون لاين العقارية*\n\n` +
          `أهلاً أستاذ *${name}*،\n` +
          `تواصلت معك تحديداً لأننا تعاقدنا للتو على *وحدة نادرة ومسجلة شهر عقاري* تلائم تطلعاتكم السكنية والاستثمارية:\n\n` +
          `🏢 *${propTitle}*\n` +
          `📍 *الموقع المميز:* ${propLocation}\n` +
          `📐 *المساحة:* ${selectedProperty.size || 160} م² بتشطيب الترا لوكس\n` +
          `💰 *السعر الإجمالي:* ${propPrice}\n\n` +
          `📸 يمكنك معاينة الوحدة والاطلاع على الموقف القانوني اليوم قبل طرحها للإعلان العام.\n` +
          `📲 هل نحدد موعداً للمعاينة الخاصة غداً؟`
        : `💎 *Exclusive VIP Opportunity — One Line Real Estate*\n\n` +
          `Dear Mr/Ms *${name}*,\n` +
          `We have secured an exclusive prime property matching your profile:\n\n` +
          `🏢 *${propTitle}*\n` +
          `📍 *Location:* ${propLocation}\n` +
          `💰 *Price:* ${propPrice}\n\n` +
          `Would you like to arrange a private viewing?`;
    }

    if (activeSegment === 'installment') {
      return isAr
        ? `🏡 *تسهيلات كبرى في السداد — شقتك بمقدم ميسر بسوهاج*\n\n` +
          `مساء الخير أ. *${name}*،\n` +
          `بناءً على طلبكم لشقة بتسهيلات في ${area}، تم فتح الحجز في مرحلة جديدة بأنظمة سداد مريحة:\n\n` +
          `🏢 *${propTitle}*\n` +
          `📍 *الموقع:* ${propLocation}\n` +
          `💳 *المقدم:* ${propDownPayment} فقط\n` +
          `💵 *القسط الشهري:* ${propInstallment} على أطول فترة سداد\n` +
          `📑 *خالصة التراخيص والمرافق*\n\n` +
          `📲 للحجز والاستفسار عن جدول الأقساط، تواصل معنا فوراً.`
        : `🏡 *Flexible Payment Plan Available — One Line Real Estate*\n\n` +
          `Hello ${name},\n` +
          `A new phase is now open with flexible installments for *${propTitle}* in ${propLocation}.\n` +
          `Down Payment: ${propDownPayment} | Monthly: ${propInstallment}.\n` +
          `Contact us to schedule a site visit!`;
    }

    if (activeSegment === 'investors') {
      return isAr
        ? `📈 *دراسة جدوى استثمارية بعائد إيجاري مرتفع — ONE LINE INVEST*\n\n` +
          `أهلاً أستاذ *${name}*،\n` +
          `فرصة استثمارية واعدة بسوهاج تحقق عائداً سنوياً يفوق 14% ونمواً رأسمالياً سريعاً:\n\n` +
          `🏢 *الأصل العقاري:* ${propTitle}\n` +
          `📍 *الموقع التجاري والحيوي:* ${propLocation}\n` +
          `💵 *السعر الإجمالي:* ${propPrice} (مع تسهيلات سداد)\n` +
          `⚖️ *الموقف القانوني:* مفحوص ومعتمد 100% بدون أي نزاعات\n\n` +
          `📊 لطلب ملف التدفقات النقدية وجدول الأرباح المتوقعة، رد على هذه الرسالة وسنرسل لك التقرير فوراً.`
        : `📈 *High-Yield Investment Opportunity — One Line Real Estate*\n\n` +
          `Dear ${name},\n` +
          `An exceptional investment asset with 14%+ ROI is now available: *${propTitle}*.\n` +
          `Reply to receive the detailed financial prospectus.`;
    }

    if (activeSegment === 'price_drop') {
      return isAr
        ? `⚡ *تحديث عاجل: تخفيض سعر العقار لسرعة البيع!*\n\n` +
          `مساء الخير أ. *${name}*،\n` +
          `بخصوص العقار *${propTitle}* في *${propLocation}* الذي استفسرت عنه سابقاً:\n\n` +
          `🔥 وافق المالك اليوم على *تخفيض السعر بنسبة استثنائية* لسرعة إتمام البيع هذا الأسبوع!\n` +
          `💰 *السعر الحالي الجديد:* ${propPrice}\n` +
          `📑 *جاهز للاستلام الفوري وعقد مسجل*\n\n` +
          `⏳ العرض ساري لأسبقية الحجز. هل نحدد موعداً لمعاينته اليوم؟`
        : `⚡ *Urgent Price Reduction Alert!*\n\n` +
          `Dear ${name},\n` +
          `The owner has reduced the price for *${propTitle}* to ${propPrice}.\n` +
          `Available for immediate handover. Reply to book a viewing today!`;
    }

    // Default: Dormant Lead Re-warming
    return isAr
      ? `🌸 *تقرير عقارات سوهاج 2026 الحصري — شركة ون لاين*\n\n` +
        `أهلاً بك أ. *${name}*، نتمنى أن تكون بأفضل حال 🌸\n\n` +
        `أصدرت إدارتنا الاستشارية *دليل أسعار وتوقعات العقارات بسوهاج لعام 2026* (شرق النيل، سوهاج الجديدة، والكوثر)، لمساعدتك في اتخاذ قرار الشراء الأنسب قبل الزيادات السعرية.\n\n` +
        `💬 إذا كنت ما زلت تبحث عن شقة أو عقار، أخبرنا بمواصفاتك وسنرشح لك أفضل 3 خيارات متاحة كاش وتقسيط فوراً!`
      : `🌸 *Sohag Real Estate Market Outlook 2026 — One Line*\n\n` +
        `Hello ${name},\n` +
        `We have released our updated 2026 property market report. If you are still seeking a property in Sohag, let us know your requirements!`;
  };

  const handleLaunchWhatsApp = (lead) => {
    const text = getWhatsAppMessage(lead);
    const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
      
      // Update Lead Activity Log
      if (onUpdateLead) {
        const newLog = {
          timestamp: new Date().toISOString(),
          action: `إرسال حملة إعادة استهداف (${activeSegment}) عبر واتساب`
        };
        onUpdateLead(lead.id, {
          activityLogs: [newLog, ...(lead.activityLogs || [])],
          lastRetargeted: new Date().toISOString()
        });
      }

      if (triggerToast) {
        triggerToast(isAr ? `تم فتح واتساب وتجهيز الحملة لـ (${lead.name})` : `Campaign opened for ${lead.name}`, 'success');
      }
    }
  };

  const handleCopyText = (lead) => {
    const text = getWhatsAppMessage(lead);
    navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    if (triggerToast) triggerToast(isAr ? 'تم نسخ نص الرسالة المخصصة!' : 'Message copied!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="retargeting-hub-card animate-fadeIn">
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Zap size={22} className="text-gold" />
            {isAr ? 'مركز حملات إعادة الاستهداف والذكاء التسويقي (Smart Retargeting Engine)' : 'Smart Lead Retargeting & Nurturing Engine'}
          </h3>
          <p className="section-subtitle" style={{ margin: '4px 0 0' }}>
            {isAr ? 'تقسيم العملاء حسب القوة الشرائية وتنشيطهم بحملات WhatsApp ديناميكية بنقرة واحدة' : 'Segment leads by purchasing power & trigger 1-click personalized WhatsApp campaigns'}
          </p>
        </div>

        {/* Target Property Switcher for Campaigns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            🏢 {isAr ? 'العقار المروج له:' : 'Promoted Property:'}
          </span>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="form-input"
            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {isAr ? p.title_ar : p.title_en} ({p.price?.toLocaleString()} ج.م)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Segment Selector Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <button
          type="button"
          className={`btn ${activeSegment === 'vip_cash' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSegment('vip_cash')}
          style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ fontSize: '1rem' }}>💎</span>
          <strong>{isAr ? 'عملاء VIP كاش' : 'VIP Cash'}</strong>
          <small style={{ opacity: 0.8 }}>({segmentedLeads.vip_cash.length} {isAr ? 'عميل' : 'leads'})</small>
        </button>

        <button
          type="button"
          className={`btn ${activeSegment === 'installment' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSegment('installment')}
          style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ fontSize: '1rem' }}>🏦</span>
          <strong>{isAr ? 'باحثو الأقساط' : 'Installments'}</strong>
          <small style={{ opacity: 0.8 }}>({segmentedLeads.installment.length} {isAr ? 'عميل' : 'leads'})</small>
        </button>

        <button
          type="button"
          className={`btn ${activeSegment === 'investors' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSegment('investors')}
          style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ fontSize: '1rem' }}>📈</span>
          <strong>{isAr ? 'المستثمرون (ROI)' : 'Investors'}</strong>
          <small style={{ opacity: 0.8 }}>({segmentedLeads.investors.length} {isAr ? 'عميل' : 'leads'})</small>
        </button>

        <button
          type="button"
          className={`btn ${activeSegment === 'price_drop' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSegment('price_drop')}
          style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ fontSize: '1rem' }}>⚡</span>
          <strong>{isAr ? 'تخفيض الأسعار' : 'Price Drops'}</strong>
          <small style={{ opacity: 0.8 }}>({segmentedLeads.price_drop.length} {isAr ? 'مهتم' : 'leads'})</small>
        </button>

        <button
          type="button"
          className={`btn ${activeSegment === 'dormant' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSegment('dormant')}
          style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ fontSize: '1rem' }}>❄️</span>
          <strong>{isAr ? 'عملاء باردون خاملون' : 'Dormant (>30d)'}</strong>
          <small style={{ opacity: 0.8 }}>({segmentedLeads.dormant.length} {isAr ? 'عميل' : 'leads'})</small>
        </button>
      </div>

      {/* Segment Metrics Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              {isAr ? 'حجم القوة الشرائية في الشريحة:' : 'Total Segment Purchasing Power:'}
            </span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--emerald)' }}>
              {(segmentTotalVolume / 1000000).toFixed(1)} {isAr ? 'مليون جنيه مصري' : 'M EGP'}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              {isAr ? 'العملاء المؤهلون للحملة:' : 'Eligible Audience:'}
            </span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
              {currentList.length} {isAr ? 'عميل مسجل' : 'Leads'}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)', fontSize: '0.8rem' }}>
            ✓ {isAr ? 'تم توليد قوالب واتساب المخصصة آلياً' : 'Automated WhatsApp copy active'}
          </span>
        </div>
      </div>

      {/* Leads Audience Table with 1-Click WhatsApp Dispatch */}
      <div className="admin-table-wrapper">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>{isAr ? 'اسم العميل' : 'Client'}</th>
              <th>{isAr ? 'الهاتف' : 'Phone'}</th>
              <th>{isAr ? 'الميزانية والمنطقة' : 'Budget & Area'}</th>
              <th>{isAr ? 'آخر نشاط' : 'Last Activity'}</th>
              <th>{isAr ? 'معاينة الرسالة وإرسال الحملة' : 'Preview & WhatsApp Action'}</th>
            </tr>
          </thead>
          <tbody>
            {currentList.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <Users size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p>{isAr ? 'لا يوجد عملاء يطابقون هذه الشريحة حالياً' : 'No leads found in this segment'}</p>
                </td>
              </tr>
            ) : (
              currentList.map((lead) => {
                const sampleMsg = getWhatsAppMessage(lead);

                return (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.name}</strong>
                      <span className={`lead-score-pill ${lead.score >= 85 ? 'score-high' : 'score-medium'}`} style={{ marginInlineStart: '6px', fontSize: '0.65rem' }}>
                        {lead.score || 85}%
                      </span>
                    </td>
                    <td style={{ direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}>
                      {lead.phone}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--emerald)', fontWeight: 'bold', display: 'block' }}>
                        💰 {lead.details?.budget ? parseInt(lead.details.budget).toLocaleString() + ' ج.م' : 'مرنة'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        📍 {lead.details?.area || 'سوهاج'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {lead.lastRetargeted 
                        ? (isAr ? `أرسلت حملة في ${new Date(lead.lastRetargeted).toLocaleDateString('ar-EG')}` : `Retargeted on ${new Date(lead.lastRetargeted).toLocaleDateString()}`)
                        : (isAr ? 'لم يُرسل له سابقاً' : 'Not retargeted yet')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* 1-Click WhatsApp Launch */}
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleLaunchWhatsApp(lead)}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          <Send size={13} />
                          <span>{isAr ? 'إرسال واتساب فوري' : 'Launch WhatsApp'}</span>
                        </button>

                        {/* Copy Script */}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => handleCopyText(lead)}
                          style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                          title={isAr ? 'نسخ نص الرسالة' : 'Copy Message'}
                        >
                          {copiedId === lead.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
