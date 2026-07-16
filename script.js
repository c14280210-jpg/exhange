// ===== КОНФІГ =====
const CONFIG = {
    UPDATE_INTERVAL: 30000,
    CURRENCIES: {
        USD: { code: 840, name: 'Долар США', flag: '🇺🇸' },
        EUR: { code: 978, name: 'Євро', flag: '🇪🇺' },
        PLN: { code: 985, name: 'Злотий', flag: '🇵🇱' }
    }
};

let state = {
    previousRates: {},
    isUpdating: false,
    updateTimer: null,
    countdown: CONFIG.UPDATE_INTERVAL / 1000
};

// ===== ОТРИМАННЯ КУРСІВ =====
async function fetchRates() {
    if (state.isUpdating) return;
    state.isUpdating = true;
    updateUI('loading');

    try {
        const response = await fetch('https://api.monobank.ua/bank/currency');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const rates = {};

        for (const [key, config] of Object.entries(CONFIG.CURRENCIES)) {
            // Шукаємо пряму пару до гривні (980)
            let found = data.find(item =>
                item.currencyCodeA === config.code &&
                item.currencyCodeB === 980
            );

            // Якщо не знайшли — пробуємо через USD (для PLN)
            if (!found) {
                const usd = data.find(item =>
                    item.currencyCodeA === 840 &&
                    item.currencyCodeB === 980
                );
                const cross = data.find(item =>
                    item.currencyCodeA === config.code &&
                    item.currencyCodeB === 840
                );
                if (usd?.rateBuy && cross?.rateCross) {
                    const rate = cross.rateCross * usd.rateBuy;
                    found = { rateBuy: rate, rateSell: rate * 1.005 };
                    console.log(`✅ ${key} отримано через cross:`, rate);
                }
            }

            if (found) {
                const buy = found.rateBuy || found.rateCross || null;
                const sell = found.rateSell || found.rateCross || null;

                // Якщо buy або sell немає — використовуємо rateCross
                const finalBuy = buy ?? found.rateCross ?? null;
                const finalSell = sell ?? found.rateCross ?? null;

                if (finalBuy !== null && finalSell !== null) {
                    rates[key] = { buy: finalBuy, sell: finalSell };
                } else {
                    rates[key] = null;
                }
            } else {
                rates[key] = null;
            }
        }

        const hasData = Object.values(rates).some(r => r !== null);
        if (!hasData) throw new Error('Немає даних');

        updateDisplay(rates);
        updateUI('success');
        animateHippo('update');

    } catch (error) {
        console.error('❌ Помилка:', error);
        updateUI('error');
    } finally {
        state.isUpdating = false;
        resetCountdown();
    }
}

