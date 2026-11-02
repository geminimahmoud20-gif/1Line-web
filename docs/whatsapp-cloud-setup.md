# ربط واتساب بالـ CRM (WhatsApp Cloud API)

بعد الربط، أي رسالة توصل على رقم الشركة بتتسجل لوحدها عميل في «العملاء». بيتسجل معاها رقم العميل الحقيقي واسمه على واتساب ورسالته. ولو الرسالة فيها «رقم المرجع: W-…»، بتتربط بالوحدة أو الصفحة اللي العميل داس منها على زرار واتساب.

- العميل بيتسجل مرة واحدة لكل رقم. الرسايل اللي بعد كده بتحدّث نفس العميل: آخر رسالة وعدد الرسايل.
- العميل الجديد بيبقى «جديد» ومش متوزع على حد. رقمه بيتحفظ في نفس المكان المحمي اللي فيه أرقام باقي العملاء.
- اللي فتح الواتساب وما بعتش رسالة مش هيتسجل، لأن رقمه عمره ما وصلنا.

## الخطوات

1. **حساب Meta Business:** من business.facebook.com، وكمّل توثيق الشركة.
2. **تطبيق على Meta for Developers:** من developers.facebook.com → My Apps → Create App → نوع Business، وبعدين ضيف منتج **WhatsApp**.
3. **ضيف رقم الشركة** في WhatsApp → API Setup.
   - لو الرقم شغال على تطبيق **واتساب بيزنس** وعايز تكمّل عليه، اختار طريقة الربط اللي بتسيب التطبيق شغال (Coexistence / "Connect your existing WhatsApp Business app").
   - لو لأ، الرقم بينتقل للـ API بالكامل.
4. **اعمل Webhook في Meta:** من WhatsApp → Configuration → Webhook.
   - Callback URL: `https://www.1lineestate.com/api/whatsapp-webhook`
   - Verify token: أي نص طويل عشوائي، وهو نفسه اللي هتحطه في `WHATSAPP_VERIFY_TOKEN` في الخطوة 5.
   - بعد ما يتأكد، اعمل **Subscribe** على حقل `messages`.
5. **ضيف المتغيرات في Vercel:** من Project → Settings → Environment Variables، ونوعها Production. أضف الأول، وبعدين اعمل Redeploy قبل ما تدوس Verify في الخطوة 4.

| المتغير | القيمة |
| :--- | :--- |
| `WHATSAPP_VERIFY_TOKEN` | نفس النص اللي في الخطوة 4 |
| `WHATSAPP_APP_SECRET` | App settings → Basic → App secret |
| `WHATSAPP_CLOUD_PHONE_ID` | اختياري: Phone number ID من صفحة API Setup |
| `FIREBASE_SERVICE_ACCOUNT` | موجود بالفعل (بتستخدمه باقي الخدمات) |

6. **التجربة:** ابعت رسالة لرقم الشركة من موبايل تاني. المفروض العميل يظهر في الـ CRM → العملاء ومصدره «واتساب» خلال ثواني.

لو المتغيرات مش موجودة، الرابط بيرد 503، وباقي الموقع بيكمّل عادي.
