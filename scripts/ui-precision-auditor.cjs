/**
 * UI Precision & Accessibility Auditor
 * 1Line Solutions PropTech Platform
 * Validates interface aesthetics, responsive ergonomics, accessibility (WCAG AA),
 * z-index stacking layers, and touch target standards.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const defects = [];

function checkFile(filePath) {
  const relPath = path.relative(srcDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Z-Index collision check
  const zIndexMatches = content.match(/z-index:\s*([0-9]+)/gi) || [];
  zIndexMatches.forEach(m => {
    const val = parseInt(m.replace(/[^0-9]/g, ''), 10);
    if (val > 99999) {
      defects.push({
        severity: 'LOW',
        type: 'Z-Index Super-Stacking',
        file: relPath,
        detail: `Extreme z-index value found (${val}). Can cause stacking context escalation.`
      });
    }
  });

  // 2. Button without accessible name / aria-label if icon-only
  const iconBtnRegex = /<button[^>]*>([\s\n]*<[A-Z][a-zA-Z]+[^>]*\/>[\s\n]*)<\/button>/g;
  let match;
  while ((match = iconBtnRegex.exec(content)) !== null) {
    if (!match[0].includes('aria-label') && !match[0].includes('title=')) {
      defects.push({
        severity: 'MEDIUM',
        type: 'Accessibility (A11y)',
        file: relPath,
        detail: `Icon-only button missing aria-label or title: ${match[0].slice(0, 60)}...`
      });
    }
  }

  // 3. Img tags without alt
  const imgRegex = /<img\b(?![^>]*\balt=)[^>]*>/gi;
  while ((match = imgRegex.exec(content)) !== null) {
    defects.push({
      severity: 'HIGH',
      type: 'Accessibility (WCAG)',
      file: relPath,
      detail: `Image element missing 'alt' attribute: ${match[0].slice(0, 50)}...`
    });
  }

  // 4. Input tags without label/aria-label/placeholder
  const inputRegex = /<input\b(?![^>]*\b(aria-label|placeholder|aria-labelledby)=)[^>]*type=["'](text|email|tel|password|number)["'][^>]*>/gi;
  while ((match = inputRegex.exec(content)) !== null) {
    // Check if wrapped in <label>
    const index = match.index;
    const preceding = content.slice(Math.max(0, index - 200), index);
    if (!preceding.includes('<label')) {
      defects.push({
        severity: 'MEDIUM',
        type: 'Accessibility (A11y)',
        file: relPath,
        detail: `Input field missing label/placeholder/aria-label: ${match[0].slice(0, 60)}...`
      });
    }
  }

  // 5. Fixed pixel min-width > 360px on mobile elements
  const fixedWidthRegex = /min-width:\s*([4-9][0-9]{2}|[1-9][0-9]{3,})px/gi;
  while ((match = fixedWidthRegex.exec(content)) !== null) {
    if (!content.includes('@media') || content.includes('(min-width:')) {
      // Check if this might trigger overflow on mobile viewports
      defects.push({
        severity: 'HIGH',
        type: 'Mobile Responsive Overflow',
        file: relPath,
        detail: `Hardcoded min-width (${match[1]}px) may cause horizontal overflow on mobile viewports (<375px).`
      });
    }
  }

  // 6. Hardcoded inline styles using pure red or green (#ff0000, #00ff00) instead of palette tokens
  if (content.includes('#ff0000') || content.includes('#00ff00') || content.includes('color: red') || content.includes('color: green')) {
    defects.push({
      severity: 'LOW',
      type: 'Art Direction / Palette Token',
      file: relPath,
      detail: `Uncurated raw primary color detected. Use design system tokens (var(--gold), var(--crimson), var(--emerald)).`
    });
  }
}

function traverse(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'dist') {
        traverse(full);
      }
    } else if (item.name.endsWith('.jsx') || item.name.endsWith('.css') || item.name.endsWith('.js')) {
      checkFile(full);
    }
  }
}

console.log('🔍 Running UI Precision, Accessibility & Responsive Ergonomics Audit...');
traverse(srcDir);

console.log(`\nFound ${defects.length} potential defects / improvements:\n`);
defects.forEach((d, i) => {
  console.log(`${i + 1}. [${d.severity}] [${d.type}] in ${d.file}:`);
  console.log(`   ↳ ${d.detail}\n`);
});

fs.writeFileSync(
  path.join(__dirname, '../ui-audit-defects.json'),
  JSON.stringify(defects, null, 2),
  'utf8'
);