// ===== ВІДОБРАЖЕННЯ =====
function updateDisplay(rates) {
    for (const [currency, data] of Object.entries(rates)) {
        const buyEl = document.getElementById(`${currency.toLowerCase()}-buy`);
        const sellEl = document.getElementById(`${currency.toLowerCase()}-sell`);
        const changeEl = document.getElementById(`${currency.toLowerCase()}-change`);

        if (!buyEl || !sellEl || !changeEl) continue;

        if (!data) {
            buyEl.textContent = '—';
            sellEl.textContent = '—';
            changeEl.textContent = '❌';
            changeEl.className = 'change-badge unavailable';
            continue;
        }

        // Анімація
        [buyEl, sellEl].forEach(el => {
            el.classList.remove('updating');
            void el.offsetWidth;
            el.classList.add('updating');
        });

        buyEl.textContent = data.buy.toFixed(2);
        sellEl.textContent = data.sell.toFixed(2);

        // Зміна
        const prev = state.previousRates[currency]?.buy ?? data.buy;
        const change = ((data.buy - prev) / prev * 100);
        const text = change === 0 ? '0.00%' : (change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`);

        changeEl.textContent = text;
        changeEl.className = 'change-badge';

        if (change > 0.2) {
            changeEl.classList.add('up');
            animateHippo('happy');
        } else if (change < -0.2) {
            changeEl.classList.add('down');
            animateHippo('sad');
        } else {
            changeEl.classList.add('neutral');
            if (Math.abs(change) < 0.01) animateHippo('idle');
        }

        state.previousRates[currency] = { buy: data.buy, sell: data.sell };
    }

    document.getElementById('updateTime').textContent = new Date().toLocaleTimeString('uk-UA');
}

// ===== UI СТАН =====
function updateUI(status) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (!dot || !text) return;

    dot.className = 'status-dot';
    switch (status) {
        case 'loading':
            dot.classList.add('loading');
            text.textContent = 'Завантаження...';
            break;
        case 'error':
            dot.classList.add('error');
            text.textContent = 'Помилка, повтор...';
            break;
        default:
            dot.classList.add('idle');
            text.textContent = 'LIVE';
    }
}

// ===== ТАЙМЕР =====
function resetCountdown() {
    state.countdown = CONFIG.UPDATE_INTERVAL / 1000;
    updateCountdown();
}

function updateCountdown() {
    const el = document.getElementById('countdownTimer');
    if (el) el.textContent = `${Math.ceil(state.countdown)}с`;
}

function startCountdown() {
    resetCountdown();
    if (state.updateTimer) clearInterval(state.updateTimer);
    state.updateTimer = setInterval(() => {
        state.countdown -= 1;
        updateCountdown();
        if (state.countdown <= 0) fetchRates();
    }, 1000);
}

function manualRefresh() {
    const btn = document.querySelector('.refresh-btn');
    btn.disabled = true;
    btn.innerHTML = '⏳ ...';
    fetchRates().finally(() => {
        btn.disabled = false;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Оновити`;
    });
}

