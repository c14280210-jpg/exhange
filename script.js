// ===== КОНФІГУРАЦІЯ =====
const CONFIG = {
    UPDATE_INTERVAL: 30000,
    CURRENCIES: {
        USD: { code: 840, name: 'Долар США', flag: '🇺🇸' },
        EUR: { code: 978, name: 'Євро', flag: '🇪🇺' },
        PLN: { code: 985, name: 'Злотий', flag: '🇵🇱' }
    }
};

// ===== СТАН =====
let state = {
    previousRates: {},
    isUpdating: false,
    updateTimer: null,
    countdown: CONFIG.UPDATE_INTERVAL / 1000
};

// ===== 1. ОТРИМАННЯ КУРСІВ =====
async function fetchRates() {
    if (state.isUpdating) return;
    
    state.isUpdating = true;
    updateUI('loading');
    
    try {
        const response = await fetch('https://api.monobank.ua/bank/currency');
        
        if (!response.ok) throw new Error(`HTTP помилка: ${response.status}`);
        
        const data = await response.json();
        
        // Логуємо для перевірки PLN
        console.log('Отримані дані:', data);
        
        const rates = {};
        
        for (const [key, config] of Object.entries(CONFIG.CURRENCIES)) {
            // Шукаємо валюту
            const found = data.find(item => 
                item.currencyCodeA === config.code && 
                item.currencyCodeB === 980
            );
            
            if (found) {
                // Для PLN може бути тільки rateCross
                const buy = found.rateBuy || found.rateCross || null;
                const sell = found.rateSell || found.rateCross || null;
                
                if (buy !== null && sell !== null) {
                    rates[key] = { buy, sell, timestamp: Date.now() };
                } else {
                    console.warn(`⚠️ Неповні дані для ${key}:`, found);
                    rates[key] = null;
                }
            } else {
                // Спроба знайти через rateCross (для PLN)
                const cross = data.find(item => 
                    item.currencyCodeA === config.code && 
                    item.currencyCodeB === 840 // іноді PLN прив'язаний до USD
                );
                
                if (cross && cross.rateCross) {
                    // Якщо знайшли через USD, конвертуємо
                    const usd = data.find(item => 
                        item.currencyCodeA === 840 && 
                        item.currencyCodeB === 980
                    );
                    if (usd && usd.rateBuy) {
                        const rate = cross.rateCross * usd.rateBuy;
                        rates[key] = { buy: rate, sell: rate * 1.01, timestamp: Date.now() };
                        console.log(`✅ ${key} отримано через cross:`, rate);
                    } else {
                        rates[key] = null;
                    }
                } else {
                    console.warn(`⚠️ Валюту ${key} не знайдено`);
                    rates[key] = null;
                }
            }
        }
        
        // Перевіряємо, чи є хоч якісь дані
        const hasData = Object.values(rates).some(r => r !== null);
        if (!hasData) {
            throw new Error('Не вдалося отримати жодної валюти');
        }
        
        updateDisplay(rates);
        updateUI('success');
        animateHippo('update');
        
    } catch (error) {
        console.error('❌ Помилка:', error);
        updateUI('error');
        showError(error.message);
    } finally {
        state.isUpdating = false;
        resetCountdown();
    }
}

