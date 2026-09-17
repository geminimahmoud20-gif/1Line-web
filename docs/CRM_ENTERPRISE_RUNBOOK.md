# 📘 دليل التشغيل والإدارة المؤسسية لمنظومة CRM — منصة 1Line Solutions

> **وثيقة سرية ومخصصة لإدارة العمليات، المطورين، ومسؤولي أمان المعلومات (DevSecOps)**  
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

1. **قناع رقم الهاتف (Phone Masking):**
   - يتم تطبيق دالة `maskPhoneNumber` تلقائياً لأي مستخدم يحمل دور `viewer` أو `finance` أو `property_manager`.
   - يتم إخفاء 4 أرقام من منتصف رقم الهاتف (مثل: `010****5678`) لمنع تسريب أرقام عملاء المنصة خارج فريق المبيعات المصرح له.
2. **منع هجمات التخمين وتعداد المستخدمين (Anti-Enumeration):**
   - بوابة الدخول تعتمد رسالة خطأ واحدة موحدة عند فشل الدخول: *"بيانات الدخول غير صحيحة، يرجى التحقق من البريد وكلمة المرور والمحاولة مجدداً."*
   - لا يتم إفشاء ما إذا كان البريد الإلكتروني مسجلاً بالخدمة أم لا.
3. **حماية سجلات التدقيق (Forensic Audit Trail):**
   - مسار `/audit_logs` محمي بقواعد تمنع التعديل أو الحذف إطلاقاً (`allow update, delete: if false`).
   - لا يمكن لأي مستخدم مهما بلغت صلاحياته مسح سجلات التدقيق السابقة، لضمان الامتثال القانوني.

---

## 5. إجراءات المزامنة والتعافي من الكوارث (Disaster Recovery & Backup Procedures)

### أ. طابور العمليات غير المتصل (Offline Queue & Idempotency)
- عند انقطاع الاتصال بالشبكة، يتم حفظ العمليات في طابور محلي مشفر مع إنشاء مفتاح عدم تكرار فريد (`crm-idemp-[action]-[entityId]-[timestamp]-[nonce]`).
- فور عودة الاتصال، يقوم `syncManager` بمحاولة المزامنة التلقائية مع تراجع أسي (Exponential Backoff: 1s, 2s, 4s, 8s...).
- إذا استنفدت المحاولات، تظهر حالة المزامنة بلون أحمر تحذيري مع زر `إعادة المزامنة يدوياً`.

### ب. النسخ الاحتياطي السحابي اليومي (Daily Automated Backups)
يتم تصدير قاعدة بيانات Firestore دورياً عبر Cloud Scheduler و Google Cloud Storage:
```bash
# أمر النسخ الاحتياطي التلقائي لمجموعات CRM الحساسة
gcloud firestore export gs://oneline-crm-backups/$(date +%Y-%m-%d) \
  --collection-ids='leads','deals','audit_logs','demands'
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

يجب تشغيل حزمة الاختبارات الآلية قبل أي عملية رفع (Deploy) إلى الإنتاج:

```bash
# 1. اختبارات الجودة والأمان ووظائف CRM الـ 63
node scripts/qa-test-suite.cjs

# 2. فحص سيناريوهات سير العمل الشامل والـ E2E الـ 32
node scripts/e2e-workflow-auditor.cjs

# 3. بناء نسخة الإنتاج والتحقق من عدم وجود أخطاء في التجميع
npm run build
```

يجب أن تحقق كافة الاختبارات نسبة نجاح **100%** لضمان الجاهزية التشغيلية للمنصة.
