import React from 'react';
import { ShieldCheck, Lock, EyeOff, Award, MessageSquare, PhoneCall, Sparkles } from 'lucide-react';
import { getWhatsAppUrl, getFounderSettings } from '../../utils/founderCmsData';

export default function PrivateOfficeSection({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const cms = getFounderSettings();

  const handleConfidentialInquiry = () => {
    const text = isAr
      ? 'مرحباً، أرغب في التواصل مع المكتب الخاص 1Line Private Office بخصوص صفقات كبار العملاء السرية الحصرية (Off-Market).'
      : 'Hello 1Line Private Office, I would like to inquire about confidential off-market luxury acquisitions.';
    window.open(getWhatsAppUrl(text), '_blank');
  };

  const handleListOffMarket = () => {
    const text = isAr
      ? 'مرحباً، أمتلك عقاراً فاخراً / أرضاً استراتيجية بسوهاج وأرغب في عرضها للبيع عبر المكتب الخاص (Off-Market) بسرية تامة دون نشر صور للعامة.'
      : 'Hello, I own a prime property in Sohag and wish to discuss a discreet private off-market sale with your Private Office.';
    window.open(getWhatsAppUrl(text), '_blank');
  };

  return (
    <section className="homepage-section private-office-section" id="private-office">
      <div className="private-office-container">
        {/* Ambient Luxury Glow */}
        <div className="private-office-glow" />

        {/* Top Header */}
        <div className="private-office-header">
          <div className="private-office-badge">
            <Lock size={13} className="text-gold" />
            <span>{isAr ? '1Line Private Office • صفقات كبار المستثمرين' : '1Line Private Office • Confidential Acquisitions'}</span>
          </div>

          <h2 className="private-office-title luxury-serif-title">
            {isAr ? 'المكتب الخاص: صفقات سرية وحصرية (Off-Market)' : 'Discreet Off-Market Portfolio for Ultra-High-Net-Worth'}
          </h2>

          <p className="private-office-desc">
            {isAr
              ? 'نخبة من القصور الفارهة، الأراضي النيلية الاستراتيجية، والمشروعات التجارية الكبرى التي يطلب ملاكها الخصوصية التامة دون الإعلان عنها للجمهور. خدمة حصرية لكبار المستثمرين والمغتربين.'
              : 'An exclusive collection of prime waterfront estates, commercial towers, and sovereign land plots kept strictly confidential per owner request.'}
          </p>
        </div>

        {/* 3 Pillars of Confidentiality */}
        <div className="private-office-pillars">
          <div className="private-pillar-card">
            <div className="pillar-icon-box">
              <EyeOff size={22} className="text-gold" />
            </div>
            <h4>{isAr ? 'سرية تامة واتفاقيات عدم إفصاح (NDA)' : 'Strict Confidentiality & NDA'}</h4>
            <p>
              {isAr
                ? 'لا يتم نشر أي صور أو معلومات علنية؛ مشاركة ملفات العقارات تتم فقط مع مشترين معتمدين ومتحقق من ملاءتهم المالية.'
                : 'No public marketing. Property portfolios are shared strictly under non-disclosure agreements with verified buyers.'}
            </p>
          </div>

          <div className="private-pillar-card">
            <div className="pillar-icon-box">
              <ShieldCheck size={22} className="text-emerald" />
            </div>
            <h4>{isAr ? 'تدقيق قانوني وهندسي مسبق 100%' : '100% Pre-Audited Legal Deeds'}</h4>
            <p>
              {isAr
                ? 'كافة الصفقات السرية خضعت لفحص شامل لسندات الملكية، التراخيص، وخلو النزاعات من الإدارة القانونية قبل عرضها.'
                : 'Zero legal ambiguity. Every off-market asset has been vetted by senior real estate attorneys.'}
            </p>
          </div>

          <div className="private-pillar-card">
            <div className="pillar-icon-box">
              <Award size={22} className="text-gold" />
            </div>
            <h4>{isAr ? 'مستشار ثروات عقارية مخصص VIP' : 'Dedicated Private Wealth Advisor'}</h4>
            <p>
              {isAr
                ? 'مستشار تنفيذي يتولى ترتيب المعاينات الخاصة، التفاوض المالي المباشر، وتسهيلات مغتربي الخليج والتوكيلات الرسمية.'
                : 'A personal senior advisor orchestrates discreet private tours, high-value negotiations, and bespoke cross-border closings.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="private-office-actions">
          <button
            type="button"
            onClick={handleConfidentialInquiry}
            className="btn btn-gold-luxury"
          >
            <MessageSquare size={16} />
            <span>{isAr ? 'طلب استشارة خاصة سرية عبر واتساب' : 'Request Private Consultation'}</span>
          </button>

          <button
            type="button"
            onClick={handleListOffMarket}
            className="btn btn-glass-luxury"
          >
            <Lock size={15} />
            <span>{isAr ? 'عرض عقار استثنائي للبيع السري' : 'Inquire About Private Listing'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