// ===== 2. ОНОВЛЕННЯ ВІДОБРАЖЕННЯ =====
function updateDisplay(rates) {
    for (const [currency, data] of Object.entries(rates)) {
        const buyElement = document.getElementById(`${currency.toLowerCase()}-buy`);
        const sellElement = document.getElementById(`${currency.toLowerCase()}-sell`);
        const changeElement = document.getElementById(`${currency.toLowerCase()}-change`);
        
        if (!buyElement || !sellElement || !changeElement) continue;
        
        if (!data) {
            buyElement.textContent = '❌';
            sellElement.textContent = '❌';
            changeElement.textContent = 'Немає даних';
            changeElement.className = 'currency-change unavailable';
            continue;
        }
        
        // Анімація оновлення
        [buyElement, sellElement].forEach(el => {
            el.classList.remove('updating');
            void el.offsetWidth;
            el.classList.add('updating');
        });
        
        // Оновлюємо курси
        buyElement.textContent = data.buy.toFixed(2);
        sellElement.textContent = data.sell.toFixed(2);
        
        // Розраховуємо зміну (по курсу купівлі)
        const prevBuy = state.previousRates[currency]?.buy || data.buy;
        const changePercent = ((data.buy - prevBuy) / prevBuy * 100);
        const changeText = changePercent === 0 ? '0.00%' :
                          changePercent > 0 ? `+${changePercent.toFixed(2)}%` : 
                          `${changePercent.toFixed(2)}%`;
        
        changeElement.textContent = changeText;
        changeElement.className = 'currency-change';
        
        // Реакція бегемотика
        if (changePercent > 0.3) {
            changeElement.classList.add('up');
            animateHippo('happy');
        } else if (changePercent < -0.3) {
            changeElement.classList.add('down');
            animateHippo('sad');
        } else {
            changeElement.classList.add('neutral');
            if (Math.abs(changePercent) < 0.01) {
                animateHippo('idle');
            }
        }
        
        // Зберігаємо
        state.previousRates[currency] = { buy: data.buy, sell: data.sell };
    }
    
    document.getElementById('update-time').textContent = 
        new Date().toLocaleTimeString('uk-UA');
}

// ===== 3. СТАН UI =====
function updateUI(status) {
    const indicator = document.getElementById('update-indicator');
    if (!indicator) return;
    indicator.className = 'indicator';
    
    switch(status) {
        case 'loading': indicator.classList.add('loading'); break;
        case 'error': indicator.classList.add('error'); break;
        default: indicator.classList.add('idle');
    }
}

function showError(message) {
    document.querySelectorAll('.currency-rate').forEach(el => {
        if (el.textContent === '--' || el.textContent === '❌') {
            el.textContent = '⚠️';
        }
    });
}

// ===== 4. ТАЙМЕР =====
function resetCountdown() {
    state.countdown = CONFIG.UPDATE_INTERVAL / 1000;
    updateCountdownDisplay();
}

function updateCountdownDisplay() {
    const el = document.getElementById('next-update');
    if (el) el.textContent = `Наступне оновлення: ${Math.ceil(state.countdown)}с`;
}

function startCountdown() {
    resetCountdown();
    if (state.updateTimer) clearInterval(state.updateTimer);
    
    state.updateTimer = setInterval(() => {
        state.countdown -= 1;
        updateCountdownDisplay();
        if (state.countdown <= 0) fetchRates();
    }, 1000);
}

function manualRefresh() {
    const btn = document.querySelector('.refresh-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Оновлення...';
    fetchRates().finally(() => {
        btn.disabled = false;
        btn.textContent = '🔄 Оновити зараз';
    });
}

// ===== 5. 3D БЕГЕМОТИК (повна версія) =====
let scene, camera, renderer, hippo;
let currentAnimation = 'idle';

function initHippo() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0c29);
    
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 7);
    camera.lookAt(0, 0.3, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('hippo-container').appendChild(renderer.domElement);
    
    // Освітлення
    const ambient = new THREE.AmbientLight(0x40406b, 0.5);
    scene.add(ambient);
    
    const mainLight = new THREE.DirectionalLight(0xffeedd, 1);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-3, 2, -4);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xff8844, 0.2);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);
    
    // Підлога
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 8),
        new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    createHippo();
    
    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isMobile = w < 768;
        camera.aspect = (isMobile ? w : w / 2) / h;
        camera.updateProjectionMatrix();
        renderer.setSize(isMobile ? w : w / 2, h);
    });
}

