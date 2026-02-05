// ==UserScript==
// @name         eProc - Limpador de Lotações (Helpdesk)
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Remove múltiplas lotações de uma vez — discreto como Gmail.
// @author       Antigravity
// @match        https://eproc1g.tjsp.jus.br/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PROTECTED = ["ADMINISTRADOR DO SISTEMA", "GERENTE DE USUÁRIOS"];

    function init() {
        const table = document.getElementById('tabelaUsuarios');
        if (!table || table.dataset.injected === "true") return;
        table.dataset.injected = "true";

        // Inject checkbox column header with trash icon
        const head = table.querySelector('thead tr');
        if (head) {
            const th = document.createElement('th');
            th.className = 'infraTh';
            th.style.cssText = 'white-space: nowrap;';
            th.innerHTML = `
                <input type="checkbox" id="master-check" title="Selecionar Todos" style="cursor:pointer; vertical-align:middle;">
                <img id="bulk-delete" src="infra_css/imagens/desativar.gif" 
                     title="Desativar selecionadas" alt="Desativar selecionadas" 
                     class="infraImgNormal" 
                     style="cursor:pointer; margin-left:6px; vertical-align:middle; display:none;">
            `;
            head.prepend(th);

            document.getElementById('master-check').onclick = (e) => {
                document.querySelectorAll('.row-check:not(:disabled)').forEach(cb => cb.checked = e.target.checked);
                updateTrashVisibility();
            };

            document.getElementById('bulk-delete').onclick = executeCleanup;
        }

        // Inject checkboxes into rows
        table.querySelectorAll('tbody tr').forEach(row => {
            const role = row.cells[3]?.textContent.trim().toUpperCase() || "";
            const isProtected = PROTECTED.some(p => role.includes(p));
            const trash = row.querySelector('img[src*="desativar_vermelho.gif"]')?.closest('a');
            const id = trash?.getAttribute('onclick')?.match(/'(\d+)'/)?.[1];

            const td = document.createElement('td');
            td.style.textAlign = 'center';
            if (isProtected || !id) {
                td.innerHTML = '<span title="Protegido pelo sistema">🛡️</span>';
                row.style.opacity = '0.7';
            } else {
                td.innerHTML = `<input type="checkbox" class="row-check" data-id="${id}" style="cursor:pointer;">`;
                td.querySelector('.row-check').onchange = updateTrashVisibility;
            }
            row.prepend(td);
        });
    }

    function updateTrashVisibility() {
        const trash = document.getElementById('bulk-delete');
        const anySelected = document.querySelectorAll('.row-check:checked').length > 0;
        if (trash) trash.style.display = anySelected ? 'inline' : 'none';
    }

    async function executeCleanup() {
        const selected = Array.from(document.querySelectorAll('.row-check:checked')).map(cb => cb.dataset.id);
        if (!selected.length) return;

        if (!confirm(`Desativar ${selected.length} lotaç${selected.length === 1 ? 'ão' : 'ões'} em todos os eprocs?`)) return;

        let currentDOM = document;

        for (let i = 0; i < selected.length; i++) {
            const id = selected[i];

            const form = currentDOM.getElementById('frmUsuarioLista');
            if (!form) break;

            const hashMatch = currentDOM.documentElement.innerHTML.match(/usuario_desativar&hash=([a-f0-9]{32})/);
            const hash = hashMatch ? hashMatch[1] : "";
            const url = `controlador.php?acao=usuario_desativar&hash=${hash}`;

            const payload = new URLSearchParams(new FormData(form));
            payload.set('hdnIdUsuario', id);
            payload.set('hdnSinReplicar', 'S');

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });

                const htmlText = await response.text();
                const parser = new DOMParser();
                currentDOM = parser.parseFromString(htmlText, 'text/html');
            } catch (err) {
                console.error(err);
            }

            await new Promise(r => setTimeout(r, 400));
        }

        location.reload();
    }

    init();
    const obs = new MutationObserver(init);
    obs.observe(document.body, { childList: true, subtree: true });
})();