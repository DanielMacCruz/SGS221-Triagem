// ==UserScript==
// @name         TRIAGEM - SMAX SGS221
// @namespace    https://github.com/DanielMacCruz/SGS221-Triagem
// @version      0.4
// @description  Interface enhancements for triagem workflow
// @author       YOU
// @match        https://suporte.tjsp.jus.br/saw/Requests*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @downloadURL  https://github.com/DanielMacCruz/SGS221-Triagem/raw/refs/heads/main/TRIAGEM%20-%20SMAX%20SGS221-0.1.user.js
// @updateURL    https://github.com/DanielMacCruz/SGS221-Triagem/raw/refs/heads/main/TRIAGEM%20-%20SMAX%20SGS221-0.1.user.js
// @homepageURL  https://github.com/DanielMacCruz/SGS221-Triagem
// @supportURL   https://chatgpt.com
// ==/UserScript==

(() => {
  'use strict';

  if (window.top && window.top !== window.self) return;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const getPageCKEditor = () => (pageWindow && pageWindow.CKEDITOR ? pageWindow.CKEDITOR : null);

  /* =========================================================
   * Preferences
   * =======================================================*/
  const PrefStore = (() => {
    const defaults = {
      nameBadgesOn: true,
      collapseOn: false,
      enlargeCommentsOn: true,
      flagSkullOn: true,
      nameGroups: {},
      ausentes: [],
      nameColors: {},
      enableRealWrites: false,
      defaultGlobalChangeId: '',
      personalFinalsRaw: ''
    };

    const state = JSON.parse(JSON.stringify(defaults));

    const load = () => {
      try {
        const saved = GM_getValue('smax_prefs');
        if (!saved) return;
        const parsed = JSON.parse(saved);
        Object.assign(state, defaults, parsed || {});
        console.log('[SMAX] Preferences loaded:', state);
      } catch (err) {
        console.warn('[SMAX] Failed to load preferences:', err);
      }
    };

    const save = () => {
      try {
        GM_setValue('smax_prefs', JSON.stringify(state));
        console.log('[SMAX] Preferences saved:', state);
      } catch (err) {
        console.error('[SMAX] Failed to save preferences:', err);
      }
    };

    load();
    return { state, save, defaults };
  })();

  const prefs = PrefStore.state;
  const savePrefs = PrefStore.save;

  /* =========================================================
   * Styles
   * =======================================================*/
  GM_addStyle(`
    .slick-cell.tmx-namecell { font-weight:700 !important; transition: box-shadow .15s ease; }
    .slick-cell.tmx-namecell a { color: inherit !important; }
    .slick-cell.tmx-namecell:focus-within { outline: 2px solid rgba(0,0,0,.25); outline-offset: 2px; }
    .slick-cell.tmx-namecell:hover { box-shadow: 0 0 0 2px rgba(0,0,0,.08) inset; }

    .comment-items { height: auto !important; max-height: none !important; }

    .smax-absent-wrapper { display:inline-flex; align-items:center; gap:4px; cursor:pointer; font-size:12px; white-space:nowrap; }
    .smax-absent-input { position:absolute; opacity:0; pointer-events:none; }
    .smax-absent-box { width:14px; height:14px; border:1px solid #555; border-radius:2px; background:#fff; box-sizing:border-box; }
    .smax-absent-input:checked + .smax-absent-box { background:#d32f2f; border-color:#d32f2f; box-shadow:0 0 0 1px #d32f2f; }

    #smax-settings-btn { width:50px; height:50px; border-radius:50%; border:none; background:#0f172a; color:#f8fafc; font-size:26px; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,.35); cursor:pointer; }
    #smax-settings-btn:hover { background:#1f2937; }
    #smax-refresh-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 999998; display: none; align-items: center; justify-content: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #smax-refresh-overlay-inner { width:70px; height:70px; border-radius:50%; background:#34c759; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 2px rgba(255,255,255,.35), 0 0 16px rgba(52,199,89,.8); }
    #smax-refresh-now { width:46px; height:46px; border-radius:50%; border:none; background:transparent; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:26px; }

    #smax-triage-start-btn { position:fixed; left:50%; bottom:18px; transform:translateX(-50%); z-index:999999; padding:10px 22px; border-radius:999px; border:none; cursor:pointer; font-size:16px; font-weight:600; background:#1976d2; color:#fff; box-shadow:0 4px 12px rgba(0,0,0,.35); }
    #smax-triage-hud-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:999997; display:none; align-items:center; justify-content:center; }
    #smax-triage-hud { position:relative; background:#111827; color:#e5e7eb; border-radius:12px; padding:16px 18px 14px; max-width:990px; width:99vw; max-height:95vh; box-shadow:0 20px 45px rgba(0,0,0,.7); font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; display:flex; flex-direction:column; gap:10px; }
    #smax-triage-hud-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; gap:10px; }
    #smax-triage-hud-header h3 { margin:0; font-size:15px; line-height:1.2; }
    #smax-triage-hud-header .smax-triage-title-bar { display:flex; align-items:center; gap:10px; flex:1; }
    #smax-personal-finals-label { display:flex; align-items:center; gap:6px; font-size:11px; color:#94a3b8; }
    #smax-personal-finals-input { background:#0f172a; border:1px solid #1f2937; border-radius:999px; padding:2px 8px; color:#f8fafc; font-size:11px; min-width:120px; }
    #smax-personal-finals-input::placeholder { color:#6b7280; }
    #smax-triage-hud-body { background:#020617; border-radius:8px; padding:12px 14px; min-height:120px; flex:1; overflow:auto; }
    #smax-triage-hud-footer { display:flex; flex-direction:column; gap:12px; }
    .smax-triage-top-row { display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center; }
    .smax-triage-inline-controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .smax-triage-main-actions { display:flex; flex-direction:column; gap:4px; align-items:flex-end; min-width:210px; }
    .smax-triage-main-actions-buttons { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
    .smax-triage-urg-group { display:flex; flex-wrap:wrap; gap:6px; }
    .smax-triage-global-group { display:flex; flex-wrap:wrap; gap:6px; align-items:center; font-size:12px; color:#e5e7eb; }
    #smax-triage-guide-btn { padding:4px 10px; border-radius:999px; border:1px solid #374151; background:transparent; color:#cbd5f5; font-size:12px; cursor:pointer; }
    #smax-triage-guide-btn:hover { background:#1f2937; }
    #smax-quick-guide-panel { position:absolute; top:54px; right:20px; width:260px; background:#020617; border:1px solid #1f2937; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.55); padding:12px 14px; font-size:12px; color:#e2e8f0; display:none; z-index:5; }
    #smax-quick-guide-panel h4 { margin:0 0 6px; font-size:13px; }
    #smax-quick-guide-panel ul { margin:0; padding-left:16px; }
    #smax-quick-guide-panel li { margin-bottom:4px; line-height:1.35; }
    .smax-triage-primary { padding:8px 16px; border-radius:999px; border:none; cursor:pointer; background:#22c55e; color:#022c22; font-weight:600; }
    .smax-triage-secondary { padding:6px 12px; border-radius:999px; border:1px solid #4b5563; background:transparent; color:#e5e7eb; cursor:pointer; font-size:13px; }
    .smax-triage-chip { transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.08s ease; }
    .smax-triage-chip[data-active="true"], .smax-triage-chip[data-active="selected"] { box-shadow:0 0 0 1px rgba(250,250,250,0.7), 0 0 18px rgba(250,250,250,0.55); transform:translateY(-1px) scale(1.01); }
    .smax-urg-low[data-active="true"]  { background:#facc15;color:#111827;border-color:#facc15; }
    .smax-urg-med[data-active="true"]  { background:#fb923c;color:#111827;border-color:#fb923c; }
    .smax-urg-high[data-active="true"] { background:#f97316;color:#111827;border-color:#f97316; }
    .smax-urg-crit[data-active="true"] { background:#ef4444;color:#fee2e2;border-color:#ef4444; }
    #smax-triage-assign-owner[data-active="ready"] { background:#ababab;color:#808080;border-color:#ababab; }
    #smax-triage-assign-owner[data-active="selected"] { background:#22c55e;color:#022c22;border-color:#22c55e; }
    #smax-triage-link-global[data-active="ready"] { background:#dbeafe;color:#1d4ed8;border-color:#bfdbfe; }
    #smax-triage-link-global[data-active="selected"] { background:#3b82f6;color:#e5f0ff;border-color:#3b82f6; }
    #smax-triage-status { font-size:12px; color:#9ca3af; }
    #smax-triage-ticket-details { background:#0f172a; border:1px solid #1f2937; border-radius:8px; padding:10px 12px 8px; min-height:100px; max-height:240px; overflow:auto; }
    #smax-triage-ticket-details img { max-width:100%; height:auto; display:block; border-radius:6px; margin-top:6px; }
    #smax-triage-hud-body .smax-triage-desc { max-height:240px; overflow:auto; padding:6px 8px; border-radius:6px; background:#020617; border:1px solid #1f2937; }
    .smax-triage-meta-row { display:flex; flex-wrap:wrap; gap:14px; font-size:13px; color:#cbd5f5; margin-bottom:4px; }
    .smax-triage-meta-row strong { color:#f1f5f9; }
    #smax-triage-quickreply-card { border:1px solid #1f2937; border-radius:8px; padding:10px; background:#020617; width:100%; box-sizing:border-box; transition:border-color 0.2s ease, box-shadow 0.2s ease; }
    #smax-triage-quickreply-card[data-staged="true"] { border-color:#38bdf8; box-shadow:0 0 12px rgba(56,189,248,0.35); }
    #smax-triage-quickreply-card textarea { width:100%; min-height:140px; resize:vertical; background:#020617; color:#e5e7eb; border:1px solid #374151; border-radius:6px; padding:8px; font-family:"Segoe UI",sans-serif; box-sizing:border-box; }
    #smax-triage-quickreply-card .cke { width:100% !important; max-width:100%; box-sizing:border-box; }
    #smax-triage-hud .cke { z-index:1000000 !important; }
    body .cke_panel, body .cke_combopanel, body .cke_panel_block { z-index:1000003 !important; }
    body .cke_dialog, body .cke_dialog_container, body .cke_dialog_body, body .cke_dialog_background_cover { z-index:1000005 !important; }
    body .cke_colorauto .cke_colorbox_color { background-color:#000 !important; }
    body .cke_colorauto .cke_colorbox { border-color:#000 !important; }
    body .cke_colorauto { color:#f5f5f5 !important; }
  `);

  /* =========================================================
   * Utilities
   * =======================================================*/
  const Utils = (() => {
    const debounce = (fn, wait = 120) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
      };
    };

    const getGridViewport = (root = document) => root.querySelector('.slick-viewport') || root;

    const parseSmaxDateTime = (str) => {
      if (!str) return null;
      const match = str.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!match) return null;
      let [, d, mo, y, h, mi, s] = match;
      d = parseInt(d, 10);
      mo = parseInt(mo, 10) - 1;
      let year = parseInt(y, 10);
      if (year < 100) year += 2000;
      h = parseInt(h, 10);
      mi = parseInt(mi, 10);
      s = s ? parseInt(s, 10) : 0;
      return new Date(year, mo, d, h, mi, s).getTime();
    };

    const parseDigitRanges = (input) => {
      const digits = [];
      const parts = (input || '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let i = start; i <= end; i += 1) digits.push(i);
          }
        } else {
          const num = parseInt(part, 10);
          if (!isNaN(num)) digits.push(num);
        }
      }
      return [...new Set(digits)].sort((a, b) => a - b);
    };

    const digitsToRangeString = (digits) => {
      if (!digits || !digits.length) return '';
      const sorted = [...new Set(digits)].sort((a, b) => a - b);
      const ranges = [];
      let start = sorted[0];
      let end = sorted[0];

      for (let i = 1; i <= sorted.length; i += 1) {
        if (i < sorted.length && sorted[i] === end + 1) {
          end = sorted[i];
        } else {
          if (end - start >= 2) ranges.push(`${start}-${end}`);
          else if (end === start) ranges.push(`${start}`);
          else ranges.push(`${start},${end}`);
          start = sorted[i];
          end = sorted[i];
        }
      }

      return ranges.join(',');
    };

    const extractTrailingDigits = (text) => {
      const best = String(text || '').match(/(\d{2,})\b(?!.*\d)/);
      if (best) return best[1];
      const fallback = String(text || '').match(/(\d+)(?!.*\d)/);
      return fallback ? fallback[1] : '';
    };

    const locateSolutionEditor = () => {
      const ck = getPageCKEditor();
      if (!(ck && ck.instances)) return null;
      return Object.values(ck.instances).find((inst) => {
        const el = inst.element && inst.element.$;
        if (!el) return false;
        const id = el.id || '';
        const name = el.getAttribute && el.getAttribute('name') || '';
        return /solution|solucao|plCkeditor/i.test(`${id} ${name}`);
      }) || null;
    };

    const focusSolutionEditor = () => {
      try {
        const hasCk = locateSolutionEditor();
        if (!hasCk) {
          const editIcon = document.querySelector('.icon-edit.pl-toolbar-item-icon');
          if (editIcon) editIcon.click();
        }
      } catch (err) {
        console.warn('[SMAX] Failed to toggle CKEditor:', err);
      }

      setTimeout(() => {
        try {
          const inst = locateSolutionEditor();
          if (inst && typeof inst.focus === 'function') {
            inst.focus();
            return;
          }
        } catch (err) {
          console.warn('[SMAX] Failed to focus CKEditor instance:', err);
        }

        const el = document.querySelector('[name="Solution"], #Solution, [id^="plCkeditor"], [data-aid="preview_Solution"]');
        if (el && typeof el.focus === 'function') {
          el.focus();
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 200);
    };

    const pushSolutionHtml = (html, { append = false } = {}) => new Promise((resolve) => {
      if (!html) {
        resolve(false);
        return;
      }
      focusSolutionEditor();
      let tries = 0;
      const attempt = () => {
        const inst = locateSolutionEditor();
        if (inst && typeof inst.setData === 'function') {
          try {
            if (append) inst.setData((inst.getData() || '') + html);
            else inst.setData(html);
            if (typeof inst.focus === 'function') inst.focus();
            resolve(true);
          } catch (err) {
            console.warn('[SMAX] Failed to push HTML into solution editor:', err);
            resolve(false);
          }
          return;
        }
        if (tries >= 10) {
          resolve(false);
          return;
        }
        tries += 1;
        setTimeout(attempt, 250);
      };
      attempt();
    });

    const sanitizeRichText = (html) => {
      if (!html) return '';
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      tmp.querySelectorAll('script, style').forEach((el) => el.remove());
      tmp.querySelectorAll('*').forEach((node) => {
        Array.from(node.attributes || []).forEach((attr) => {
          if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
          if (attr.name.toLowerCase() === 'style') node.removeAttribute(attr.name);
        });
      });
      return tmp.innerHTML;
    };

    const onDomReady = (fn) => {
      if (typeof fn !== 'function') return;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn, { once: true });
      } else {
        fn();
      }
    };

    return {
      debounce,
      getGridViewport,
      parseDigitRanges,
      digitsToRangeString,
      parseSmaxDateTime,
      extractTrailingDigits,
      locateSolutionEditor,
      focusSolutionEditor,
      pushSolutionHtml,
      sanitizeRichText,
      onDomReady
    };
  })();

  /* =========================================================
   * Color registry for owner badges
   * =======================================================*/
  const ColorRegistry = (() => {
    const ensureStore = () => {
      if (!prefs.nameColors) prefs.nameColors = {};
      return prefs.nameColors;
    };

    const generate = (name) => {
      let hash = 0;
      for (let i = 0; i < name.length; i += 1) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      const saturation = 45 + (Math.abs(hash >> 8) % 30);
      const lightness = 50 + (Math.abs(hash >> 16) % 20);
      const bg = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      const fg = lightness > 60 ? '#000' : '#fff';
      return { bg, fg };
    };

    const get = (name) => {
      if (!name) return { bg: '#374151', fg: '#fff' };
      const store = ensureStore();
      if (!store[name]) {
        store[name] = generate(name);
        savePrefs();
      }
      return store[name];
    };

    const remove = (name) => {
      const store = ensureStore();
      if (store[name]) {
        delete store[name];
        savePrefs();
      }
    };

    return { get, remove };
  })();

  /* =========================================================
   * Data repository (requests + people caches)
   * =======================================================*/
  const DataRepository = (() => {
    const triageCache = new Map();
    let triageIds = [];
    const peopleCache = new Map();
    const manualPeopleSeed = [
      {
        id: '95970',
        name: 'ROBSON SOUZA ALVES',
        upn: 'robsonalves',
        email: 'robsonalves@tjsp.jus.br',
        isVip: false,
        employeeNumber: '367442',
        firstName: 'ROBSON',
        lastName: 'SOUZA ALVES',
        location: '49893064'
      }
    ];

    const ensureManualPeople = () => {
      manualPeopleSeed.forEach((person) => {
        if (!person || !person.id) return;
        if (!person.email && !person.upn) return;
        if (!peopleCache.has(person.id)) peopleCache.set(person.id, Object.assign({}, person));
      });
    };
    let peopleTotal = null;
    const queueListeners = new Set();
    ensureManualPeople();

    const notifyQueueListeners = () => {
      queueListeners.forEach((fn) => {
        try { fn(); } catch (err) { console.warn('[SMAX] Queue listener failed:', err); }
      });
    };

    const upsertTriageEntryFromProps = (props, rel) => {
      if (!props) return;
      const id = props.Id != null ? String(props.Id) : '';
      if (!id) return;

      const createdRaw = props.CreateTime;
      let createdText = '';
      let createdTs = 0;
      if (typeof createdRaw === 'number') {
        createdTs = createdRaw;
        createdText = new Date(createdRaw).toLocaleString();
      } else if (createdRaw != null) {
        createdText = String(createdRaw);
        createdTs = Utils.parseSmaxDateTime(createdText) || 0;
      }

      const priority = props.Priority || '';
      const isVipPerson = !!(rel && rel.RequestedForPerson && rel.RequestedForPerson.IsVIP);
      const isVip = isVipPerson || /VIP/i.test(String(priority));

      const descHtml = props.Description || '';
      const tmpDiv = document.createElement('div');
      tmpDiv.innerHTML = String(descHtml);
      const fullText = (tmpDiv.textContent || tmpDiv.innerText || '').trim();
      const subjectText = fullText.split('\n')[0] || '';
      const hasInlineImage = /<img\b/i.test(String(descHtml));

      const solutionHtml = props.Solution || '';
      const solutionDiv = document.createElement('div');
      solutionDiv.innerHTML = String(solutionHtml);
      const solutionText = (solutionDiv.textContent || solutionDiv.innerText || '').trim();

      const idNum = parseInt(id.replace(/\D/g, ''), 10);
      const existing = triageCache.get(id) || {};
      let requestedForName = '';
      const requestedRel = rel && rel.RequestedForPerson ? rel.RequestedForPerson : null;
      const requestedProps = props && props.RequestedForPerson ? props.RequestedForPerson : null;
      const requestedCandidates = [
        requestedRel && requestedRel.DisplayLabel,
        requestedRel && requestedRel.Name,
        requestedRel && requestedRel.PrimaryDisplayValue,
        requestedRel && requestedRel.FullName,
        requestedProps && requestedProps.DisplayLabel,
        requestedProps && requestedProps.Name,
        requestedProps && requestedProps.FullName,
        props && props.RequestedForDisplayLabel,
        props && props.RequestedForName
      ];
      for (const candidate of requestedCandidates) {
        if (!candidate) continue;
        const trimmed = String(candidate).trim();
        if (trimmed) {
          requestedForName = trimmed;
          break;
        }
      }
      if (!requestedForName && existing.requestedForName) requestedForName = existing.requestedForName;
      triageCache.set(id, Object.assign({}, existing, {
        idText: id,
        idNum: Number.isNaN(idNum) ? null : idNum,
        createdText,
        createdTs,
        isVip,
        subjectText,
        descriptionHtml: String(descHtml),
        descriptionText: fullText,
        hasInlineImage,
        solutionHtml: String(solutionHtml),
        solutionText,
        requestedForName
      }));
    };

    const ingestRequestListPayload = (obj) => {
      try {
        if (!obj || typeof obj !== 'object') return;
        const entities = Array.isArray(obj.entities) ? obj.entities : [];
        const list = [];
        for (const ent of entities) {
          if (!ent || typeof ent !== 'object') continue;
          const props = ent.properties || {};
          const rel = ent.related_properties || {};
          upsertTriageEntryFromProps(props, rel);

          const id = props.Id != null ? String(props.Id) : '';
          if (!id) continue;

          const createdRaw = props.CreateTime;
          let createdTs = 0;
          if (typeof createdRaw === 'number') createdTs = createdRaw;

          const priority = props.Priority || '';
          const isVipPerson = !!(rel && rel.RequestedForPerson && rel.RequestedForPerson.IsVIP);
          const isVip = isVipPerson || /VIP/i.test(String(priority));

          const idNum = parseInt(id.replace(/\D/g, ''), 10);
          list.push({
            idText: id,
            idNum: Number.isNaN(idNum) ? null : idNum,
            createdTs,
            isVip
          });
        }

        if (list.length) {
          list.sort((a, b) => {
            if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
            if (a.createdTs !== b.createdTs) return a.createdTs - b.createdTs;
            if (a.idNum != null && b.idNum != null && a.idNum !== b.idNum) return a.idNum - b.idNum;
            return 0;
          });
          triageIds = list;
          notifyQueueListeners();
        }
      } catch (err) {
        console.warn('[SMAX] Failed to ingest request payload:', err);
      }
    };

    const ingestRequestDetailPayload = (obj) => {
      try {
        if (!obj || typeof obj !== 'object') return;
        const entities = Array.isArray(obj.entities) ? obj.entities : [];
        if (!entities.length) return;
        const ent = entities[0] || {};
        upsertTriageEntryFromProps(ent.properties || {}, ent.related_properties || {});
      } catch (err) {
        console.warn('[SMAX] Failed to ingest request detail payload:', err);
      }
    };

    const ingestPersonListPayload = (obj) => {
      try {
        if (!obj || typeof obj !== 'object') return;
        if (obj.meta && typeof obj.meta.total_count === 'number') {
          peopleTotal = obj.meta.total_count;
        }
        const entities = Array.isArray(obj.entities) ? obj.entities : [];
        for (const ent of entities) {
          if (!ent || typeof ent !== 'object') continue;
          if (ent.entity_type !== 'Person') continue;
          const props = ent.properties || {};
          const id = props.Id != null ? String(props.Id) : '';
          if (!id) continue;

          const payload = {
            id,
            name: (props.Name || '').toString().trim(),
            upn: (props.Upn || '').toString().trim(),
            email: (props.Email || '').toString().trim(),
            isVip: !!props.IsVIP,
            employeeNumber: props.EmployeeNumber || '',
            firstName: props.FirstName || '',
            lastName: props.LastName || '',
            location: props.Location || ''
          };
          if (!payload.email && !payload.upn) continue;
          peopleCache.set(id, payload);
        }
      } catch (err) {
        console.warn('[SMAX] Failed to ingest person payload:', err);
      }
    };

    const ensurePeopleLoaded = () => {
      try {
        const pageSize = 50;
        const baseUrl = '/rest/213963628/ems/Person?filter=' +
          encodeURIComponent('(PersonToGroup[Id in (51642955)])') +
          '&layout=Name,Avatar,Location,IsVIP,OrganizationalGroup,Upn,IsDeleted,FirstName,LastName,EmployeeNumber,Email' +
          '&meta=totalCount&order=Name+asc';

        const fetchPage = (skip) => {
          const url = `${baseUrl}&size=${pageSize}&skip=${skip || 0}`;
          return fetch(url, {
            credentials: 'include',
            headers: { Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' }
          })
            .then((r) => r.text())
            .then((txt) => {
              if (!txt) return;
              try {
                ingestPersonListPayload(JSON.parse(txt));
              } catch (err) {
                console.warn('[SMAX] Failed to parse people page:', err);
              }
            })
            .catch(() => {});
        };

        fetchPage(0).then(() => {
          if (typeof peopleTotal !== 'number' || peopleTotal <= peopleCache.size) return;
          const promises = [];
          for (let skip = pageSize; skip < peopleTotal; skip += pageSize) {
            promises.push(fetchPage(skip));
          }
          Promise.all(promises).then(() => {
            console.log('[SMAX] People cache ready:', peopleCache.size, '/', peopleTotal);
          });
        });
      } catch (err) {
        console.warn('[SMAX] Failed to start people loading:', err);
      }
    };

    const ensureRequestPayload = (id) => {
      const key = String(id || '').replace(/\D/g, '') || String(id || '');
      if (!key) return Promise.resolve(null);
      if (triageCache.has(key)) return Promise.resolve(triageCache.get(key));

      try {
        const xsrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        const xsrfToken = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : null;
        const headers = { Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' };
        if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken;
        const url = `/rest/213963628/ems/Request/${encodeURIComponent(key)}?layout=FULL_LAYOUT,RELATION_LAYOUT.item`;
        return fetch(url, { method: 'GET', credentials: 'include', headers })
          .then((r) => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
          })
          .then((txt) => {
            if (!txt) return triageCache.get(key) || null;
            try {
              const parsed = JSON.parse(txt);
              const entities = Array.isArray(parsed.entities) ? parsed.entities : [];
              if (!entities.length) return triageCache.get(key) || null;
              const ent = entities[0] || {};
              upsertTriageEntryFromProps(ent.properties || {}, ent.related_properties || {});
              return triageCache.get(key) || null;
            } catch {
              return triageCache.get(key) || null;
            }
          })
          .catch(() => triageCache.get(key) || null);
      } catch (err) {
        console.warn('[SMAX] Failed to ensure triage payload:', err);
        return Promise.resolve(triageCache.get(key) || null);
      }
    };

    const updateCachedSolution = (id, html) => {
      const key = String(id || '');
      if (!key || !triageCache.has(key)) return;
      const current = triageCache.get(key) || {};
      const safeHtml = html != null ? String(html) : '';
      const tmp = document.createElement('div');
      tmp.innerHTML = safeHtml;
      const text = (tmp.textContent || tmp.innerText || '').trim();
      triageCache.set(key, Object.assign({}, current, {
        solutionHtml: safeHtml,
        solutionText: text
      }));
    };

    return {
      triageCache,
      getTriageQueueSnapshot: () => triageIds.slice(),
      setTriageQueueSnapshot: (list) => { triageIds = list.slice(); },
      peopleCache,
      ingestRequestListPayload,
      ingestPersonListPayload,
      ensurePeopleLoaded,
      ensureRequestPayload,
      upsertTriageEntryFromProps,
      ingestRequestDetailPayload,
      updateCachedSolution,
      onQueueUpdate: (fn) => {
        if (typeof fn === 'function') queueListeners.add(fn);
      }
    };
  })();

  /* =========================================================
   * Distribution (digits -> owner)
   * =======================================================*/
  const Distribution = (() => {
    const mapping = new Map();
    let currentAusentes = [];

    const rebuild = () => {
      mapping.clear();
      const groups = prefs.nameGroups || {};
      const ausentes = prefs.ausentes || [];
      Object.entries(groups).forEach(([name, digits]) => {
        digits.forEach((digit) => {
          const key = String(digit).padStart(2, '0');
          mapping.set(key, name);
        });
      });
      currentAusentes = ausentes.slice();
    };

    const isActive = (name) => name && !currentAusentes.includes(name);

    const ownerForDigits = (digits) => {
      const cleaned = (digits || '').replace(/\D/g, '');
      if (cleaned.length < 2) return null;
      for (let i = cleaned.length; i >= 2; i -= 1) {
        const pair = cleaned.slice(i - 2, i);
        const owner = mapping.get(pair);
        if (!owner) continue;
        if (isActive(owner)) return owner;
      }
      return null;
    };

    rebuild();

    return { rebuild, isActive, ownerForDigits, mapping };
  })();

  /* =========================================================
   * Refresh overlay helper
   * =======================================================*/
  const RefreshOverlay = (() => {
    let overlay;
    const ensureOverlay = () => {
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'smax-refresh-overlay';
      overlay.innerHTML = `
        <div id="smax-refresh-overlay-inner">
          <button id="smax-refresh-now" title="Atualizar página">&#x21bb;</button>
        </div>
      `;
      document.body.appendChild(overlay);
      const btn = overlay.querySelector('#smax-refresh-now');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.location.reload();
        });
      }
      return overlay;
    };

    const show = () => {
      ensureOverlay().style.display = 'flex';
    };

    return { show };
  })();

  /* =========================================================
   * Network patch (intercept SMAX payloads)
   * =======================================================*/
  const Network = (() => {
    let patched = false;
    const isRequestDetailUrl = (url = '') => /\/rest\/\d+\/ems\/Request\/\d+/i.test(url);
    const isRequestListUrl = (url = '') => /\/rest\/\d+\/ems\/Request(?:\?|$)/i.test(url) && !isRequestDetailUrl(url);

    const patch = () => {
      if (patched) return;
      patched = true;
      try {
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
          try { this.__smaxUrl = url; } catch {}
          return origOpen.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.send = function patchedSend(body) {
          this.addEventListener('load', function onLoad() {
            try {
              const url = this.__smaxUrl || this.responseURL || '';
              if (!/\/rest\/\d+\/ems\/(Request|Person)/i.test(url)) return;
              if (!this.responseText) return;
              const json = JSON.parse(this.responseText);
              if (isRequestListUrl(url)) {
                DataRepository.ingestRequestListPayload(json);
              } else if (isRequestDetailUrl(url)) {
                DataRepository.ingestRequestDetailPayload(json);
              } else if (/\/rest\/\d+\/ems\/Person/i.test(url)) {
                DataRepository.ingestPersonListPayload(json);
              }
            } catch {}
          });
          return origSend.call(this, body);
        };

        if (window.fetch) {
          const origFetch = window.fetch;
          window.fetch = function patchedFetch(input, init) {
            return origFetch(input, init).then((resp) => {
              try {
                const url = resp.url || (typeof input === 'string' ? input : '');
                if (!/\/rest\/\d+\/ems\/(Request|Person)/i.test(url)) return resp;
                const clone = resp.clone();
                clone.text().then((txt) => {
                  try {
                    if (!txt) return;
                    const json = JSON.parse(txt);
                    if (isRequestListUrl(url)) {
                      DataRepository.ingestRequestListPayload(json);
                    } else if (isRequestDetailUrl(url)) {
                      DataRepository.ingestRequestDetailPayload(json);
                    } else if (/\/rest\/\d+\/ems\/Person/i.test(url)) {
                      DataRepository.ingestPersonListPayload(json);
                    }
                  } catch {}
                });
              } catch {}
              return resp;
            });
          };
        }
      } catch (err) {
        console.warn('[SMAX] Failed to patch network:', err);
      }
    };

    return { patch };
  })();

  Network.patch();

  /* =========================================================
   * API helpers for real updates
   * =======================================================*/
  const Api = (() => {
    const withXsrfHeaders = () => {
      const xsrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      const xsrfToken = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : null;
      const headers = {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=utf-8',
        'X-Requested-With': 'XMLHttpRequest'
      };
      if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken;
      return headers;
    };

    const postUpdateRequest = (props) => {
      if (!prefs.enableRealWrites) {
        console.warn('[SMAX] Real writes disabled.');
        return Promise.resolve({ skipped: true, reason: 'real-writes-disabled' });
      }
      if (!props || !props.Id) {
        console.warn('[SMAX] postUpdateRequest missing Id.');
        return Promise.resolve(null);
      }
      const body = {
        entities: [{ entity_type: 'Request', properties: { ...props } }],
        operation: 'UPDATE'
      };
      return fetch('/rest/213963628/ems/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: withXsrfHeaders(),
        body: JSON.stringify(body)
      })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then((txt) => {
          try { return txt ? JSON.parse(txt) : null; } catch { return null; }
        })
        .catch((err) => {
          console.warn('[SMAX] postUpdateRequest failed:', err);
          return null;
        });
    };

    const postCreateRequestCausesRequest = (globalId, childId) => {
      if (!prefs.enableRealWrites) {
        console.warn('[SMAX] Real writes disabled.');
        return Promise.resolve({ skipped: true, reason: 'real-writes-disabled' });
      }
      const parent = String(globalId || '').trim();
      const child = String(childId || '').trim();
      if (!parent || !child) {
        console.warn('[SMAX] Missing ids for RequestCausesRequest.');
        return Promise.resolve(null);
      }
      const body = {
        relationships: [{
          name: 'RequestCausesRequest',
          firstEndpoint: { Request: parent },
          secondEndpoint: { Request: child }
        }],
        operation: 'CREATE'
      };
      return fetch('/rest/213963628/ems/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: withXsrfHeaders(),
        body: JSON.stringify(body)
      })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then((txt) => {
          try { return txt ? JSON.parse(txt) : null; } catch { return null; }
        })
        .catch((err) => {
          console.warn('[SMAX] postCreateRequestCausesRequest failed:', err);
          return null;
        });
    };

    return { postUpdateRequest, postCreateRequestCausesRequest };
  })();

  /* =========================================================
   * Name badges
   * =======================================================*/
  const NameBadges = (() => {
    const processed = new WeakSet();
    const NAME_MARK_ATTR = 'adMarcado';

    const pickAllLinks = () => {
      const sel = new Set();
      const viewport = Utils.getGridViewport();
      if (!viewport) return [];
      ['a.entity-link-id', '.slick-row a'].forEach((selector) => {
        viewport.querySelectorAll(selector).forEach((anchor) => sel.add(anchor));
      });
      return Array.from(sel);
    };

    const apply = () => {
      if (!prefs.nameBadgesOn) return;
      pickAllLinks().forEach((link) => {
        if (!link || processed.has(link)) return;
        processed.add(link);
        const label = (link.textContent || '').trim();
        const digits = Utils.extractTrailingDigits(label);
        const owner = Distribution.ownerForDigits(digits);
        const cell = link.closest('.slick-cell');

        if (cell) {
          cell.classList.add('tmx-namecell');
          if (owner) {
            const { bg, fg } = ColorRegistry.get(owner);
            cell.style.background = bg;
            cell.style.color = fg;
            cell.querySelectorAll('a').forEach((a) => { a.style.color = 'inherit'; });
          } else {
            cell.style.background = '#d32f2f';
            cell.style.color = '#fff';
            cell.querySelectorAll('a').forEach((a) => { a.style.color = 'inherit'; });
          }
        }

        if (!link.dataset[NAME_MARK_ATTR]) {
          const tag = document.createElement('span');
          tag.style.marginLeft = '6px';
          tag.style.fontWeight = '600';
          tag.style.padding = '0 4px';
          tag.style.borderRadius = '4px';
          if (owner) {
            const { bg, fg } = ColorRegistry.get(owner);
            tag.textContent = ` ${owner}`;
            tag.style.background = bg;
            tag.style.color = fg;
          } else {
            tag.textContent = 'SEM DONO (verifique configurações)';
            tag.style.background = '#fff';
            tag.style.color = '#d32f2f';
            tag.style.border = '2px solid #d32f2f';
          }
          link.insertAdjacentElement('afterend', tag);
          link.dataset[NAME_MARK_ATTR] = '1';
        }
      });
    };

    return { apply };
  })();

  /* =========================================================
   * Settings panel
   * =======================================================*/
  const SettingsPanel = (() => {
    let container;
    let toggleBtn;

    const buildNameRows = () => {
      const nameGroups = prefs.nameGroups || {};
      const ausentes = prefs.ausentes || [];
      const sortedNames = Object.keys(nameGroups).sort();
      if (!sortedNames.length) {
        return '<div style="color:#555;">Nenhuma pessoa adicionada ainda.</div>';
      }
      return sortedNames.map((name) => {
        const digits = nameGroups[name];
        const rangeStr = Utils.digitsToRangeString(digits);
        const isAbsent = ausentes.includes(name);
        const bg = isAbsent ? '#ffe0e0' : '#f9f9f9';
        return `
          <div style="margin-bottom:10px;padding:8px;background:${bg};border-radius:4px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
              <span style="min-width:140px;font-weight:600;">${name}</span>
              <label class="smax-absent-wrapper">
                <input type="checkbox" class="smax-name-absent smax-absent-input" data-name="${name}" ${isAbsent ? 'checked' : ''}>
                <span class="smax-absent-box"></span>
                Ausente
              </label>
              <input type="text" class="smax-name-digits" data-name="${name}" value="${rangeStr}"
                    style="flex:1;padding:6px;border:1px solid #ccc;border-radius:3px;font-family:monospace;"
                    placeholder="0-6 ou 7,8,10-15">
              <button class="smax-remove-name" data-name="${name}"
                      style="padding:4px 8px;background:#d32f2f;color:#fff;border:none;border-radius:3px;cursor:pointer;">
                ✕
              </button>
            </div>
          </div>`;
      }).join('');
    };

    const renderPanel = () => {
      if (!container) return;
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-weight:600;font-size:13px;letter-spacing:.03em;text-transform:uppercase;color:#444;">
            Distribuição de chamados
          </div>
        </div>

        <div id="smax-realwrites-panel" style="margin-bottom:10px;padding:8px 10px;border-radius:6px;border:1px solid #ddd;display:flex;align-items:center;justify-content:space-between;gap:10px;${prefs.enableRealWrites ? 'background:#fff7ed;border-color:#fdba74;' : ''}">
          <div style="display:flex;flex-direction:column;font-size:12px;color:#333;">
            <span style="font-weight:600;">Modo real (gravar no SMAX)</span>
            <span style="opacity:0.8;">Quando ativo, urgência, atribuição e vínculo ao global salvam de verdade.</span>
          </div>
          <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
            <input type="checkbox" id="smax-realwrites-toggle" ${prefs.enableRealWrites ? 'checked' : ''} />
            <span>${prefs.enableRealWrites ? 'Ativo' : 'Ativar'}</span>
          </label>
        </div>

        <div style="margin-bottom:10px;border:1px solid #ddd;border-radius:6px;padding:8px 8px 6px;display:flex;flex-direction:column;gap:6px;">
          <input type="text" id="smax-person-search" placeholder="Adicionar pessoa"
                style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;">
          <div id="smax-person-results" style="max-height:140px;overflow:auto;font-size:12px;"></div>
        </div>

        <div id="smax-team-list">${buildNameRows()}</div>
      `;
      wirePanelEvents();
    };

    const wirePanelEvents = () => {
      const realToggle = container.querySelector('#smax-realwrites-toggle');
      const realPanel = container.querySelector('#smax-realwrites-panel');
      if (realToggle && realPanel) {
        realToggle.addEventListener('change', () => {
          prefs.enableRealWrites = !!realToggle.checked;
          savePrefs();
          if (realToggle.checked) {
            realPanel.style.background = '#fff7ed';
            realPanel.style.borderColor = '#fdba74';
            realPanel.querySelector('span:last-child').textContent = 'Ativo';
          } else {
            realPanel.style.background = '';
            realPanel.style.borderColor = '#ddd';
            realPanel.querySelector('span:last-child').textContent = 'Ativar';
          }
          const flag = document.getElementById('smax-triage-real-flag');
          if (flag) flag.style.display = prefs.enableRealWrites ? 'block' : 'none';
        });
      }

      const searchInput = container.querySelector('#smax-person-search');
      const resultsEl = container.querySelector('#smax-person-results');
      if (searchInput && resultsEl) {
        const renderResults = (term) => {
          const q = (term || '').trim().toUpperCase();
          if (!q) {
            const preview = Array.from(DataRepository.peopleCache.values()).slice(0, 5).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            resultsEl.innerHTML = preview.map((p) => personOptionTemplate(p)).join('');
            attachPersonPickHandlers(resultsEl);
            return;
          }
          if (!DataRepository.peopleCache.size) {
            resultsEl.innerHTML = '<div style="color:#999;">Carregando pessoas do SMAX...</div>';
            return;
          }
          const matches = [];
          for (const p of DataRepository.peopleCache.values()) {
            const name = (p.name || '').toUpperCase();
            const upn = (p.upn || '').toUpperCase();
            if (name.includes(q) || upn.includes(q)) {
              matches.push(p);
              if (matches.length >= 30) break;
            }
          }
          resultsEl.innerHTML = matches.length ? matches.map((p) => personOptionTemplate(p)).join('') : '<div style="color:#999;">Nenhuma pessoa corresponde à busca.</div>';
          attachPersonPickHandlers(resultsEl);
        };

        searchInput.addEventListener('input', () => renderResults(searchInput.value));
        searchInput.addEventListener('focus', () => renderResults(searchInput.value));
        renderResults('');
      }

      container.querySelectorAll('.smax-remove-name').forEach((btn) => {
        btn.addEventListener('click', () => {
          const name = btn.dataset.name;
          if (!confirm(`Remover ${name} da equipe?`)) return;
          const groups = prefs.nameGroups || {};
          delete groups[name];
          prefs.nameGroups = groups;
          prefs.ausentes = (prefs.ausentes || []).filter((n) => n !== name);
          ColorRegistry.remove(name);
          savePrefs();
          Distribution.rebuild();
          RefreshOverlay.show();
          renderPanel();
        });
      });

      container.querySelectorAll('.smax-name-digits').forEach((input) => {
        input.addEventListener('input', () => {
          const cleaned = input.value.replace(/[^0-9,\-]/g, '');
          if (cleaned !== input.value) input.value = cleaned;
        });
        input.addEventListener('change', () => {
          const name = input.dataset.name;
          const groups = prefs.nameGroups || {};
          groups[name] = Utils.parseDigitRanges(input.value.trim());
          prefs.nameGroups = groups;
          savePrefs();
          Distribution.rebuild();
          RefreshOverlay.show();
        });
      });

      container.querySelectorAll('.smax-name-absent').forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          const name = checkbox.dataset.name;
          const ausentes = new Set(prefs.ausentes || []);
          if (checkbox.checked) ausentes.add(name);
          else ausentes.delete(name);
          prefs.ausentes = Array.from(ausentes);
          savePrefs();
          Distribution.rebuild();
          checkbox.closest('div[style*="margin-bottom:10px"]').style.background = checkbox.checked ? '#ffe0e0' : '#f9f9f9';
          RefreshOverlay.show();
        });
      });
    };

    const personOptionTemplate = (p) => `
      <div class="smax-person-pick" data-name="${(p.name || '').replace(/"/g, '&quot;')}" style="padding:4px 6px;cursor:pointer;border-radius:3px;">
        <strong>${p.name}</strong>
        ${p.upn ? `<span style="color:#555;"> (${p.upn})</span>` : ''}
        ${p.isVip ? '<span style="margin-left:4px;padding:0 4px;border-radius:999px;background:#facc15;color:#854d0e;font-size:10px;font-weight:700;">VIP</span>' : ''}
      </div>
    `;

    const attachPersonPickHandlers = (resultsEl) => {
      resultsEl.querySelectorAll('.smax-person-pick').forEach((el) => {
        el.addEventListener('click', () => {
          const picked = (el.getAttribute('data-name') || '').toUpperCase();
          if (!picked) return;
          const groups = prefs.nameGroups || {};
          if (!groups[picked]) {
            groups[picked] = [];
            prefs.nameGroups = groups;
            savePrefs();
            Distribution.rebuild();
            RefreshOverlay.show();
            renderPanel();
          }
        });
      });
    };

    const init = () => {
      if (container) return;
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'smax-settings-btn';
      toggleBtn.textContent = '⚙️';
      toggleBtn.title = 'Configurações do assistente de triagem';
      Object.assign(toggleBtn.style, { position: 'fixed', right: '12px', bottom: '12px', zIndex: 999999, border: 'none' });
      document.body.appendChild(toggleBtn);

      container = document.createElement('div');
      container.id = 'smax-settings';
      Object.assign(container.style, {
        position: 'fixed', right: '12px', bottom: '70px', maxWidth: '650px', maxHeight: '80vh', minHeight: '220px', overflow: 'auto', zIndex: 999999, padding: '16px', borderRadius: '8px', background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,.25)', display: 'none'
      });
      document.body.appendChild(container);

      toggleBtn.addEventListener('click', () => {
        const visible = container.style.display !== 'none';
        if (!visible) {
          DataRepository.ensurePeopleLoaded();
          renderPanel();
          container.style.display = 'block';
        } else {
          container.style.display = 'none';
        }
      });
    };

    return { init, renderPanel };
  })();

  /* =========================================================
   * Comment auto height
   * =======================================================*/
  const CommentExpander = (() => {
    const init = () => {
      if (!prefs.enlargeCommentsOn) return;
      const obs = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.matches('.comment-items')) {
              node.style.height = 'auto';
              node.style.maxHeight = 'none';
            } else {
              node.querySelectorAll('.comment-items').forEach((el) => {
                el.style.height = 'auto';
                el.style.maxHeight = 'none';
              });
            }
          });
        });
      });
      obs.observe(document.body, { childList: true, subtree: true });
      window.addEventListener('beforeunload', () => obs.disconnect(), { once: true });
    };
    return { init };
  })();

  /* =========================================================
   * Section tweaks (collapse catalogue block)
   * =======================================================*/
  const SectionTweaks = (() => {
    const init = () => {
      if (!prefs.collapseOn) return;
      const SECTION_SELECTOR = '#form-section-5, [data-aid="section-catalog-offering"]';
      const IDS_TO_REMOVE = ['form-section-1', 'form-section-7', 'form-section-8'];
      const collapsedOnce = new WeakSet();

      const isOpen = (section) => {
        const content = section?.querySelector?.('.pl-entity-page-component-content');
        return !!content && !content.classList.contains('ng-hide');
      };

      const fixAria = (header, section) => {
        if (!header || !section) return;
        if (header.getAttribute('aria-expanded') !== 'false') header.setAttribute('aria-expanded', 'false');
        const sr = section.querySelector('.pl-entity-page-component-header-sr');
        if (sr && /Expandido/i.test(sr.textContent || '')) sr.textContent = sr.textContent.replace(/Expandido/ig, 'Recolhido');
        const icon = header.querySelector('[pl-bidi-collapse-arrow]') || header.querySelector('.icon-arrow-med-down, .icon-arrow-med-right');
        if (icon) {
          icon.classList.remove('icon-arrow-med-down');
          icon.classList.add('icon-arrow-med-right');
        }
      };

      const collapseSectionOnce = (section) => {
        if (section.dataset.userInteracted === '1') return;
        if (collapsedOnce.has(section)) return;
        const header = section.querySelector('.pl-entity-page-component-header[role="button"]');
        if (!header) return;
        if (isOpen(section)) {
          header.click();
          setTimeout(() => fixAria(header, section), 0);
        } else {
          fixAria(header, section);
        }
        collapsedOnce.add(section);
      };

      const removeSections = () => {
        IDS_TO_REMOVE.forEach((id) => {
          const el = document.getElementById(id);
          if (el && el.parentNode) el.remove();
        });
      };

      const applyAll = () => {
        document.querySelectorAll(SECTION_SELECTOR).forEach(collapseSectionOnce);
        removeSections();
      };

      document.addEventListener('click', (event) => {
        const header = event.target.closest('.pl-entity-page-component-header[role="button"]');
        if (!header) return;
        const section = header.closest('#form-section-5, [data-aid="section-catalog-offering"]');
        if (section) section.dataset.userInteracted = '1';
      }, { capture: true });

      const schedule = Utils.debounce(applyAll, 100);
      const obs = new MutationObserver(() => schedule());
      setTimeout(applyAll, 300);
      obs.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('beforeunload', () => obs.disconnect(), { once: true });
    };

    return { init };
  })();

  /* =========================================================
   * Orchestrator for repeated UI refresh
   * =======================================================*/
  const Orchestrator = (() => {
    const runAll = () => {
      if ('requestIdleCallback' in window) requestIdleCallback(NameBadges.apply, { timeout: 500 });
      else setTimeout(NameBadges.apply, 0);
    };

    const schedule = Utils.debounce(runAll, 80);

    const init = () => {
      runAll();
      const obsMain = new MutationObserver(() => schedule());
      obsMain.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'aria-expanded']
      });

      const headerEl = document.querySelector('.slick-header-columns') || document.body;
      const obsHeader = new MutationObserver(() => schedule());
      obsHeader.observe(headerEl, { childList: true, subtree: true, attributes: true });

      window.addEventListener('scroll', schedule, true);
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('beforeunload', () => { obsMain.disconnect(); obsHeader.disconnect(); }, { once: true });
    };

    return { init };
  })();

  /* =========================================================
   * Skull flag for detractor users
   * =======================================================*/
  const SkullFlag = (() => {
    const normalize = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const FLAG_SET = new Set([
      'Adriano Zilli','Adriana Da Silva Ferreira Oliveira','Alessandra Sousa Nunes','Bruna Marques Dos Santos','Breno Medeiros Malfati','Carlos Henrique Scala De Almeida','Cassia Santos Alves De Lima','Dalete Rodrigues Silva','David Lopes De Oliveira','Davi Dos Reis Garcia','Deaulas De Campos Salviano','Diego Oliveira Da Silva','Diogo Mendonça Aniceto','Elaine Moriya','Ester Naili Dos Santos','Fabiano Barbosa Dos Reis','Fabricio Christiano Tanobe Lyra','Gabriel Teixeira Ludvig','Gilberto Sintoni Junior','Giovanna Coradini Teixeira','Gislene Ferreira Sant\'Ana Ramos','Guilherme Cesar De Sousa','Gustavo De Meira Gonçalves','Jackson Alcantara Santana','Janaina Dos Passos Silvestre','Jefferson Silva De Carvalho Soares','Joyce Da Silva Oliveira','Juan Campos De Souza','Juliana Lino Dos Santos Rosa','Karina Nicolau Samaan','Karine Barbara Vitor De Lima Souza','Kaue Nunes Silva Farrelly','Kelly Ferreira De Freitas','Larissa Ferreira Fumero','Lucas Alves Dos Santos','Lucas Carneiro Peres Ferreira','Marcos Paulo Silva Madalena','Maria Fernanda De Oliveira Bento','Natalia Yurie Shiba','Paulo Roberto Massoca','Pedro Henrique Palacio Baritti','Rafaella Silva Lima Petrolini','Renata Aparecida Mendes Bonvechio','Rodrigo Silva Oliveira','Ryan Souza Carvalho','Tatiana Lourenço Da Costa Antunes','Tatiane Araujo Da Cruz','Thiago Tadeu Faustino De Oliveira','Tiago Carvalho De Freitas Meneses','Victor Viana Roca'
    ].map(normalize));

    const apply = (personItem) => {
      try {
        if (!(personItem instanceof HTMLElement)) return;
        const clone = personItem.cloneNode(true);
        while (clone.firstChild) {
          if (clone.firstChild.nodeType === Node.ELEMENT_NODE) clone.removeChild(clone.firstChild);
          else break;
        }
        const leading = clone.textContent || '';
        if (!FLAG_SET.has(normalize(leading))) return;
        const img = personItem.querySelector('img.ts-avatar, img.pl-shared-item-img, img.ts-image') || personItem.querySelector('img');
        if (img && img.dataset.__g1Applied !== '1') {
          img.dataset.__g1Applied = '1';
          img.src = 'https://cdn-icons-png.flaticon.com/512/564/564619.png';
          img.alt = 'Alerta de Usuário Detrator';
          img.title = 'Alerta de Usuário Detrator';
          Object.assign(img.style, { border: '3px solid #ff0000', borderRadius: '50%', padding: '2px', backgroundColor: '#ff000022', boxShadow: '0 0 10px #ff0000' });
        }
        personItem.style.color = '#ff0000';
      } catch {}
    };

    const init = () => {
      if (!prefs.flagSkullOn) return;
      const obs = new MutationObserver(() => document.querySelectorAll('span.pl-person-item').forEach(apply));
      obs.observe(document.body, { childList: true, subtree: true });
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('span.pl-person-item').forEach(apply));
      } else {
        document.querySelectorAll('span.pl-person-item').forEach(apply);
      }
      window.addEventListener('beforeunload', () => obs.disconnect(), { once: true });
    };

    return { init };
  })();

  /* =========================================================
   * Grid tracker for triage HUD
   * =======================================================*/
  const GridTracker = (() => {
    let needsRebuild = false;

    const markDirty = () => {
      needsRebuild = true;
    };

    const init = () => {
      try {
        const viewport = Utils.getGridViewport();
        if (!viewport) return;
        let lastCount = viewport.querySelectorAll('.slick-row').length;
        const obs = new MutationObserver(() => {
          const currentCount = viewport.querySelectorAll('.slick-row').length;
          if (currentCount !== lastCount) {
            lastCount = currentCount;
            markDirty();
          }
        });
        obs.observe(viewport, { childList: true, subtree: true });
        window.addEventListener('beforeunload', () => obs.disconnect(), { once: true });
      } catch (err) {
        console.warn('[SMAX] Failed to observe grid changes:', err);
      }
    };

    const consume = () => {
      const flag = needsRebuild;
      needsRebuild = false;
      return flag;
    };

    DataRepository.onQueueUpdate(markDirty);

    return { init, consume, markDirty };
  })();

  /* =========================================================
   * Triage HUD
   * =======================================================*/
  const TriageHUD = (() => {
    const quickReplyCompletionCode = 'CompletionCodeFulfilled';
    let startBtn;
    let backdrop;
    let triageQueue = [];
    let triageIndex = -1;
    const stagedState = { urgency: null, assign: false, parentId: '', parentSelected: false };
    let quickReplyHtml = '';
    let quickReplyEditor = null;
    let quickReplyEditorAttempts = 0;
    let quickReplyEditorConfig = null;
    let globalCkSnapshot = null;
    let nativeWatcherArmed = false;
    let quickReplyFallbackNotified = false;
    let quickReplyEditorPollTimer = null;
    let activeTicketId = null;
    let editorBaselineHtml = '';
    let quickReplyDirtyState = false;
    let personalFinalsSet = new Set(Utils.parseDigitRanges(prefs.personalFinalsRaw || ''));

    const urgencyMap = {
      low: { Urgency: 'NoDisruption', ImpactScope: 'SingleUser' },
      med: { Urgency: 'SlightDisruption', ImpactScope: 'SiteOrDepartment' },
      high: { Urgency: 'TotalLossOfService', ImpactScope: 'SiteOrDepartment' },
      crit: { Urgency: 'TotalLossOfService', ImpactScope: 'Enterprise' }
    };

    const getQuickReplyField = () => (backdrop ? backdrop.querySelector('#smax-triage-quickreply-editor') : null);

    const setQuickReplyHtml = (html) => {
      quickReplyHtml = html || '';
      if (quickReplyEditor && typeof quickReplyEditor.setData === 'function') {
        quickReplyEditor.setData(quickReplyHtml);
      } else {
        const field = getQuickReplyField();
        if (field) field.value = quickReplyHtml;
      }
      if (backdrop) refreshButtons();
    };

    const readQuickReplyHtml = () => {
      if (quickReplyEditor && typeof quickReplyEditor.getData === 'function') {
        return quickReplyEditor.getData();
      }
      const field = getQuickReplyField();
      return field ? field.value : '';
    };

    const normalizeHtml = (html) => (html || '')
      .replace(/\r/g, '')
      .replace(/\u00a0/gi, ' ')
      .trim();

    const clearQuickReplyState = () => {
      editorBaselineHtml = '';
      setQuickReplyHtml('');
      quickReplyHtml = '';
      updateQuickReplyStageState();
    };

    const syncQuickReplyBaseline = (html) => {
      const safe = html != null ? String(html) : '';
      editorBaselineHtml = normalizeHtml(safe);
      setQuickReplyHtml(safe);
      quickReplyHtml = safe;
      updateQuickReplyStageState();
    };

    const hasUnsavedSolution = () => normalizeHtml(readQuickReplyHtml()) !== editorBaselineHtml;

    const updateQuickReplyStageState = ({ announce = false } = {}) => {
      const staged = hasUnsavedSolution();
      if (backdrop) {
        const card = backdrop.querySelector('#smax-triage-quickreply-card');
        if (card) card.dataset.staged = staged ? 'true' : 'false';
      }
      if (announce && staged && !quickReplyDirtyState) {
        setStatus('Resposta pronta. Use ENVIAR para gravá-la no chamado.', 3500);
      }
      quickReplyDirtyState = staged;
    };

    const handleQuickReplyChange = (nextHtml) => {
      quickReplyHtml = nextHtml != null ? nextHtml : readQuickReplyHtml();
      refreshButtons();
      setBaselineStatus();
      updateQuickReplyStageState({ announce: true });
    };

    const setQuickGuideVisible = (visible) => {
      if (!backdrop) return;
      const panel = backdrop.querySelector('#smax-quick-guide-panel');
      if (!panel) return;
      panel.style.display = visible ? 'block' : 'none';
      panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    };

    const toggleQuickGuide = () => {
      if (!backdrop) return;
      const panel = backdrop.querySelector('#smax-quick-guide-panel');
      if (!panel) return;
      const next = panel.style.display !== 'block';
      setQuickGuideVisible(next);
    };

    const hideQuickGuide = () => setQuickGuideVisible(false);

    const refreshPersonalFinalsSet = () => {
      personalFinalsSet = new Set(Utils.parseDigitRanges(prefs.personalFinalsRaw || ''));
    };

    const finalPairFromEntry = (entry) => {
      if (!entry) return null;
      if (typeof entry.idNum === 'number' && !Number.isNaN(entry.idNum)) {
        return ((Math.abs(entry.idNum) % 100) + 100) % 100;
      }
      const trailing = Utils.extractTrailingDigits(entry.idText || '') || '';
      if (!trailing) return null;
      const slice = trailing.slice(-2);
      if (!slice) return null;
      const parsed = parseInt(slice, 10);
      if (Number.isNaN(parsed)) return null;
      return ((Math.abs(parsed) % 100) + 100) % 100;
    };

    const matchesPersonalFinals = (entry) => {
      if (!personalFinalsSet.size) return true;
      const target = finalPairFromEntry(entry);
      return target != null && personalFinalsSet.has(target);
    };

    const applyPersonalFinalsFilter = (queue) => {
      if (!personalFinalsSet.size || !Array.isArray(queue)) return queue;
      return queue.filter((entry) => matchesPersonalFinals(entry));
    };

    const deepClone = (value) => {
      if (Array.isArray(value)) return value.map((item) => deepClone(item));
      if (value && typeof value === 'object') {
        return Object.entries(value).reduce((acc, [key, val]) => {
          acc[key] = deepClone(val);
          return acc;
        }, {});
      }
      return value;
    };

    const ensureSourceButton = (toolbar) => {
      if (!Array.isArray(toolbar)) return;
      const hasSource = toolbar.some((group) => {
        if (!group) return false;
        if (typeof group === 'string') return group === 'Source';
        if (Array.isArray(group)) return group.includes('Source');
        const items = Array.isArray(group.items) ? group.items : null;
        return items ? items.includes('Source') : false;
      });
      if (hasSource) return;
      if (toolbar.length) {
        const first = toolbar[0];
        if (typeof first === 'string') toolbar.unshift('Source');
        else if (Array.isArray(first)) first.unshift('Source');
        else if (first && Array.isArray(first.items)) first.items.unshift('Source');
        else toolbar.unshift({ name: 'document', items: ['Source'] });
      } else {
        toolbar.push({ name: 'document', items: ['Source'] });
      }
    };

    const defaultQuickReplyConfig = () => ({
      height: 180,
      allowedContent: true,
      removePlugins: 'elementspath',
      extraPlugins: 'colorbutton,font',
      toolbar: [
        { name: 'document', items: ['Source', 'Preview'] },
        { name: 'clipboard', items: ['Undo', 'Redo'] },
        { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', 'RemoveFormat'] },
        { name: 'paragraph', items: ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent'] },
        { name: 'links', items: ['Link', 'Unlink'] },
        { name: 'insert', items: ['Table', 'HorizontalRule'] },
        { name: 'styles', items: ['Format', 'Font', 'FontSize'] },
        { name: 'colors', items: ['TextColor', 'BGColor'] }
      ]
    });

    const copyConfigKeys = (source) => {
      if (!source) return null;
      const cfg = {
        height: source.height || 180,
        allowedContent: source.allowedContent !== undefined ? source.allowedContent : true,
        removePlugins: source.removePlugins || 'elementspath',
        extraPlugins: source.extraPlugins || ''
      };
      const keys = [
        'toolbar', 'toolbarGroups', 'font_names', 'fontSize_sizes', 'format_tags', 'contentsCss',
        'skin', 'uiColor', 'colorButton_foreStyle', 'colorButton_backStyle', 'stylesSet',
        'enterMode', 'shiftEnterMode', 'removeButtons'
      ];
      keys.forEach((key) => {
        if (source[key] !== undefined) cfg[key] = deepClone(source[key]);
      });
      if (cfg.toolbar) ensureSourceButton(cfg.toolbar);
      return cfg;
    };

    const appendEditorCss = (config, cssText) => {
      if (!config || !cssText) return;
      const dataUri = `data:text/css,${encodeURIComponent(cssText)}`;
      if (Array.isArray(config.contentsCss)) {
        config.contentsCss.push(dataUri);
      } else if (typeof config.contentsCss === 'string' && config.contentsCss.length) {
        config.contentsCss = [config.contentsCss, dataUri];
      } else {
        config.contentsCss = [dataUri];
      }
    };

    const pickAnyEditorInstance = () => {
      const ck = getPageCKEditor();
      if (!(ck && ck.instances)) return null;
      const list = Object.values(ck.instances);
      if (!list.length) return null;
      const target = list.find((inst) => {
        try {
          const id = `${inst.name || ''} ${inst.element && inst.element.getName ? inst.element.getName() : ''}`;
          return /solution|solucao|plCkeditor/i.test(id);
        } catch {
          return false;
        }
      });
      return target || list[0];
    };

    const captureGlobalConfigSnapshot = () => {
      const ck = getPageCKEditor();
      if (globalCkSnapshot || !(ck && ck.config)) return globalCkSnapshot;
      try {
        globalCkSnapshot = copyConfigKeys(ck.config) || null;
      } catch (err) {
        console.warn('[SMAX] Failed to snapshot global CKEditor config:', err);
        globalCkSnapshot = null;
      }
      return globalCkSnapshot;
    };

    const captureQuickReplyConfig = () => {
      if (quickReplyEditorConfig) return quickReplyEditorConfig;
      const ck = getPageCKEditor();
      if (ck && ck.instances) {
        const native = (Utils.locateSolutionEditor && Utils.locateSolutionEditor()) || pickAnyEditorInstance();
        if (native && native.config) {
          quickReplyEditorConfig = copyConfigKeys(native.config);
          if (quickReplyEditorConfig) {
            quickReplyFallbackNotified = false;
            return quickReplyEditorConfig;
          }
        }
      }
      quickReplyEditorConfig = captureGlobalConfigSnapshot();
      if (quickReplyEditorConfig && !quickReplyFallbackNotified) {
        quickReplyFallbackNotified = true;
        console.warn('[SMAX] CKEditor nativo ainda não foi aberto; usando configuração global detectada.');
      }
      return quickReplyEditorConfig;
    };

    const hookNativeEditors = () => {
      if (nativeWatcherArmed) return;
      nativeWatcherArmed = true;
      console.info('[SMAX] Aguardando o CKEditor nativo para copiar a configuração...');
      const attempt = () => {
        const ck = getPageCKEditor();
        if (!(ck && ck.on)) {
          setTimeout(attempt, 800);
          return;
        }
        const tryCapture = (editor) => {
          if (!editor || !editor.config) return;
          const cfg = copyConfigKeys(editor.config);
          if (cfg) {
            quickReplyEditorConfig = cfg;
            quickReplyFallbackNotified = false;
            console.info('[SMAX] Configuração do CKEditor clonada para a resposta rápida.');
            if (!quickReplyEditor) ensureQuickReplyEditor();
          }
        };
        Object.values(ck.instances || {}).forEach(tryCapture);
        ck.on('instanceReady', (evt) => {
          tryCapture(evt && evt.editor);
        });
      };
      attempt();
    };

    const buildQuickReplyConfig = () => {
      const captured = captureQuickReplyConfig();
      if (captured) return deepClone(captured);
      const fallback = defaultQuickReplyConfig();
      ensureSourceButton(fallback.toolbar);
      if (!quickReplyFallbackNotified) {
        quickReplyFallbackNotified = true;
        console.warn('[SMAX] CKEditor nativo não detectado; usando configuração padrão na resposta rápida.');
      }
      return fallback;
    };

    const ensureQuickReplyEditor = () => {
      const ck = getPageCKEditor();
      if (!ck || !ck.replace || quickReplyEditor) return;
      const field = getQuickReplyField();
      if (!field) return;
      const config = buildQuickReplyConfig();
      if (!config) return;
      try {
        console.info('[SMAX] Inicializando editor de resposta rápida.');
        const instanceConfig = Object.assign({ resize_enabled: true }, config);
        appendEditorCss(instanceConfig, 'body{color:#000000 !important;}');
        quickReplyEditor = ck.replace(field, instanceConfig);
        const enforceDefaultColor = () => {
          try {
            if (!quickReplyEditor) return;
            const editable = typeof quickReplyEditor.editable === 'function' ? quickReplyEditor.editable() : null;
            if (editable && typeof editable.setStyle === 'function') {
              editable.setStyle('color', '#000000');
              editable.removeClass('smax-quickreply-muted');
            }
          } catch (err) {
            console.warn('[SMAX] Failed to enforce default CKEditor text color:', err);
          }
        };
        quickReplyEditor.on('instanceReady', () => {
          enforceDefaultColor();
          quickReplyEditor.setData(quickReplyHtml);
          console.info('[SMAX] Editor de resposta rápida pronto e sincronizado.');
        });
        quickReplyEditor.on('contentDom', enforceDefaultColor);
        quickReplyEditor.on('change', () => {
          handleQuickReplyChange(quickReplyEditor.getData());
        });
      } catch (err) {
        console.warn('[SMAX] Failed to init quick reply editor:', err);
        console.error('[SMAX] Não consegui carregar o CKEditor no painel de resposta rápida.');
      }
    };

    const scheduleQuickReplyEditor = () => {
      if (quickReplyEditor) return;
      if (quickReplyEditorPollTimer) clearTimeout(quickReplyEditorPollTimer);
      quickReplyEditorAttempts += 1;
      const ck = getPageCKEditor();
      const ckReady = Boolean(ck && ck.replace);
      if (ckReady) {
        ensureQuickReplyEditor();
      } else {
        if (quickReplyEditorAttempts === 1) {
          console.info('[SMAX] Carregando scripts do CKEditor para a resposta rápida...');
        }
      }
      if (!quickReplyEditor) {
        const delay = Math.min(1200, 600 + quickReplyEditorAttempts * 40);
        quickReplyEditorPollTimer = setTimeout(scheduleQuickReplyEditor, delay);
      } else {
        quickReplyEditorPollTimer = null;
      }
    };

    const captureSelectedIdFromDom = () => {
      try {
        const viewport = Utils.getGridViewport();
        if (!viewport) return null;
        const row = viewport.querySelector('.slick-row.active, .slick-row.ui-state-active, .slick-row.selected');
        if (!row) return null;
        const anchor = row.querySelector('a.entity-link-id, a');
        if (anchor) return (anchor.textContent || '').trim();
        const cell = row.querySelector('.slick-cell');
        return cell ? (cell.textContent || '').trim() : null;
      } catch (err) {
        console.warn('[SMAX] Failed to capture selected row id:', err);
        return null;
      }
    };

    const buildQueue = () => {
      const snapshot = DataRepository.getTriageQueueSnapshot();
      const selectedFromDom = captureSelectedIdFromDom();
      if (snapshot.length) {
        return { list: applyPersonalFinalsFilter(snapshot.slice()), selectedId: selectedFromDom };
      }
      const viewport = Utils.getGridViewport();
      if (!viewport) return [];
      let idColIndex = 0;
      let createTimeColIndex = null;
      try {
        const headerColumns = document.querySelectorAll('.slick-header-column');
        headerColumns.forEach((col, idx) => {
          const aid = col.getAttribute('data-aid') || '';
          if (/grid_header_Id$/i.test(aid)) idColIndex = idx;
          if (/grid_header_CreateTime$/i.test(aid)) createTimeColIndex = idx;
        });
      } catch {}

      const rows = Array.from(viewport.querySelectorAll('.slick-row'));
      const queue = [];
      let selectedId = null;
      for (const row of rows) {
        const cells = row.querySelectorAll('.slick-cell');
        if (!cells.length) continue;
        const idCell = cells[idColIndex] || cells[0];
        const idText = (idCell.textContent || '').trim();
        const idNum = parseInt(idText.replace(/\D/g, ''), 10);
        if (!idText) continue;
        if (!selectedId && row.classList.contains('active')) selectedId = idText;
        else if (!selectedId && row.classList.contains('ui-state-active')) selectedId = idText;
        else if (!selectedId && row.classList.contains('selected')) selectedId = idText;
        let createdCell = null;
        if (createTimeColIndex != null && cells[createTimeColIndex]) {
          createdCell = cells[createTimeColIndex];
        } else {
          createdCell = Array.from(cells).find((c) => /Hora de Cria/i.test(c.getAttribute('title') || '') || /Hora de Cria/i.test(c.textContent || ''));
        }
        const createdText = createdCell ? (createdCell.textContent || '').trim() : '';
        const createdTs = Utils.parseSmaxDateTime(createdText) || 0;
        const vipCell = Array.from(cells).find((c) => /VIP/i.test(c.textContent || ''));
        const isVip = !!vipCell && /VIP/i.test(vipCell.textContent || '');
        queue.push({ idText, idNum: Number.isNaN(idNum) ? null : idNum, createdText, createdTs, isVip });
      }
      queue.sort((a, b) => {
        if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
        if (a.createdTs !== b.createdTs) return a.createdTs - b.createdTs;
        if (a.idNum != null && b.idNum != null && a.idNum !== b.idNum) return a.idNum - b.idNum;
        return 0;
      });
      return { list: applyPersonalFinalsFilter(queue), selectedId: selectedId || selectedFromDom || null };
    };

    const currentItem = () => {
      if (!triageQueue.length) return null;
      if (triageIndex < 0 || triageIndex >= triageQueue.length) return triageQueue[0];
      return triageQueue[triageIndex];
    };

    const rebuildQueueForPersonalFinals = () => {
      if (!backdrop || backdrop.style.display !== 'flex') return;
      const currentId = currentItem()?.idText || null;
      const { list } = buildQueue();
      triageQueue = list;
      if (!triageQueue.length) {
        triageIndex = -1;
      } else if (currentId) {
        const idx = triageQueue.findIndex((entry) => entry.idText === currentId);
        triageIndex = idx >= 0 ? idx : 0;
      } else {
        triageIndex = 0;
      }
      render();
    };

    const resetStaged = () => {
      stagedState.urgency = null;
      stagedState.assign = false;
      stagedState.parentId = '';
      stagedState.parentSelected = false;
    };

    const anyStaged = () => stagedState.urgency || stagedState.assign || stagedState.parentSelected || hasUnsavedSolution();

    const ownerForCurrent = () => {
      const item = currentItem();
      if (!item) return null;
      return Distribution.ownerForDigits(item.idText) || Distribution.ownerForDigits(item.idNum != null ? String(item.idNum) : '');
    };

    const formatBrazilianDateTime = (ts, fallbackText) => {
      const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      if (typeof ts === 'number' && Number.isFinite(ts) && ts > 0) {
        try {
          return new Date(ts).toLocaleString('pt-BR', options);
        } catch {}
      }
      const parsed = Utils.parseSmaxDateTime(fallbackText || '');
      if (parsed) {
        try {
          return new Date(parsed).toLocaleString('pt-BR', options);
        } catch {}
      }
      return fallbackText || 'Faltando na visão';
    };

    const render = () => {
      if (!backdrop) return;
      const bodyEl = backdrop.querySelector('#smax-triage-hud-body');
      const ticketDetailsEl = bodyEl ? bodyEl.querySelector('#smax-triage-ticket-details') : null;
      const statusEl = backdrop.querySelector('#smax-triage-status');
      const prevBtn = backdrop.querySelector('#smax-triage-prev');
      const nextBtn = backdrop.querySelector('#smax-triage-next');
      const commitBtn = backdrop.querySelector('#smax-triage-commit');
      const inputGlobal = backdrop.querySelector('#smax-triage-global-id');
      const btnLinkGlobal = backdrop.querySelector('#smax-triage-link-global');
      const urgencyButtons = {
        low: backdrop.querySelector('#smax-triage-urg-low'),
        med: backdrop.querySelector('#smax-triage-urg-med'),
        high: backdrop.querySelector('#smax-triage-urg-high'),
        crit: backdrop.querySelector('#smax-triage-urg-crit')
      };
      const assignBtn = backdrop.querySelector('#smax-triage-assign-owner');

      if (!triageQueue.length) {
        triageIndex = -1;
        if (ticketDetailsEl) ticketDetailsEl.innerHTML = '<div style="font-size:14px;color:#e5e7eb;">Nenhum chamado encontrado na lista atual. Verifique o campo "meus finais", logo acima.</div>';
        statusEl.textContent = personalFinalsSet.size
          ? 'Nenhum chamado corresponde aos finais configurados.'
          : 'Verifique se a visão contém ID, Descrição e Hora de Criação.';
        if (nextBtn) nextBtn.disabled = true;
        if (prevBtn) prevBtn.disabled = true;
        Object.values(urgencyButtons).forEach((btn) => { btn.disabled = true; btn.dataset.active = 'false'; });
        assignBtn.disabled = true;
        assignBtn.dataset.active = 'false';
        btnLinkGlobal.disabled = true;
        btnLinkGlobal.dataset.active = 'false';
        commitBtn.disabled = true;
        activeTicketId = null;
        clearQuickReplyState();
        return;
      }

      if (nextBtn) nextBtn.disabled = false;
      if (prevBtn) prevBtn.disabled = false;
      const item = currentItem();
      activeTicketId = item ? item.idText : null;
      const pendingRequestId = activeTicketId;
      resetStaged();
      if (inputGlobal) inputGlobal.value = '';
      clearQuickReplyState();
      setStatus('Carregando solução do chamado selecionado...', 3000);

      if (ticketDetailsEl) {
        ticketDetailsEl.innerHTML = `
          <div style="font-size:14px;color:#e5e7eb;">
            Carregando detalhes completos do chamado ${item.idText || '-'}...
          </div>
        `;
      }

      DataRepository.ensureRequestPayload(pendingRequestId).then((full) => {
        if (!pendingRequestId || activeTicketId !== pendingRequestId) return;
        if (!full) {
          if (ticketDetailsEl) {
            ticketDetailsEl.innerHTML = `
              <div style="font-size:14px;color:#fecaca;">
                Não foi possível carregar os detalhes completos deste chamado.
              </div>
            `;
          }
          setStatus('Não consegui carregar a solução deste chamado.', 4000);
          return;
        }
        const missing = [];
        if (!full.idText) missing.push('ID');
        if (!full.descriptionText && !full.subjectText) missing.push('Descrição');
        if (!full.createdText) missing.push('Hora de Criação');
        const warning = missing.length
          ? `<div style="margin-bottom:6px;padding:6px 8px;border-radius:6px;background:#7f1d1d;color:#fee2e2;font-size:12px;">
               Faltam as colunas: ${missing.join(', ')} na visão atual.
             </div>`
          : '';
        const vipBadge = full.isVip ? '<span style="margin-left:8px;padding:2px 6px;border-radius:999px;background:#facc15;color:#854d0e;font-size:11px;font-weight:700;">VIP</span>' : '';
        const requestedForHtml = full.requestedForName
          ? `<div><strong>Solicitado para</strong> ${full.requestedForName}</div>`
          : '';
        if (!ticketDetailsEl) return;
        const createdDisplay = formatBrazilianDateTime(full.createdTs, full.createdText);
        const descHtml = Utils.sanitizeRichText(full.descriptionHtml || full.descriptionText || full.subjectText || '');
        const descDisplay = descHtml || `<div style="color:#94a3b8;">(Sem descrição disponível. Confira a coluna Descrição.)</div>`;
        const idLink = full.idText
          ? `<a href="https://suporte.tjsp.jus.br/saw/Request/${encodeURIComponent(full.idText)}/general" target="_blank" rel="noreferrer noopener" style="color:#38bdf8;text-decoration:none;">${full.idText}</a>`
          : '-';
        ticketDetailsEl.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:6px;font-size:14px;">
            ${warning}
            <div class="smax-triage-meta-row">
              <div><strong>ID</strong> ${idLink}${vipBadge ? ` ${vipBadge}` : ''}</div>
              <div><strong>Hora de criação</strong> ${createdDisplay}</div>
              ${requestedForHtml}
            </div>
            <div class="smax-triage-desc">${descDisplay}</div>
          </div>
        `;

        const solutionHtml = full.solutionHtml != null ? full.solutionHtml : '';
        syncQuickReplyBaseline(solutionHtml);
        if (solutionHtml) setStatus('Solução atual carregada deste chamado.', 2500);
        else setBaselineStatus();
      });

      Object.entries(urgencyButtons).forEach(([key, btn]) => {
        btn.disabled = false;
        btn.dataset.active = 'false';
        btn.onclick = () => toggleUrgency(key);
      });

      const owner = ownerForCurrent();
      if (assignBtn) {
        if (owner) {
          const firstName = owner.split(' ')[0] || owner;
          assignBtn.textContent = `Atribuir a ${firstName}`;
          assignBtn.title = `Atribuir para ${owner}`;
          assignBtn.dataset.active = 'ready';
          assignBtn.disabled = true;
        } else {
          assignBtn.textContent = 'Sem dono';
          assignBtn.title = 'Sem dono configurado para estes dígitos';
          assignBtn.dataset.active = 'false';
          assignBtn.disabled = true;
        }
        assignBtn.onclick = () => toggleAssign();
      }

      if (btnLinkGlobal && inputGlobal) {
        btnLinkGlobal.disabled = true;
        btnLinkGlobal.dataset.active = 'false';
        btnLinkGlobal.onclick = () => toggleParentLink();
        inputGlobal.addEventListener('input', () => {
          const cleaned = inputGlobal.value.replace(/\D/g, '');
          if (cleaned !== inputGlobal.value) inputGlobal.value = cleaned;
          stagedState.parentId = inputGlobal.value.trim();
          if (!stagedState.parentId) stagedState.parentSelected = false;
          refreshButtons();
        });
      }

      refreshButtons();
      setBaselineStatus();
      ensureQuickReplyEditor();
    };

    const refreshButtons = () => {
      const urgencyButtons = {
        low: backdrop.querySelector('#smax-triage-urg-low'),
        med: backdrop.querySelector('#smax-triage-urg-med'),
        high: backdrop.querySelector('#smax-triage-urg-high'),
        crit: backdrop.querySelector('#smax-triage-urg-crit')
      };
      Object.entries(urgencyButtons).forEach(([key, btn]) => {
        btn.dataset.active = stagedState.urgency === key ? 'true' : 'false';
      });

      const assignBtn = backdrop.querySelector('#smax-triage-assign-owner');
      const hasOwner = assignBtn && assignBtn.textContent !== 'Sem dono';
      if (assignBtn) {
        const canAssign = hasOwner && !!stagedState.urgency;
        assignBtn.disabled = !canAssign;
        assignBtn.dataset.active = !canAssign ? (hasOwner ? 'ready' : 'false') : (stagedState.assign ? 'selected' : 'ready');
      }

      const btnLinkGlobal = backdrop.querySelector('#smax-triage-link-global');
      if (btnLinkGlobal) {
        const hasParent = !!stagedState.parentId;
        btnLinkGlobal.disabled = !hasParent;
        btnLinkGlobal.dataset.active = hasParent ? (stagedState.parentSelected ? 'selected' : 'ready') : 'false';
      }

      const commitBtn = backdrop.querySelector('#smax-triage-commit');
      const canCommit = !!anyStaged();
      commitBtn.disabled = !canCommit;
    };

    const setBaselineStatus = () => {
      const statusEl = backdrop.querySelector('#smax-triage-status');
      if (!statusEl) return;
      if (!triageQueue.length) {
        statusEl.textContent = 'Nenhum chamado na fila de triagem.';
        return;
      }
      const total = triageQueue.length;
      const position = Math.min(Math.max(triageIndex, 0) + 1, total);
      const stagedBits = [];
      if (stagedState.urgency) stagedBits.push('urgência');
      if (stagedState.assign) stagedBits.push('atribuir');
      if (stagedState.parentSelected && stagedState.parentId) stagedBits.push('global');
      if (hasUnsavedSolution()) stagedBits.push('resposta');
      const pending = stagedBits.length ? ` Pronto para enviar: ${stagedBits.join(', ')}.` : '';
      statusEl.textContent = `Chamado ${position} de ${total} na visão atual.${pending}`;
    };

    const toggleUrgency = (level) => {
      stagedState.urgency = stagedState.urgency === level ? null : level;
      refreshButtons();
      setBaselineStatus();
    };

    const toggleAssign = () => {
      if (!Distribution.ownerForDigits(currentItem()?.idText || '')) return;
      stagedState.assign = !stagedState.assign;
      refreshButtons();
      setBaselineStatus();
    };

    const toggleParentLink = () => {
      if (!stagedState.parentId) return;
      stagedState.parentSelected = !stagedState.parentSelected;
      refreshButtons();
      setBaselineStatus();
    };

    const commit = () => {
      const item = currentItem();
      if (!item) return;
      const props = { Id: String(item.idText) };
      if (stagedState.urgency) Object.assign(props, urgencyMap[stagedState.urgency]);
      const solutionHtml = hasUnsavedSolution() ? readQuickReplyHtml() : '';
      if (solutionHtml) {
        props.Solution = solutionHtml;
        props.CompletionCode = quickReplyCompletionCode;
      }

      let ownerName = null;
      if (stagedState.assign) ownerName = ownerForCurrent();

      if (ownerName) {
        const target = ownerName.toUpperCase();
        for (const p of DataRepository.peopleCache.values()) {
          if ((p.name || '').toUpperCase() === target) {
            props.ExpertAssignee = String(p.id);
            break;
          }
        }
      }

      const doGlobal = stagedState.parentSelected && stagedState.parentId;
      if (!stagedState.urgency && !props.ExpertAssignee && !doGlobal && !props.Solution) {
        setStatus('Nada para gravar.', 2500);
        return;
      }

      if (!prefs.enableRealWrites) {
        setStatus('Modo simulação ativo. Mudanças não foram gravadas.', 2500);
        advanceQueue();
        return;
      }

      setStatus('Gravando alterações...');
      const tasks = [];
      if (stagedState.urgency || props.ExpertAssignee || props.Solution) tasks.push(Api.postUpdateRequest(props));
      if (doGlobal) {
        tasks.push(
          Api.postCreateRequestCausesRequest(stagedState.parentId, props.Id).then((relRes) => {
            if (!(relRes && relRes.meta && relRes.meta.completion_status === 'OK')) return relRes;
            return Api.postUpdateRequest({ Id: props.Id, PhaseId: 'Escalate' });
          })
        );
      }
      Promise.all(tasks).then((results) => {
        const hadError = results.some((res) => !res || (res.meta && res.meta.completion_status !== 'OK'));
        if (!hadError && props.Solution) {
          syncQuickReplyBaseline(props.Solution);
          if (DataRepository.updateCachedSolution) DataRepository.updateCachedSolution(props.Id, props.Solution);
        }
        setStatus(hadError ? 'Algumas alterações falharam.' : 'Alterações gravadas com sucesso.', hadError ? 3000 : 2000);
        advanceQueue();
      }).catch(() => {
        setStatus('Erro ao gravar alterações.', 3000);
      });
    };

    let statusTimer = null;
    const setStatus = (msg, duration = 2000) => {
      const statusEl = backdrop.querySelector('#smax-triage-status');
      if (!statusEl) return;
      statusEl.textContent = msg;
      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = setTimeout(() => setBaselineStatus(), duration);
    };

    const navigateQueue = (delta) => {
      if (hasUnsavedSolution()) {
        const discard = window.confirm('A resposta atual não foi salva. Deseja descartá-la antes de continuar?');
        if (!discard) {
          setStatus('Navegação cancelada para preservar a resposta não salva.', 3500);
          return;
        }
        clearQuickReplyState();
        setStatus('Resposta descartada. Carregando outro chamado...', 3000);
      }
      if (!triageQueue.length) {
        render();
        return;
      }

      const currentId = currentItem()?.idText || null;

      if (GridTracker.consume()) {
        const { list: rebuilt } = buildQueue();
        if (rebuilt.length) {
          triageQueue = rebuilt;
          if (currentId) {
            const nextIndex = rebuilt.findIndex((entry) => entry.idText === currentId);
            if (nextIndex >= 0) triageIndex = (nextIndex + delta + rebuilt.length) % rebuilt.length;
            else triageIndex = delta > 0 ? 0 : rebuilt.length - 1;
          } else {
            triageIndex = delta > 0 ? 0 : rebuilt.length - 1;
          }
        } else {
          triageQueue = rebuilt;
          triageIndex = -1;
        }
      } else if (triageQueue.length) {
        const length = triageQueue.length;
        triageIndex = (triageIndex + delta + length) % length;
      }

      render();
    };

    const advanceQueue = () => navigateQueue(1);
    const retreatQueue = () => navigateQueue(-1);

    const openHud = () => {
      DataRepository.ensurePeopleLoaded();
      if (startBtn) startBtn.style.display = 'none';
      backdrop.style.display = 'flex';
      const finalsInput = backdrop.querySelector('#smax-personal-finals-input');
      if (finalsInput) finalsInput.value = prefs.personalFinalsRaw || '';
      const { list, selectedId } = buildQueue();
      triageQueue = list;
      if (!triageQueue.length) triageIndex = -1;
      else if (selectedId) {
        const focusIdx = triageQueue.findIndex((entry) => entry.idText === selectedId);
        triageIndex = focusIdx >= 0 ? focusIdx : 0;
      } else {
        triageIndex = 0;
      }
      render();
      const realFlag = backdrop.querySelector('#smax-triage-real-flag');
      if (realFlag) realFlag.style.display = prefs.enableRealWrites ? 'block' : 'none';
    };

    const closeHud = () => {
      backdrop.style.display = 'none';
      if (startBtn) startBtn.style.display = 'block';
      hideQuickGuide();
    };

    const init = () => {
      if (startBtn) return;
      hookNativeEditors();
      startBtn = document.createElement('button');
      startBtn.id = 'smax-triage-start-btn';
      startBtn.textContent = 'Iniciar triagem';
      document.body.appendChild(startBtn);

      backdrop = document.createElement('div');
      backdrop.id = 'smax-triage-hud-backdrop';
      backdrop.innerHTML = `
        <div id="smax-triage-hud">
          <div id="smax-triage-hud-header">
            <div class="smax-triage-title-bar">
              <h3>Triagem de Chamados</h3>
              <label id="smax-personal-finals-label" title="Limite os chamados pelos seus dígitos finais">
                <span>Meus finais</span>
                <input type="text" id="smax-personal-finals-input" placeholder="0-32,66-99" inputmode="numeric" autocomplete="off" />
              </label>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" id="smax-triage-guide-btn" title="Dicas rápidas">Guia Rápido</button>
              <button type="button" class="smax-triage-secondary" id="smax-triage-close" title="Minimizar triagem">_</button>
            </div>
          </div>
          <div id="smax-quick-guide-panel" aria-hidden="true">
            <h4>Guia rápido</h4>
            <ul>
              <li>Use os botões de urgência para definir impacto antes de atribuir.</li>
              <li>“Meus finais” limita a fila de triagem aos IDs desejados.</li>
              <li>Editar a resposta rápida já a deixa pronta; "ENVIAR" grava tudo no SMAX.</li>
              <li>Filtre os chamados através do SMAX corretamente antes de começar a Triagem</li>
              <li>Configure corretamente os finais e colegas ausentes através do ícone de configuração, no canto direito inferior do SMAX</li>
              <li>O filtro (não a coluna) "Hora de Criação" do SMAX permite escolher um intervalo de datas.</li>
              <li>Os chamados são ordenados sempre por VIP, e mais antigos primeiro.</li>
              <li>CUIDADO DOBRADO: Vincular Global NÃO VERIFICA se o número é válido.</li>
            </ul>
            <div style="margin-top:8px;display:flex;justify-content:flex-end;">
              <button type="button" class="smax-triage-secondary" id="smax-guide-close" style="padding:4px 10px;">Fechar</button>
            </div>
          </div>
          <div id="smax-triage-hud-body">
            <div id="smax-triage-ticket-details">
              <div style="font-size:14px;color:#9ca3af;">Inicie a triagem para carregar um chamado.</div>
            </div>
          </div>
          <div id="smax-triage-hud-footer">
            <div class="smax-triage-top-row">
              <div class="smax-triage-inline-controls">
                <div class="smax-triage-urg-group">
                  <button type="button" class="smax-triage-secondary smax-triage-chip smax-urg-low" id="smax-triage-urg-low" disabled>Baixa</button>
                  <button type="button" class="smax-triage-secondary smax-triage-chip smax-urg-med" id="smax-triage-urg-med" disabled>Média</button>
                  <button type="button" class="smax-triage-secondary smax-triage-chip smax-urg-high" id="smax-triage-urg-high" disabled>Alta</button>
                  <button type="button" class="smax-triage-secondary smax-triage-chip smax-urg-crit" id="smax-triage-urg-crit" disabled>Crítica</button>
                </div>
                <button type="button" class="smax-triage-primary smax-triage-chip" id="smax-triage-assign-owner" disabled>Sem dono</button>
                <div class="smax-triage-global-group">
                  <input type="text" id="smax-triage-global-id" placeholder="ID do global (cuidado)"
                        style="width:130px;padding:4px 6px;border-radius:999px;border:1px solid #4b5563;background:#020617;color:#e5e7eb;font-size:12px;" />
                  <button type="button" class="smax-triage-secondary smax-triage-chip" id="smax-triage-link-global" disabled>Vincular</button>
                </div>
              </div>
              <div class="smax-triage-main-actions">
                <div id="smax-triage-real-flag" style="font-size:11px;font-weight:600;color:#f97316;display:none;">MODO REAL ATIVO</div>
                <div class="smax-triage-main-actions-buttons">
                  <button type="button" class="smax-triage-secondary" id="smax-triage-prev" disabled>Chamado anterior</button>
                  <button type="button" class="smax-triage-secondary" id="smax-triage-next" disabled>Próximo chamado</button>
                  <button type="button" class="smax-triage-primary smax-triage-chip" id="smax-triage-commit" disabled>ENVIAR</button>
                </div>
              </div>
            </div>
            <div id="smax-triage-quickreply-card" data-staged="false">
              <textarea id="smax-triage-quickreply-editor" placeholder="Digite aqui sua resposta..."></textarea>
            </div>
            <div id="smax-triage-status">Fila de triagem ainda não inicializada.</div>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      startBtn.addEventListener('click', openHud);
      backdrop.querySelector('#smax-triage-close').addEventListener('click', closeHud);
      backdrop.addEventListener('click', (event) => {
        const panel = backdrop.querySelector('#smax-quick-guide-panel');
        if (panel && panel.style.display === 'block') {
          if (!panel.contains(event.target) && event.target.id !== 'smax-triage-guide-btn') hideQuickGuide();
        }
        if (event.target === backdrop) closeHud();
      });
      const prevBtn = backdrop.querySelector('#smax-triage-prev');
      if (prevBtn) prevBtn.addEventListener('click', () => retreatQueue());
      backdrop.querySelector('#smax-triage-next').addEventListener('click', () => advanceQueue());
      backdrop.querySelector('#smax-triage-commit').addEventListener('click', () => commit());
      const quickTextarea = backdrop.querySelector('#smax-triage-quickreply-editor');
      if (quickTextarea) quickTextarea.addEventListener('input', () => {
        if (!quickReplyEditor) handleQuickReplyChange(quickTextarea.value);
      });
      const finalsInput = backdrop.querySelector('#smax-personal-finals-input');
      if (finalsInput) {
        finalsInput.value = prefs.personalFinalsRaw || '';
        finalsInput.addEventListener('input', () => {
          const cleaned = finalsInput.value.replace(/[^0-9,\-\s]/g, '');
          if (cleaned !== finalsInput.value) finalsInput.value = cleaned;
          prefs.personalFinalsRaw = cleaned.trim();
          refreshPersonalFinalsSet();
          savePrefs();
          rebuildQueueForPersonalFinals();
        });
      }
      const guideBtn = backdrop.querySelector('#smax-triage-guide-btn');
      if (guideBtn) guideBtn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        toggleQuickGuide();
      });
      const guideClose = backdrop.querySelector('#smax-guide-close');
      if (guideClose) guideClose.addEventListener('click', (evt) => {
        evt.stopPropagation();
        hideQuickGuide();
      });
      scheduleQuickReplyEditor();
    };

    return { init };
  })();

  /* =========================================================
   * Boot
   * =======================================================*/
  const boot = () => {
    CommentExpander.init();
    SectionTweaks.init();
    Orchestrator.init();
    SettingsPanel.init();
    GridTracker.init();
    TriageHUD.init();
    SkullFlag.init();
  };

  Utils.onDomReady(boot);
})();
