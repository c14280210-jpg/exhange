// ===== СТАН =====
let savedRates = {
    USD: { buy: null, sell: null },
    EUR: { buy: null, sell: null },
    PLN: { buy: null, sell: null }
};

let previousRates = {};

// ===== ЗБЕРЕЖЕННЯ КУРСІВ =====
function saveRates() {
    const currencies = ['USD', 'EUR', 'PLN'];
    let hasData = false;

    currencies.forEach(currency => {
        const buyEl = document.getElementById(`${currency.toLowerCase()}-buy`);
        const sellEl = document.getElementById(`${currency.toLowerCase()}-sell`);
        const changeEl = document.getElementById(`${currency.toLowerCase()}-change`);

        const buy = parseFloat(buyEl.value);
        const sell = parseFloat(sellEl.value);

        if (!isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
            hasData = true;

            // Розрахунок зміни
            const prevBuy = previousRates[currency]?.buy || buy;
            const change = ((buy - prevBuy) / prevBuy * 100);
            const changeText = change === 0 ? '0.00%' :
                              change > 0 ? `+${change.toFixed(2)}%` :
                              `${change.toFixed(2)}%`;

            changeEl.textContent = changeText;
            changeEl.className = 'change-badge';

            if (change > 0.2) {
                changeEl.classList.add('up');
                animateHippo('happy');
            } else if (change < -0.2) {
                changeEl.classList.add('down');
                animateHippo('sad');
            } else {
                changeEl.classList.add('neutral');
                animateHippo('idle');
            }

            previousRates[currency] = { buy, sell };
            savedRates[currency] = { buy, sell };
        } else {
            changeEl.textContent = '—';
            changeEl.className = 'change-badge';
        }
    });

    // Оновлюємо час
    document.getElementById('updateTime').textContent = new Date().toLocaleTimeString('uk-UA');

    // Індикатор
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    dot.className = 'status-dot idle';
    text.textContent = hasData ? 'Збережено ✅' : 'Введіть курси';

    setTimeout(() => {
        if (text.textContent === 'Збережено ✅') {
            text.textContent = 'Готово';
        }
    }, 2000);
}

// ===== 2D БЕГЕМОТИК (НОВИЙ, МІНІМАЛІСТИЧНИЙ) =====
let hippoEmotion = 'idle';
let hippoCanvas = null;

