import { LEAD_TYPE_NAMES, PROPERTY_TYPE_NAMES, STAGE_CONFIG, getAreaDisplayName } from '../../pages/ClientAccountPageData';
import { Link } from 'react-router-dom';
import { Building, Sparkles, FileText, MapPin, ExternalLink, MessageSquare, Calendar, Clock, Car, Tag } from 'lucide-react';

export default function AccountInquiriesTab({
  clientDemands,
  clientLeads,
  clientSiteVisits,
  handleInquiryWhatsApp,
  handleSiteVisitWhatsApp,
  isAr,
  lang,
  properties
}) {
  return (
    <div className="account-tab-content inquiries-tab-view">
      {/* Section 1: Scheduled Site Visits */}
      <div className="inquiries-section">
        <div className="section-head">
          <div className="section-title-wrap">
            <Car size={20} className="text-gold" />
            <div>
              <h3>{isAr ? 'المعاينات الميدانية المجدولة (VIP Site Visits)' : 'Scheduled VIP Site Visits'}</h3>
              <p>{isAr ? 'جولات المعاينة الميدانية المنظمة مع مستشارك العقاري وسيارات النقل المخصصة' : 'Your on-site property tours with 1Line advisors and private transport'}</p>
            </div>
          </div>
          <span className="section-count-badge">{clientSiteVisits.length}</span>
        </div>

        {clientSiteVisits.length > 0 ? (
          <div className="site-visits-cards-grid">
            {clientSiteVisits.map((lead) => {
              const visit = lead.siteVisit || {};
              const targetProp = properties.find(p => p.id === (visit.propertyId || lead.targetPropertyId));
              return (
                <div key={lead.id} className="client-visit-card">
                  <div className="visit-card-header">
                    <span className="visit-status-badge">
                      <Clock size={13} />
                      <span>{isAr ? 'معاينة مجدولة ومؤكدة' : 'Confirmed Visit'}</span>
                    </span>
                    <span className="visit-code">#{lead.id}</span>
                  </div>

                  <div className="visit-card-body">
                    {targetProp && (
                      <div className="visit-prop-preview">
                        <Building size={16} className="text-gold" />
                        <Link to={`/properties/${targetProp.id}`} className="visit-prop-title">
                          {isAr ? targetProp.title_ar : targetProp.title_en}
                        </Link>
                      </div>
                    )}

                    <div className="visit-details-row">
                      <div className="visit-detail-item">
                        <Calendar size={14} className="text-emerald" />
                        <span>{visit.date || (isAr ? 'قيد التحديد' : 'TBD')}</span>
                      </div>
                      {visit.time && (
                        <div className="visit-detail-item">
                          <Clock size={14} className="text-emerald" />
                          <span>{visit.time}</span>
                        </div>
                      )}
                      <div className="visit-detail-item">
                        <MapPin size={14} className="text-muted" />
                        <span>{getAreaDisplayName(lead.area || targetProp?.area || 'new_sohag', lang)}</span>
                      </div>
                    </div>

                    {visit.notes && (
                      <div className="visit-notes-box">
                        <p>💡 {visit.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="visit-card-footer">
                    <button
                      type="button"
                      className="btn-visit-whatsapp"
                      onClick={() => handleSiteVisitWhatsApp(lead)}
                    >
                      <MessageSquare size={14} />
                      <span>{isAr ? 'تأكيد الموعد عبر واتساب' : 'Confirm via WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-sub-section">
            <p>
              {isAr 
                ? 'ليس لديك معاينات ميدانية مجدولة حالياً. يمكنك طلب معاينة مجانية لأي عقار من بطاقته أو بالتواصل المباشر مع مستشارك.' 
                : 'No scheduled site visits yet. You can request a free on-site tour from any property card.'}
            </p>
            <Link to="/properties" className="btn-book-visit-cta">
              <Car size={15} />
              <span>{isAr ? 'استعراض العقارات وحجز معاينة مجانية' : 'Browse & Book Free Tour'}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Section 2: General Inquiries & Consultations */}
      <div className="inquiries-section">
        <div className="section-head">
          <div className="section-title-wrap">
            <FileText size={20} className="text-gold" />
            <div>
              <h3>{isAr ? 'استشاراتي وطلباتي العقارية المسجلة' : 'My Inquiries & Consultations'}</h3>
              <p>{isAr ? 'تتبع مسار طلبك ومرحلته في خط سير مستشاري 1Line بسوهاج' : 'Live tracking of your inquiries within 1Line CRM pipeline'}</p>
            </div>
          </div>
          <span className="section-count-badge">{clientLeads.length}</span>
        </div>

        {clientLeads.length > 0 ? (
          <div className="client-inquiries-table-wrap">
            <div className="client-inquiries-grid">
              {clientLeads.map((lead) => {
                const stage = STAGE_CONFIG[lead.status] || STAGE_CONFIG.new;
                const typeLabel = LEAD_TYPE_NAMES[lead.type] || lead.type || (isAr ? 'استشارة' : 'Inquiry');
                const areaName = getAreaDisplayName(lead.area || 'new_sohag', lang);
                const propTypeLabel = PROPERTY_TYPE_NAMES[lead.propertyType] || lead.propertyType || '';

                return (
                  <div key={lead.id} className="client-lead-card">
                    <div className="lead-card-top">
                      <div className="lead-type-tag">
                        <Sparkles size={13} className="text-gold" />
                        <span>{typeLabel}</span>
                      </div>
                      <span 
                        className="lead-stage-pill"
                        style={{ color: stage.color, background: stage.bg }}
                      >
                        {isAr ? stage.ar : stage.en}
                      </span>
                    </div>

                    <div className="lead-card-body">
                      <div className="lead-info-row">
                        <span className="lead-info-label">{isAr ? 'المنطقة:' : 'Area:'}</span>
                        <span className="lead-info-val"><MapPin size={12} /> {areaName}</span>
                      </div>

                      {propTypeLabel && (
                        <div className="lead-info-row">
                          <span className="lead-info-label">{isAr ? 'نوع العقار:' : 'Type:'}</span>
                          <span className="lead-info-val"><Building size={12} /> {propTypeLabel}</span>
                        </div>
                      )}

                      {lead.budget && (
                        <div className="lead-info-row">
                          <span className="lead-info-label">{isAr ? 'الميزانية المستهدفة:' : 'Budget:'}</span>
                          <span className="lead-info-val text-gold">{lead.budget} {isAr ? 'ج.م' : 'EGP'}</span>
                        </div>
                      )}

                      <div className="lead-info-row">
                        <span className="lead-info-label">{isAr ? 'تاريخ التسجيل:' : 'Date:'}</span>
                        <span className="lead-info-val text-muted">
                          {lead.createdAt || lead.timestamp 
                            ? new Date(lead.createdAt || lead.timestamp).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US') 
                            : (isAr ? 'مؤخراً' : 'Recent')}
                        </span>
                      </div>

                      {lead.notes && (
                        <div className="lead-notes-snippet">
                          <p>{lead.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="lead-card-footer">
                      <button
                        type="button"
                        className="btn-lead-action btn-wa"
                        onClick={() => handleInquiryWhatsApp(lead)}
                      >
                        <MessageSquare size={13} />
                        <span>{isAr ? 'متابعة مع المستشار' : 'Follow up on WhatsApp'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-sub-section">
            <p>
              {isAr 
                ? 'لا توجد طلبات استشارة مسجلة برقم هاتفك بعد. يمكنك تقديم طلب عقار خاص أو حجز استشارة مجانية مع مستشارينا.' 
                : 'No recorded inquiries found for your phone number yet.'}
            </p>
            <Link to="/special-requests" className="btn-book-visit-cta">
              <Sparkles size={15} />
              <span>{isAr ? 'تقديم طلب عقار خاص VIP' : 'Submit Bespoke Request'}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Section 3: Submitted Demands */}
      <div className="inquiries-section">
        <div className="section-head">
          <div className="section-title-wrap">
            <Tag size={20} className="text-gold" />
            <div>
              <h3>{isAr ? 'طلبات الشراء المعلنة بسوق العقارات (Demands)' : 'My Published Demands'}</h3>
              <p>{isAr ? 'طلباتك المعروضة على شبكة وسطاء وملاك سوهاج لاستقبال العروض المباشرة' : 'Your demands posted to the public brokers network'}</p>
            </div>
          </div>
          <span className="section-count-badge">{clientDemands.length}</span>
        </div>

        {clientDemands.length > 0 ? (
          <div className="client-demands-grid">
            {clientDemands.map((demand) => (
              <div key={demand.id} className="client-demand-card">
                <div className="demand-card-header">
                  <h4>{isAr ? demand.text_ar || demand.title_ar || demand.title : demand.text_en || demand.title_en || demand.text_ar || demand.title}</h4>
                  <span className={`demand-status-badge ${demand.status === 'published' ? 'published' : 'pending'}`}>
                    {demand.status === 'published' 
                      ? (isAr ? 'معتمد ومنشور ✅' : 'Published') 
                      : (isAr ? 'قيد المراجعة الإدارية ⏳' : 'Pending Review')}
                  </span>
                </div>

                <div className="demand-card-details">
                  <div className="demand-detail-item">
                    <MapPin size={13} className="text-muted" />
                    <span>{getAreaDisplayName(demand.area, lang)}</span>
                  </div>
                  {(demand.budgetMax || demand.budget) && (
                    <div className="demand-detail-item">
                      <span className="text-gold font-bold">{Number(demand.budgetMax || demand.budget).toLocaleString('en-US')} {isAr ? 'ج.م كحد أقصى' : 'EGP max'}</span>
                    </div>
                  )}
                </div>

                <div className="demand-card-footer">
                  <Link to="/demands" className="btn-view-demand">
                    <ExternalLink size={13} />
                    <span>{isAr ? 'عرض في لوحة طلبات السوق' : 'View in Demands Board'}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-sub-section">
            <p>
              {isAr 
                ? 'هل تبحث عن مواصفات عقارية معينة ولا تجدها؟ انشر طلبك في بورصة طلبات سوهاج وسيقوم الوسطاء المعتمدون بعرض وحداتهم عليك.' 
                : 'Looking for a specific property? Publish your demand on the Sohag real estate exchange board.'}
            </p>
            <Link to="/demands" className="btn-book-visit-cta">
              <Tag size={15} />
              <span>{isAr ? 'نشر طلب شراء جديد' : 'Publish Buyer Demand'}</span>
            </Link>
          </div>
        )}
      </div>
    </div>

  );
}
