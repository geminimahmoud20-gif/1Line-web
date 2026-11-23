import { Link } from 'react-router-dom';
import { Building, MapPin, MessageSquare, Tag, Users, ExternalLink } from 'lucide-react';
import { PROPERTY_TYPE_NAMES, LISTING_STATUS_CONFIG, getAreaDisplayName } from '../../pages/ClientAccountPageData';
import './AccountListingsTab.app.css';

/**
 * «وحداتي»: the units an owner or broker has listed, each with its live status and who asked about it —
 * only shown when clientListings isn't empty (ClientAccountPage decides that).
 */
export default function AccountListingsTab({ clientListings, listingInterests, handleListingWhatsApp, isAr, lang }) {
  return (
    <div className="account-tab-content listings-tab-view">
      <div className="inquiries-section">
        <div className="section-head">
          <div className="section-title-wrap">
            <Building size={20} className="text-gold" />
            <div>
              <h3>{isAr ? 'وحداتي المعروضة' : 'My Listed Units'}</h3>
              <p>{isAr ? 'حالة كل وحدة سجّلتها معانا، ومين سأل عنها' : 'The live status of every unit you listed with us, and who asked about it'}</p>
            </div>
          </div>
          <span className="section-count-badge">{clientListings.length}</span>
        </div>

        <div className="client-listings-grid">
          {clientListings.map((property) => {
            const status = LISTING_STATUS_CONFIG[property.status] || LISTING_STATUS_CONFIG.published;
            const typeLabel = PROPERTY_TYPE_NAMES[property.type] || property.type || '';
            const areaName = getAreaDisplayName(property.areaKey || property.area || '', lang);
            const title = isAr ? (property.title_ar || property.title) : (property.title_en || property.title_ar || property.title);
            const interested = listingInterests.get(property.id) || [];

            return (
              <div key={property.id} className="client-listing-card">
                <div className="listing-card-top">
                  <Link to={`/properties/${property.id}`} className="listing-card-title">
                    {title}
                  </Link>
                  <span className="listing-status-pill" style={{ color: status.color, background: status.bg }}>
                    {isAr ? status.ar : status.en}
                  </span>
                </div>

                <div className="listing-card-body">
                  {typeLabel && (
                    <div className="lead-info-row">
                      <span className="lead-info-label">{isAr ? 'النوع:' : 'Type:'}</span>
                      <span className="lead-info-val"><Building size={12} /> {typeLabel}</span>
                    </div>
                  )}
                  <div className="lead-info-row">
                    <span className="lead-info-label">{isAr ? 'المنطقة:' : 'Area:'}</span>
                    <span className="lead-info-val"><MapPin size={12} /> {areaName}</span>
                  </div>
                  {property.price > 0 && (
                    <div className="lead-info-row">
                      <span className="lead-info-label">{isAr ? 'السعر المطلوب:' : 'Asking price:'}</span>
                      <span className="lead-info-val text-gold">{Number(property.price).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  )}
                </div>

                <div className="listing-interest-box">
                  <div className="listing-interest-head">
                    <Users size={14} className="text-emerald" />
                    <span>{isAr ? 'مهتمين بالوحدة' : 'Interested buyers'}</span>
                    <span className="listing-interest-count">{interested.length}</span>
                  </div>
                  {interested.length > 0 ? (
                    <ul className="listing-interest-list">
                      {interested.slice(0, 4).map((lead) => (
                        <li key={lead.id}>
                          <Tag size={11} />
                          <span>{lead.name || (isAr ? 'عميل' : 'A client')}</span>
                          {lead.createdAt && (
                            <span className="text-muted">
                              {new Date(lead.createdAt).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US')}
                            </span>
                          )}
                        </li>
                      ))}
                      {interested.length > 4 && (
                        <li className="text-muted">{isAr ? `+ ${interested.length - 4} آخرين` : `+ ${interested.length - 4} more`}</li>
                      )}
                    </ul>
                  ) : (
                    <p className="listing-interest-empty">
                      {isAr ? 'لسه محدش طلب معاينة للوحدة دي' : 'No viewing requests on this unit yet'}
                    </p>
                  )}
                </div>

                <div className="listing-card-footer">
                  <Link to={`/properties/${property.id}`} className="btn-lead-action">
                    <ExternalLink size={13} />
                    <span>{isAr ? 'عرض صفحة الوحدة' : 'View listing page'}</span>
                  </Link>
                  <button type="button" className="btn-lead-action btn-wa" onClick={() => handleListingWhatsApp(property, interested.length)}>
                    <MessageSquare size={13} />
                    <span>{isAr ? 'تواصل مع مستشارك' : 'Follow up on WhatsApp'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
