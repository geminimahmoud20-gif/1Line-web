// scripts/crm-audit/audit-buttons-and-screens.mjs
// Comprehensive static & structural analysis of all CRM tabs, modals, and buttons.
import fs from 'node:fs';
import path from 'node:path';

const CRM_ROOT = path.resolve('src/components/crm');
const EXTRA_FILES = [
  path.resolve('src/components/CrmAdminPanel.jsx'),
  path.resolve('src/pages/CrmPage.jsx')
];

function getAllJsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllJsxFiles(fullPath));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = [...getAllJsxFiles(CRM_ROOT), ...EXTRA_FILES];

console.log(`Auditing ${files.length} CRM files for buttons, screens, and handlers...`);

const auditResults = {
  totalFiles: files.length,
  totalButtonsFound: 0,
  deadButtons: [],
  falseButtons: [],
  localOnlyButtons: [],
  firestoreButtons: [],
  permissionGuardedButtons: [],
  unprotectedButtons: [],
  screensInventory: []
};

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const baseName = path.basename(filePath);

  const screenName = baseName.replace(/\.(jsx|js)$/, '');
  auditResults.screensInventory.push({
    file: relPath,
    name: screenName,
    lineCount: content.split('\n').length
  });

  // Find all <button tags
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<button') || line.includes('<Button')) {
      auditResults.totalButtonsFound++;
      const lineNum = i + 1;
      
      // Grab surrounding context (next 15 lines) to parse attributes
      const snippet = lines.slice(i, Math.min(lines.length, i + 15)).join('\n');
      
      let onClickExpr = null;
      const onClickIdx = snippet.indexOf('onClick=');
      if (onClickIdx !== -1) {
        const after = snippet.slice(onClickIdx + 8).trim();
        if (after.startsWith('{')) {
          // balance curly braces
          let depth = 0;
          let endIdx = 0;
          for (let c = 0; c < after.length; c++) {
            if (after[c] === '{') depth++;
            else if (after[c] === '}') {
              depth--;
              if (depth === 0) {
                endIdx = c;
                break;
              }
            }
          }
          onClickExpr = after.slice(1, endIdx).trim();
        } else if (after.startsWith('"') || after.startsWith("'")) {
          const quote = after[0];
          const end = after.indexOf(quote, 1);
          onClickExpr = after.slice(1, end);
        }
      }

      // Extract label
      const tagEnd = snippet.indexOf('>');
      let label = '';
      if (tagEnd !== -1) {
        const closeTag = snippet.indexOf('</button', tagEnd);
        if (closeTag !== -1) {
          label = snippet.slice(tagEnd + 1, closeTag).replace(/<[^>]+>/g, '').trim().slice(0, 60);
        }
      }

      const buttonDef = {
        file: relPath,
        line: lineNum,
        label: label || '(Icon/Component)',
        onClick: onClickExpr ? onClickExpr.slice(0, 100) : null
      };

      // 1. Dead button check
      if (!onClickExpr || onClickExpr === '() => {}' || onClickExpr === '() => null' || onClickExpr === 'undefined') {
        auditResults.deadButtons.push({
          ...buttonDef,
          reason: !onClickExpr ? 'No onClick attribute' : 'Empty no-op handler'
        });
      } else if (
        // 2. False buttons
        (label.includes('طباعة') || label.includes('سند') || label.includes('جدول') || label.includes('فاتورة')) &&
        (onClickExpr.includes('window.print') || onClickExpr.includes('printReceipt')) &&
        !content.includes('setDoc') && !content.includes('addDoc') && !content.includes('updateDoc')
      ) {
        auditResults.falseButtons.push({
          ...buttonDef,
          reason: 'Calculates receipt/schedule in-memory and prints without persisting to Firestore'
        });
      } else if (
        // 3. Local-only button
        (onClickExpr.startsWith('() => set') || onClickExpr.startsWith('set')) &&
        !onClickExpr.includes('async') &&
        !content.includes('save') && !content.includes('update')
      ) {
        auditResults.localOnlyButtons.push(buttonDef);
      } else if (
        // 4. Backend action
        onClickExpr.includes('save') || onClickExpr.includes('update') || onClickExpr.includes('delete') ||
        onClickExpr.includes('handle') || onClickExpr.includes('submit') || onClickExpr.includes('onConfirm')
      ) {
        auditResults.firestoreButtons.push(buttonDef);
      }

      // Check permission guard in preceding 15 lines
      const prevContext = lines.slice(Math.max(0, i - 15), i + 1).join('\n');
      if (
        prevContext.includes('hasPerm') || prevContext.includes('canEdit') ||
        prevContext.includes('isSuperAdmin') || prevContext.includes('role ===') ||
        snippet.includes('disabled={!') || snippet.includes('disabled={!hasPerm')
      ) {
        auditResults.permissionGuardedButtons.push(buttonDef);
      } else {
        auditResults.unprotectedButtons.push(buttonDef);
      }
    }
  }
}

console.log('--- REFINED AUDIT RESULTS: BUTTONS & SCREENS ---');
console.log(`Total Screens Audited: ${auditResults.screensInventory.length}`);
console.log(`Total Buttons Cataloged: ${auditResults.totalButtonsFound}`);
console.log(`Dead Buttons Identified: ${auditResults.deadButtons.length}`);
console.log(`False Buttons Identified: ${auditResults.falseButtons.length}`);
console.log(`Local-Only Buttons: ${auditResults.localOnlyButtons.length}`);
console.log(`Backend Action Buttons: ${auditResults.firestoreButtons.length}`);
console.log(`Permission-Guarded Buttons: ${auditResults.permissionGuardedButtons.length}`);
console.log(`Unprotected Buttons: ${auditResults.unprotectedButtons.length}`);

const reportPath = path.resolve('scripts/crm-audit/buttons-audit-summary.json');
fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2), 'utf8');
console.log(`Saved detailed report to ${reportPath}`);
