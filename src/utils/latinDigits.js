// =============================================================
//  One digit style across the whole site: 0-9.
//  The code formats numbers and dates with Latin digits, but text that comes from the database
//  or is typed by staff can still contain Arabic-Indic (٠-٩) or Persian (۰-۹) digits. This keeps
//  what is rendered consistent: it rewrites those digits in text nodes as they appear.
//  Form fields (input/textarea/contenteditable), scripts and styles are left alone.
// =============================================================

// Also the Arabic thousands separator (U+066C) and decimal point (U+066B) that come with those digits
const NON_LATIN_DIGITS = /[٠-٩۰-۹٫٬]/;
const NON_LATIN_DIGITS_G = /[٠-٩۰-۹٫٬]/g;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE']);

export const toLatinDigits = (value) =>
  String(value ?? '').replace(NON_LATIN_DIGITS_G, (d) => {
    const c = d.charCodeAt(0);
    if (c === 0x066C) return ',';
    if (c === 0x066B) return '.';
    return String(c >= 0x06F0 ? c - 0x06F0 : c - 0x0660);
  });

const skipped = (node) => {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (SKIP.has(el.tagName) || el.isContentEditable) return true;
  }
  return false;
};

const fixTextNode = (node) => {
  const text = node.nodeValue;
  if (text && NON_LATIN_DIGITS.test(text) && !skipped(node)) node.nodeValue = toLatinDigits(text);
};

const fixTree = (root) => {
  if (root.nodeType === Node.TEXT_NODE) return fixTextNode(root);
  if (root.nodeType !== Node.ELEMENT_NODE || SKIP.has(root.tagName)) return;
  // Cheap check first: most inserted subtrees contain no such digit at all
  if (!NON_LATIN_DIGITS.test(root.textContent || '')) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) fixTextNode(n);
};

let installed = false;

export function installLatinDigits() {
  if (installed || typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  installed = true;
  const start = () => {
    fixTree(document.body);
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') fixTextNode(r.target);
        else r.addedNodes.forEach(fixTree);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}
