import { useState, useEffect } from 'react';
import { 
  Activity, 
  Eye, 
  Clock, 
  MessageSquare, 
  Calculator, 
  Flame, 
  TrendingUp, 
  Compass, 
  FileText, 
  Sparkles, 
  Smartphone, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  Users,
  MousePointerClick
} from 'lucide-react';
import { 
  getLiveAnalyticsSummary, 
  getTopViewedProperties 
} from '../../utils/visitorTracker';

export default function VisitorIntelligencePanel({
  properties = [],
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';
  const [summary, setSummary] = useState(() => getLiveAnalyticsSummary());
  const [trendingProperties, setTrendingProperties] = useState(() => getTopViewedProperties(properties));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('today'); // 'today' | 'week' | 'all'

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSummary(getLiveAnalyticsSummary());
      setTrendingProperties(getTopViewedProperties(properties));
      setIsRefreshing(false);
      if (triggerToast) {
        triggerToast(isAr ? 'تم تحديث بيانات التتبع وسلوك الزوار اللحظية! 🔄' : 'Visitor Analytics Refreshed!', 'info');
      }
    }, 400);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSummary(getLiveAnalyticsSummary());
      setTrendingProperties(getTopViewedProperties(properties));
    }, 15000); // Auto-refresh every 15s

    return () => clearInterval(timer);
  }, [properties]);

  // Translate event types to friendly labels
  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'property_view':
        return { label: isAr ? '👁️ مشاهدة عقار' : 'Property View', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' };
      case 'whatsapp_click':
        return { label: isAr ? '💬 نقرة واتساب' : 'WhatsApp Click', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'calculator_used':
        return { label: isAr ? '🧮 حاسبة التمويل' : 'Calculator Used', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'compare_added':
        return { label: isAr ? '⚖️ مقارنة عقارات' : 'Compare Added', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
      case 'brochure_download':
        return { label: isAr ? '📑 تحميل بروشور' : 'Brochure PDF', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' };
      default:
        return { label: isAr ? '⚡ تفاعل' : 'Action', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    }
  };

  return (
    <div className="visitor-intelligence-panel animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '18px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#06b6d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            <Activity size={22} className="animate-pulse" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                {isAr ? 'محرك تتبع سلوك الزوار وتحليلات الاهتمام اللحظية' : 'Visitor Intelligence & Real-Time Tracking'}
              </h2>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }}></span>
                {isAr ? 'البث اللحظي متصل 🟢' : 'LIVE TRACKING'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isAr ? 'تتبع مسار كل زائر، وقت التصفح المستهلك، ونسب المشاهدات لكل وحدة عقارية' : 'Track dwell time, clickstream, and top viewed properties.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={refreshData}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isAr ? 'تحديث لحظي' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px'
      }}>
        {/* KPI 1: Total Views */}
        <div className="crm-stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isAr ? 'إجمالي مشاهدات العقارات' : 'Total Property Views'}
            </span>
            <Eye size={18} style={{ color: '#06b6d4' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '8px 0 4px 0', color: '#06b6d4' }}>
            {summary.totalPropertyViews?.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--emerald)' }}>
            ↑ +18.4% {isAr ? 'نمو مقارنة بالأسبوع الماضي' : 'vs last week'}
          </span>
        </div>

        {/* KPI 2: Average Dwell Time */}
        <div className="crm-stat-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isAr ? 'متوسط وقت بقاء الزائر' : 'Average Dwell Time'}
            </span>
            <Clock size={18} style={{ color: 'var(--accent-gold)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '8px 0 4px 0', color: 'var(--accent-gold)' }}>
            {summary.avgDwellTimeFormatted || '3د 45ث'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            ⏱️ {isAr ? 'معدل انتباه وقراءة مرتفع' : 'High engagement rate'}
          </span>
        </div>

        {/* KPI 3: WhatsApp Conversion Clicks */}
        <div className="crm-stat-card" style={{ borderLeft: '4px solid var(--emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isAr ? 'نقرات الواتساب المباشرة' : 'WhatsApp Lead Clicks'}
            </span>
            <MessageSquare size={18} style={{ color: 'var(--emerald)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '8px 0 4px 0', color: 'var(--emerald)' }}>
            {summary.whatsappClicks} {isAr ? 'نقرة' : 'Clicks'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--emerald)' }}>
            🔥 {isAr ? 'أعلى قناة تحويل للصفقات' : 'Top converting channel'}
          </span>
        </div>

        {/* KPI 4: Financial Calculator Uses */}
        <div className="crm-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isAr ? 'تجارب حاسبة التمويل' : 'Calculator Simulations'}
            </span>
            <Calculator size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '8px 0 4px 0', color: '#f59e0b' }}>
            {summary.calculatorUses} {isAr ? 'حسبة' : 'Runs'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            📈 {isAr ? 'مشترين جادين يبحثون عن خطط دفع' : 'High-intent payment seekers'}
          </span>
        </div>
      </div>

      {/* Main Grid: Top Trending Properties vs Live Clickstream Feed */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {/* Left Column: TOP TRENDING PROPERTIES LEADERBOARD */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} style={{ color: '#f43f5e' }} />
              <span>{isAr ? 'العقارات الأكثر طلباً ومشاهدة (Top Viewed Units)' : 'Top Viewed Properties'}</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {trendingProperties.length} {isAr ? 'عقار مرصود' : 'tracked'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {trendingProperties.slice(0, 6).map((prop, idx) => (
              <div
                key={prop.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: idx === 0 ? 'var(--gradient-gold)' : 'rgba(255,255,255,0.08)',
                    color: idx === 0 ? '#000' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    #{idx + 1}
                  </span>

                  <div>
                    <strong style={{ fontSize: '0.85rem', display: 'block' }}>
                      {isAr ? prop.title_ar : prop.title_en}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      📍 {prop.areaKey || 'سوهاج'} • 💰 {prop.price?.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <span className="badge" style={{
                    background: prop.isTrending ? 'rgba(244, 63, 94, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                    color: prop.isTrending ? '#f43f5e' : '#06b6d4',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    👁️ {prop.viewCount} {isAr ? 'مشاهدة' : 'Views'}
                  </span>
                  {prop.isTrending && (
                    <small style={{ color: '#f43f5e', fontSize: '0.68rem', fontWeight: 'bold' }}>
                      🔥 {isAr ? 'رائج جداً' : 'Hot Demand'}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: LIVE CLICKSTREAM STREAM */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MousePointerClick size={18} style={{ color: 'var(--accent-gold)' }} />
              <span>{isAr ? 'شريط أحداث وتفاعل الزوار المباشر (Live Clickstream)' : 'Live Clickstream Feed'}</span>
            </h3>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.72rem' }}>
              {summary.recentEvents?.length || 0} {isAr ? 'حدث مسجل' : 'events'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {(!summary.recentEvents || summary.recentEvents.length === 0) ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>
                {isAr ? 'جاري استقبال أحداث ونقرات الزوار لحظياً...' : 'Waiting for incoming events...'}
              </p>
            ) : (
              summary.recentEvents.map((evt, idx) => {
                const badge = getEventBadge(evt.eventType);

                return (
                  <div
                    key={evt.id || idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderInlineStart: `3px solid ${badge.color}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ background: badge.bg, color: badge.color, padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {badge.label}
                        </span>
                        {evt.identifiedUser?.name && (
                          <strong style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}>
                            👤 {evt.identifiedUser.name}
                          </strong>
                        )}
                      </div>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {evt.metadata?.title || evt.metadata?.propertyId || evt.url}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(evt.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: USER ENGAGEMENT HEATMAP BREAKDOWN */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: 'var(--accent-gold)' }}>
          📊 {isAr ? 'توزيع اهتمامات ونقرات المشترين (Action Heatmap Distribution)' : 'Visitor Intent & Action Heatmap'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              💬 {isAr ? 'الاستفسار المباشر (واتساب)' : 'WhatsApp Inquiries'}
            </span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--emerald)' }}>42%</strong>
            <div style={{ height: '4px', background: 'var(--emerald)', borderRadius: '2px', marginTop: '6px', width: '42%' }}></div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              🧮 {isAr ? 'حاسبة التمويل والأقساط' : 'Calculators & ROI'}
            </span>
            <strong style={{ fontSize: '1.2rem', color: '#f59e0b' }}>28%</strong>
            <div style={{ height: '4px', background: '#f59e0b', borderRadius: '2px', marginTop: '6px', width: '28%' }}></div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              ⚖️ {isAr ? 'مقارنة الوحدات والمفضلة' : 'Compare & Favorites'}
            </span>
            <strong style={{ fontSize: '1.2rem', color: '#8b5cf6' }}>18%</strong>
            <div style={{ height: '4px', background: '#8b5cf6', borderRadius: '2px', marginTop: '6px', width: '18%' }}></div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
              📑 {isAr ? 'تحميل البروشور PDF' : 'Brochure Downloads'}
            </span>
            <strong style={{ fontSize: '1.2rem', color: '#ec4899' }}>12%</strong>
            <div style={{ height: '4px', background: '#ec4899', borderRadius: '2px', marginTop: '6px', width: '12%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
