import { useEffect } from 'react';
import { updatePageSeo } from '../utils/seoHelper';
import { BRAND, CONTACT } from '../config/siteConfig';
import { getDynamicPhone } from '../utils/founderCmsData';
import { useSiteSettings } from '../utils/siteSettings';

const LAST_UPDATED = '2026-10-10';

const SECTIONS_AR = [
  ['من نحن', `${BRAND.name_ar} (${BRAND.name_en})، ومقرها ${CONTACT.address_ar}. نحن المسؤول عن معالجة البيانات التي تُرسل عبر هذا الموقع.`],
  ['البيانات التي نجمعها', 'ما تكتبه بنفسك في النماذج: الاسم، رقم الهاتف والواتساب، البريد الإلكتروني إن وُجد، وتفاصيل العقار أو الطلب. وبيانات استخدام تقنية (الصفحات التي زرتها ونوع الجهاز) لتحسين الموقع.'],
  ['لماذا نستخدمها', 'للتواصل معك بخصوص طلبك، وإعداد التقييم أو مطابقة العقارات، وترتيب المعاينات، وتحسين الخدمة. لا نبيع بياناتك ولا نؤجرها لأي جهة.'],
  ['مع من نشاركها', 'فريق 1Line المختص بطلبك فقط. عند إتمام صفقة قد نشارك الحد الأدنى اللازم مع الطرف الآخر أو المحامي أو جهة التوثيق، وبعلمك. نستضيف البيانات لدى Google Firebase، ونستخدم Microsoft Clarity وGoogle Analytics وMeta Pixel (فيسبوك وإنستجرام) للقياس وقياس الإعلانات، ومن غير أي اسم أو رقم تليفون. وعند إرسال طلب أو الضغط على واتساب أو الاتصال، يُرسل موقعنا الحدث إلى Meta من خادمنا أيضاً (عنوان الاتصال ونوع المتصفح ومعرّف الإعلان فقط) حتى لا يضيع من قياس الحملة.'],
  ['ملفات تعريف الارتباط والقياس', 'يحفظ الموقع تفضيلاتك (اللغة، الوضع الليلي، المفضلة) في متصفحك. نحفظ معرّفاً عشوائياً لجهازك ونسجّل تصفحك للموقع (الوحدات التي فتحتها ومدة قراءتها، البحث، حاسبة التمويل، التواصل) لنفهم احتياجك ونرشّح لك وحدات مناسبة، ويُربط ذلك بطلبك إذا سجّلت طلباً. لا نسجّل في القياس اسماً أو رقماً أو نصاً تكتبه في النماذج، وتُحذف السجلات التفصيلية تلقائياً بعد 180 يوماً. يمكنك الاعتراض على القياس في أي وقت بمراسلتنا، أو بمسح بيانات الموقع وتعطيل التتبع من متصفحك.'],
  ['مدة الاحتفاظ', 'نحتفظ ببيانات الطلبات طوال مدة التعامل وحتى 24 شهراً بعد آخر تواصل، ما لم يلزمنا القانون بمدة أطول للمستندات التعاقدية.'],
  ['حقوقك', 'وفق قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020، يحق لك معرفة البيانات المحفوظة عنك، وتصحيحها، وطلب حذفها، وسحب موافقتك في أي وقت. راسلنا وسنرد خلال 15 يوم عمل.'],
  ['المدفوعات', 'لا يقبل هذا الموقع أي مدفوعات إلكترونية ولا يطلب بيانات بطاقات. أي مبلغ جدية حجز يُسدَّد فقط بعد استلامك خطاب حجز رسمياً من الشركة يحدد الحساب والمبلغ وشروط الاسترداد.'],
];

const SECTIONS_EN = [
  ['Who we are', `${BRAND.name_en}, located at ${CONTACT.address_en}. We control the data submitted through this website.`],
  ['What we collect', 'What you type into forms (name, phone/WhatsApp, optional email, property or request details) and technical usage data (pages visited, device type) to improve the site.'],
  ['Why we use it', 'To contact you about your request, prepare valuations or matches, arrange viewings and improve the service. We never sell or rent your data.'],
  ['Who we share it with', 'Only the 1Line team handling your request. When a deal proceeds we may share the minimum necessary with the counterparty, lawyer or notary, with your knowledge. Data is hosted on Google Firebase; Microsoft Clarity, Google Analytics and the Meta Pixel (Facebook & Instagram) run on public pages for site and ad measurement, and receive no names or phone numbers. When you submit a request or tap WhatsApp or call, our server also sends that event to Meta (connection address, browser type and ad identifier only) so the campaign measurement is not lost.'],
  ['Cookies and analytics', 'Preferences (language, theme, favorites) are stored in your browser. We keep a random ID for your device and record your browsing (listings opened and reading time, searches, the financing calculator, contact clicks) to understand your needs and suggest suitable units; it is linked to your request if you submit one. Analytics never record names, numbers or text you type, and detailed logs are deleted after 180 days. You may object to measurement at any time by emailing us, or by clearing site data and disabling tracking in your browser.'],
  ['Retention', 'We keep request data for the duration of our relationship and up to 24 months after last contact, unless the law requires longer for contract records.'],
  ['Your rights', 'Under Egyptian Personal Data Protection Law No. 151 of 2020 you may access, correct or delete your data and withdraw consent at any time. Email us; we reply within 15 business days.'],
  ['Payments', 'This website does not take online payments or card details. Any reservation deposit is paid only after you receive an official reservation letter stating the account, amount and refund terms.'],
];

export default function PrivacyPage({ lang = 'ar' }) {
  const { contact } = useSiteSettings();
  const isAr = lang === 'ar';
  const sections = isAr ? SECTIONS_AR : SECTIONS_EN;

  useEffect(() => {
    updatePageSeo({
      title: isAr ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy & data protection',
      description: isAr
        ? 'كيف تجمع 1Line Solutions بياناتك وتستخدمها وتحميها، وحقوقك وفق قانون حماية البيانات الشخصية المصري.'
        : 'How 1Line Solutions collects, uses and protects your data, and your rights under Egyptian law.',
      url: '/privacy'
    });
  }, [isAr]);

  return (
    <article className="lx-legal" dir={isAr ? 'rtl' : 'ltr'}>
      <p className="lx-eyebrow">{isAr ? 'الخصوصية' : 'Privacy'}</p>
      <h1>{isAr ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy & data protection policy'}</h1>
      <p className="lx-legal-meta">
        {isAr ? 'آخر تحديث' : 'Last updated'}: <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>
      </p>
      {sections.map(([h, body]) => (
        <section key={h}>
          <h2>{h}</h2>
          <p>{body}</p>
        </section>
      ))}
      <section>
        <h2>{isAr ? 'للتواصل بخصوص بياناتك' : 'Contact about your data'}</h2>
        <p>
          <a href={`mailto:${contact.email}`}>{contact.email}</a> — <bdi>{getDynamicPhone()}</bdi>
        </p>
      </section>
    </article>
  );
}