// ===== 2D БЕГЕМОТИК (Canvas) =====
function drawHippo(ctx, w, h, emotion) {
    const cx = w / 2;
    const cy = h / 2 + 20;
    const scale = Math.min(w, h) / 420;

    ctx.clearRect(0, 0, w, h);

    // === ТІЛО ===
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Тінь
    ctx.shadowColor = 'rgba(247, 151, 30, 0.08)';
    ctx.shadowBlur = 40;

    // Тіло
    ctx.beginPath();
    ctx.ellipse(0, 20, 100, 80, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#6b4c3b';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Костюм (піджак)
    ctx.beginPath();
    ctx.ellipse(0, 10, 100, 70, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // Комір
    ctx.beginPath();
    ctx.moveTo(-30, -20);
    ctx.lineTo(0, -40);
    ctx.lineTo(30, -20);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Краватка-метелик
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.ellipse(-12, -15, 14, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -15, 14, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -15, 6, 0, Math.PI * 2);
    ctx.fill();

    // === ГОЛОВА ===
    ctx.fillStyle = '#8b6b5b';
    ctx.beginPath();
    ctx.ellipse(0, -40, 60, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // Морда
    ctx.fillStyle = '#a08070';
    ctx.beginPath();
    ctx.ellipse(0, -20, 40, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ніс
    ctx.fillStyle = '#6b4c3b';
    ctx.beginPath();
    ctx.ellipse(0, -15, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ніздрі
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.arc(-8, -12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -12, 4, 0, Math.PI * 2);
    ctx.fill();

    // === ОЧІ ===
    const eyeY = -50;
    // Білки
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-22, eyeY, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(22, eyeY, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Зіниці (дивляться в залежності від емоції)
    let pupilOffX = 0,
        pupilOffY = 0;
    if (emotion === 'happy') { pupilOffX = 4;
        pupilOffY = -3; } else if (emotion === 'sad') { pupilOffX = -2;
        pupilOffY = 3; } else if (emotion === 'update') { pupilOffX = 6; }

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-22 + pupilOffX, eyeY + pupilOffY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(22 + pupilOffX, eyeY + pupilOffY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Блиск
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(-18 + pupilOffX, eyeY - 3 + pupilOffY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(26 + pupilOffX, eyeY - 3 + pupilOffY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // === ОКУЛЯРИ ===
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-22, eyeY, 18, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(22, eyeY, 18, 18, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Дужка
    ctx.beginPath();
    ctx.moveTo(-4, eyeY);
    ctx.lineTo(4, eyeY);
    ctx.stroke();

    // Скло (напівпрозоре)
    ctx.fillStyle = 'rgba(136, 204, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(-22, eyeY, 16, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(22, eyeY, 16, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // === ВУХА ===
    ctx.fillStyle = '#7b5b4b';
    ctx.beginPath();
    ctx.ellipse(-38, -65, 12, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(38, -65, 12, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // === РУКИ ===
    ctx.fillStyle = '#1e293b';
    // Ліва рука
    ctx.save();
    ctx.translate(-70, 10);
    ctx.rotate(emotion === 'happy' ? -0.8 : -0.2);
    ctx.fillRect(-6, 0, 12, 40);
    ctx.restore();
    // Права рука
    ctx.save();
    ctx.translate(70, 10);
    ctx.rotate(emotion === 'happy' ? 0.8 : 0.2);
    ctx.fillRect(-6, 0, 12, 40);
    ctx.restore();

    // Кисті
    ctx.fillStyle = '#8b6b5b';
    ctx.beginPath();
    ctx.arc(-70 + (emotion === 'happy' ? -8 : 0), 50 + (emotion === 'happy' ? -6 : 0), 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(70 + (emotion === 'happy' ? 8 : 0), 50 + (emotion === 'happy' ? -6 : 0), 10, 0, Math.PI * 2);
    ctx.fill();

    // === НОГИ ===
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-30, 80, 20, 35);
    ctx.fillRect(10, 80, 20, 35);

    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.ellipse(-20, 118, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, 118, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // === ГОДИННИК ===
    const watchX = 62,
        watchY = 25;
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(watchX, watchY, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(watchX, watchY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Стрілки
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(watchX, watchY);
    ctx.lineTo(watchX - 4, watchY - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(watchX, watchY);
    ctx.lineTo(watchX + 6, watchY - 2);
    ctx.stroke();

    // Ремінець
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(watchX - 4, watchY + 12, 8, 10);
    ctx.fillRect(watchX - 4, watchY - 22, 8, 10);

    ctx.restore();

    // === ЕМОЦІЯ (додаткові деталі) ===
    if (emotion === 'happy') {
        // Посмішка
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#6b4c3b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -10, 20, 0.1, Math.PI - 0.1);
        ctx.stroke();
        ctx.restore();
    } else if (emotion === 'sad') {
        // Сумна посмішка
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#6b4c3b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -5, 18, Math.PI + 0.2, 2 * Math.PI - 0.2);
        ctx.stroke();
        ctx.restore();
    }
}

// ===== КЕРУВАННЯ БЕГЕМОТИКОМ =====
let hippoEmotion = 'idle';
let hippoCanvas = null;

function initHippo() {
    const canvas = document.getElementById('hippoCanvas');
    if (!canvas) return;
    hippoCanvas = canvas;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height * 0.85, 420);
        canvas.width = size * 2;
        canvas.height = size * 2;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        drawHippo(canvas.getContext('2d'), canvas.width, canvas.height, hippoEmotion);
    }

    window.addEventListener('resize', resize);
    resize();

    // Періодичне оновлення для idle-анімації
    setInterval(() => {
        if (hippoEmotion === 'idle') {
            const ctx = canvas.getContext('2d');
            drawHippo(ctx, canvas.width, canvas.height, 'idle');
        }
    }, 2000);
}

function animateHippo(type) {
    hippoEmotion = type;
    const canvas = document.getElementById('hippoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Анімація зміни
    if (type === 'update') {
        let frames = 0;
        const interval = setInterval(() => {
            frames++;
            drawHippo(ctx, canvas.width, canvas.height, 'update');
            if (frames > 6) {
                clearInterval(interval);
                hippoEmotion = 'idle';
                drawHippo(ctx, canvas.width, canvas.height, 'idle');
            }
        }, 100);
    } else {
        drawHippo(ctx, canvas.width, canvas.height, type);
        // Повертаємось до idle через 1.5с
        if (type !== 'idle') {
            setTimeout(() => {
                hippoEmotion = 'idle';
                drawHippo(ctx, canvas.width, canvas.height, 'idle');
            }, 1500);
        }
    }
}

// ===== ЗАПУСК =====
function init() {
    initHippo();
    fetchRates();
    startCountdown();
}

document.addEventListener('DOMContentLoaded', init);
