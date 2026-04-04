#!/usr/bin/env node
// Structured audit of the current browser page via CDP.
// Outputs JSON with: section headings, field labels, nav items, border status.
// Usage: node dr-audit.js [--pretty]
'use strict';

const CDP = require('chrome-remote-interface');

const pretty = process.argv.includes('--pretty');

// This runs inside the browser — no Node.js APIs allowed here
const AUDIT_SCRIPT = `
(function audit() {
  const rgb2hex = (rgb) => {
    const m = rgb.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
    if (!m) return rgb;
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  };

  const hasArrowNearby = (el) => {
    // Check the element itself and its immediate parent for collapse/expand indicators
    const targets = [el, el.parentElement, el.closest('[class]')].filter(Boolean);
    for (const t of targets) {
      const html = t.innerHTML || '';
      if (
        t.querySelector('svg')            ||
        t.querySelector('button')         ||
        /chevron|arrow|collapse|expand|caret|toggle/i.test(t.className || '') ||
        /[▲▼▸▾›‹⌃⌄↑↓]/.test(html)
      ) return true;
    }
    return false;
  };

  const result = {
    url: location.href,
    sections: [],
    fieldLabels: [],
    navigation: [],
    borders: {},
  };

  // ── 1. Section headings ──────────────────────────────────────────────────
  // Elements that look like section/module headings:
  // visible, font-size ≥ 16px, font-weight ≥ 500, short text, no block children
  const seen = new Set();
  document.querySelectorAll('*').forEach(el => {
    if (!isVisible(el)) return;
    const text = (el.innerText || '').trim();
    if (!text || text.length > 80 || seen.has(text)) return;
    // Must be a leaf-ish text node (no significant child elements with own text)
    const childText = Array.from(el.children).map(c => (c.innerText || '').trim()).join('');
    if (childText.length > text.length * 0.5) return;

    const s = window.getComputedStyle(el);
    const fs = parseFloat(s.fontSize);
    const fw = parseFloat(s.fontWeight);
    if (fs < 16 || fw < 500) return;

    seen.add(text);
    result.sections.push({
      text,
      fontSize:          Math.round(fs),
      fontWeight:        Math.round(fw),
      color:             rgb2hex(s.color),
      hasCollapseControl: hasArrowNearby(el),
    });
  });

  // ── 2. Field labels (label / value pairs) ────────────────────────────────
  // Strategy: find rows where the first child looks like a label.
  // A label: font-weight ≥ 600, short text, inside a flex/grid container.
  const labelSeen = new Set();
  document.querySelectorAll('*').forEach(row => {
    if (!isVisible(row)) return;
    const children = Array.from(row.children).filter(isVisible);
    if (children.length < 2) return;

    const rowStyle = window.getComputedStyle(row);
    const isRowLayout = rowStyle.display === 'flex' || rowStyle.display === 'grid';
    if (!isRowLayout) return;

    const labelEl = children[0];
    const rawText = (labelEl.innerText || '').trim();
    if (!rawText || rawText.length > 60 || labelSeen.has(rawText)) return;

    const ls = window.getComputedStyle(labelEl);
    const fw = parseFloat(ls.fontWeight);
    if (fw < 500) return;

    labelSeen.add(rawText);

    const hasAsterisk = rawText.includes('*') ||
      !!labelEl.querySelector('[aria-label*="required"], [class*="required"], [class*="asterisk"]');
    const cleanText = rawText.replace(/\\*/g, '').trim();

    result.fieldLabels.push({
      text:       cleanText,
      hasAsterisk,
      fontWeight: Math.round(fw),
      color:      rgb2hex(ls.color),
      fontSize:   Math.round(parseFloat(ls.fontSize)),
    });
  });

  // ── 3. Navigation items ──────────────────────────────────────────────────
  const navSeen = new Set();
  const navCandidates = document.querySelectorAll(
    'nav a, nav li, aside a, aside li, [role="navigation"] a, [role="menuitem"]'
  );
  navCandidates.forEach(item => {
    if (!isVisible(item)) return;
    const text = (item.innerText || '').trim();
    if (!text || text.length > 60 || navSeen.has(text)) return;
    navSeen.add(text);

    const s = window.getComputedStyle(item);
    const isActive =
      item.classList.toString().toLowerCase().includes('active') ||
      item.getAttribute('aria-current') === 'page' ||
      parseFloat(s.fontWeight) > 500;

    result.navigation.push({
      text,
      isActive,
      color:      rgb2hex(s.color),
      fontWeight: Math.round(parseFloat(s.fontWeight)),
    });
  });

  // ── 4. Border status on key structural elements ──────────────────────────
  // Title bar: element containing a name + action buttons at the top
  const structuralCandidates = document.querySelectorAll(
    'header, [class*="header"], [class*="title-bar"], [class*="titlebar"], [class*="topbar"], [class*="toolbar"]'
  );
  structuralCandidates.forEach((el, i) => {
    if (!isVisible(el) || i > 2) return;
    const s = window.getComputedStyle(el);
    const key = 'element_' + i;
    result.borders[key] = {
      tag:                el.tagName.toLowerCase(),
      text:               (el.innerText || '').trim().slice(0, 60),
      borderBottom:       s.borderBottom,
      borderBottomWidth:  s.borderBottomWidth,
      borderBottomColor:  rgb2hex(s.borderBottomColor),
      hasBorderBottom:    s.borderBottomWidth !== '0px',
      boxShadow:          s.boxShadow !== 'none' ? s.boxShadow : null,
    };
  });

  return result;
})()
`;

async function run() {
  let client;
  try {
    client = await CDP({ port: 9222 });
  } catch {
    console.error('❌ Cannot connect to Chrome on port 9222. Make sure the Design Review Chrome window is open.');
    process.exit(1);
  }

  try {
    const { Runtime } = client;

    const { result, exceptionDetails } = await Runtime.evaluate({
      expression:   AUDIT_SCRIPT,
      returnByValue: true,
      awaitPromise:  false,
    });

    if (exceptionDetails) {
      console.error('❌ Script error:', exceptionDetails.text);
      process.exit(1);
    }

    const data = result.value;

    if (pretty) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(JSON.stringify(data));
    }

  } finally {
    if (client) await client.close();
  }
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
