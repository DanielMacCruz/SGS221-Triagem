// ==UserScript==
// @name         TRIAGEM - SMAX SGS221
// @namespace    https://github.com/DanielMacCruz/SGS221-Triagem
// @version      0.2
// @description  Interface enhancements for triagem workflow
// @author       YOU
// @match        https://suporte.tjsp.jus.br/saw/*
// @match        https://suporte.tjsp.jus.br/saw/Requests*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL  https://github.com/DanielMacCruz/SGS221-Triagem/raw/refs/heads/main/TRIAGEM%20-%20SMAX%20SGS221-0.1.user.js
// @updateURL    https://github.com/DanielMacCruz/SGS221-Triagem/raw/refs/heads/main/TRIAGEM%20-%20SMAX%20SGS221-0.1.user.js
// @homepageURL  https://github.com/DanielMacCruz/SGS221-Triagem
// @supportURL   https://chatgpt.com
// ==/UserScript==

(() => {
  'use strict';

  /* ====================== Preferências ====================== */
  const prefs = {
    nameBadgesOn: true,
    collapseOn: false,
    enlargeCommentsOn: true,
    flagSkullOn: true,
    nameGroups: null, // will store custom name assignments
    ausentes: null,   // will store absent colleagues
    nameColors: null, // will store assigned colors for each name
  };

  // Load saved preferences
  try {
    const saved = GM_getValue('smax_prefs');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(prefs, parsed);
      console.log('[SMAX] Loaded preferences:', prefs);
    }
  } catch (e) {
    console.warn('[SMAX] Failed to load preferences:', e);
  }

  // Helper to save preferences
  const savePrefs = () => {
    try {
      const serialized = JSON.stringify(prefs);
      GM_setValue('smax_prefs', serialized);
      console.log('[SMAX] Saved preferences:', prefs);
    } catch (e) {
      console.error('[SMAX] Failed to save preferences:', e);
    }
  };

  /* ====================== CSS Global ====================== */
  GM_addStyle(`
  /* badge de nomes (célula inteira colorida) */
  .slick-cell.tmx-namecell { font-weight:700 !important; transition: box-shadow .15s ease; }
  .slick-cell.tmx-namecell a { color: inherit !important; }
  .slick-cell.tmx-namecell:focus-within { outline: 2px solid rgba(0,0,0,.25); outline-offset: 2px; }
  .slick-cell.tmx-namecell:hover { box-shadow: 0 0 0 2px rgba(0,0,0,.08) inset; }

  /* comentários */
  .comment-items { height: auto !important; max-height: none !important; }

  /* settings: custom Ausente checkbox */
  .smax-absent-wrapper {
    display:inline-flex;
    align-items:center;
    gap:4px;
    cursor:pointer;
    font-size:12px;
    white-space:nowrap;
  }
  .smax-absent-input {
    position:absolute;
    opacity:0;
    pointer-events:none;
  }
  .smax-absent-box {
    width:14px;
    height:14px;
    border:1px solid #555;
    border-radius:2px;
    background:#fff;
    box-sizing:border-box;
  }
  .smax-absent-input:checked + .smax-absent-box {
    background:#d32f2f;
    border-color:#d32f2f;
    box-shadow:0 0 0 1px #d32f2f;
  }

  /* overlay para sugerir atualização de página */
  #smax-refresh-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 999998;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  #smax-refresh-overlay-inner {
    background:#fff;
    border-radius:8px;
    padding:24px 28px;
    max-width:420px;
    box-shadow:0 10px 30px rgba(0,0,0,.35);
    text-align:center;
  }
  #smax-refresh-overlay-inner h3 {
    margin:0 0 12px 0;
    font-size:18px;
  }
  #smax-refresh-overlay-inner p {
    margin:0 0 16px 0;
    font-size:14px;
    line-height:1.5;
  }
  #smax-refresh-now {
    padding:8px 16px;
    background:#2e7d32;
    color:#fff;
    border:none;
    border-radius:4px;
    font-size:14px;
    cursor:pointer;
    margin-right:8px;
  }
  #smax-refresh-later {
    padding:8px 12px;
    background:#eee;
    color:#333;
    border:none;
    border-radius:4px;
    font-size:13px;
    cursor:pointer;
  }

  /* triage HUD: entry button + panel */
  #smax-triage-start-btn {
    position:fixed;
    left:50%;
    bottom:18px;
    transform:translateX(-50%);
    z-index:999999;
    padding:10px 22px;
    border-radius:999px;
    border:none;
    cursor:pointer;
    font-size:16px;
    font-weight:600;
    background:#1976d2;
    color:#fff;
    box-shadow:0 4px 12px rgba(0,0,0,.35);
  }

  #smax-triage-hud-backdrop {
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.5);
    z-index:999997;
    display:none;
    align-items:center;
    justify-content:center;
  }

  #smax-triage-hud {
    background:#111827;
    color:#e5e7eb;
    border-radius:12px;
    padding:18px 20px 16px;
    max-width:900px;
    width:90vw;
    box-shadow:0 20px 45px rgba(0,0,0,.7);
    font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  }

  #smax-triage-hud-header {
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:10px;
  }

  #smax-triage-hud-header h3 {
    margin:0;
    font-size:18px;
  }

  #smax-triage-hud-body {
    background:#020617;
    border-radius:8px;
    padding:12px 14px;
    min-height:80px;
    margin-bottom:10px;
  }

  #smax-triage-hud-footer {
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px;
  }

  .smax-triage-primary {
    padding:8px 16px;
    border-radius:999px;
    border:none;
    cursor:pointer;
    background:#22c55e;
    color:#022c22;
    font-weight:600;
  }

  .smax-triage-secondary {
    padding:6px 12px;
    border-radius:999px;
    border:1px solid #4b5563;
    background:transparent;
    color:#e5e7eb;
    cursor:pointer;
    font-size:13px;
  }
  
  #smax-triage-status {
    font-size:12px;
    color:#9ca3af;
  }
`);

  /* ====================== Network / triage cache ====================== */
  const TRIAGE_CACHE = new Map();

  function ingestRequestListPayload(obj) {
    try {
      if (!obj || typeof obj !== 'object') return;
      const entities = Array.isArray(obj.entities) ? obj.entities : [];
      for (const ent of entities) {
        if (!ent || typeof ent !== 'object') continue;
        const props = ent.properties || {};
        const rel = ent.related_properties || {};

        const id = props.Id != null ? String(props.Id) : '';
        if (!id) continue;

        const createdRaw = props.CreateTime;
        let createdText = '';
        let createdTs = 0;
        if (typeof createdRaw === 'number') {
          createdTs = createdRaw;
          createdText = new Date(createdRaw).toLocaleString();
        } else if (createdRaw != null) {
          createdText = String(createdRaw);
          createdTs = parseSmaxDateTime(createdText) || 0;
        }

        const priority = props.Priority || '';
        const isVipPerson = !!(rel.RequestedForPerson && rel.RequestedForPerson.IsVIP);
        const isVip = isVipPerson || /VIP/i.test(String(priority));

        const descHtml = props.Description || '';
        const tmpDiv = document.createElement('div');
        tmpDiv.innerHTML = String(descHtml);
        const subjectText = (tmpDiv.textContent || tmpDiv.innerText || '').trim().split('\n')[0] || '';

        const idNum = parseInt(id.replace(/\D/g,''),10);

        TRIAGE_CACHE.set(id, {
          idText: id,
          idNum: isNaN(idNum) ? null : idNum,
          createdText,
          createdTs,
          isVip,
          subjectText,
          row: null
        });
      }
      if (entities.length) {
        console.log('[SMAX] Ingeridos', entities.length, 'chamados na TRIAGE_CACHE (total:', TRIAGE_CACHE.size, ')');
      }
    } catch (e) {
      console.warn('[SMAX] Falha ao ingerir payload de Request:', e);
    }
  }

  const PEOPLE_CACHE = new Map();

  function ingestPersonListPayload(obj) {
    try {
      if (!obj || typeof obj !== 'object') return;
      const entities = Array.isArray(obj.entities) ? obj.entities : [];
      for (const ent of entities) {
        if (!ent || typeof ent !== 'object') continue;
        const props = ent.properties || {};

        const id = props.Id != null ? String(props.Id) : '';
        if (!id) continue;

        const name = (props.Name || '').toString().trim();
        const upn  = (props.Upn  || '').toString().trim();
        const email = (props.Email || '').toString().trim();
        const isVip = !!props.IsVIP;
        const employeeNumber = props.EmployeeNumber || '';
        const firstName = props.FirstName || '';
        const lastName  = props.LastName  || '';
        const location  = props.Location  || '';

        PEOPLE_CACHE.set(id, {
          id,
          name,
          upn,
          email,
          isVip,
          employeeNumber,
          firstName,
          lastName,
          location
        });
      }
      if (entities.length) {
        console.log('[SMAX] Ingeridas', entities.length, 'pessoas na PEOPLE_CACHE (total:', PEOPLE_CACHE.size, ')');
      }
    } catch (e) {
      console.warn('[SMAX] Falha ao ingerir payload de Person:', e);
    }
  }

  (function patchNetworkForTriage(){
    try {
      // XHR
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        try { this.__smaxUrl = url; } catch {}
        return origOpen.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function(body) {
        this.addEventListener('load', function() {
          try {
                        const url = this.__smaxUrl || this.responseURL || '';
            if (!/\/rest\/\d+\/ems\/(Request|Person)/i.test(url)) return;
            if (!this.responseText) return;
            const json = JSON.parse(this.responseText);
            if (/\/rest\/\d+\/ems\/Request/i.test(url)) {
              ingestRequestListPayload(json);
            } else if (/\/rest\/\d+\/ems\/Person/i.test(url)) {
              ingestPersonListPayload(json);
            }
          } catch {}
        });
        return origSend.call(this, body);
      };

      // fetch
      if (window.fetch) {
        const origFetch = window.fetch;
        window.fetch = function(input, init) {
          return origFetch(input, init).then(resp => {
            try {
              const url = resp.url || (typeof input === 'string' ? input : '');
              if (!/\/rest\/\d+\/ems\/(Request|Person)/i.test(url)) return resp;
              const clone = resp.clone();
              clone.text().then(txt => {
                try {
                  if (!txt) return;
                  const json = JSON.parse(txt);
                  if (/\/rest\/\d+\/ems\/Request/i.test(url)) {
                    ingestRequestListPayload(json);
                  } else if (/\/rest\/\d+\/ems\/Person/i.test(url)) {
                    ingestPersonListPayload(json);
                  }
                } catch {}
              });
            } catch {}
            return resp;
          });
        };
      }
    } catch (e) {
      console.warn('[SMAX] Falha ao fazer patch de rede para triagem:', e);
    }
  })();

    function createSettingsUI() {
        if (document.getElementById('smax-settings')) return;
        const btn = document.createElement('button');
        btn.id = 'smax-settings-btn';
        btn.textContent = '⚙️ SMAX';
        Object.assign(btn.style, { position:'fixed', right:'12px', bottom:'12px', zIndex:999999, padding:'8px 12px', borderRadius:'8px', background:'#222', color:'#fff', border:'none', cursor:'pointer', fontSize:'14px' });
        document.body.appendChild(btn);

        const panel = document.createElement('div');
        panel.id = 'smax-settings';
        Object.assign(panel.style, { position:'fixed', right:'12px', bottom:'54px', maxWidth:'650px', maxHeight:'80vh', overflow:'auto', zIndex:999999, padding:'16px', borderRadius:'8px', background:'#fff', boxShadow:'0 6px 18px rgba(0,0,0,.25)', display:'none' });
        
        function rebuildPanel() {
            // Get current name groups and ausentes
            const currentNames = prefs.nameGroups || NAME_GROUPS;
            const currentAusentes = prefs.ausentes || AUSENTES;
            
            // Sort names alphabetically
            const sortedNames = Object.keys(currentNames).sort();
            
            // Build the name groups editor HTML (with explicit Absent checkbox)
            let nameGroupsHTML = '';
            for (const name of sortedNames) {
                const digits = currentNames[name];
                const isAbsent = currentAusentes.includes(name);
                const rangeStr = digitsToRangeString(digits);
                nameGroupsHTML += `
                    <div style="margin-bottom:10px;padding:8px;background:${isAbsent ? '#ffe0e0' : '#f9f9f9'};border-radius:4px;">
                      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                        <span style="min-width:140px;font-weight:600;">${name}</span>
                        <label class="smax-absent-wrapper">
                          <input
                            type="checkbox"
                            class="smax-name-absent smax-absent-input"
                            data-name="${name}"
                            ${isAbsent ? 'checked' : ''}
                          >
                          <span class="smax-absent-box"></span>
                          Ausente
                        </label>
                        <input type="text" class="smax-name-digits" data-name="${name}" value="${rangeStr}"
                              style="flex:1;padding:6px;border:1px solid #ccc;border-radius:3px;font-family:monospace;"
                              placeholder="0-6 or 7,8,10-15">
                        <button class="smax-remove-name" data-name="${name}"
                                style="padding:4px 8px;background:#d32f2f;color:#fff;border:none;border-radius:3px;cursor:pointer;">
                          ✕
                        </button>
                      </div>
                    </div>`;
            }
            
            panel.innerHTML = `
        <h4 style="margin:0 0 12px 0;border-bottom:2px solid #222;padding-bottom:6px;">SMAX — Settings</h4>
        <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h5 style="margin:0;">Team Assignments</h5>
                <button id="smax-add-person" style="padding:4px 12px;background:#2e7d32;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">+ Add Person</button>
            </div>
            <div style="margin-bottom:10px;border:1px solid #ddd;border-radius:4px;padding:8px;">
              <div style="font-size:12px;margin-bottom:6px;">Adicionar pessoa pelo SMAX (usa PEOPLE_CACHE)</div>
              <input type="text" id="smax-person-search" placeholder="Digite parte do nome ou UPN"
                     style="width:100%;padding:6px;border:1px solid #ccc;border-radius:3px;font-size:12px;margin-bottom:6px;">
              <div id="smax-person-results" style="max-height:140px;overflow:auto;font-size:12px;"></div>
            </div>
            <div id="smax-team-list">
                ${nameGroupsHTML}
            </div>
          </div>
      `;

            // Re-attach event listeners
            attachEventListeners();
        }

        function attachEventListeners() {
            const searchInput = document.getElementById('smax-person-search');
            const resultsEl = document.getElementById('smax-person-results');

            if (searchInput && resultsEl) {
              const renderResults = (term) => {
                const q = (term || '').toString().trim().toUpperCase();
                if (!q || PEOPLE_CACHE.size === 0) {
                  resultsEl.innerHTML = q
                    ? '<div style="color:#999;">Nenhuma pessoa encontrada. Abra um dropdown de responsável para carregar dados.</div>'
                    : '<div style="color:#999;">Digite para buscar nas pessoas já carregadas.</div>';
                  return;
                }
                const matches = [];
                for (const p of PEOPLE_CACHE.values()) {
                  const name = (p.name || '').toUpperCase();
                  const upn = (p.upn || '').toUpperCase();
                  if (name.includes(q) || upn.includes(q)) {
                    matches.push(p);
                    if (matches.length >= 30) break;
                  }
                }
                if (!matches.length) {
                  resultsEl.innerHTML = '<div style="color:#999;">Nenhuma pessoa corresponde à busca atual.</div>';
                  return;
                }
                resultsEl.innerHTML = matches.map(p => `
                  <div class="smax-person-pick"
                       data-name="${p.name.replace(/"/g,'&quot;')}"
                       style="padding:4px 6px;cursor:pointer;border-radius:3px;">
                    <strong>${p.name}</strong>
                    ${p.upn ? `<span style="color:#555;"> (${p.upn})</span>` : ''}
                    ${p.isVip ? `<span style="margin-left:4px;padding:0 4px;border-radius:999px;background:#facc15;color:#854d0e;font-size:10px;font-weight:700;">VIP</span>` : ''}
                  </div>
                `).join('');

                resultsEl.querySelectorAll('.smax-person-pick').forEach(el => {
                  el.addEventListener('click', () => {
                    const pickedName = (el.getAttribute('data-name') || '').toUpperCase();
                    if (!pickedName) return;
                    const currentNames = prefs.nameGroups || {};
                    if (!currentNames[pickedName]) {
                      currentNames[pickedName] = [];
                      prefs.nameGroups = currentNames;
                      savePrefs();
                      rebuildNameMapping();
                      showRefreshOverlay();
                      rebuildPanel();
                    }
                  });
                });
              };

              searchInput.addEventListener('input', () => renderResults(searchInput.value));
              renderResults(''); // initial help text
            }

            // Add person button
            document.getElementById('smax-add-person').addEventListener('click', () => {
                const name = prompt('Enter person name (e.g., JOAO):');
                if (!name || !name.trim()) return;
                const digits = prompt('Enter assigned digits (e.g., 0-6 or 7,10-15,20):');

                const currentNames = prefs.nameGroups || {};
                const newName = name.trim().toUpperCase();

                // Add name even if no digits provided
                currentNames[newName] = digits ? parseDigitRanges(digits) : [];
                prefs.nameGroups = currentNames;
                savePrefs();
                rebuildNameMapping();
                showRefreshOverlay();
                rebuildPanel();
            });

            // Remove person buttons
            document.querySelectorAll('.smax-remove-name').forEach(btn => {
                btn.addEventListener('click', () => {
                    const name = btn.dataset.name;
                    if (!confirm(`Remove ${name} from the team? This will permanently delete them.`)) return;

                    const currentNames = prefs.nameGroups || {};
                    delete currentNames[name];
                    prefs.nameGroups = currentNames;

                    // Also remove from ausentes if present
                    const currentAusentes = prefs.ausentes || [];
                    prefs.ausentes = currentAusentes.filter(n => n !== name);

                    // Remove color assignment
                    if (prefs.nameColors && prefs.nameColors[name]) {
                        delete prefs.nameColors[name];
                    }
                    savePrefs();
                    rebuildNameMapping();
                    showRefreshOverlay();
                    rebuildPanel();
                });
            });

            // Auto-save when digits change
            document.querySelectorAll('.smax-name-digits').forEach(input => {
              input.addEventListener('change', () => {
                const name = input.dataset.name;
                const digitsStr = input.value.trim();
                const currentNames = prefs.nameGroups || {};
                currentNames[name] = digitsStr ? parseDigitRanges(digitsStr) : [];
                prefs.nameGroups = currentNames;
                savePrefs();
                rebuildNameMapping();
                showRefreshOverlay();
              });
            });

            // Auto-save when absent checkbox toggled (explicit user-only control)
            document.querySelectorAll('.smax-name-absent').forEach(checkbox => {
              checkbox.addEventListener('change', () => {
                const name = checkbox.dataset.name;
                const currentAusentes = prefs.ausentes || [];
                const isChecked = checkbox.checked;
                const set = new Set(currentAusentes);
                if (isChecked) set.add(name); else set.delete(name);
                prefs.ausentes = Array.from(set);
                savePrefs();
                rebuildNameMapping();
                // Also visually update background without full rebuild
                const wrapper = checkbox.closest('div[style*="margin-bottom:10px"]');
                if (wrapper) wrapper.style.background = isChecked ? '#ffe0e0' : '#f9f9f9';
                showRefreshOverlay();
              });
            });
        }

        document.body.appendChild(panel);
        rebuildPanel();

        btn.addEventListener('click', () => {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) rebuildPanel(); // Refresh panel when opening
        });
    }

  function showRefreshOverlay() {
    let overlay = document.getElementById('smax-refresh-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'smax-refresh-overlay';
      overlay.innerHTML = `
        <div id="smax-refresh-overlay-inner">
          <h3>Configurações atualizadas</h3>
          <p>
            Para aplicar todas as mudanças, atualize a página.<br>
            A lista de chamados ficará certinha com as novas regras.
          </p>
          <button id="smax-refresh-now">Atualizar agora</button>
          <button id="smax-refresh-later">Vou atualizar depois</button>
        </div>
      `;
      document.body.appendChild(overlay);

      const refreshBtn = () => document.getElementById('smax-refresh-now');
      const laterBtn = () => document.getElementById('smax-refresh-later');

      overlay.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.id === 'smax-refresh-now') {
          window.location.reload();
        } else if (target.id === 'smax-refresh-later') {
          overlay.style.display = 'none';
        }
      });
    }
    overlay.style.display = 'flex';
  }

  /* ====================== Helpers ====================== */
  const debounce = (fn, wait=120) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; };
  const getGridViewport = (root=document) => root.querySelector('.slick-viewport') || root;

  // Empty defaults - everything is configured via settings UI
  const NAME_GROUPS = {};
  const AUSENTES = [];

  // Dynamic mapping that will be rebuilt when settings change
  let SUB_TO_OWNER = new Map();
  let CURRENT_AUSENTES = [];

  // Parse digit ranges like "12-15" or "0,1,2-5,7"
  function parseDigitRanges(input) {
    const digits = [];
    const parts = input.split(',').map(s => s.trim()).filter(s => s);
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            digits.push(i);
          }
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num)) digits.push(num);
      }
    }
    
    return [...new Set(digits)].sort((a, b) => a - b);
  }

  // Convert array of digits to compact range notation
  function digitsToRangeString(digits) {
    if (!digits || digits.length === 0) return '';
    const sorted = [...new Set(digits)].sort((a, b) => a - b);
    const ranges = [];
    let start = sorted[0];
    let end = sorted[0];
    
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (end - start >= 2) {
          ranges.push(`${start}-${end}`);
        } else if (end === start) {
          ranges.push(`${start}`);
        } else {
          ranges.push(`${start},${end}`);
        }
        start = sorted[i];
        end = sorted[i];
      }
    }
    
    return ranges.join(',');
  }

  function rebuildNameMapping() {
    const nameGroups = prefs.nameGroups || NAME_GROUPS;
    const ausentes = prefs.ausentes || AUSENTES;
    
    SUB_TO_OWNER.clear();
    for (const [nome, finais] of Object.entries(nameGroups)) {
      for (const f of finais) {
        // Only store zero-padded 2-digit strings since we check 2-digit pairs
        const key = String(f).padStart(2, '0');
        SUB_TO_OWNER.set(key, nome);
      }
    }
    
    CURRENT_AUSENTES = ausentes;
  }

  // Initialize on load
  rebuildNameMapping();

  const isAtivo = (nome) => nome && !CURRENT_AUSENTES.includes(nome);

  function donoSubfinal(sub) {
    const nome = SUB_TO_OWNER.get(sub);
    return isAtivo(nome) ? nome : null;
  }

  // Resolver geral com fallback e skip de ausentes
  // Walks backwards through ticket number checking ONLY 2-digit pairs
  function getResponsavel(numeroStr) {
    const digits = (numeroStr || "").replace(/\D/g, "");
    if (digits.length < 2) return null;

    // Start from the last 2 digits and walk backwards
    for (let i = digits.length; i >= 2; i--) {
      const pair = digits.slice(i - 2, i);
      const owner = SUB_TO_OWNER.get(pair);
      
      if (owner) {
        // Found an owner - check if they're active
        if (isAtivo(owner)) {
          return owner; // Active owner found!
        }
        // Owner is absent, continue walking backwards
      }
    }
    
    return null; // No active owner found
  }

  // Generate a color from a string (deterministic but visually distinct)
  function generateColorForName(name) {
    // Use name hash to generate a color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with good saturation and lightness
    const hue = Math.abs(hash % 360);
    const saturation = 45 + (Math.abs(hash >> 8) % 30); // 45-75%
    const lightness = 50 + (Math.abs(hash >> 16) % 20); // 50-70%
    
    const bg = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    // Determine if we need dark or light text based on lightness
    const fg = lightness > 60 ? '#000' : '#fff';
    
    return { bg, fg };
  }

  // Get color for a name (from cache or generate new)
  function getColorForName(name) {
    if (!prefs.nameColors) prefs.nameColors = {};
    
    if (!prefs.nameColors[name]) {
      prefs.nameColors[name] = generateColorForName(name);
      savePrefs();
    }
    
    return prefs.nameColors[name];
  }

  const NAME_MARK_ATTR = 'adMarcado';
  const LINK_PICKERS = ['a.entity-link-id', '.slick-row a'];
  let processedLinks = new Set();

  // Helper to clear processed links cache
  processedLinks.clear = function() { this.clear(); processedLinks = new Set(); };

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

  /* ====================== Triage queue helpers ====================== */
  function parseSmaxDateTime(str) {
    // Expect patterns like 13/11/25 16:37:57
    if (!str) return null;
    const m = str.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    let [ , d, mo, y, h, mi, s] = m;
    d = parseInt(d,10); mo = parseInt(mo,10)-1; h = parseInt(h,10); mi = parseInt(mi,10); s = s?parseInt(s,10):0;
    let year = parseInt(y,10);
    if (year < 100) year += 2000;
    return new Date(year, mo, d, h, mi, s).getTime();
  }

  function buildTriageQueue() {
    // Primeiro, tente usar os dados completos capturados via REST
    if (TRIAGE_CACHE.size) {
      const items = Array.from(TRIAGE_CACHE.values());

      // Tente associar cada item a uma linha visível (para highlight)
      const viewport = getGridViewport();
      const rows = viewport ? Array.from(viewport.querySelectorAll('.slick-row')) : [];
      for (const item of items) {
        item.row = null;
        if (!rows.length || !item.idText) continue;
        for (const row of rows) {
          const cells = row.querySelectorAll('.slick-cell');
          if (!cells.length) continue;
          const cellText = (cells[0].textContent || '').trim();
          if (cellText === item.idText) { item.row = row; break; }
        }
      }

      items.sort((a,b)=>{
        if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
        if (a.createdTs !== b.createdTs) return a.createdTs - b.createdTs;
        if (a.idNum != null && b.idNum != null && a.idNum !== b.idNum) return a.idNum - b.idNum;
        return 0;
      });

      return items;
    }

    // Fallback: usar apenas o que está visível na grade
    const viewport = getGridViewport();
    if (!viewport) return [];

    // Discover column indexes from SlickGrid header to be robust
    let idColIndex = 0;
    let createTimeColIndex = null;
    try {
      const headerColumns = document.querySelectorAll('.slick-header-column');
      headerColumns.forEach((col, idx) => {
        const aid = col.getAttribute('data-aid') || '';
        if (/grid_header_Id$/i.test(aid)) idColIndex = idx;
        if (/grid_header_CreateTime$/i.test(aid)) createTimeColIndex = idx;
      });
    } catch (e) {
      console.warn('[SMAX] Falha ao mapear colunas da grade para triagem:', e);
    }

    const rows = Array.from(viewport.querySelectorAll('.slick-row'));
    const queue = [];

    for (const row of rows) {
      const cells = row.querySelectorAll('.slick-cell');
      if (!cells.length) continue;

      const idCell = cells[idColIndex] || cells[0];
      const idText = (idCell.textContent || '').trim();
      const idNum = parseInt(idText.replace(/\D/g,''),10);
      if (!idText) continue;

      let createdCell = null;
      if (createTimeColIndex != null && cells[createTimeColIndex]) {
        createdCell = cells[createTimeColIndex];
      } else {
        createdCell = Array.from(cells).find(c => /Hora de Cria/i.test(c.getAttribute('title')||'') || /Hora de Cria/i.test(c.textContent||''));
      }
      const createdText = createdCell ? (createdCell.textContent || '').trim() : '';
      const createdTs = parseSmaxDateTime(createdText) || 0;

      const vipCell = Array.from(cells).find(c => /VIP/i.test(c.textContent||''));
      const isVip = !!vipCell && /VIP/i.test(vipCell.textContent||'');

      const link = row.querySelector('a.entity-link-id, .slick-row a');
      const subjectText = link ? (link.textContent || '').trim() : '';

      queue.push({
        idText,
        idNum: isNaN(idNum) ? null : idNum,
        createdText,
        createdTs,
        isVip,
        subjectText,
        row
      });
    }

    queue.sort((a,b)=>{
      if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
      if (a.createdTs !== b.createdTs) return a.createdTs - b.createdTs;
      if (a.idNum != null && b.idNum != null && a.idNum !== b.idNum) return a.idNum - b.idNum;
      return 0;
    });

    return queue;
  }

  /* =========================================================
   *  Triage HUD (skeleton only for now)
   * =======================================================*/
  function initTriageHUD() {
    if (document.getElementById('smax-triage-start-btn')) return;

    const startBtn = document.createElement('button');
    startBtn.id = 'smax-triage-start-btn';
    startBtn.textContent = 'Iniciar triagem';
    document.body.appendChild(startBtn);

    const backdrop = document.createElement('div');
    backdrop.id = 'smax-triage-hud-backdrop';
    backdrop.innerHTML = `
      <div id="smax-triage-hud">
        <div id="smax-triage-hud-header">
          <h3>Triagem de Chamados</h3>
          <button type="button" class="smax-triage-secondary" id="smax-triage-close">Fechar</button>
        </div>
        <div id="smax-triage-hud-body">
          <div style="font-size:14px;color:#e5e7eb;">
            Nenhum chamado carregado ainda.<br>
            Clique em "Próximo chamado" quando estiver pronto.
          </div>
        </div>
        <div id="smax-triage-hud-footer">
          <div>
            <button type="button" class="smax-triage-primary" id="smax-triage-next" disabled>Próximo chamado</button>
          </div>
          <div id="smax-triage-status">Fila de triagem ainda não inicializada.</div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    let triageQueue = [];
    let triageIndex = -1;
    let lastHighlighted = null;

    const bodyEl = backdrop.querySelector('#smax-triage-hud-body');
    const statusEl = backdrop.querySelector('#smax-triage-status');
    const nextBtn = backdrop.querySelector('#smax-triage-next');

    const renderCurrent = () => {
      if (!bodyEl || !statusEl) return;
      if (!triageQueue.length) {
        bodyEl.innerHTML = '<div style="font-size:14px;color:#e5e7eb;">Nenhum chamado encontrado na lista atual.</div>';
        statusEl.textContent = 'Verifique se a visão contém ID e Hora de Criação.';
        if (nextBtn) nextBtn.disabled = true;
        return;
      }

      if (triageIndex < 0 || triageIndex >= triageQueue.length) triageIndex = 0;

      const item = triageQueue[triageIndex];

      if (lastHighlighted && lastHighlighted.row && lastHighlighted.row.isConnected) {
        lastHighlighted.row.style.outline = '';
        lastHighlighted.row.style.outlineOffset = '';
      }
      if (item.row && item.row.isConnected) {
        item.row.style.outline = '3px solid #22c55e';
        item.row.style.outlineOffset = '-2px';
        lastHighlighted = item;
        item.row.scrollIntoView({ block:'center', behavior:'smooth' });
      }

      const vipBadge = item.isVip ? '<span style="display:inline-block;margin-left:8px;padding:2px 6px;border-radius:999px;background:#facc15;color:#854d0e;font-size:11px;font-weight:700;">VIP</span>' : '';

      bodyEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:6px;font-size:14px;">
          <div><strong>ID:</strong> ${item.idText || '-'} ${vipBadge}</div>
          <div style="white-space:normal;overflow:hidden;text-overflow:ellipsis;"><strong>Título:</strong> ${item.subjectText || '(sem título visível)'}</div>
          <div><strong>Hora de criação:</strong> ${item.createdText || '-'}</div>
        </div>
      `;

      statusEl.textContent = `Chamado ${triageIndex+1} de ${triageQueue.length} na fila (VIP primeiro, depois mais antigo).`;
      if (nextBtn) nextBtn.disabled = false;
    };

    const openHud = () => {
      backdrop.style.display = 'flex';
      triageQueue = buildTriageQueue();
      triageIndex = 0;
      renderCurrent();
    };
    const closeHud = () => { backdrop.style.display = 'none'; };

    startBtn.addEventListener('click', openHud);
    backdrop.querySelector('#smax-triage-close')?.addEventListener('click', closeHud);

    // Close when clicking outside panel
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHud();
    });

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!triageQueue.length) return;
        triageIndex = (triageIndex + 1) % triageQueue.length;
        renderCurrent();
      });
    }
  }

  function applyNameBadges() {
    if (!prefs.nameBadgesOn) return;
    pickAllLinks().forEach(link => {
      if (!link || processedLinks.has(link)) return;
      const label = (link.textContent || '').trim();
      const digits = extractTrailingDigits(label);
      if (!digits) { processedLinks.add(link); return; }

      const owner = getResponsavel(digits);
      const cell = link.closest('.slick-cell');

      if (cell && owner) {
        const { bg, fg } = getColorForName(owner);
        cell.classList.add('tmx-namecell');
        cell.style.background = bg;
        cell.style.color = fg || '';
        cell.querySelectorAll('a').forEach(a => { a.style.color = 'inherit'; });
      } else if (cell && !owner) {
        // SEM DONO - red warning
        cell.classList.add('tmx-namecell');
        cell.style.background = '#d32f2f';
        cell.style.color = '#fff';
        cell.querySelectorAll('a').forEach(a => { a.style.color = 'inherit'; });
      }

      if (owner && !link.dataset[NAME_MARK_ATTR]) {
        const tag = document.createElement('span');
        tag.textContent = ' ' + owner;
        tag.style.marginLeft = '6px';
        tag.style.fontWeight = '600';
        const c = getColorForName(owner);
        tag.style.background = c.bg;
        tag.style.color = c.fg;
        tag.style.padding = '0 4px';
        tag.style.borderRadius = '4px';
        link.insertAdjacentElement('afterend', tag);
        link.dataset[NAME_MARK_ATTR] = '1';
      } else if (!owner && !link.dataset[NAME_MARK_ATTR]) {
        const tag = document.createElement('span');
        tag.textContent = ' SEM DONO';
        tag.style.marginLeft = '6px';
        tag.style.fontWeight = '700';
        tag.style.background = '#fff';
        tag.style.color = '#d32f2f';
        tag.style.padding = '0 4px';
        tag.style.borderRadius = '4px';
        tag.style.border = '2px solid #d32f2f';
        link.insertAdjacentElement('afterend', tag);
        link.dataset[NAME_MARK_ATTR] = '1';
      }

      processedLinks.add(link);
    });
  }

  /* (highlighting, magistrate marking and auto-tag features removed to keep script focused on team triage) */

  /* =========================================================
    *  Comentários auto-altura
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
   *  Recolher "Oferta de Catálogo" + remover seções
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
   *  Orquestração (um único observer com debounce)
   * =======================================================*/
  function runAllFeatures() {
    const work = () => {
      applyNameBadges();
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
  initTriageHUD();
  initFlagUsersSkull(); // comente esta linha se não quiser a “caveira”
})();