function createHippo() {
    const group = new THREE.Group();
    
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x6b4c3b, roughness: 0.7 });
    const skinMat = new THREE.MeshPhongMaterial({ color: 0x8b6b5b, roughness: 0.6 });
    const suitMat = new THREE.MeshPhongMaterial({ color: 0x2c3e50, roughness: 0.3, metalness: 0.2 });
    const glassesMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.8 });
    const glassMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2 });
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.7 });
    
    // ТІЛО
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 32), bodyMat);
    body.scale.set(1, 0.8, 1.2);
    body.position.y = 0.2;
    body.castShadow = true;
    group.add(body);
    
    // КОСТЮМ
    const jacket = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 32), suitMat);
    jacket.scale.set(1, 0.7, 1.1);
    jacket.position.y = 0.1;
    jacket.position.z = 0.1;
    jacket.castShadow = true;
    group.add(jacket);
    
    const pants = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.5, 16), suitMat);
    pants.position.y = -0.35;
    pants.position.z = 0.1;
    pants.castShadow = true;
    group.add(pants);
    
    // ГОЛОВА
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 32), skinMat);
    head.position.set(0, 1, 0.75);
    head.scale.set(0.9, 0.8, 0.7);
    head.castShadow = true;
    group.add(head);
    
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32), skinMat);
    muzzle.position.set(0, 0.9, 1.25);
    muzzle.scale.set(0.9, 0.6, 0.5);
    muzzle.castShadow = true;
    group.add(muzzle);
    
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), bodyMat);
    nose.position.set(0, 0.85, 1.5);
    nose.scale.set(0.8, 0.6, 0.4);
    group.add(nose);
    
    // ОЧІ
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    [-0.3, 0.3].forEach(x => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), eyeMat);
        eye.position.set(x, 1.15, 1.15);
        group.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), pupilMat);
        pupil.position.set(x, 1.15, 1.3);
        group.add(pupil);
    });
    
    // ОКУЛЯРИ
    const frameMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.5 });
    [-0.3, 0.3].forEach(x => {
        const frame = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 16, 16), frameMat);
        frame.position.set(x, 1.15, 1.15);
        frame.rotation.y = x > 0 ? -0.2 : 0.2;
        group.add(frame);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), glassMat);
        glass.position.set(x, 1.15, 1.28);
        glass.rotation.y = x > 0 ? -0.1 : 0.1;
        group.add(glass);
    });
    
    // ВУХА
    const earMat = new THREE.MeshPhongMaterial({ color: 0x7b5b4b });
    [-0.45, 0.45].forEach(x => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), earMat);
        ear.position.set(x, 1.3, 0.85);
        ear.scale.set(0.5, 0.3, 0.8);
        group.add(ear);
    });
    
    // РУКИ
    const armMat = new THREE.MeshPhongMaterial({ color: 0x2c3e50 });
    const handMat = new THREE.MeshPhongMaterial({ color: 0x8b6b5b });
    [-1.2, 1.2].forEach((x, i) => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8), armMat);
        arm.position.set(x, 0.5, 0.2);
        arm.rotation.z = i === 0 ? 0.3 : -0.3;
        arm.rotation.x = i === 0 ? -0.3 : 0.3;
        arm.castShadow = true;
        group.add(arm);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), handMat);
        hand.position.set(x + (i === 0 ? -0.2 : 0.2), 0.2, 0.3);
        group.add(hand);
    });
    
    // НОГИ
    const legMat = new THREE.MeshPhongMaterial({ color: 0x1a2a3a });
    const footMat = new THREE.MeshPhongMaterial({ color: 0x2a1a0a });
    [-0.45, 0.45].forEach(x => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.4, 8), legMat);
        leg.position.set(x, -0.7, 0.2);
        leg.castShadow = true;
        group.add(leg);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), footMat);
        foot.position.set(x, -0.95, 0.2);
        foot.scale.set(1, 0.3, 1.5);
        group.add(foot);
    });
    
    // ГОДИННИК
    const watchGroup = new THREE.Group();
    const watchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 16), goldMat);
    watchBody.rotation.x = Math.PI / 2;
    watchGroup.add(watchBody);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16),
        new THREE.MeshPhongMaterial({ color: 0xffffff, roughness: 0.2 }));
    dial.position.z = 0.018;
    watchGroup.add(dial);
    const handMat2 = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.035, 0.004), handMat2);
    hour.position.z = 0.02;
    watchGroup.add(hour);
    const min = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.004), handMat2);
    min.position.z = 0.02;
    min.rotation.z = 0.4;
    watchGroup.add(min);
    watchGroup.position.set(1.2, 0.3, 0.4);
    watchGroup.rotation.z = -0.2;
    watchGroup.rotation.y = 0.5;
    watchGroup.scale.set(1.6, 1.6, 1.6);
    group.add(watchGroup);
    
    // КРАВАТКА
    const bowMat = new THREE.MeshPhongMaterial({ color: 0x8b0000 });
    const bow1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.025), bowMat);
    bow1.position.set(0, 0.65, 1.15);
    bow1.rotation.y = 0.2;
    group.add(bow1);
    const bow2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.025), bowMat);
    bow2.position.set(0, 0.65, 1.15);
    group.add(bow2);
    
    hippo = group;
    scene.add(hippo);
}

