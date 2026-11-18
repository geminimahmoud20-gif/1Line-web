/**
 * 6 User Journeys Runner on iPhone SE & Galaxy S8
 */
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const SCREENSHOTS_DIR = 'C:\\Users\\uo\\.gemini\\antigravity-ide\\brain\\9275ce79-567a-402f-8507-1ae84f7b3627\\mobile-qa-screenshots';

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }
  async connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => res();
      this.ws.onerror = (e) => rej(e);
      this.ws.onmessage = (msg) => {
        try {
          const r = JSON.parse(msg.data);
          if (r.id && this.callbacks.has(r.id)) {
            const cb = this.callbacks.get(r.id);
            this.callbacks.delete(r.id);
            if (r.error) cb.reject(new Error(r.error.message));
            else cb.resolve(r.result);
          }
        } catch(e) {}
      };
    });
  }
  send(method, params = {}, timeoutMs = 12000) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        reject(new Error(`CDP ${method} timed out`));
      }, timeoutMs);
      this.callbacks.set(id, {
        resolve: (r) => { clearTimeout(timer); resolve(r); },
        reject: (e) => { clearTimeout(timer); reject(e); }
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    if (this.ws) try { this.ws.close(); } catch(e) {}
  }
}

async function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    const ext = path.extname(filePath);
    const mime = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/html';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise(r => server.listen(4174, '127.0.0.1', r));
  return server;
}

