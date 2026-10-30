import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAbout, sectionOn, visibleCompanyFacts, visibleTeam, featuredTeam, bioPoints, displayName, visibleGallery, waDigits, initials, moveItem, blankMember, LIMITS } from '../../src/utils/aboutProfile.js';

test('nothing saved yet: every section on, no facts, no team, no photos', () => {
  const a = normalizeAbout(undefined);
  assert.equal(Object.values(a.sections).every(Boolean), true);
  assert.deepEqual(visibleCompanyFacts(undefined), []);
  assert.deepEqual(visibleTeam(undefined), []);
  assert.deepEqual(visibleGallery(undefined), []);
});

test('a section switched off stays off', () => {
  assert.equal(sectionOn({ sections: { pillars: false } }, 'pillars'), false);
  assert.equal(sectionOn({ sections: { pillars: false } }, 'founder'), true);
});

test('company facts: only filled and switched on, English falls back to Arabic', () => {
  const about = { company: { founded: { value_ar: '2018' }, taxId: { value_ar: '123-456', visible: false }, coverage: { value_ar: 'سوهاج والقاهرة', value_en: 'Sohag & Cairo' }, hours: { value_ar: '  ' } } };
  assert.deepEqual(visibleCompanyFacts(about), [
    { key: 'founded', label: 'سنة التأسيس', value: '2018' },
    { key: 'coverage', label: 'مناطق العمل', value: 'سوهاج والقاهرة' }
  ]);
  assert.deepEqual(visibleCompanyFacts(about, false).map((f) => f.value), ['2018', 'Sohag & Cairo']);
});

test('team: grouped, hidden people and nameless cards left out, each field has its own switch', () => {
  const about = {
    team: [
      { id: 'a', group: 'management', name_ar: 'أحمد', role_ar: 'مدير', bio_ar: 'نبذة', photo: 'https://x/a.jpg', whatsapp: '01012345678', show: { whatsapp: true } },
      { id: 'b', group: 'advisors', name_ar: 'سارة', role_ar: 'مستشارة', bio_ar: 'نبذة', photo: 'https://x/b.jpg', show: { photo: false, bio: false } },
      { id: 'c', group: 'advisors', name_ar: 'مخفي', visible: false },
      { id: 'd', group: 'partners', name_ar: '' },
      { id: 'e', group: 'weird', name_ar: 'منى', whatsapp: '01099999999' }
    ]
  };
  const groups = visibleTeam(about);
  assert.deepEqual(groups.map((g) => g.id), ['management', 'advisors']);
  assert.deepEqual(groups[0].members[0], { id: 'a', name: 'أحمد', role: 'مدير', bio: 'نبذة', points: ['نبذة'], photo: 'https://x/a.jpg', photoPos: 'top', whatsapp: '201012345678', legal: false });
  assert.deepEqual(groups[1].members.map((m) => m.name), ['سارة', 'منى']);
  assert.equal(groups[1].members[0].photo, '');
  assert.equal(groups[1].members[0].bio, '');
  // WhatsApp is off unless switched on, even when a number is saved
  assert.equal(groups[1].members[1].whatsapp, '');
});

test('gallery: hidden photos and inline data left out, capped', () => {
  const about = { gallery: [{ url: 'https://x/1.jpg', caption_ar: 'المكتب' }, { url: 'https://x/2.jpg', visible: false }, { url: 'data:image/png;base64,AAA' }] };
  assert.deepEqual(visibleGallery(about).map((g) => [g.url, g.caption]), [['https://x/1.jpg', 'المكتب']]);
  const many = { gallery: Array.from({ length: 30 }, (_, i) => ({ url: `https://x/${i}.jpg` })) };
  assert.equal(normalizeAbout(many).gallery.length, LIMITS.gallery);
});

test('helpers: WhatsApp digits, initials, moving cards, blank card', () => {
  assert.equal(waDigits('0101 234 5678'), '201012345678');
  assert.equal(waDigits('+971 50 123 4567'), '971501234567');
  assert.equal(waDigits('123'), '');
  assert.equal(initials('د. محمود الباز'), 'م');
  assert.equal(initials('Sara Ali'), 'SA');
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(moveItem(['a', 'b'], 0, -1), ['a', 'b']);
  const m = blankMember('partners');
  assert.equal(m.group, 'partners');
  assert.equal(m.show.whatsapp, false);
});

test('the legal advisor is featured by default, shown once, and can be switched back to a normal card', () => {
  const advisor = { id: 'z', group: 'advisors', name_ar: 'ا.زكريا الحويج', role_ar: 'المستشار القانوني', bio_ar: '_ مدير عام الشهر العقاري بسوهاج سابقا\n_خبرة اكثر من 40 سنة في صياغة العقود \n_ محامي حر ', photo: 'https://x/z.jpg' };
  const about = { team: [advisor, { id: 's', group: 'advisors', name_ar: 'سارة', role_ar: 'مستشارة مبيعات' }] };
  const [f] = featuredTeam(about);
  assert.equal(f.name, 'أ. زكريا الحويج');
  assert.equal(f.legal, true);
  assert.deepEqual(f.points, ['مدير عام الشهر العقاري بسوهاج سابقا', 'خبرة اكثر من 40 سنة في صياغة العقود', 'محامي حر']);
  // not repeated in the grid below
  assert.deepEqual(visibleTeam(about).flatMap((g) => g.members.map((m) => m.id)), ['s']);
  // switched off in the CRM: back in the grid
  const off = { team: [{ ...advisor, featured: false }] };
  assert.deepEqual(featuredTeam(off), []);
  assert.equal(visibleTeam(off)[0].members[0].id, 'z');
  // anyone can be featured; a hidden card never is
  assert.equal(featuredTeam({ team: [{ name_ar: 'منى', featured: true }] }).length, 1);
  assert.equal(featuredTeam({ team: [{ ...advisor, visible: false }] }).length, 0);
});

test('bio points and title spelling', () => {
  assert.deepEqual(bioPoints('سطر واحد عادي - بشرطة'), ['سطر واحد عادي - بشرطة']);
  assert.deepEqual(bioPoints('• أولاً\n• ثانياً'), ['أولاً', 'ثانياً']);
  assert.deepEqual(bioPoints(''), []);
  assert.equal(displayName('د.محمود الباز'), 'د. محمود الباز');
  assert.equal(displayName('م. أحمد'), 'م. أحمد');
  assert.equal(displayName('Sara'), 'Sara');
});