// ===== 6. АНІМАЦІЇ =====
function animateHippo(type) {
    if (!hippo) return;
    currentAnimation = type;
    
    switch(type) {
        case 'happy':
            gsapTo(hippo, { y: 0.4 }, 0.4);
            gsapTo(hippo, { rotation: { x: 0.1, z: 0.08 } }, 0.3);
            hippo.children.forEach(child => {
                if (child.position && Math.abs(child.position.x) > 1 && 
                    child.geometry?.type === 'CylinderGeometry') {
                    gsapTo(child, { rotation: { x: -0.7, z: child.position.x > 0 ? -0.4 : 0.4 } }, 0.4);
                }
            });
            setTimeout(() => {
                if (currentAnimation === 'happy') {
                    gsapTo(hippo, { y: 0 }, 0.6);
                    gsapTo(hippo, { rotation: { x: 0, z: 0 } }, 0.6);
                }
            }, 600);
            break;
        case 'sad':
            gsapTo(hippo, { y: -0.1 }, 0.4);
            gsapTo(hippo, { rotation: { x: 0.08, z: -0.05 } }, 0.4);
            hippo.children.forEach(child => {
                if (child.position && Math.abs(child.position.x) > 1 && 
                    child.geometry?.type === 'CylinderGeometry') {
                    gsapTo(child, { rotation: { x: -0.1, z: child.position.x > 0 ? -0.1 : 0.1 } }, 0.4);
                }
            });
            setTimeout(() => {
                if (currentAnimation === 'sad') {
                    gsapTo(hippo, { y: 0 }, 0.6);
                    gsapTo(hippo, { rotation: { x: 0, z: 0 } }, 0.6);
                }
            }, 600);
            break;
        case 'update':
            gsapTo(hippo, { rotation: { y: 2 * Math.PI } }, 0.6);
            break;
        default:
            break;
    }
}

function gsapTo(obj, target, duration) {
    const startY = obj.position?.y || 0;
    const startRotX = obj.rotation?.x || 0;
    const startRotY = obj.rotation?.y || 0;
    const startRotZ = obj.rotation?.z || 0;
    
    const targetY = target.y !== undefined ? target.y : startY;
    const targetRotX = target.rotation?.x !== undefined ? target.rotation.x : startRotX;
    const targetRotY = target.rotation?.y !== undefined ? target.rotation.y : startRotY;
    const targetRotZ = target.rotation?.z !== undefined ? target.rotation.z : startRotZ;
    
    const startTime = Date.now();
    const durationMs = duration * 1000;
    
    function animate() {
        const elapsed = (Date.now() - startTime) / durationMs;
        const progress = Math.min(elapsed, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        
        if (obj.position) {
            obj.position.y = startY + (targetY - startY) * ease;
        }
        if (obj.rotation) {
            obj.rotation.x = startRotX + (targetRotX - startRotX) * ease;
            obj.rotation.y = startRotY + (targetRotY - startRotY) * ease;
            obj.rotation.z = startRotZ + (targetRotZ - startRotZ) * ease;
        }
        if (progress < 1) requestAnimationFrame(animate);
    }
    animate();
}

// ===== 7. РЕНДЕРИНГ =====
function renderLoop() {
    if (hippo && currentAnimation === 'idle') {
        const time = Date.now() / 2000;
        hippo.position.y = Math.sin(time) * 0.02;
        hippo.rotation.y += 0.003;
        hippo.rotation.z = Math.sin(time * 0.7) * 0.008;
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
    requestAnimationFrame(renderLoop);
}

// ===== 8. ЗАПУСК =====
function init() {
    initHippo();
    renderLoop();
    fetchRates();
    startCountdown();
}

document.addEventListener('DOMContentLoaded', init);
