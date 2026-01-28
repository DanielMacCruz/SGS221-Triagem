// ==UserScript==
// @name         eProc Remigrar Automation
// @namespace    eproc-tjsp
// @version      1.1
// @description  Bulk automation for "Remigrar Processo por Módulo" in eProc TJSP
// @author       Helpdesk Automation
// @match        https://eproc1g.tjsp.jus.br/eproc/controlador.php*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    const CONFIG = {
        STORAGE_KEY: 'eproc_remigrar_log',
        QUEUE_KEY: 'eproc_remigrar_queue',
        LOG_RETENTION_DAYS: 7,
        SUBMIT_DELAY_MS: 1000,  // Delay before clicking submit to ensure DOM is ready
        VIDEOS_SUBMIT_DELAY_MS: 2000,  // Double timeout for Vídeos module (takes longer)
        REMIGRAR_URL: 'https://eproc1g.tjsp.jus.br/eproc/controlador.php?acao=remigrar_processo'
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE DETECTION
    // ═══════════════════════════════════════════════════════════════════════════
    function isRemigrarPage() {
        const params = new URLSearchParams(window.location.search);
        return params.get('acao') === 'remigrar_processo';
    }

    // Don't exit early - we may need to capture results on other pages

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE MODULE
    // ═══════════════════════════════════════════════════════════════════════════
    const Storage = {
        loadLog() {
            try {
                const data = GM_getValue(CONFIG.STORAGE_KEY, '[]');
                return JSON.parse(data);
            } catch (e) {
                console.error('Failed to load log:', e);
                return [];
            }
        },

        saveLog(entries) {
            GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(entries));
        },

        addEntry(entry) {
            const entries = this.loadLog();
            entries.unshift(entry); // Add to beginning
            this.saveLog(entries);
            return entries;
        },

        cleanup() {
            const entries = this.loadLog();
            const cutoff = Date.now() - (CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
            const filtered = entries.filter(e => e.timestamp > cutoff);
            if (filtered.length !== entries.length) {
                this.saveLog(filtered);
            }
            return filtered;
        },

        clearLog() {
            this.saveLog([]);
        },

        // Queue management for persistence across page reloads
        loadQueue() {
            try {
                const data = GM_getValue(CONFIG.QUEUE_KEY, 'null');
                return JSON.parse(data);
            } catch (e) {
                return null;
            }
        },

        saveQueue(queue) {
            GM_setValue(CONFIG.QUEUE_KEY, JSON.stringify(queue));
        },

        clearQueue() {
            GM_setValue(CONFIG.QUEUE_KEY, 'null');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RESULT CLASSIFIER
    // ═══════════════════════════════════════════════════════════════════════════
    const ResultType = {
        SUCCESS: 'success',   // Green - documents remigrated
        INFO: 'info',         // Blue - already OK
        ERROR: 'error',       // Red - process not found
        EMPTY: 'empty'        // Gray - no documents found
    };

    function classifyResponse() {
        // Check for error first (process not found)
        const errorDiv = document.querySelector('.infraExcecao');
        if (errorDiv) {
            return {
                type: ResultType.ERROR,
                message: errorDiv.textContent.trim()
            };
        }

        // Check for success (documents remigrated)
        const successCard = document.querySelector('.msg-card.msg-SUCESSO');
        if (successCard) {
            const items = successCard.querySelectorAll('.msg-text');
            return {
                type: ResultType.SUCCESS,
                message: `${items.length} documento(s) remigrado(s)`
            };
        }

        // Check for info (already OK)
        const infoCard = document.querySelector('.msg-card.msg-INFO');
        if (infoCard) {
            const items = infoCard.querySelectorAll('.msg-text');
            return {
                type: ResultType.INFO,
                message: `${items.length} documento(s) já OK`
            };
        }

        // No response cards found
        return {
            type: ResultType.EMPTY,
            message: 'Sem documentos encontrados'
        };
    }

    function summarizeResults(casResult, zipResult, videosResult) {
        if (casResult.type === ResultType.ERROR || zipResult.type === ResultType.ERROR || videosResult.type === ResultType.ERROR) {
            return 'error'; // Process not found
        }
        if (casResult.type === ResultType.SUCCESS || zipResult.type === ResultType.SUCCESS || videosResult.type === ResultType.SUCCESS) {
            return 'success'; // Something was remigrated
        }
        if (casResult.type === ResultType.INFO && zipResult.type === ResultType.INFO && videosResult.type === ResultType.INFO) {
            return 'info'; // Everything already OK
        }
        return 'empty'; // No documents in any module
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTOMATION ENGINE (Page-reload based)
    // ═══════════════════════════════════════════════════════════════════════════
    const Automation = {
        parseInput(text) {
            return text
                .split(/[\n,;]+/)
                .map(line => line.trim().replace(/[^\d.-]/g, ''))
                .filter(line => line.length >= 20); // Valid case numbers are 20+ digits
        },

        startBatch(caseNumbers) {
            const queue = {
                cases: caseNumbers,
                currentIndex: 0,
                currentStep: 'cas', // 'cas', 'zip', or 'videos'
                results: {}, // { caseNumber: { casResult, zipResult, videosResult } }
                startedAt: Date.now()
            };
            Storage.saveQueue(queue);
            this.executeNext(queue);
        },

        stop() {
            Storage.clearQueue();
        },

        resumeIfNeeded() {
            const queue = Storage.loadQueue();
            if (!queue) return false;

            const onRemigrarPage = isRemigrarPage();
            const currentCase = queue.cases[queue.currentIndex];

            // If we're awaiting a result (just submitted), capture it
            if (queue.awaitingResult && currentCase) {
                const result = classifyResponse();

                if (!queue.results[currentCase]) {
                    queue.results[currentCase] = {};
                }

                if (queue.currentStep === 'cas') {
                    queue.results[currentCase].casResult = result;
                    queue.currentStep = 'zip';
                } else if (queue.currentStep === 'zip') {
                    queue.results[currentCase].zipResult = result;
                    queue.currentStep = 'videos';
                } else {
                    // videos step completed
                    queue.results[currentCase].videosResult = result;

                    // Log this case
                    const entry = {
                        caseNumber: currentCase,
                        timestamp: Date.now(),
                        casResult: queue.results[currentCase].casResult,
                        zipResult: queue.results[currentCase].zipResult,
                        videosResult: queue.results[currentCase].videosResult,
                        summary: summarizeResults(
                            queue.results[currentCase].casResult,
                            queue.results[currentCase].zipResult,
                            queue.results[currentCase].videosResult
                        )
                    };
                    Storage.addEntry(entry);

                    // Move to next case
                    queue.currentIndex++;
                    queue.currentStep = 'cas';

                    if (queue.currentIndex >= queue.cases.length) {
                        // All done!
                        Storage.clearQueue();
                        // Redirect to remigrar page to show completion
                        if (!onRemigrarPage) {
                            window.location.href = CONFIG.REMIGRAR_URL;
                        }
                        return true;
                    }
                }

                queue.awaitingResult = false;
                Storage.saveQueue(queue);
            }

            // If not on remigrar page, redirect there
            if (!onRemigrarPage) {
                console.log('[Remigrar] Redirecting to remigrar page...');
                window.location.href = CONFIG.REMIGRAR_URL;
                return true;
            }

            // We're on remigrar page with pending work - execute next step
            this.executeNext(queue);
            return true;
        },

        executeNext(queue) {
            const currentCase = queue.cases[queue.currentIndex];
            let module;
            if (queue.currentStep === 'cas') {
                module = 'documentos_cas';
            } else if (queue.currentStep === 'zip') {
                module = 'documentos_zip';
            } else {
                module = 'videos';
            }

            // Fill case number
            const input = document.getElementById('txtNumProcesso');
            if (!input) {
                console.error('[Remigrar] Input not found - redirecting');
                window.location.href = CONFIG.REMIGRAR_URL;
                return;
            }
            input.value = currentCase;

            // Select module
            const select = document.getElementById('selModulo');
            if (!select) {
                console.error('[Remigrar] Select not found - redirecting');
                window.location.href = CONFIG.REMIGRAR_URL;
                return;
            }
            select.value = module;

            // Mark that we're awaiting a result, then submit
            queue.awaitingResult = true;
            Storage.saveQueue(queue);

            // Use double timeout for videos module (takes longer)
            const delay = queue.currentStep === 'videos' ? CONFIG.VIDEOS_SUBMIT_DELAY_MS : CONFIG.SUBMIT_DELAY_MS;

            setTimeout(() => {
                const button = document.querySelector('button[type="submit"].infraButton');
                if (button) {
                    console.log(`[Remigrar] Submitting: ${currentCase} / ${module}`);
                    button.click();
                }
            }, delay);
        },

        getProgress() {
            const queue = Storage.loadQueue();
            if (!queue) return null;
            return {
                current: queue.currentIndex + 1,
                total: queue.cases.length,
                currentCase: queue.cases[queue.currentIndex],
                step: queue.currentStep.toUpperCase()
            };
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // HUD COMPONENT
    // ═══════════════════════════════════════════════════════════════════════════
    function createHUD() {
        const hud = document.createElement('div');
        hud.id = 'remigrar-hud';
        hud.innerHTML = `
            <style>
                #remigrar-hud {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 380px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid #4a5568;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                    font-family: 'Segoe UI', Tahoma, sans-serif;
                    font-size: 13px;
                    color: #e2e8f0;
                    z-index: 99999;
                    overflow: hidden;
                }
                #remigrar-hud-header {
                    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                    padding: 12px 15px;
                    font-weight: 600;
                    font-size: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                }
                #remigrar-hud-header span {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                #remigrar-hud-toggle {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                #remigrar-hud-body {
                    padding: 15px;
                }
                #remigrar-hud-body.collapsed {
                    display: none;
                }
                #remigrar-input {
                    width: 100%;
                    height: 80px;
                    background: #2d3748;
                    border: 1px solid #4a5568;
                    border-radius: 6px;
                    color: #e2e8f0;
                    padding: 10px;
                    font-family: 'Consolas', monospace;
                    font-size: 12px;
                    resize: vertical;
                    box-sizing: border-box;
                }
                #remigrar-input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                #remigrar-input::placeholder {
                    color: #718096;
                }
                #remigrar-controls {
                    display: flex;
                    gap: 8px;
                    margin-top: 10px;
                }
                .remigrar-btn {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                .remigrar-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .remigrar-btn-primary {
                    background: linear-gradient(90deg, #48bb78 0%, #38a169 100%);
                    color: white;
                }
                .remigrar-btn-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
                }
                .remigrar-btn-danger {
                    background: linear-gradient(90deg, #f56565 0%, #e53e3e 100%);
                    color: white;
                }
                .remigrar-btn-secondary {
                    background: #4a5568;
                    color: white;
                }
                #remigrar-status {
                    margin-top: 12px;
                    padding: 10px;
                    background: #2d3748;
                    border-radius: 6px;
                    text-align: center;
                    font-size: 12px;
                }
                #remigrar-log {
                    margin-top: 12px;
                    max-height: 200px;
                    overflow-y: auto;
                    background: #0d1117;
                    border-radius: 6px;
                    padding: 8px;
                }
                .log-entry {
                    padding: 8px 10px;
                    margin-bottom: 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    border-left: 3px solid;
                }
                .log-entry:last-child {
                    margin-bottom: 0;
                }
                .log-entry.success {
                    background: rgba(72, 187, 120, 0.15);
                    border-color: #48bb78;
                }
                .log-entry.info {
                    background: rgba(66, 153, 225, 0.15);
                    border-color: #4299e1;
                }
                .log-entry.error {
                    background: rgba(245, 101, 101, 0.15);
                    border-color: #f56565;
                }
                .log-entry.empty {
                    background: rgba(160, 174, 192, 0.15);
                    border-color: #a0aec0;
                }
                .log-entry-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }
                .log-entry-case {
                    font-family: 'Consolas', monospace;
                    font-weight: 600;
                }
                .log-entry-time {
                    color: #718096;
                    font-size: 10px;
                }
                .log-entry-details {
                    color: #a0aec0;
                }
                #remigrar-footer {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid #4a5568;
                }
                #remigrar-count {
                    color: #718096;
                    font-size: 11px;
                    margin-top: 8px;
                }
                .processing-indicator {
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            </style>
            <div id="remigrar-hud-header">
                <span>⚡ Remigrar Bulk</span>
                <button id="remigrar-hud-toggle">−</button>
            </div>
            <div id="remigrar-hud-body">
                <textarea id="remigrar-input" placeholder="Cole números de processo aqui (um por linha)&#10;Ex: 1047067-14.2024.8.26.0224"></textarea>
                <div id="remigrar-controls">
                    <button id="remigrar-start" class="remigrar-btn remigrar-btn-primary">▶ Iniciar</button>
                    <button id="remigrar-stop" class="remigrar-btn remigrar-btn-danger" disabled>⏹ Parar</button>
                </div>
                <div id="remigrar-status">Aguardando entrada...</div>
                <div id="remigrar-log"></div>
                <div id="remigrar-footer">
                    <button id="remigrar-export" class="remigrar-btn remigrar-btn-secondary">📥 Exportar Log</button>
                    <button id="remigrar-clear" class="remigrar-btn remigrar-btn-secondary">🗑️ Limpar</button>
                </div>
                <div id="remigrar-count"></div>
            </div>
        `;

        document.body.appendChild(hud);

        // Elements
        const toggle = hud.querySelector('#remigrar-hud-toggle');
        const body = hud.querySelector('#remigrar-hud-body');
        const input = hud.querySelector('#remigrar-input');
        const startBtn = hud.querySelector('#remigrar-start');
        const stopBtn = hud.querySelector('#remigrar-stop');
        const status = hud.querySelector('#remigrar-status');
        const log = hud.querySelector('#remigrar-log');
        const exportBtn = hud.querySelector('#remigrar-export');
        const clearBtn = hud.querySelector('#remigrar-clear');
        const countDiv = hud.querySelector('#remigrar-count');

        // Toggle collapse
        toggle.addEventListener('click', () => {
            body.classList.toggle('collapsed');
            toggle.textContent = body.classList.contains('collapsed') ? '+' : '−';
        });

        // Render log
        function renderLog() {
            const entries = Storage.cleanup();
            log.innerHTML = '';

            entries.slice(0, 50).forEach(entry => {
                const div = document.createElement('div');
                div.className = `log-entry ${entry.summary}`;

                const date = new Date(entry.timestamp);
                const timeStr = date.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                div.innerHTML = `
                    <div class="log-entry-header">
                        <span class="log-entry-case">${entry.caseNumber}</span>
                        <span class="log-entry-time">${timeStr}</span>
                    </div>
                    <div class="log-entry-details">
                        CAS: ${entry.casResult.message} | ZIP: ${entry.zipResult.message} | VID: ${entry.videosResult?.message || 'N/A'}
                    </div>
                `;
                log.appendChild(div);
            });

            countDiv.textContent = `${entries.length} registro(s) nos últimos 7 dias`;
        }

        // Update UI based on queue state
        function updateUI() {
            const progress = Automation.getProgress();
            if (progress) {
                startBtn.disabled = true;
                stopBtn.disabled = false;
                input.disabled = true;
                status.innerHTML = `<span class="processing-indicator">⏳ Processando ${progress.current}/${progress.total}</span><br>` +
                    `<strong>${progress.currentCase}</strong><br>` +
                    `Etapa: ${progress.step}`;
            } else {
                startBtn.disabled = false;
                stopBtn.disabled = true;
                input.disabled = false;
            }
        }

        // Start automation
        startBtn.addEventListener('click', () => {
            const cases = Automation.parseInput(input.value);
            if (cases.length === 0) {
                status.textContent = '⚠️ Nenhum número válido encontrado';
                return;
            }

            status.textContent = `🚀 Iniciando ${cases.length} processo(s)...`;
            Automation.startBatch(cases);
        });

        // Stop automation
        stopBtn.addEventListener('click', () => {
            Automation.stop();
            startBtn.disabled = false;
            stopBtn.disabled = true;
            input.disabled = false;
            status.textContent = '⏹️ Interrompido pelo usuário';
        });

        // Export log
        exportBtn.addEventListener('click', () => {
            const entries = Storage.loadLog();
            if (entries.length === 0) {
                alert('Nenhum registro para exportar');
                return;
            }

            let text = '═══════════════════════════════════════════════════════════════\n';
            text += '           RELATÓRIO DE REMIGRAÇÃO - eProc TJSP\n';
            text += `           Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
            text += '═══════════════════════════════════════════════════════════════\n\n';

            entries.forEach(entry => {
                const date = new Date(entry.timestamp).toLocaleString('pt-BR');
                const summaryLabel = {
                    success: '✅ REMIGRADO',
                    info: 'ℹ️ JÁ OK',
                    error: '❌ NÃO ENCONTRADO',
                    empty: '⚪ SEM DOCUMENTOS'
                }[entry.summary];

                text += `📋 ${entry.caseNumber}\n`;
                text += `   Data: ${date}\n`;
                text += `   Status: ${summaryLabel}\n`;
                text += `   CAS: ${entry.casResult.message}\n`;
                text += `   ZIP: ${entry.zipResult.message}\n`;
                text += `   VID: ${entry.videosResult?.message || 'N/A'}\n`;
                text += '───────────────────────────────────────────────────────────────\n';
            });

            text += `\nTotal: ${entries.length} processo(s)\n`;

            // Download as file
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `remigrar_log_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });

        // Clear log
        clearBtn.addEventListener('click', () => {
            if (confirm('Limpar todos os registros?')) {
                Storage.clearLog();
                renderLog();
                status.textContent = '🗑️ Log limpo';
            }
        });

        // Initial render
        renderLog();
        updateUI();

        // Make draggable
        let isDragging = false;
        let offsetX, offsetY;
        const header = hud.querySelector('#remigrar-hud-header');

        header.addEventListener('mousedown', (e) => {
            if (e.target === toggle) return;
            isDragging = true;
            offsetX = e.clientX - hud.offsetLeft;
            offsetY = e.clientY - hud.offsetTop;
            hud.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            hud.style.left = (e.clientX - offsetX) + 'px';
            hud.style.top = (e.clientY - offsetY) + 'px';
            hud.style.right = 'auto';
            hud.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        return { renderLog, updateUI, status };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    // FIRST: Check if we need to resume - this may redirect away from this page
    const resumed = Automation.resumeIfNeeded();

    // Only show HUD on the main remigrar page
    if (isRemigrarPage()) {
        const hudControls = createHUD();
        hudControls.renderLog();
        hudControls.updateUI();
        console.log('[eProc Remigrar] HUD initialized, queue active:', resumed);
    } else {
        console.log('[eProc Remigrar] Not on remigrar page, waiting for redirect...');
    }

})();
