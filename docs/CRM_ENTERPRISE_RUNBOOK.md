# 📘 دليل التشغيل والإدارة المؤسسية لمنظومة CRM — منصة 1Line Solutions

> **وثيقة خاصة ومحمية مخصصة لإدارة العمليات، المطورين، ومسؤولي أمان المعلومات (DevSecOps)**  
> **الإصدار:** 2.6 Enterprise  
> **تاريخ التحديث:** سبتمبر 2026  
> **النطاق:** https://1-line-qkzp9.vercel.app/crm

---

## 1. نظرة عامة على البنية الأمنية

تعتمد لوحة CRM لمنصة 1Line Solutions العقارية على هيكلية مؤسسية منيعة تتكون من:
1. **المصادقة السحابية المباشرة (Direct Firebase Auth):** لا توجد أي بوابات وصول تعتمد على قيم محلية مثل `sessionStorage`.
2. **صلاحيات الوصول متعددة المستويات (6-Tier Enterprise RBAC):** حماية الواجهة والـ API وقواعد البيانات بناءً على هوية المستخدم والدور المحدد له.
3. **التدقيق الجنائي غير القابل للتعديل (Immutable Audit Logs):** تسجيل فوري لجميع العمليات الحساسة (إنشاء، تعديل، حذف) مع الحالتين قبل وبعد وتفاصيل الفاعل في مجموعة `/audit_logs` في Firestore.
4. **طابور العمليات غير المتصل ومفاتيح منع التكرار (Idempotency Key & Offline Queue):** معالجة موثوقة لطلبات العملاء والصفقات حتى مع انقطاع أو ضعف شبكة الإنترنت مع منع تكرار العمليات إطلاقاً.

---

## 2. جدول الأدوار والصلاحيات المؤسسية (6-Tier RBAC Matrix)

| الدور الوظيفي (`role`) | رؤية العملاء | تعديل العملاء | حذف العملاء | رؤية أرقام الهواتف | إدارة الصفقات | تعديل العقارات | إدارة المدفوعات | تصدير Excel |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Super Admin (`super_admin`)** | ✅ كامل | ✅ كامل | ✅ كامل | ✅ غير محجوب | ✅ كامل | ✅ كامل | ✅ كامل | ✅ مصرح |
| **مدير المبيعات (`sales_manager`)** | ✅ كامل | ✅ كامل | ❌ غير مصرح | ✅ غير محجوب | ✅ كامل | ❌ غير مصرح | ❌ غير مصرح | ✅ مصرح |
| **مسؤول المبيعات (`sales_agent`)** | ✅ عملاؤه | ✅ عملاؤه | ❌ غير مصرح | ✅ غير محجوب | ✅ صفقاته | ❌ غير مصرح | ❌ غير مصرح | ❌ غير مصرح |
| **مدير العقارات (`property_manager`)** | ❌ غير مصرح | ❌ غير مصرح | ❌ غير مصرح | ❌ محجوب بالقناع | ❌ غير مصرح | ✅ كامل | ❌ غير مصرح | ❌ غير مصرح |
| **مسؤول المالية (`finance`)** | ❌ غير مصرح | ❌ غير مصرح | ❌ غير مصرح | ❌ محجوب بالقناع | ✅ قراءة فقط | ❌ غير مصرح | ✅ كامل | ✅ مصرح |
| **مشاهد / مدقق (`viewer`)** | ✅ قراءة فقط | ❌ غير مصرح | ❌ غير مصرح | 🛡️ محجوب بالقناع | ✅ قراءة فقط | ❌ غير مصرح | ❌ غير مصرح | ❌ غير مصرح |

---

## 3. سكربت إعداد صلاحيات المستخدمين (Firebase Custom Claims Setup Script)

لتعيين الأدوار الحقيقية على رموز المصادقة (Custom Claims) في Firebase، يتم استخدام السكربت الإداري التالي عبر Firebase Admin SDK:

```javascript
// scripts/set-user-role.cjs
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const VALID_ROLES = [
  'super_admin',
  'sales_manager',
  'sales_agent',
  'property_manager',
  'finance',
  'viewer'
];

async function assignUserRole(email, role) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`الدور غير صالح: ${role}. الأدوار المتاحة هي: ${VALID_ROLES.join(', ')}`);
  }

  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { role });
  
  // توثيق في سجل التدقيق
  await admin.firestore().collection('audit_logs').add({
    actorId: 'system-admin-cli',
    action: 'ASSIGN_ROLE',
    entityType: 'user',
    entityId: user.uid,
    before: null,
    after: { email, role },
    ipHashOrMetadata: 'cli-terminal-session',
    createdAt: new Date().toISOString()
  });

  console.log(`✅ تم تعيين دور [${role}] بنجاح للمستخدم: ${email} (${user.uid})`);
}

// مثال للاستخدام:
// assignUserRole('admin@oneline-solutions.com', 'super_admin');
```

---

## 4. سياسة أمان البيانات وحماية الخصوصية (Data Privacy & Masking Policy)

