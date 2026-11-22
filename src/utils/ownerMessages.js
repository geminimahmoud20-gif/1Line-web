// =============================================================
//  WhatsApp messages for an owner who offers a property (a seller, or a broker offering a unit).
//  One list for the client file and the pipeline card; the default one follows the stage.
//  Pure: tests/unit/owner-messages.test.mjs
// =============================================================
import { sellerRoleOf } from './sellerRole.js';

const sizeText = (lead) => {
  const n = Number(lead?.details?.size);
  return n > 0 ? ` بمساحة ${n} م²` : '';
};

/**
 * [{ id, title, msg }]. ctx: { areaName, propTypeName }.
 * The wording stays neutral between an owner and a broker («وحدتكم»), and never promises a price or a date.
 */
export function ownerMessages(lead = {}, { areaName = 'سوهاج', propTypeName = 'عقار' } = {}) {
  const name = lead.name || 'العميل الكريم';
  const broker = sellerRoleOf(lead) === 'broker';
  const unit = broker ? 'الوحدة اللي حضرتك بتعرضها' : 'عقاركم';
  const hello = `أهلاً بك أستاذ ${name}`;
  return [
    {
      id: 'intro',
      title: 'ترحيب أول تواصل',
      msg: `${hello}، معك فريق 1Line للاستشارات والتسويق العقاري بسوهاج. وصلنا طلب عرض ${propTypeName} للبيع في ${areaName}${sizeText(lead)}. نحب نتأكد من بيانات ${unit} والسعر المطلوب، هل يناسبك اتصال سريع؟`
    },
    {
      id: 'valuation',
      title: 'تحديد موعد معاينة وتقييم',
      msg: `${hello}، نراجع بيانات ${unit} في ${areaName}${sizeText(lead)}. يسعدنا تحديد موعد لمعاينة الوحدة وتقييمها وتصويرها رسمياً لبدء تسويقها للمشترين.`
    },
    {
      id: 'exclusive',
      title: 'عرض عقد البيع الحصري',
      msg: `${hello}، بعد معاينة ${unit} نقترح عقد بيع حصري وتسويق احترافي عبر فريقنا وقاعدة عملائنا الجاهزة. أتعاب الشركة تنافسية ويتم الاتفاق عليها بوضوح وكتابةً حسب تفاصيل الصفقة قبل التعاقد. هل نرتّب موعداً لمناقشة العقد؟`
    },
    {
      id: 'price',
      title: 'مراجعة السعر المطلوب',
      msg: `${hello}، بناءً على أسعار السوق الحالية في ${areaName} ومواصفات ${unit}، نحب نناقش معك السعر المطلوب لنتمكن من تسويقه بأفضل شكل. متى يناسبك الحديث؟`
    },
    {
      id: 'buyers',
      title: 'إبلاغ بمشترين مهتمين',
      msg: `${hello}، لدينا مشترون مسجلون يبحثون عن ${propTypeName} في ${areaName} وقد تناسبهم ${unit}. نود تأكيد تفاصيل الوحدة والسعر لعرضها عليهم.`
    },
    {
      id: 'docs',
      title: 'طلب مستندات وصور',
      msg: `تحياتنا أستاذ ${name}، لاستكمال ملف تسويق ${unit} على منصة 1Line، هل يمكن إرسال صور واضحة للوحدة ومستندات الملكية؟`
    },
    {
      id: 'decline',
      title: 'اعتذار مهذب عن الوحدة',
      msg: `${hello}، نشكرك على ثقتك في 1Line. بعد مراجعة ${unit} لم نجد أنها مناسبة لخطة التسويق لدينا في الوقت الحالي، ويسعدنا خدمتك في أي عقار آخر مستقبلاً.`
    }
  ];
}

/** The message to open by default at this stage of the sale */
export function ownerMessageFor(lead = {}, ctx = {}) {
  const status = lead.status || 'new';
  const id = ({ new: 'intro', contacted: 'valuation', site_visit: 'exclusive', negotiating: 'buyers', closing: 'docs' })[status] || 'docs';
  const all = ownerMessages(lead, ctx);
  return all.find((m) => m.id === id) || all[0];
}
