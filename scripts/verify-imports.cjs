const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allJsxFiles = getAllFiles('e:/New folder/Local Disk/Business/برمجه/موقع/src');
let totalErrors = 0;

allJsxFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract all imported identifiers (including multi-line)
  const importedIdentifiers = new Set();

  // Multi-line named imports: import { ... } from '...'
  const namedRegex = /import\s*\{([^}]+)\}\s*from/gs;
  let match;
  while ((match = namedRegex.exec(content)) !== null) {
    match[1].split(',').forEach(item => {
      const parts = item.trim().split(/\s+as\s+/);
      const name = parts[parts.length - 1].trim();
      if (name) importedIdentifiers.add(name);
    });
  }

  // Default imports: import Foo from '...' or import Foo, { ... } from '...'
  const defaultRegex = /import\s+([\w\d_$]+)\s*(?:,|\s+from)/g;
  while ((match = defaultRegex.exec(content)) !== null) {
    if (match[1]) importedIdentifiers.add(match[1].trim());
  }

  // Namespace imports: import * as Foo from '...'
  const nsRegex = /import\s*\*\s*as\s+([\w\d_$]+)\s+from/g;
  while ((match = nsRegex.exec(content)) !== null) {
    if (match[1]) importedIdentifiers.add(match[1].trim());
  }

  // Find all JSX tags <TagName ...
  const jsxTags = [...content.matchAll(/<([A-Z][a-zA-Z0-9_$]+)\b/g)].map(m => m[1]);
  const uniqueTags = [...new Set(jsxTags)];

  const standard = ['React', 'Fragment', 'Link', 'NavLink', 'Route', 'Routes', 'Navigate', 'BrowserRouter'];

  uniqueTags.forEach(tag => {
    if (standard.includes(tag)) return;
    const localDeclaration = new RegExp(`(?:const|let|var|function|class)\\s+${tag}\\b`).test(content);
    if (!importedIdentifiers.has(tag) && !localDeclaration) {
      console.error(`❌ In ${path.relative('e:/New folder/Local Disk/Business/برمجه/موقع', filePath)}: <${tag}> is used but NOT imported or declared!`);
      totalErrors++;
    }
  });
});

if (totalErrors === 0) {
  console.log(`🎉 100% CLEAN! Checked ${allJsxFiles.length} files. Zero missing JSX imports across the entire project!`);
} else {
  console.error(`⚠️ Found ${totalErrors} missing JSX imports.`);
}
