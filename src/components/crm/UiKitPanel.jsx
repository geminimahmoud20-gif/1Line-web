import { useState } from 'react';
import { m } from 'motion/react';
import { Bell, Download, Filter, Phone, Plus, Search, Trash2, TrendingUp, Users } from 'lucide-react';
import {
  Avatar, Badge, Button, Card, CardHeader, Chip, ConfirmProvider, Drawer, EmptyState, ErrorState, IconButton, Input,
  KpiRow, KpiTile, Modal, MotionRoot, PageHeader, SegmentedControl, Select, Skeleton, Table, Tabs, Textarea, Tooltip, useConfirm,
  motionPresets
} from '../ui';
import './ui-kit.css';

// System → UI kit (super admin only): every shared component in every state, in the current theme.
// Phase 3 screens are rebuilt from these parts; anything a screen needs that is missing here gets added here first.

const SWATCHES = [
  ['--ui-bg', 'الخلفية'], ['--ui-surface', 'سطح'], ['--ui-surface-2', 'سطح 2'], ['--ui-line', 'خط'],
  ['--ui-text', 'نص'], ['--ui-text-2', 'نص 2'], ['--ui-text-3', 'نص خافت'], ['--ui-primary', 'أساسي'],
  ['--ui-accent', 'ذهبي'], ['--ui-success', 'نجاح'], ['--ui-warning', 'تحذير'], ['--ui-danger', 'خطر'], ['--ui-info', 'معلومة']
];

const LEADS = [
  { id: 'l1', name: 'أحمد عبد العال', kind: 'معاينة', stage: 'جديد', tone: 'info', area: 'شرق سوهاج', age: 'من 12 دقيقة' },
  { id: 'l2', name: 'منى السيد', kind: 'بيع', stage: 'اتكلمنا', tone: 'primary', area: 'سوهاج الجديدة', age: 'من ساعتين' },
  { id: 'l3', name: 'كريم فؤاد', kind: 'شراء', stage: 'معاينة', tone: 'accent', area: 'حي الكوثر', age: 'امبارح' },
  { id: 'l4', name: 'سارة محمود', kind: 'مستثمر', stage: 'اتقفل', tone: 'success', area: 'غرب سوهاج', age: 'من 3 أيام' }
];

function DeleteDemo() {
  const confirm = useConfirm();
  const [done, setDone] = useState('');
  return (
    <div className="ui-kit__row">
      <Button
        variant="danger"
        icon={<Trash2 size={16} />}
        onClick={async () => {
          const ok = await confirm({ title: 'حذف العميل؟', message: 'هيتشال من القائمة ومن كل التقارير. مش هتقدر ترجّعه.', confirmLabel: 'احذف العميل' });
          setDone(ok ? 'اتحذف (تجربة)' : 'اتلغى');
        }}
      >
        حذف (تجربة تأكيد)
      </Button>
      {done && <span className="ui-kit__muted">{done}</span>}
    </div>
  );
}