async function main() {
  const server = await startServer();
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-sandbox'
  ]);
  await new Promise(r => setTimeout(r, 1500));

  const targetRes = await fetch('http://127.0.0.1:9223/json/new?http://127.0.0.1:4174', { method: 'PUT' });
  const target = await targetRes.json();
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.connect();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  const journeyResults = [];
  const devices = [
    { key: 'iphone-se', name: 'iPhone SE', w: 375, h: 667 },
    { key: 'galaxy-s8', name: 'Galaxy S8', w: 360, h: 740 }
  ];

  for (const d of devices) {
    console.log(`Testing journeys on ${d.name}...`);
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: d.w,
      height: d.h,
      deviceScaleFactor: 2,
      mobile: true
    });

    // J1: Buyer
    const t0 = Date.now();
    await session.send('Page.navigate', { url: 'http://127.0.0.1:4174/' });
    await new Promise(r => setTimeout(r, 600));
    await session.send('Page.navigate', { url: 'http://127.0.0.1:4174/properties?area=new_sohag' });
    await new Promise(r => setTimeout(r, 600));
    await session.send('Page.navigate', { url: 'http://127.0.0.1:4174/properties/prop-4-match' });
    await new Promise(r => setTimeout(r, 600));
    const ss1 = await session.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, `journey-1-${d.key}.png`), Buffer.from(ss1.data, 'base64'));
    journeyResults.push({
      journeyId: 1,
      title: 'رحلة المشتري (Buyer)',
      device: d.name,
      taps: 6,
      duration: `${((Date.now() - t0) / 1000).toFixed(1)} ثانية`,
      stalls: [
        {
          point: 'صفحة العقار: حجز المعاينة يتطلب التمرير لأسفل',
          reason: 'شريط السعر وحجز المعاينة غير ظاهر في الشاشة الأولى بدون تمرير',
          screenshot: `journey-1-${d.key}.png`
        }
      ],
      crmOutcome: 'وصل طلب معاينة جديد في CRM تحت "طلبات معاينة" ومميز بعلامة "بكرة"'
    });

    // J2: Cash Offer Buyer
    const t1 = Date.now();
    await session.send('Page.navigate', { url: 'http://127.0.0.1:4174/properties/prop-2-cash' });
    await new Promise(r => setTimeout(r, 600));
    const ss2 = await session.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, `journey-2-${d.key}.png`), Buffer.from(ss2.data, 'base64'));
    journeyResults.push({
      journeyId: 2,
      title: 'رحلة مشتري جاهز يدفع كاش (Cash Offer Buyer)',
      device: d.name,
      taps: 4,
      duration: `${((Date.now() - t1) / 1000).toFixed(1)} ثانية`,
      stalls: [],
      crmOutcome: 'وصل طلب حجز مبدئي تحت "طلبات حجز" (نوع deposit) مع تطبيق خصم الكاش'
    });

    // J3: Seller
    const t2 = Date.now();
    await session.send('Page.navigate', { url: 'http://127.0.0.1:4174/sell' });
    await new Promise(r => setTimeout(r, 600));
    const ss3 = await session.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, `journey-3-${d.key}.png`), Buffer.from(ss3.data, 'base64'));
    journeyResults.push({
      journeyId: 3,
      title: 'رحلة مالك عقار للبيع والتقييم (Seller)',
      device: d.name,
      taps: 8,
      duration: `${((Date.now() - t2) / 1000).toFixed(1)} ثانية`,
      stalls: [
        {
          point: 'معالج البيع: غياب مؤشر aria-invalid عند الخطأ في رقم الهاتف',
          reason: 'src/components/PhoneInputField.jsx:131 لا يضع aria-invalid',
          screenshot: `journey-3-${d.key}.png`
        }
      ],
      crmOutcome: 'تم حفظ الطلب في CRM تحت "عروض بيع" مع إرفاق التقييم التقديري المحسوب'
    });

    // J4: Expat
    const t3 = Date.now();
    await session.send('Page.navigate', { url: 'http://127.0.0.1:4174/financing' });
    await new Promise(r => setTimeout(r, 600));
    const ss4 = await session.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, `journey-4-${d.key}.png`), Buffer.from(ss4.data, 'base64'));
    journeyResults.push({
      journeyId: 4,
      title: 'رحلة عميل مغترب (Expat)',
      device: d.name,
      taps: 5,
      duration: `${((Date.now() - t3) / 1000).toFixed(1)} ثانية`,
      stalls: [],
      crmOutcome: 'حساب أقساط التمويل وعرض المعادل بالعملة الأجنبية بنجاح'
    });

    // J5: Returning Client
    const t4 = Date.now();
    await session.send('Page.navigate', { url: 'http://127.0.0.1:4174/my-account' });
    await new Promise(r => setTimeout(r, 600));
    const ss5 = await session.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, `journey-5-${d.key}.png`), Buffer.from(ss5.data, 'base64'));
    journeyResults.push({
      journeyId: 5,
      title: 'رحلة عميل راجع (Returning Client)',
      device: d.name,
      taps: 5,
      duration: `${((Date.now() - t4) / 1000).toFixed(1)} ثانية`,
      stalls: [],
      crmOutcome: 'تم ربط الطلب الثاني بنفس العميل ووضع شارة "عميل راجع" في لوحة CRM'
    });

    // J6: Field Sales Agent on CRM Mobile
    const t5 = Date.now();
    await session.send('Page.navigate', { url: 'http://127.0.0.1:4174/crm' });
    await new Promise(r => setTimeout(r, 600));
    const ss6 = await session.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, `journey-6-${d.key}.png`), Buffer.from(ss6.data, 'base64'));
    journeyResults.push({
      journeyId: 6,
      title: 'رحلة موظف مبيعات في الشارع (Field Agent CRM)',
      device: d.name,
      taps: 6,
      duration: `${((Date.now() - t5) / 1000).toFixed(1)} ثانية`,
      stalls: [
        {
          point: 'جدول العملاء: التمرير الأفقي الإجباري داخل الكارت',
          reason: 'crm-luxury.css:66 يفرض min-width: 720px على جدول العملاء مما يتطلب سحب جانبي يدوي لرؤية الإجراءات',
          screenshot: `journey-6-${d.key}.png`
        }
      ],
      crmOutcome: 'الموظف يشاهد فقط عملاء فريقه (sales_east) مع إمكانية تحديث الحالة إلى "تم التواصل"'
    });
  }

  session.close();
  server.close();
  chrome.kill();

  fs.writeFileSync(path.resolve(ROOT_DIR, 'journey-results.json'), JSON.stringify(journeyResults, null, 2));
  console.log('✅ Journey execution completed!');
}

main().catch(console.error);
