// ==UserScript==
// @name         TRIAGEM - SMAX SGS221
// @namespace    https://github.com/DanielMacCruz/SGS221-Triagem
// @version      0.1
// @description  Interface enhancements for triagem workflow
// @author       YOU
// @match        https://suporte.tjsp.jus.br/saw/*
// @match        https://suporte.tjsp.jus.br/saw/Requests*
// @run-at       document-idle
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/DanielMacCruz/SGS221-Triagem/refs/heads/main/Triagem.js
// @updateURL    https://raw.githubusercontent.com/DanielMacCruz/SGS221-Triagem/refs/heads/main/Triagem.js
// @homepageURL  https://github.com/DanielMacCruz/SGS221-Triagem
// @supportURL   https://chatgpt.com
// ==/UserScript==
//TESTEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE


(() => {
  'use strict';

  /* ====================== Preferências ====================== */
  const prefs = {
    highlightsOn: true,
    nameBadgesOn: true,
    magistradoOn: true,
    collapseOn: false,
    enlargeCommentsOn: true,
    autoTagsOn: true,
  };

    if (typeof GM_getValue === 'function') {
        const saved = GM_getValue('smax_prefs');
        if (saved) Object.assign(prefs, saved);
    }

    // helper to save
    const savePrefs = () => { if (typeof GM_setValue === 'function') GM_setValue('smax_prefs', prefs); };

    // Example usage: when toggling a pref
    // prefs.highlightsOn = false; savePrefs();

  /* ====================== CSS Global ====================== */
  GM_addStyle(`
    /* highlights */
    .tmx-hl-yellow { background:#ffeb3b; color:#000; font-weight:700; border-radius:5px; padding:0 .14em; }
    .tmx-hl-red    { background:#d32f2f; color:#fff; font-weight:700; border-radius:3px; padding:0 .16em; }
    .tmx-hl-green  { background:#2e7d32; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
    .tmx-hl-blue   { background:#1e88e5; color:#fff; font-weight:700; border-radius:3px; padding:0 .14em; }
    .tmx-hl-pink   { background:#FC0FC0; color:#000; font-weight:700; border-radius:3px; padding:0 .14em; }

    /* célula marcada como juiz/juíza */
    .tmx-juizdireito-hit { background:#1e88e5 !important; color:#fff !important; font-weight:700 !important; }

    /* badge de nomes (célula inteira colorida) */
    .slick-cell.tmx-namecell { font-weight:700 !important; transition: box-shadow .15s ease; }
    .slick-cell.tmx-namecell a { color: inherit !important; }
    .slick-cell.tmx-namecell:focus-within { outline: 2px solid rgba(0,0,0,.25); outline-offset: 2px; }
    .slick-cell.tmx-namecell:hover { box-shadow: 0 0 0 2px rgba(0,0,0,.08) inset; }

    /* TAGs automáticas (CSS blindado) */
    .tag-smax, .tag-smax * { all: unset !important; }
    .tag-smax {
      display: inline-block !important;
      background: #e0e0e0 !important;
      color: #000 !important;
      font-weight: 700 !important;
      border-radius: 3px !important;
      padding: 0 4px !important;
      margin-right: 4px !important;
      white-space: nowrap !important;
      font-size: inherit !important;
      font-family: inherit !important;
      line-height: inherit !important;
      text-decoration: none !important;
    }
    .tag-smax [class^="tmx-hl-"], .tag-smax [class*=" tmx-hl-"] { all: unset !important; background: none !important; color: inherit !important; }

    /* comentários */
    .comment-items { height: auto !important; max-height: none !important; }
  `);

    function createSettingsUI() {
        if (document.getElementById('smax-settings')) return;
        const btn = document.createElement('button');
        btn.id = 'smax-settings-btn';
        btn.textContent = 'SMAX';
        Object.assign(btn.style, { position:'fixed', right:'12px', bottom:'12px', zIndex:999999, padding:'8px 10px', borderRadius:'8px', background:'#222', color:'#fff', border:'none', cursor:'pointer' });
        document.body.appendChild(btn);

        const panel = document.createElement('div');
        panel.id = 'smax-settings';
        Object.assign(panel.style, { position:'fixed', right:'12px', bottom:'54px', minWidth:'260px', zIndex:999999, padding:'10px', borderRadius:'8px', background:'#fff', boxShadow:'0 6px 18px rgba(0,0,0,.25)', display:'none' });
        panel.innerHTML = `
    <h4 style="margin:0 0 8px 0">SMAX — Settings</h4>
    <label><input type="checkbox" id="smax-toggle-highlights"> Highlights</label><br>
    <label><input type="checkbox" id="smax-toggle-namebadges"> Name badges</label><br>
    <label><input type="checkbox" id="smax-toggle-magistrado"> Magistrado highlight</label><br>
    <label><input type="checkbox" id="smax-toggle-skull"> Skull alerts</label><br>
    <div style="margin-top:8px; text-align:right;"><button id="smax-save">Save</button></div>
  `;
        document.body.appendChild(panel);

        btn.addEventListener('click', ()=> panel.style.display = panel.style.display === 'none' ? 'block' : 'none');

        // initialize values
        document.getElementById('smax-toggle-highlights').checked = !!prefs.highlightsOn;
        document.getElementById('smax-toggle-namebadges').checked = !!prefs.nameBadgesOn;
        document.getElementById('smax-toggle-magistrado').checked = !!prefs.magistradoOn;
        document.getElementById('smax-toggle-skull').checked = true;

        document.getElementById('smax-save').addEventListener('click', ()=>{
            prefs.highlightsOn = document.getElementById('smax-toggle-highlights').checked;
            prefs.nameBadgesOn = document.getElementById('smax-toggle-namebadges').checked;
            prefs.magistradoOn = document.getElementById('smax-toggle-magistrado').checked;
            // skull controlled by this pref; initFlagUsersSkull should check it
            prefs.flagSkullOn = document.getElementById('smax-toggle-skull').checked;
            if (typeof savePrefs === 'function') savePrefs();
            panel.style.display = 'none';
            scheduleRunAllFeatures();
        });
    }

  /* ====================== Helpers ====================== */
  const debounce = (fn, wait=120) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; };
  const getGridViewport = (root=document) => root.querySelector('.slick-viewport') || root;
  const escapeReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalizeText = t => (t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  /* =========================================================
   *  1) Destaques por cores (tokens/regex)
   * =======================================================*/
  const HL_GROUPS = {
    amarelo: { cls:'tmx-hl-yellow',
      whole:['jurisprudência','jurisprudencia','distribuidor','acessar','DJEN','Diário Eletrônico','automatização','ceman','Central de Mandados','mandado','mandados','movimentar','dois fatores','Renajud','Sisbajud','Autenticador','carta','evento','cadastro','automação','automações','migrar','migrador','migração','perito','perita','localizadores','localizador'],
      substr:['acess','mail'], custom:[] },
    vermelho:{ cls:'tmx-hl-red',
      whole:['ERRO_AGENDAMENTO_EVENTO','ERRO_ENVIO_INTIMACAO_DJEN','ERRO_ENVIO_INTIMAÇÃO_DJEN','Item 04 do Comunicado 435/2025','Erro ao gerar o Documento Comprobatório Renajud','Cookie not found','Urgente','urgência','Plantão'],
      substr:['erro','errado','réu revel','help_outline'], custom:[] },
    verde:{ cls:'tmx-hl-green',
      whole:['taxa','taxas','custa','custas','restituir','restituição','guia','diligência','diligencia','justiça gratuíta','parcelamento','parcelamento das custas', 'desvincular', 'desvinculação'],
      substr:[], custom:[] },
    azul:{ cls:'tmx-hl-blue',
      whole:['magistrado','magistrada'], substr:[], custom:[/\bju[ií]z(?:es|a)?\b/giu] },
    rosa:{ cls:'tmx-hl-pink',
      whole:['inesperado'],
      substr:[], custom:[] },
  };
  const HL_ORDER = ['vermelho','rosa','amarelo','verde','azul'];

  const buildHighlightRegexes = (g) => {
    const regs = [];
    if (g.whole?.length) regs.push(new RegExp(`(?<![\\p{L}\\d_])(${g.whole.map(escapeReg).join('|')})(?![\\p{L}\\d_])`, 'giu'));
    if (g.substr?.length) regs.push(new RegExp(`(${g.substr.map(escapeReg).join('|')})`, 'giu'));
    if (g.custom?.length) regs.push(...g.custom);
    return regs;
  };

  const HL_LIST = Object.entries(HL_GROUPS).map(([name,cfg]) => ({ name, cls:cfg.cls, regexes: buildHighlightRegexes(cfg) }));
  const HL_ORDERED = HL_LIST.slice().sort((a,b)=>HL_ORDER.indexOf(a.name)-HL_ORDER.indexOf(b.name));
  const processedTextNodes = new WeakSet();

  const unwrapCellHighlights = (root) =>
    root.querySelectorAll('.tmx-hl-yellow, .tmx-hl-red, .tmx-hl-green, .tmx-hl-blue, .tmx-hl-pink')
        .forEach(span => span.replaceWith(document.createTextNode(span.textContent || '')));

  function highlightMatchesInNode(container, regex, cls) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (processedTextNodes.has(node)) return NodeFilter.FILTER_REJECT;
        const t = node.nodeValue;
        if (!t || !t.trim()) return NodeFilter.FILTER_REJECT;
        const pe = node.parentElement;
        if (!pe) return NodeFilter.FILTER_REJECT;
        if (pe.closest('input,textarea,[contenteditable],[role="button"],[aria-live]')) return NodeFilter.FILTER_REJECT;
        const pcls = pe.classList;
        if (pcls?.contains('tmx-hl-yellow') || pcls?.contains('tmx-hl-red') ||
            pcls?.contains('tmx-hl-green') || pcls?.contains('tmx-hl-blue') ||
            pcls?.contains('tmx-hl-pink')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    for (let n; (n = walker.nextNode()); ) nodes.push(n);

    for (const textNode of nodes) {
          // mark as processed so we don't re-evaluate the same text node in this session
        processedTextNodes.add(textNode);

        const text = textNode.nodeValue;
        if (!regex.test(text)) { regex.lastIndex = 0; continue; }
        regex.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  function sweepHighlightsInCell(cell) {
    if (!prefs.highlightsOn) return;
    const current = (cell.textContent || '').trim();
    const last = cell.getAttribute('data-tmx-last') || '';
    if (current === last) return;

    unwrapCellHighlights(cell);
    for (const g of HL_ORDERED) for (const re of g.regexes) highlightMatchesInNode(cell, re, g.cls);
    cell.setAttribute('data-tmx-last', (cell.textContent || '').trim());
  }

  function applyHighlightsInGrid(root=document) {
    if (!prefs.highlightsOn) return;
    const scope = getGridViewport(root);
    scope.querySelectorAll('.slick-cell').forEach(sweepHighlightsInCell);
  }

  /* =========================================================
   *  2) Badges por finais de ID (célula inteira)
   * =======================================================*/

  // Lista sem GLAUCO (definir APENAS UMA VEZ no arquivo!)
  const NAME_GROUPS = {
    "ADRIANO":       [0,1,2,3,4,5,6],
    "DANIEL LEAL":   [7,8,9,10,11,12],
    "DOUGLAS":       [13,14,15,16,17,18,19],
    "IONE":          [20,21,22,23,24,25],
    "ISA":           [26,27,28,29,30,31,32],
    "IVAN":          [33,34,35,36,37,38,39],
    "LAIS":          [40,41,42,43,44,45,46],
    "LEONARDO":      [47,48,49,50,51,52,53],
    "LUANA":         [54,55,56,57,58,59,60],
    "LUIS FELIPE":   [61,62,63,64,65,66,67],
    "MARCELO":       [68,69,70,71,72,73,74],
    "MARLON":        [75,76,77,78,79,80,81],
    "ROBSON":        [82,83,84,85,86,87],
    "SAMUEL":        [88,89,90,91,92,93],
    "YVES":          [94,95,96,97,98,99]
  };

  // Ausências/férias
  const AUSENTES = []; // ex.: ["LUANA"]

  // Índice sub-final → dono (aceita "0"/"00" .. "99")
  const SUB_TO_OWNER = (() => {
    const m = new Map();
    for (const [nome, finais] of Object.entries(NAME_GROUPS)) {
      for (const f of finais) {
        const s1 = String(f);
        const s2 = String(f).padStart(2,'0');
        m.set(s1, nome);
        m.set(s2, nome);
      }
    }
    return m;
  })();

  const isAtivo = (nome) => nome && !AUSENTES.includes(nome);

  function donoSubfinal(sub) {
    const nome = SUB_TO_OWNER.get(sub);
    return isAtivo(nome) ? nome : null;
  }

  // Resolver geral com fallback (SEM regra especial Glauco)
  function getResponsavel(numeroStr) {
    let n = (numeroStr || "").replace(/\D/g, "");
    if (!n) return null;

    while (n.length > 0) {
      // últimos 2 dígitos
      if (n.length >= 2) {
        const sub2 = n.slice(-2);
        const dono2 = donoSubfinal(sub2);
        if (dono2) return dono2;
      }

      // último dígito
      const sub1 = n.slice(-1);
      const dono1 = donoSubfinal(sub1);
      if (dono1) return dono1;

      // fallback: encurta
      n = n.slice(0, -1);
    }
    return null;
  }

  const NAME_COLOR = {
    "ADRIANO":            {bg:"#E6E66A", fg:"#000"},
    "DANIEL LEAL":        {bg:"#E6A85C", fg:"#000"},
    "DOUGLAS":            {bg:"#66CCCC", fg:"#000"},
    "IONE":               {bg:"#4D4D4D", fg:"#fff"},
    "ISA":                {bg:"#5C6FA6", fg:"#fff"},
    "IVAN":               {bg:"#9A9A52", fg:"#000"},
    "LAIS":               {bg:"#D966D9", fg:"#000"},
    "LEONARDO":           {bg:"#8E5A8E", fg:"#fff"},
    "LUANA":              {bg:"#7ACC7A", fg:"#000"},
    "LUIS FELIPE":        {bg:"#5CA3A3", fg:"#000"},
    "MARCELO":            {bg:"#A05252", fg:"#fff"},
    "MARLON":             {bg:"#A0A0A0", fg:"#000"},
    "ROBSON":             {bg:"#CCCCCC", fg:"#000"},
    "SAMUEL":             {bg:"#66A3CC", fg:"#000"},
    "YVES":               {bg:"#4D4D4D", fg:"#fff"},
  };

  const NAME_MARK_ATTR = 'adMarcado';
  const LINK_PICKERS = ['a.entity-link-id', '.slick-row a'];
  const processedLinks = new WeakSet();

  // pega links únicos
  const pickAllLinks = () => {
      const set = new Set();
      const viewport = getGridViewport();
      if (!viewport) return [];
      for (const sel of LINK_PICKERS) {
          viewport.querySelectorAll(sel).forEach(a => set.add(a));
      }
      return Array.from(set);
  };


  const extractTrailingDigits = (text) => {
      // grab last contiguous run of digits from the string, prefer last >=2 digits
      const m = String(text).match(/(\d{2,})\b(?!.*\d)/);
      if (m) return m[1];
      const m2 = String(text).match(/(\d+)(?!.*\d)/);
      return m2 ? m2[1] : '';
  };

  function applyNameBadges() {
    if (!prefs.nameBadgesOn) return;
    pickAllLinks().forEach(link => {
      if (!link || processedLinks.has(link)) return;
      const label = (link.textContent || '').trim();
      const digits = extractTrailingDigits(label);
      if (!digits) { processedLinks.add(link); return; }

      const owner = getResponsavel(digits);
      const cell = link.closest('.slick-cell');

      if (cell && owner && NAME_COLOR[owner]) {
        const { bg, fg } = NAME_COLOR[owner];
        cell.classList.add('tmx-namecell');
        cell.style.background = bg;
        cell.style.color = fg || '';
        cell.querySelectorAll('a').forEach(a => { a.style.color = 'inherit'; });
      }

      if (owner && !link.dataset[NAME_MARK_ATTR]) {
        const tag = document.createElement('span');
        tag.textContent = ' ' + owner;
        tag.style.marginLeft = '6px';
        tag.style.fontWeight = '600';
        const c = NAME_COLOR[owner];
        if (c) {
          tag.style.background = c.bg;
          tag.style.color = c.fg;
          tag.style.padding = '0 4px';
          tag.style.borderRadius = '4px';
        }
        link.insertAdjacentElement('afterend', tag);
        link.dataset[NAME_MARK_ATTR] = '1';
      }

      processedLinks.add(link);
    });
  }

  /* =========================================================
   *  3) Marca "Solicitado por.Título" se for juiz/juíza
   * =======================================================*/
  const RE_MAGISTRADO = /\bju[ií]z(?:es|a)?(?:\s+de\s+direito)?\b/i;
  const AID_SOLICITADO_POR = 'grid_header_RequestedByPerson.Title';

  function getColumnSelectorByHeaderAid(aid) {
      const headers = Array.from(document.querySelectorAll('.slick-header-columns .slick-header-column'));
      const target = headers.find(h => h.getAttribute('data-aid') === aid);
      let idx = -1;
      if (target) idx = headers.indexOf(target);
      else {
          // fallback: search by normalized innerText containing a known label fragment
          const normalizedAid = aid.toLowerCase().replace(/grid_header_/, '').replace(/_/g,' ');
          const byText = headers.find(h => (h.textContent||'').toLowerCase().includes(normalizedAid));
          if (byText) idx = headers.indexOf(byText);
      }
      if (idx < 0) return null;
      return `.slick-row .slick-cell.l${idx}.r${idx}`;
  }


  function markMagistrateColumn(root=document) {
    if (!prefs.magistradoOn) return;
    const scope = getGridViewport(root);
    const colSel = getColumnSelectorByHeaderAid(AID_SOLICITADO_POR);
    if (!colSel) return;
    scope.querySelectorAll(colSel).forEach(cell => {
      const txt = (cell.textContent || '').trim();
      if (RE_MAGISTRADO.test(txt)) cell.classList.add('tmx-juizdireito-hit');
      else cell.classList.remove('tmx-juizdireito-hit');
    });
  }

  /* =========================================================
   *  4) TAGs automáticas na coluna "Descrição"
   * =======================================================*/
  const AID_DESCRICAO = 'grid_header_Description';

  const AUTO_TAG_RULES = [
    { palavras:["mandado","oficial de justiça","central de mandos"], tag:"CEMAN" },
    { palavras:["custas","taxa","diligência","diligências"],        tag:"CUSTAS" },
    { palavras:["atp","automatização","automação","regra"],          tag:"ATP" },
    { palavras:["cadastrar","cadastro"],                              tag:"CADASTROS" },
    { palavras:["acesso","login","acessar","fatores","autenticador","autenticação","authenticator","senha"], tag:"LOGIN" },
    { palavras:["Migrado","Migrados","Migração","Migrador","migrar"], tag:"MIGRADOR" },
    { palavras:["Carta","Cartas"],                                    tag:"CORREIOS" },
    { palavras:["DJEN"],                                              tag:"DJEN" },
    { palavras:["Renajud","Sisbajud"],                                tag:"ACIONAMENTOS" },
    { palavras:["Distribuição","Redistribuir","Remeter"],             tag:"DISTRIBUIÇÃO" },
  ];

  const hasLeadingTag = html => /\[\s*[A-Z]+\s*\]/.test(html.replace(/<[^>]+>/g,'').slice(0,24));

  function tagDescriptionCellOnce(el) {
    if (el.dataset.smaxTagged === '1') return;
    const plain = el.textContent?.trim();
    if (!plain) return;

    const htmlAtual = el.innerHTML.trim();
    if (hasLeadingTag(htmlAtual)) { el.dataset.smaxTagged = '1'; return; }

    const n = normalizeText(plain);
    for (const r of AUTO_TAG_RULES) {
      if (r.palavras.some(p => n.includes(normalizeText(p)))) {
        el.innerHTML = `<span class="tag-smax">${r.tag}</span> ${htmlAtual}`;
        el.dataset.smaxTagged = '1';
        break;
      }
    }
  }

  function applyAutoTagsInDescription() {
    if (!prefs.autoTagsOn) return;
    const colSel = getColumnSelectorByHeaderAid(AID_DESCRICAO);
    if (!colSel) return;
    const nodes = document.querySelectorAll(`${colSel}:not([data-smax-tagged])`);
    const MAX_PER_TICK = 500;
    let count = 0;
    for (const el of nodes) {
      tagDescriptionCellOnce(el);
      if (++count >= MAX_PER_TICK) break;
    }
  }

  /* =========================================================
   *  5) Comentários auto-altura
   * =======================================================*/
  function initAutoHeightComments() {
    if (!prefs.enlargeCommentsOn) return;
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes?.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches?.('.comment-items')) {
            node.style.height = 'auto';
            node.style.maxHeight = 'none';
          } else {
            node.querySelectorAll?.('.comment-items').forEach(el => {
              el.style.height = 'auto';
              el.style.maxHeight = 'none';
            });
          }
        });
      }
    });
    obs.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  }

  /* =========================================================
   *  6) Recolher "Oferta de Catálogo" + remover seções
   * =======================================================*/
  function initSectionTweaks() {
    if (!prefs.collapseOn) return;

    const SECTION_SELECTOR = '#form-section-5, [data-aid="section-catalog-offering"]';
    const IDS_TO_REMOVE = ['form-section-1','form-section-7','form-section-8'];
    const collapsedOnce = new WeakSet();

    const isOpen = (sectionEl) => {
      const content = sectionEl?.querySelector?.('.pl-entity-page-component-content');
      return !!content && !content.classList.contains('ng-hide');
    };
    const syntheticClick = (el) => { try { el.click(); } catch { el.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true })); } };
    const fixAriaAndIcon = (headerEl, sectionEl) => {
      if (!headerEl || !sectionEl) return;
      if (headerEl.getAttribute('aria-expanded') !== 'false') headerEl.setAttribute('aria-expanded','false');
      const sr = sectionEl.querySelector('.pl-entity-page-component-header-sr');
      if (sr && /Expandido/i.test(sr.textContent || '')) sr.textContent = sr.textContent.replace(/Expandido/ig,'Recolhido');
      const icon = headerEl.querySelector('[pl-bidi-collapse-arrow]') || headerEl.querySelector('.icon-arrow-med-down, .icon-arrow-med-right');
      if (icon) { icon.classList.remove('icon-arrow-med-down'); icon.classList.add('icon-arrow-med-right'); }
    };

    function collapseSectionOnce(sectionEl) {
      if (sectionEl.dataset.userInteracted === '1') return;
      if (collapsedOnce.has(sectionEl)) return;

      const header = sectionEl.querySelector('.pl-entity-page-component-header[role="button"]');
      if (!header) return;

      if (isOpen(sectionEl)) {
        syntheticClick(header);
        setTimeout(()=>fixAriaAndIcon(header,sectionEl),0);
      } else {
        fixAriaAndIcon(header,sectionEl);
      }
      collapsedOnce.add(sectionEl);
    }

    const removeSections = () => IDS_TO_REMOVE.forEach(id => { const el = document.getElementById(id); if (el && el.parentNode) el.remove(); });

    function applyAll() {
      document.querySelectorAll(SECTION_SELECTOR).forEach(collapseSectionOnce);
      removeSections();
    }

    document.addEventListener('click', (e)=>{
      const header = e.target.closest('.pl-entity-page-component-header[role="button"]');
      if (!header) return;
      const sectionEl = header.closest('#form-section-5, [data-aid="section-catalog-offering"]');
      if (sectionEl) sectionEl.dataset.userInteracted = '1';
    }, { capture:true });

    const schedule = debounce(applyAll, 100);
    const obs = new MutationObserver(()=>schedule());
    setTimeout(applyAll, 300);
    obs.observe(document.documentElement, { childList:true, subtree:true });
    window.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  }

  /* =========================================================
   *  7) Orquestração (um único observer com debounce)
   * =======================================================*/
  function runAllFeatures() {
    const work = () => {
      applyHighlightsInGrid();
      applyNameBadges();
      markMagistrateColumn();
      applyAutoTagsInDescription();
    };
    if ('requestIdleCallback' in window) requestIdleCallback(work, { timeout: 500 });
    else setTimeout(work, 0);
  }

  const scheduleRunAllFeatures = debounce(runAllFeatures, 80);

  function initOrchestrator() {
    runAllFeatures();

    const obsMain = new MutationObserver(()=>scheduleRunAllFeatures());
    obsMain.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class','style','aria-expanded']
    });

    // Cabeçalho pode mudar índices lN/rN ao mostrar/ocultar/reordenar
    const headerEl = document.querySelector('.slick-header-columns') || document.body;
    const obsHeader = new MutationObserver(()=>scheduleRunAllFeatures());
    obsHeader.observe(headerEl, { childList:true, subtree:true, attributes:true });

    window.addEventListener('scroll', scheduleRunAllFeatures, true);
    window.addEventListener('resize', scheduleRunAllFeatures, { passive:true });
    window.addEventListener('beforeunload', () => { obsMain.disconnect(); obsHeader.disconnect(); }, { once:true });
  }

  /* =========================================================
   *  8) Destacar usuários detratores (caveira)
   * =======================================================*/
  function initFlagUsersSkull() {
    if (!prefs.flagSkullOn) return;
    const ICON_CAVEIRA_URL = 'https://cdn-icons-png.flaticon.com/512/564/564619.png';
    const GRUPO_1 = [
      "Adriano Zilli","Adriana Da Silva Ferreira Oliveira","Alessandra Sousa Nunes","Bruna Marques Dos Santos",
      "Breno Medeiros Malfati","Carlos Henrique Scala De Almeida","Cassia Santos Alves De Lima","Dalete Rodrigues Silva",
      "David Lopes De Oliveira","Davi Dos Reis Garcia","Deaulas De Campos Salviano","Diego Oliveira Da Silva",
      "Diogo Mendonça Aniceto","Elaine Moriya","Ester Naili Dos Santos","Fabiano Barbosa Dos Reis",
      "Fabricio Christiano Tanobe Lyra","Gabriel Teixeira Ludvig","Gilberto Sintoni Junior","Giovanna Coradini Teixeira",
      "Gislene Ferreira Sant'Ana Ramos","Guilherme Cesar De Sousa","Gustavo De Meira Gonçalves","Jackson Alcantara Santana",
      "Janaina Dos Passos Silvestre","Jefferson Silva De Carvalho Soares","Joyce Da Silva Oliveira","Juan Campos De Souza",
      "Juliana Lino Dos Santos Rosa","Karina Nicolau Samaan","Karine Barbara Vitor De Lima Souza","Kaue Nunes Silva Farrelly",
      "Kelly Ferreira De Freitas","Larissa Ferreira Fumero","Lucas Alves Dos Santos","Lucas Carneiro Peres Ferreira",
      "Marcos Paulo Silva Madalena","Maria Fernanda De Oliveira Bento","Natalia Yurie Shiba","Paulo Roberto Massoca",
      "Pedro Henrique Palacio Baritti","Rafaella Silva Lima Petrolini","Renata Aparecida Mendes Bonvechio","Rodrigo Silva Oliveira",
      "Ryan Souza Carvalho","Tatiana Lourenço Da Costa Antunes","Tatiane Araujo Da Cruz","Thiago Tadeu Faustino De Oliveira",
      "Tiago Carvalho De Freitas Meneses","Victor Viana Roca"
    ];

    const normalizeName = s => (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
    const FLAG_SET = new Set(GRUPO_1.map(normalizeName));

    function getVisibleLeadingText(el) {
      const clone = el.cloneNode(true);
      while (clone.firstChild) {
        if (clone.firstChild.nodeType === Node.ELEMENT_NODE) clone.removeChild(clone.firstChild);
        else break;
      }
      return clone.textContent || '';
    }

    function applySkullAlert(personItem) {
      try {
        if (!(personItem instanceof HTMLElement)) return;
        const nomeVisivel = getVisibleLeadingText(personItem);
        const chave = normalizeName(nomeVisivel);
        if (!FLAG_SET.has(chave)) return;

        const img = personItem.querySelector('img.ts-avatar, img.pl-shared-item-img, img.ts-image') || personItem.querySelector('img');
        if (img && img.dataset.__g1Applied !== '1') {
          img.dataset.__g1Applied = '1';
          img.src = ICON_CAVEIRA_URL;
          img.alt = 'Alerta de Usuário Detrator';
          img.title = 'Alerta de Usuário Detrator';
          Object.assign(img.style, {
            border:'3px solid #ff0000', borderRadius:'50%', padding:'2px',
            backgroundColor:'#ff000022', boxShadow:'0 0 10px #ff0000'
          });
        }
        personItem.style.color = '#ff0000';
      } catch {}
    }

    const obs = new MutationObserver(()=>document.querySelectorAll('span.pl-person-item').forEach(applySkullAlert));
    obs.observe(document.body, { childList:true, subtree:true });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ()=>document.querySelectorAll('span.pl-person-item').forEach(applySkullAlert));
    } else {
      document.querySelectorAll('span.pl-person-item').forEach(applySkullAlert);
    }

    window.addEventListener('beforeunload', () => obs.disconnect(), { once:true });
  }

  /* ====================== Boot ====================== */
  initAutoHeightComments();
  initSectionTweaks();
  initOrchestrator();
  createSettingsUI();
  initFlagUsersSkull(); // comente esta linha se não quiser a “caveira”
})();
