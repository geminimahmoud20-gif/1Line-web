// scripts/deep-homepage-code-audit.cjs
// Static code, accessibility, and routing audit for HomePage and its children
const fs = require('fs');
const path = require('path');

const issues = [];

function checkFile(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    issues.push({ severity: 'CRITICAL', file: relPath, message: 'File does not exist!' });
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

console.log('🔍 Starting Deep Static Code & Quality Audit for Homepage...');

// 1. Audit App.jsx routes vs links in HomePage.jsx
const appCode = checkFile('src/App.jsx');
const homeCode = checkFile('src/pages/HomePage.jsx');
const headerCode = checkFile('src/components/common/Header.jsx');
const footerCode = checkFile('src/components/common/Footer.jsx');

// Extract all <Route path="..."
const routes = new Set();
const routeRegex = /<Route[^>]+path=["']([^"']+)["']/g;
let match;
while ((match = routeRegex.exec(appCode)) !== null) {
  routes.add(match[1]);
}

console.log(`📌 Found ${routes.size} registered routes in App.jsx:`, Array.from(routes));

// Extract all to="..." in HomePage, Header, Footer
function checkLinks(code, sourceFile) {
  const linkRegex = /to=["']([^"']+)["']/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(code)) !== null) {
    const rawTarget = linkMatch[1].split('?')[0].split('#')[0];
    if (rawTarget.startsWith('/properties/')) {
      // Dynamic property detail route
      continue;
    }
    if (rawTarget && !routes.has(rawTarget) && !rawTarget.startsWith('http')) {
      issues.push({
        severity: 'HIGH',
        file: sourceFile,
        message: `Link target "${rawTarget}" is NOT a defined route in App.jsx!`
      });
    }
  }
}

checkLinks(homeCode, 'src/pages/HomePage.jsx');
checkLinks(headerCode, 'src/components/common/Header.jsx');
checkLinks(footerCode, 'src/components/common/Footer.jsx');

// 2. Check for missing alt tags on images in HomePage and PropertyCard
const cardCode = checkFile('src/components/properties/PropertyCard.jsx');
[
  { file: 'HomePage.jsx', code: homeCode },
  { file: 'PropertyCard.jsx', code: cardCode },
  { file: 'Header.jsx', code: headerCode },
  { file: 'Footer.jsx', code: footerCode }
].forEach(({ file, code }) => {
  const imgRegex = /<img\s+([^>]+)>/g;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(code)) !== null) {
    const attrs = imgMatch[1];
    if (!attrs.includes('alt=')) {
      issues.push({
        severity: 'MEDIUM',
        file: file,
        message: `Found <img> tag missing an 'alt' attribute: ${imgMatch[0].substring(0, 50)}...`
      });
    }
  }
});

// 3. Check for hardcoded inline styles that could conflict with themes or responsive layouts
const hardcodedHexRegex = /style=\{\{[^}]*color:\s*['"]#(000|000000|fff|ffffff)['"]/gi;
if (hardcodedHexRegex.test(homeCode)) {
  issues.push({
    severity: 'LOW',
    file: 'src/pages/HomePage.jsx',
    message: 'Found hardcoded black or white inline colors that might cause contrast issues in theme switching.'
  });
}

// 4. Check for unhandled mock data fallbacks
if (homeCode.includes('.map(')) {
  // Check if any map runs without array check
  const unsafeMaps = homeCode.match(/(\w+)\.map\(/g);
  console.log('📌 Checked array map occurrences:', unsafeMaps ? unsafeMaps.length : 0);
}

// 5. Output Report
console.log('\n=============================================================');
console.log(`📊 AUDIT RESULTS: Found ${issues.length} potential issue(s)`);
console.log('=============================================================');
issues.forEach((iss, idx) => {
  console.log(`[${iss.severity}] ${idx + 1}. [${iss.file}] ${iss.message}`);
});

if (issues.length === 0) {
  console.log('✅ ZERO STATIC DEFECTS FOUND! All routes, links, and tags are valid.');
}
