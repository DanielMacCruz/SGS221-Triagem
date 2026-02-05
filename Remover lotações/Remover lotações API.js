// ==UserScript==
// @name         eProc - Limpador de Lotações (Helpdesk)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Remove múltiplas lotações de uma vez com um único clique.
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

        // Injeta a coluna de seleção
        const head = table.querySelector('thead tr');
        if (head) {
            const th = document.createElement('th');
            th.className = 'infraTh';
            th.innerHTML = '<input type="checkbox" id="master-check" title="Selecionar Todos" style="transform: scale(1.2); cursor:pointer;">';
            head.prepend(th);

            document.getElementById('master-check').onclick = (e) => {
                document.querySelectorAll('.row-check:not(:disabled)').forEach(cb => cb.checked = e.target.checked);
            };
        }

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
                td.innerHTML = `<input type="checkbox" class="row-check" data-id="${id}" style="transform: scale(1.2); cursor:pointer;">`;
            }
            row.prepend(td);
        });

        renderHUD();
    }

    function renderHUD() {
        if (document.getElementById('api-smart-hud')) return;
        const hud = document.createElement('div');
        hud.id = 'api-smart-hud';
        hud.style = `position: fixed; top: 15px; right: 15px; z-index: 9999; background: #2c3e50; color: white; padding: 20px; border-radius: 12px; border: 2px solid #3498db; width: 250px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.3);`;
        hud.innerHTML = `
            <div style="font-weight: bold; font-size: 15px; margin-bottom: 12px; border-bottom: 1px solid #5d6d7e; padding-bottom: 8px; color: #3498db;">🛠️ Central Helpdesk</div>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #bdc3c7;">Selecione as lotações e clique no botão abaixo para remover todas de uma vez.</p>
            <button id="run-smart" style="width: 100%; padding: 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; transition: background 0.2s;">LIMPAR MARCADOS</button>
            <div id="smart-log" style="font-size: 12px; margin-top: 15px; color: #ecf0f1; background: #34495e; padding: 10px; border-radius: 6px; min-height: 20px;">Aguardando seleção...</div>
        `;
        document.body.appendChild(hud);

        document.getElementById('run-smart').onclick = async function () {
            const selected = Array.from(document.querySelectorAll('.row-check:checked')).map(cb => cb.dataset.id);
            if (!selected.length) return alert("Por favor, selecione ao menos uma lotação!");

            if (!confirm(`Deseja realmente remover essas ${selected.length} lotações?\n\nEsta ação será realizada em todos os eprocs.`)) return;

            this.disabled = true;
            this.style.background = "#7f8c8d";
            this.innerText = "PROCESSANDO...";
            const log = document.getElementById('smart-log');
            log.innerHTML = "Iniciando limpeza...";

            let currentDOM = document;

            for (let i = 0; i < selected.length; i++) {
                const id = selected[i];
                log.innerHTML = `Removendo item ${i + 1} de ${selected.length}...`;

                const form = currentDOM.getElementById('frmUsuarioLista');
                if (!form) {
                    log.innerHTML = `⚠️ Erro técnico no formulário.`;
                    break;
                }

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

            log.style.color = "#2ecc71";
            log.innerHTML = "✅ Concluído com sucesso!";
            setTimeout(() => location.reload(), 1000);
        };
    }

    init();
    const obs = new MutationObserver(init);
    obs.observe(document.body, { childList: true, subtree: true });
})();
