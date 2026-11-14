import { useState } from 'react';
import { X, Search, Clock, AlertCircle } from 'lucide-react';
import { formatFollowUp } from '../../utils/crmLabels';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

export default function TrackLeadModal({ isOpen, onClose, leads = [], lang }) {
  const [searchPhone, setSearchPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [foundLeads, setFoundLeads] = useState([]);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;

    const normalized = searchPhone.replace(/\D/g, '');
    const results = leads.filter(l => {
      const p = (l.phone || '').replace(/\D/g, '');
      const w = (l.whatsapp || '').replace(/\D/g, '');
      return p.includes(normalized) || w.includes(normalized);
    });

    setFoundLeads(results);
    setSearched(true);
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="track-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="track-modal-header">
          <div className="track-icon-wrap"><Search size={22} /></div>
          <h3>{lang === 'ar' ? 'تتبع حالة طلبك العقاري' : 'Track Your Real Estate Request'}</h3>
          <p>{lang === 'ar' ? 'أدخل رقم هاتفك المسجل لمعرفة آخر تحديثات طلبك والمستشار المسؤول.' : 'Enter your registered phone number to check latest updates and assigned advisor.'}</p>
        </div>

        <form onSubmit={handleSearch} className="track-search-form">
          <div className="track-input-row">
            <input
              type="tel"
              placeholder={lang === 'ar' ? 'أدخل رقم الهاتف (مثال: 01012345678)' : 'Enter phone number'}
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" className="btn btn-primary">
              <Search size={16} />
              <span>{lang === 'ar' ? 'بحث' : 'Search'}</span>
            </button>
          </div>
        </form>

        {searched && (
          <div className="track-results-container">
            {foundLeads.length > 0 ? (
              <div className="found-leads-list">
                {foundLeads.map((lead) => (
                  <div key={lead.id} className="lead-track-item">
                    <div className="lead-track-header">
                      <span className="lead-track-type">{lead.type?.toUpperCase()}</span>
                      <span className="lead-track-status status-badge">{lead.status || 'Active'}</span>
                    </div>
                    <h4>{lead.name}</h4>
                    <p className="lead-followup-text">
                      <Clock size={14} className="text-gold" />
                      <span>{formatFollowUp(lead.followUp, lang === 'ar') || lead.notes || (lang === 'ar' ? 'قيد المتابعة والتجهيز' : 'Under review')}</span>
                    </p>
                    {lead.assignedTo && (
                      <div className="lead-advisor-tag">
                        <span>{lang === 'ar' ? 'المستشار المسؤول:' : 'Assigned Advisor:'}</span>
                        <strong>{lead.assignedTo}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-lead-found">
                <AlertCircle size={32} className="text-warning" />
                <p>{lang === 'ar'
                  ? 'مش لاقيين طلب بالرقم ده على الجهاز ده. التتبع هنا بيظهر الطلبات اللي اتبعتت من نفس الجهاز. لو بعتّ طلبك من جهاز تاني، كلّمنا على واتساب ونرد عليك بحالته.'
                  : 'No request with this number on this device. Tracking here shows requests sent from this device. If you sent it from another one, message us on WhatsApp and we will tell you its status.'}</p>
                <a
                  className="btn btn-primary"
                  href={getWhatsAppUrl(lang === 'ar' ? `عايز أعرف حالة طلبي. رقمي: ${searchPhone.trim()}` : `I would like the status of my request. My number: ${searchPhone.trim()}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {lang === 'ar' ? 'اسأل على واتساب' : 'Ask on WhatsApp'}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