function Kit() {
  const [tab, setTab] = useState('all');
  const [period, setPeriod] = useState('30');
  const [chip, setChip] = useState('new');
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);

  const toggle = (k) => setSelected((prev) => {
    const next = new Set(prev);
    if (k === 'all') return next.size === LEADS.length ? new Set() : new Set(LEADS.map((l) => l.id));
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  return (
    <div className="ui-kit ui-root">
      <PageHeader
        title="مكتبة التصميم"
        description="كل مكونات الـ CRM في مكان واحد، بالألوان والمقاسات الموحدة."
        actions={(
          <>
            <Button variant="secondary" icon={<Download size={16} />}>تصدير</Button>
            <Button icon={<Plus size={16} />}>إضافة عميل</Button>
          </>
        )}
        filters={(
          <>
            <Chip pressed={chip === 'new'} count={38} onClick={() => setChip('new')}>مستني أول رد</Chip>
            <Chip pressed={chip === 'today'} count={12} onClick={() => setChip('today')}>متابعة النهارده</Chip>
            <Chip pressed={chip === 'mine'} onClick={() => setChip('mine')}>عملائي</Chip>
            <Chip icon={<Filter size={14} />}>فلاتر</Chip>
          </>
        )}
      />

      <KpiRow label="أرقام اليوم">
        <KpiTile label="طلبات جديدة" value={38} icon={<Users size={16} />} delta={6} deltaLabel="عن امبارح" trend={[12, 18, 15, 22, 30, 28, 38]} />
        <KpiTile label="معاينات الأسبوع" value={13} icon={<TrendingUp size={16} />} hint="5 منهم بكرة" />
        <KpiTile label="قيمة الصفقات المفتوحة" value={15.5} digits={1} unit="مليون ج.م" delta={-2} deltaLabel="عن الأسبوع اللي فات" />
        <KpiTile label="العمولات المستحقة" value={null} hint="لسه مفيش صفقات اتقفلت" />
      </KpiRow>

      <Card>
        <CardHeader title="الألوان" description="24 لون بس في النهاري، ولكل واحد نسخة في الليلي." />
        <div className="ui-kit__swatches">
          {SWATCHES.map(([v, name]) => (
            <div key={v} className="ui-kit__swatch">
              <div className="ui-kit__chip" style={{ background: `var(${v})` }} />
              <span>{name}<br /><code>{v}</code></span>
            </div>
          ))}
        </div>
      </Card>

      <div className="ui-kit__grid">
        <Card>
          <CardHeader title="الخط" description="Alexandria، 8 أحجام بس." />
          <div className="ui-kit__stack ui-kit__type">
            <p style={{ fontSize: 'var(--ui-fs-8)', fontWeight: 'var(--ui-fw-bold)' }}>1,250,000 · 34</p>
            <p style={{ fontSize: 'var(--ui-fs-7)', fontWeight: 'var(--ui-fw-bold)' }}>رقم مهم · 28</p>
            <p style={{ fontSize: 'var(--ui-fs-6)', fontWeight: 'var(--ui-fw-bold)' }}>عنوان صفحة · 22</p>
            <p style={{ fontSize: 'var(--ui-fs-5)', fontWeight: 'var(--ui-fw-bold)' }}>عنوان كارت · 18</p>
            <p style={{ fontSize: 'var(--ui-fs-4)' }}>نص مهم وحقول الموبايل · 16</p>
            <p style={{ fontSize: 'var(--ui-fs-3)' }}>نص عادي وأزرار · 14</p>
            <p style={{ fontSize: 'var(--ui-fs-2)' }}>خلايا الجداول · 13</p>
            <p style={{ fontSize: 'var(--ui-fs-1)' }}>شارات وتفاصيل صغيرة · 12</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="الأزرار" />
          <div className="ui-kit__stack">
            <div className="ui-kit__row">
              <Button>أساسي</Button>
              <Button variant="secondary">ثانوي</Button>
              <Button variant="ghost">خفيف</Button>
              <Button variant="danger">خطر</Button>
            </div>
            <div className="ui-kit__row">
              <Button size="sm">صغير</Button>
              <Button size="lg">كبير</Button>
              <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
                {loading ? 'بيحفظ…' : 'حفظ (جرّب)'}
              </Button>
              <Button disabled>معطّل</Button>
            </div>
            <div className="ui-kit__row">
              <IconButton label="بحث" icon={<Search size={18} />} />
              <IconButton label="الإشعارات" icon={<Bell size={18} />} variant="secondary" />
              <Tooltip content="اتصال بالعميل"><IconButton label="اتصال" icon={<Phone size={18} />} variant="secondary" /></Tooltip>
            </div>
            <DeleteDemo />
          </div>
        </Card>

        <Card>
          <CardHeader title="الحقول" description="16px على الموبايل، والـ label إجباري." />
          <div className="ui-kit__stack">
            <Input label="اسم العميل" placeholder="مثال: أحمد عبد العال" required />
            <Input label="رقم الموبايل" inputMode="tel" hint="رقم مصري من 11 رقم" />
            <Input label="الميزانية" error="اكتب رقم بس" defaultValue="مليون" />
            <Select label="المنطقة" placeholder="اختار المنطقة" options={[{ value: 'east', label: 'شرق سوهاج' }, { value: 'new', label: 'سوهاج الجديدة' }]} />
            <Textarea label="ملاحظات" placeholder="أي تفاصيل من المكالمة" />
          </div>
        </Card>

        <Card>
          <CardHeader title="الشارات والتبويبات" />
          <div className="ui-kit__stack">
            <div className="ui-kit__row">
              <Badge>عادي</Badge>
              <Badge tone="primary" dot>جديد</Badge>
              <Badge tone="accent">مميز</Badge>
              <Badge tone="success" dot>اتقفل</Badge>
              <Badge tone="warning" dot>متأخر</Badge>
              <Badge tone="danger" dot>ضاع</Badge>
              <Badge tone="info">معاينة</Badge>
            </div>
            <Tabs
              label="نوع الطلب"
              value={tab}
              onChange={setTab}
              items={[{ id: 'all', label: 'الكل', count: 132 }, { id: 'view', label: 'معاينة', count: 41 }, { id: 'sell', label: 'بيع', count: 21 }, { id: 'buy', label: 'شراء', count: 67 }]}
            />
            <SegmentedControl label="الفترة" value={period} onChange={setPeriod} options={[{ value: '7', label: '7 أيام' }, { value: '30', label: '30 يوم' }, { value: '90', label: '90 يوم' }]} />
          </div>
        </Card>

        <Card>
          <CardHeader title="النوافذ" description="على الموبايل النافذة بتطلع من تحت." />
          <div className="ui-kit__row">
            <Button variant="secondary" onClick={() => setModal(true)}>افتح نافذة</Button>
            <Button variant="secondary" onClick={() => setDrawer(true)}>افتح درج العميل</Button>
          </div>
        </Card>

        <Card padding="flush">
          <EmptyState title="مفيش طلبات جديدة" description="أول ما يوصل طلب من الموقع هيظهر هنا وهيوصلك تنبيه." action={<Button size="sm" variant="secondary">اعرض كل الطلبات</Button>} />
        </Card>

        <Card padding="flush">
          <ErrorState title="البيانات ماتحمّلتش" description="النت فصل أو الخدمة مش متاحة دلوقتي." onRetry={() => {}} />
        </Card>

        <Card>
          <CardHeader title="تحميل" />
          <div className="ui-kit__stack">
            <Skeleton width="40%" height={20} />
            <Skeleton lines={3} />
          </div>
        </Card>
      </div>

      <Card padding="flush">
        <Table
          caption="عملاء تجريبيين"
          columns={[
            { key: 'name', label: 'العميل', sortable: true, render: (r) => (
              <span className="ui-kit__lead"><Avatar name={r.name} size="sm" /><span className="ui-kit__lead-name">{r.name}</span></span>
            ) },
            { key: 'kind', label: 'الطلب' },
            { key: 'stage', label: 'المرحلة', render: (r) => <Badge tone={r.tone} dot>{r.stage}</Badge> },
            { key: 'area', label: 'المنطقة' },
            { key: 'age', label: 'وصل', sortable: true }
          ]}
          rows={LEADS}
          sort={sort}
          onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
          selected={selected}
          onSelect={toggle}
          onRowClick={() => setDrawer(true)}
        />
      </Card>

      <m.div className="ui-kit__grid" variants={motionPresets.stagger()} initial="hidden" animate="show">
        {['ظهور متتابع', 'مرة واحدة بس', 'وبيتوقف لو الجهاز طالب حركة أقل'].map((t) => (
          <m.div key={t} variants={motionPresets.fadeUp}>
            <Card interactive><span className="ui-kit__lead-name">{t}</span></Card>
          </m.div>
        ))}
      </m.div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="إضافة عميل"
        description="العميل هيتسجل في صندوق الوارد على فريقك."
        footer={(<><Button variant="secondary" onClick={() => setModal(false)}>إلغاء</Button><Button onClick={() => setModal(false)}>حفظ</Button></>)}
      >
        <div className="ui-kit__stack">
          <Input label="الاسم" required data-autofocus />
          <Input label="الموبايل" inputMode="tel" required />
          <Select label="نوع الطلب" options={[{ value: 'view', label: 'معاينة' }, { value: 'buy', label: 'شراء' }]} />
        </div>
      </Modal>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="أحمد عبد العال"
        description="طلب معاينة · شرق سوهاج · من 12 دقيقة"
        footer={(<><Button variant="secondary" icon={<Phone size={16} />}>اتصال</Button><Button>استلمت الطلب</Button></>)}
      >
        <div className="ui-kit__stack">
          <div className="ui-kit__row"><Badge tone="info" dot>جديد</Badge><Badge>الموقع</Badge></div>
          <Skeleton lines={4} />
        </div>
      </Drawer>
    </div>
  );
}

export default function UiKitPanel() {
  return (
    <MotionRoot>
      <ConfirmProvider>
        <Kit />
      </ConfirmProvider>
    </MotionRoot>
  );
}