1. **أرقام العملاء محمية على السيرفر مش في الشاشة بس:**
   - تليفون وواتساب وإيميل العميل محفوظين في `lead_contacts/{leadId}` مش في وثيقة العميل نفسها.
   - يقراها بس: المدير العام، مدير المبيعات، ومستشار الفريق المسؤول عن العميل (أو العملاء غير المسندين). أدوار `viewer` و`finance` و`property_manager` بتشوف العميل من غير أرقام خالص.
   - كل مستشار (`sales_agent` / `agent_east` / `agent_new_sohag`) يشوف ويعدّل عملاء فريقه + العملاء غير المسندين بس، ونقل عميل لفريق تاني من صلاحية المدير.
   - طلبات الشراء المنشورة للزوار في `public_demands` من غير أي بيانات تواصل؛ `demands` الأصلية للموظفين بس.
   - نفس الفكرة لطلبات الشراء وطلبات المغتربين والبدل: الأرقام في `request_contacts/{النوع}__{id}` ويقراها الأدمن ومدير المبيعات والمستشارين بس.
   - بيانات العملاء اللي جاية من السحابة مش بتتحفظ في متصفح الموظف، وبتتمسح من الذاكرة عند تسجيل الخروج.
2. **منع هجمات التخمين وتعداد المستخدمين (Anti-Enumeration):**
   - بوابة الدخول تعتمد رسالة خطأ واحدة موحدة عند فشل الدخول: *"بيانات الدخول غير صحيحة، يرجى التحقق من البريد وكلمة المرور والمحاولة مجدداً."*
   - لا يتم إفشاء ما إذا كان البريد الإلكتروني مسجلاً بالخدمة أم لا.
3. **حماية سجلات التدقيق (Forensic Audit Trail):**
   - مسار `/audit_logs` محمي بقواعد تمنع التعديل أو الحذف إطلاقاً (`allow update, delete: if false`).
   - لا يمكن لأي مستخدم مهما بلغت صلاحياته مسح سجلات التدقيق السابقة، لضمان الامتثال القانوني.

---

## 5. إجراءات المزامنة والتعافي من الكوارث (Disaster Recovery & Backup Procedures)

### أ. طابور الطلبات غير المتصل (Offline Lead Queue)
- لو الزائر بعت طلب والنت مقطوع، الطلب بيتحفظ في طابور محلي واحد (`src/utils/leadQueue.js`).
- الطابور بيترفع تلقائياً مع كل فتح للموقع ومع رجوع النت، وبيتكتب على نفس رقم العميل فمفيش تكرار.
- الطلب اللي قواعد Firestore بترفضه نهائياً بيتشال من الطابور بدل ما يفضل يتعاد للأبد.

### ب. النسخ الاحتياطي السحابي اليومي (Daily Automated Backups)
يتم تصدير قاعدة بيانات Firestore دورياً عبر Cloud Scheduler و Google Cloud Storage:
```bash
# أمر النسخ الاحتياطي التلقائي لمجموعات CRM الحساسة
gcloud firestore export gs://oneline-crm-backups/$(date +%Y-%m-%d) \
  --collection-ids='leads','lead_contacts','request_contacts','remote_inspections','trade_ins','deals','audit_logs','demands','public_demands'
```

### ج. خطة استعادة البيانات في حالات الطوارئ (Emergency Recovery Plan)
1. في حال حدوث تلاعب بقاعدة البيانات، يتم تفعيل وضع الصيانة المؤقت عبر المتغير البيئي `VITE_MAINTENANCE_MODE=true`.
2. فحص سجلات `/audit_logs` لتحديد وقت العملية الضارة ومعرّف الفاعل (`actorId`).
3. استعادة النسخة الاحتياطية السليمة من `gs://oneline-crm-backups/` باستخدام:
```bash
gcloud firestore import gs://oneline-crm-backups/[BACKUP_DATE_FOLDER]
```
4. إعادة تعيين كلمات المرور والتوكنات لكافة الحسابات المشتبه بها عبر Firebase Auth Admin.

---

## 6. خطوات التحقق والاختبار الدوري (Continuous Verification)

الـ CI بيشغّل كل ده تلقائياً مع كل push، ويقدر يتشغّل محلياً:

```bash
npm run lint          # أي خطأ يوقف الـ CI
npm run test:unit     # الصلاحيات، توزيع العملاء، الحسابات المالية، طابور الطلبات
npm run test:rules    # قواعد Firestore على المحاكي (محتاج Java 11+)
npm run build
```

---

## 7. نشر التحديث الأمني (ترتيب الخطوات مهم)

1. **القواعد والـ indexes الأول:**
   ```bash
   firebase deploy --only firestore
   ```
   القواعد الجديدة بتقبل الطلبات بالشكل القديم والجديد، فالمتصفحات اللي لسه على النسخة القديمة مش هتخسر أي طلب.
   استنى لحد ما index ‏`leads (assignedTo, createdAt)` يخلص في Firebase Console ← Firestore ← Indexes.
2. **بعد كده الموقع:** دمج الـ PR ونشره على Vercel. لو اتعكس الترتيب، طلبات الزوار هتترفض وتستنى في الطابور لحد ما الزائر يرجع.
3. **نقل الأرقام القديمة:** (مرة واحدة)
   ```bash
   node scripts/migrate-lead-contacts.mjs          # تجربة: بيعدّ بس
   node scripts/migrate-lead-contacts.mjs --apply  # تنفيذ
   ```
   السكربت بينقل أرقام العملاء والطلبات والمغتربين والبدل. جلسات المدير في الـ CRM بتنقل اللي بتحمّله تلقائياً كمان، لكن السكربت بيغطي الكل.
4. **App Check:** مفتاح reCAPTCHA Enterprise (Google Cloud → Security → reCAPTCHA، نوع Website، بدون checkbox) ← تسجيله في Firebase App Check تبويب reCAPTCHA Enterprise ← `VITE_RECAPTCHA_SITE_KEY` في Vercel ← بعد ما الطلبات تظهر "verified" فعّل Enforce على Firestore.
