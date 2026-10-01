# المساهمة في 1Line

## قبل أي commit

```bash
npm run lint -- --max-warnings=0   # صفر تحذيرات (فيه حارس ألوان الـ CRM)
npm run test:unit
npm run test:rules                 # قواعد Firestore على المحاكي — محتاج Java 11+
npm run build
```

الـ CI بيشغّل نفس الأوامر دي مع كل push و Pull Request.

## رسالة الـ commit

السطر الأول يقول **الـ commit بيعمل إيه**، مش "update":

```
إصلاح ضياع الطلبات لما الزائر يبعت من غير إنترنت
Fix lost leads when the visitor submits offline
```

ولو السبب مش واضح، سيب سطر فاضي واكتب الشرح تحته.

`npm install` بيفعّل تلقائياً:
- قالب الرسالة (`.gitmessage`)
- فحص محلي (`.githooks/commit-msg`) بيرفض رسائل زي `update` و`fix` و`تحديث` والرسائل الأقصر من 12 حرف.

ونفس الفحص بيتعمل في الـ CI على كل commit جديد.

## ألوان الـ CRM

استخدم متغيرات `--crm-*` من `src/styles/luxury-system.css` بدل الألوان المكتوبة يدوي، عشان الوضع الفاتح والداكن يشتغلوا مع بعض. الـ lint بيرفض الـ hex ومتغيرات الموقع القديمة (`--primary`، `--accent-gold`…) جوه ستايلات الـ CRM.

## الأمان

قبل ما تنشر أي تعديل في `firestore.rules` شغّل `npm run test:rules`، وراجع ترتيب النشر في [دليل التشغيل](docs/CRM_ENTERPRISE_RUNBOOK.md#7-نشر-التحديث-الأمني-ترتيب-الخطوات-مهم).