function drawHippo(ctx, w, h, emotion) {
    const cx = w / 2;
    const cy = h / 2 + 10;
    const scale = Math.min(w, h) / 400;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // ===== ТІНЬ =====
    ctx.shadowColor = 'rgba(247, 151, 30, 0.06)';
    ctx.shadowBlur = 30;

    // ===== ТІЛО =====
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#6b4c3b';
    ctx.beginPath();
    ctx.ellipse(0, 20, 85, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Костюм
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 12, 85, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Комір
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-25, -20);
    ctx.lineTo(0, -38);
    ctx.lineTo(25, -20);
    ctx.fill();

    // Краватка
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(-10, -10);
    ctx.lineTo(10, -10);
    ctx.closePath();
    ctx.fill();

    // ===== ГОЛОВА =====
    ctx.fillStyle = '#8b6b5b';
    ctx.beginPath();
    ctx.ellipse(0, -38, 50, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Морда
    ctx.fillStyle = '#a08070';
    ctx.beginPath();
    ctx.ellipse(0, -20, 32, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ніс
    ctx.fillStyle = '#6b4c3b';
    ctx.beginPath();
    ctx.ellipse(0, -16, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== ОЧІ =====
    const eyeY = -44;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-18, eyeY, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18, eyeY, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Зіниці (з емоціями)
    let px = 0,
        py = 0;
    if (emotion === 'happy') { px = 4;
        py = -3; } else if (emotion === 'sad') { px = -2;
        py = 3; } else if (emotion === 'update') { px = 6; }

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-18 + px, eyeY + py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18 + px, eyeY + py, 6, 0, Math.PI * 2);
    ctx.fill();

    // Блиск
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-15 + px, eyeY - 3 + py, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(21 + px, eyeY - 3 + py, 2, 0, Math.PI * 2);
    ctx.fill();

    // ===== ОКУЛЯРИ =====
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-18, eyeY, 16, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(18, eyeY, 16, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2, eyeY);
    ctx.lineTo(2, eyeY);
    ctx.stroke();

    // ===== ВУХА =====
    ctx.fillStyle = '#7b5b4b';
    ctx.beginPath();
    ctx.ellipse(-32, -62, 10, 16, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(32, -62, 10, 16, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // ===== РУКИ =====
    ctx.fillStyle = '#1e293b';
    // Ліва
    ctx.save();
    ctx.translate(-60, 12);
    ctx.rotate(emotion === 'happy' ? -0.6 : -0.15);
    ctx.fillRect(-5, 0, 10, 35);
    ctx.restore();
    // Права
    ctx.save();
    ctx.translate(60, 12);
    ctx.rotate(emotion === 'happy' ? 0.6 : 0.15);
    ctx.fillRect(-5, 0, 10, 35);
    ctx.restore();

    // Кисті
    ctx.fillStyle = '#8b6b5b';
    ctx.beginPath();
    ctx.arc(-58 + (emotion === 'happy' ? -6 : 0), 46 + (emotion === 'happy' ? -4 : 0), 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(58 + (emotion === 'happy' ? 6 : 0), 46 + (emotion === 'happy' ? -4 : 0), 9, 0, Math.PI * 2);
    ctx.fill();

    // ===== НОГИ =====
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-26, 68, 18, 30);
    ctx.fillRect(8, 68, 18, 30);

    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.ellipse(-17, 100, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(17, 100, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== ГОДИННИК =====
    const wx = 54,
        wy = 28;
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(wx, wy, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(wx, wy, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx - 3, wy - 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + 5, wy - 2);
    ctx.stroke();

    // ===== ЕМОЦІЇ =====
    if (emotion === 'happy') {
        ctx.strokeStyle = '#6b4c3b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -10, 16, 0.1, Math.PI - 0.1);
        ctx.stroke();
    } else if (emotion === 'sad') {
        ctx.strokeStyle = '#6b4c3b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -5, 14, Math.PI + 0.2, 2 * Math.PI - 0.2);
        ctx.stroke();
    }

    ctx.restore();
}

// ===== КЕРУВАННЯ БЕГЕМОТИКОМ =====
function initHippo() {
    const canvas = document.getElementById('hippoCanvas');
    if (!canvas) return;
    hippoCanvas = canvas;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height * 0.8, 380);
        canvas.width = size * 2;
        canvas.height = size * 2;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        drawHippo(canvas.getContext('2d'), canvas.width, canvas.height, hippoEmotion);
    }

    window.addEventListener('resize', resize);
    resize();
}

function animateHippo(type) {
    hippoEmotion = type;
    const canvas = document.getElementById('hippoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

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
        if (type !== 'idle') {
            setTimeout(() => {
                hippoEmotion = 'idle';
                drawHippo(ctx, canvas.width, canvas.height, 'idle');
            }, 1500);
        }
    }
}

// ===== АВТОЗБЕРЕЖЕННЯ ПРИ ВВЕДЕННІ =====
document.addEventListener('DOMContentLoaded', () => {
    initHippo();

    // Автозбереження при зміні полів
    document.querySelectorAll('.rate-input').forEach(input => {
        input.addEventListener('change', saveRates);
        input.addEventListener('input', () => {
            const dot = document.getElementById('statusDot');
            const text = document.getElementById('statusText');
            dot.className = 'status-dot saving';
            text.textContent = 'Редагування...';
        });
    });

    // Початкове повідомлення
    document.getElementById('updateTime').textContent = new Date().toLocaleTimeString('uk-UA');
});
