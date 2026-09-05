import { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Check, 
  Copy, 
  X, 
  Users, 
  CheckCircle2
} from 'lucide-react';
import { 
  findMatchingClientsForProperty, 
  generateWhatsAppMessage, 
  formatWhatsAppPhone 
} from '../../utils/matchingEngine';

export default function WhatsAppMatchNotifierModal({
  isOpen,
  onClose,
  property,
  allProperties = [],
  leads = [],
  demands = [],
  defaultEventType = 'new_unit', // 'new_unit' | 'sold_unit' | 'price_drop'
  lang = 'ar',
  triggerToast
}) {
  const [eventType, setEventType] = useState(defaultEventType);
  const [sentLeadIds, setSentLeadIds] = useState([]);
  const [copiedLeadId, setCopiedLeadId] = useState(null);

  // Alternative units in the same area if sold
  const alternativeProperties = useMemo(() => {
    if (!property) return [];
    return allProperties
      .filter(p => p.id !== property.id && p.areaKey === property.areaKey && p.status === 'published')
      .slice(0, 3);
  }, [allProperties, property]);

  // Find all matched clients from leads & demands database
  const matchedClients = useMemo(() => {
    if (!property) return [];
    return findMatchingClientsForProperty(property, leads, demands);
  }, [property, leads, demands]);

  if (!isOpen || !property) return null;

  const isAr = lang === 'ar';

  const handleSendWhatsApp = (client) => {
    const formattedPhone = formatWhatsAppPhone(client.phone || client.whatsapp);
    if (!formattedPhone) {
      if (triggerToast) triggerToast(isAr ? 'رقم الهاتف غير مسجل' : 'Phone not available', 'error');
      return;
    }

    const message = generateWhatsAppMessage(eventType, client, property, alternativeProperties);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    // Mark as sent in state
    setSentLeadIds(prev => [...new Set([...prev, client.id])]);
    window.open(whatsappUrl, '_blank');

    if (triggerToast) {
      triggerToast(isAr ? `جاري فتح محادثة واتساب مع ${client.name}` : `Opening WhatsApp for ${client.name}`, 'info');
    }
  };

  const handleCopyMessage = (client) => {
    const message = generateWhatsAppMessage(eventType, client, property, alternativeProperties);
    navigator.clipboard.writeText(message);
    setCopiedLeadId(client.id);
    setTimeout(() => setCopiedLeadId(null), 2500);

    if (triggerToast) {
      triggerToast(isAr ? 'تم نسخ نص الرسالة المخصصة بنجاح' : 'Message copied to clipboard', 'success');
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '24px',
          padding: '28px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          position: 'relative',
          textAlign: isAr ? 'right' : 'left'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            [isAr ? 'left' : 'right']: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <MessageSquare size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 'bold', margin: 0 }}>
                {isAr ? 'إرسال إشعارات الواتساب للعملاء المهتمين' : 'WhatsApp Retargeting & Matched Leads'}
              </h2>
              <span style={{
                fontSize: '0.72rem',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}>
                {matchedClients.length} {isAr ? 'عميل مطابق' : 'matched'}
              </span>
            </div>
            <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
              {isAr ? 'مطابقة ذكية حسب المنطقة ونوع العقار والميزانية المسجلة' : 'Intelligent auto-matching based on area, type & budget'}
            </small>
          </div>
        </div>

        {/* Target Property Summary Banner */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isAr ? 'العقار المستهدف للإشعار' : 'Target Property'}</span>
            <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{property.title_ar || property.title_en}</strong>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.76rem', color: '#cbd5e1' }}>
              <span>📍 {property.locationName_ar || 'سوهاج'}</span>
              <span>💰 {(property.price || 0).toLocaleString()} ج.م</span>
              <span>📐 {property.size} م²</span>
            </div>
          </div>

          {/* Event Trigger Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => setEventType('new_unit')}
              style={{
                background: eventType === 'new_unit' ? '#10b981' : 'transparent',
                color: '#fff',
                fontSize: '0.74rem',
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isAr ? '✨ وحدة جديدة' : 'New Unit'}
            </button>
            <button
              type="button"
              onClick={() => setEventType('sold_unit')}
              style={{
                background: eventType === 'sold_unit' ? '#ef4444' : 'transparent',
                color: '#fff',
                fontSize: '0.74rem',
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isAr ? '🔒 تم البيع وبدائلها' : 'Sold Unit'}
            </button>
            <button
              type="button"
              onClick={() => setEventType('price_drop')}
              style={{
                background: eventType === 'price_drop' ? '#f59e0b' : 'transparent',
                color: '#fff',
                fontSize: '0.74rem',
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isAr ? '🔥 تخفيض سعر' : 'Price Drop'}
            </button>
          </div>
        </div>

        {/* Matched Clients List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} style={{ color: '#3b82f6' }} />
              <span>{isAr ? 'قائمة العملاء الموصى بإشعارهم فوراً:' : 'Recommended Clients to Notify:'}</span>
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {isAr ? `تم إرسال ${sentLeadIds.length} من ${matchedClients.length}` : `${sentLeadIds.length} of ${matchedClients.length} sent`}
            </span>
          </div>

          {matchedClients.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              fontSize: '0.85rem'
            }}>
              {isAr 
                ? 'لا يوجد عملاء حالياً في قاعدة البيانات يطابقون هذه المنطقة ونوع العقار والميزانية بالكامل.' 
                : 'No clients found matching this property criteria yet.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {matchedClients.map((client) => {
                const isSent = sentLeadIds.includes(client.id);
                const isCopied = copiedLeadId === client.id;
                const previewMsg = generateWhatsAppMessage(eventType, client, property, alternativeProperties);

                return (
                  <div
                    key={client.id}
                    style={{
                      background: isSent ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSent ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    {/* Client Info */}
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>{client.name}</strong>
                        <span style={{
                          fontSize: '0.7rem',
                          background: client.score >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(217, 119, 6, 0.2)',
                          color: client.score >= 80 ? '#10b981' : 'var(--accent-gold)',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontWeight: 'bold'
                        }}>
                          {client.score}% {isAr ? 'مطابقة' : 'match'}
                        </span>
                        {isSent && (
                          <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} />
                            {isAr ? 'تم الإرسال' : 'Sent'}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '0.76rem', color: '#94a3b8' }}>
                        <span>📱 {client.phone}</span>
                        <span>🏷️ {client.source}</span>
                        {client.leadBudget > 0 && <span>💰 ميزانية: {client.leadBudget.toLocaleString()} ج.م</span>}
                      </div>

                      {/* Snippet */}
                      <p style={{
                        fontSize: '0.74rem',
                        color: '#64748b',
                        margin: '6px 0 0 0',
                        maxWidth: '450px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        "{previewMsg.split('\n')[0]} - {previewMsg.split('\n')[1] || ''}"
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(client)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#cbd5e1',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                        title={isAr ? 'نسخ نص الرسالة' : 'Copy Message'}
                      >
                        {isCopied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                        <span>{isCopied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(client)}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <Send size={13} />
                        <span>{isAr ? 'إرسال واتساب' : 'Send WhatsApp'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {isAr 
              ? '💡 يتم تجهيز الرسالة تلقائياً وتضمين رابط معاينة الوحدة والصور المباشرة لزيادة نسبة الرد والإغلاق.' 
              : 'Direct deep-link included in every message to maximize click-through rate.'}
          </span>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            style={{ fontSize: '0.82rem', color: '#cbd5e1' }}
          >
            {isAr ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
