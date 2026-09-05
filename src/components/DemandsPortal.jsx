import React, { useMemo } from 'react';
import { 
  Zap, 
  Search, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  DollarSign 
} from 'lucide-react';
import { getAreas } from '../utils/areasData';

export const DemandsPortal = ({
  lang,
  t,
  demands = [],
  ownerSearch,
  setOwnerSearch,
  isScanningMap,
  setIsScanningMap,
  ownerMatchesFound,
  setOwnerMatchesFound,
  scanningMessage,
  setScanningMessage,
  navigateTo,
  setSellerAnswers,
  triggerToast,
  handleAddNewLead,
  onOpenAddDemand
}) => {
  const publishedDemands = useMemo(() => {
    const publishedDemands = demands.filter(d => (d.status || 'published') === 'published');
    return publishedDemands.sort((a, b) => {
      const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [demands]);

  const areas = useMemo(() => getAreas().filter(a => a.id !== 'all'), []);

  return (
    <div>
      <div className="investment-hero" style={{ background: 'linear-gradient(135deg, #092347 0%, #0d48a1 60%, #0a3880 100%)', color: 'white', padding: '36px 20px', borderRadius: 'var(--radius-lg)', marginBottom: '30px', textAlign: 'center', border: '1px solid rgba(255, 202, 40, 0.35)', boxShadow: '0 15px 35px rgba(13, 72, 161, 0.25)' }}>
        <Zap size={40} className="text-gold" style={{ marginBottom: '16px' }} />
        <h2>{lang === 'ar' ? 'طلبات الشراء النشطة بسوهاج' : 'Active Market Demands in Sohag'}</h2>
        <p style={{ marginTop: '10px', fontSize: '0.95rem', opacity: 0.9, maxWidth: '640px', margin: '10px auto 20px' }}>
          {lang === 'ar'
            ? 'قاعدة بيانات حية بمتطلبات المشترين والمستثمرين الفعليين لمطابقتها مع عقارك فوراً.'
            : 'A live directory of serious buyers looking for immediate property acquisitions.'}
        </p>

        {onOpenAddDemand && (
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onOpenAddDemand}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 'bold', fontSize: '0.95rem' }}
          >
            <Sparkles size={16} className="text-gold" />
            <span>{lang === 'ar' ? 'أضف طلبك العقاري الآن (مجاناً)' : 'Post Your Buyer Request Now'}</span>
          </button>
        )}
      </div>

      {/* Owner Matching Search Widget */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '15px' }}>
          <Search size={18} style={{ color: 'var(--accent-gold)' }} />
          {lang === 'ar' ? 'هل لديك عقار تريد بيعه؟ ابحث عن مشترين مطابقين له فوراً' : 'Have a Property? Search for Matching Buyers Instantly'}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem' }}>{t.stepPropType}</label>
            <select 
              className="form-input"
              value={ownerSearch.propertyType}
              onChange={(e) => setOwnerSearch({ ...ownerSearch, propertyType: e.target.value })}
            >
              <option value="apartment">{t.apartment}</option>
              <option value="villa">{t.villa}</option>
              <option value="land">{t.land}</option>
              <option value="office">{t.office}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem' }}>{t.stepArea}</label>
            <select 
              className="form-input"
              value={ownerSearch.area}
              onChange={(e) => setOwnerSearch({ ...ownerSearch, area: e.target.value })}
            >
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {lang === 'ar' ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                  </option>
                ))}
              </select>
          </div>

          <button 
            className="btn btn-primary" 
            disabled={isScanningMap}
            style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => {
              setIsScanningMap(true);
              setOwnerMatchesFound(null);
              setScanningMessage(lang === 'ar' ? 'جاري فحص إحداثيات الموقع بسوهاج...' : 'Scanning coordinates in Sohag...');
              setTimeout(() => {
                setScanningMessage(lang === 'ar' ? 'تحليل متطلبات المشترين النشطين بمخزن البيانات...' : 'Analyzing active buyer profiles...');
                setTimeout(() => {
                  const matchedCount = demands.filter(d => d.type === ownerSearch.propertyType && d.area === ownerSearch.area).length;
                  setOwnerMatchesFound(matchedCount);
                  setIsScanningMap(false);
                }, 1200);
              }, 1200);
            }}
          >
            <Sparkles size={16} />
            {lang === 'ar' ? 'ابحث عن مشترين مطابقين' : 'Search Matching Buyers'}
          </button>
        </div>

        {isScanningMap && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', background: 'rgba(10, 17, 40, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--accent-gold)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--accent-gold-light)',
              borderTopColor: 'var(--accent-gold)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
              {scanningMessage}
            </span>
          </div>
        )}

        {ownerMatchesFound !== null && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--primary-light)', border: '1px solid rgba(255, 202, 40, 0.45)', borderRadius: 'var(--radius-sm)', animation: 'fadeIn 0.5s ease' }}>
            {ownerMatchesFound > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h4 style={{ color: 'var(--brand-navy, #0d48a1)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontWeight: '800' }}>
                    <CheckCircle size={18} className="text-gold" />
                    {lang === 'ar' ? `تم العثور على ${ownerMatchesFound} مشتري مهتمين بعقارك!` : `Found ${ownerMatchesFound} interested buyers!`}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {lang === 'ar'
                      ? 'سجل مواصفات عقارك التفصيلية لنعرضها عليهم ويقوم مستشارونا بإتمام الصفقة لك.'
                      : 'Register your property to match with these active buyers and close the transaction.'}
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigateTo('valuation')}>
                  {lang === 'ar' ? 'سجل عقارك للمطابقة الآن' : 'Match My Property Now'}
                </button>
              </div>
            ) : (
              <div>
                <h4 style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <AlertCircle size={18} />
                  {lang === 'ar' ? 'لم نجد مشترين مباشرين في هذه المنطقة حالياً' : 'No direct matches in this location currently'}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {lang === 'ar'
                    ? 'يمكنك مع ذلك تسجيل طلبك لعرضه على مستشارينا وشركاء شبكة الوسطاء.'
                    : 'You can still register your request to display it to our advisors and brokers network.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demands List Grid */}
      <div className="demands-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {publishedDemands.map((dem) => {
          const urgencyColor = dem.urgency === 'high' ? 'var(--rose)' : dem.urgency === 'medium' ? 'var(--accent-gold)' : 'var(--cyan)';
          return (
            <div key={dem.id} className="demand-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: `4px solid ${urgencyColor}` }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="demand-tag" style={{ background: 'var(--primary-light)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}>
                    <Zap size={10} style={{ color: 'var(--accent-gold)', marginInlineEnd: '4px' }} />
                    {lang === 'ar' ? t[dem.type] : dem.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', color: urgencyColor, fontWeight: 'bold' }}>
                    {lang === 'ar' 
                      ? (dem.urgency === 'high' ? 'عاجل جداً' : dem.urgency === 'medium' ? 'عادي' : 'مستقبلي')
                      : dem.urgency.toUpperCase()}
                  </span>
                </div>
                <p className="demand-text" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500', marginBottom: '15px' }}>
                  {lang === 'ar' ? dem.text_ar : dem.text_en}
                </p>
              </div>

              <div>
                <div className="demand-meta" style={{ marginBottom: '15px', padding: '10px 0', borderTop: '1px dashed var(--border-light)', borderBottom: '1px dashed var(--border-light)' }}>
                  <div className="meta-item">
                    <MapPin size={12} style={{ color: 'var(--accent-gold)' }} />
                    <span>{t[dem.area]}</span>
                  </div>
                  <div className="meta-item">
                    <DollarSign size={12} style={{ color: 'var(--accent-gold)' }} />
                    <span>{parseInt(dem.budget).toLocaleString()} EGP</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-sm btn-primary btn-full"
                    onClick={() => {
                      setSellerAnswers(prev => ({
                        ...prev,
                        propertyType: dem.type,
                        area: dem.area
                      }));
                      navigateTo('valuation');
                      triggerToast(lang === 'ar' ? 'تم اختيار الطلب! أكمل مواصفات عقارك للمطابقة.' : 'Demand selected! Enter your specs.');
                    }}
                  >
                    {lang === 'ar' ? 'لدي عقار مطابق' : 'I Have Match'}
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '8px 12px' }}
                    onClick={() => {
                      const referrer = prompt(lang === 'ar' ? 'أدخل اسمك ورقم هاتفك للتوصية بالعميل ومطابقته:' : 'Enter your name & phone to refer someone:');
                      if (referrer) {
                        handleAddNewLead('referral', { name: referrer, notes: `أوصى بمالك عقار مطابق للطلب المعرف: ${dem.id}` }, 'Demand Share CTA');
                        triggerToast(lang === 'ar' ? 'شكراً لك! تم تسجيل الإحالة وسنقوم بمتابعتها.' : 'Thank you! Referral registered.');
                      }
                    }}
                  >
                    {lang === 'ar' ? 'أعرف مالكاً' : 'Refer Owner'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DemandsPortal;
