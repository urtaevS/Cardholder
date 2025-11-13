// === ИНИЦИАЛИЗАЦИЯ ===
const tg = window.Telegram.WebApp;
tg.expand();
tg.disableClosingConfirmation();

let cards = [];
let scanning = false;
let stream = null;
let currentCardId = null;

// Элементы
const $ = (id) => document.getElementById(id);
const mainScreen = $('main-screen');
const addScreen = $('add-screen');
const viewScreen = $('view-screen');
const cardsList = $('cards-list');
const nameInput = $('name');
const colorInput = $('color');
const barcodeInput = $('barcode');
const scannerDiv = $('scanner');
const video = $('video');
const canvas = $('canvas');
const fileInput = $('file-input');

// === ФУНКЦИИ ===
function log(msg) {
    console.log('[App]', msg);
    // Для дебага в Telegram
    if (window.location.search.includes('debug')) {
        alert(msg);
    }
}

function showScreen(screen) {
    [mainScreen, addScreen, viewScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
    log('Show screen: ' + screen.id);
}

function loadCards() {
    try {
        const stored = localStorage.getItem('cards');
        cards = stored ? JSON.parse(stored) : [];
        log('Loaded ' + cards.length + ' cards');
        renderCards();
    } catch (e) {
        log('Load error: ' + e.message);
        cards = [];
    }
}

function saveCards() {
    try {
        localStorage.setItem('cards', JSON.stringify(cards));
        log('Saved ' + cards.length + ' cards');
    } catch (e) {
        log('Save error: ' + e.message);
        alert('Ошибка сохранения!');
    }
}

function renderCards() {
    cardsList.innerHTML = '';
    if (cards.length === 0) {
        cardsList.innerHTML = '<p style="text-align:center;color:#999;">Нет карт</p>';
        return;
    }
    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.style.backgroundColor = card.color || '#3390ec';
        div.textContent = card.name;
        div.onclick = () => viewCard(card.id);
        cardsList.appendChild(div);
    });
    log('Rendered ' + cards.length + ' cards');
}

function viewCard(id) {
    const card = cards.find(c => c.id === id);
    if (!card) {
        alert('Карта не найдена!');
        return;
    }
    currentCardId = id;
    $('view-name').textContent = card.name;
    const display = $('barcode-display');
    display.innerHTML = '<svg id="barcode-svg"></svg><p>' + card.barcode + '</p>';
    try {
        if (typeof JsBarcode !== 'undefined') {
            JsBarcode('#barcode-svg', card.barcode, {
                format: 'CODE128',
                width: 2,
                height: 100,
                displayValue: false,
                background: '#ffffff',
                lineColor: '#000000'
            });
            log('Barcode generated');
        } else {
            log('JsBarcode not loaded');
        }
    } catch (e) {
        log('Barcode error: ' + e.message);
        display.innerHTML = '<p style="font-size:24px;color:#000;">' + card.barcode + '</p>';
    }
    showScreen(viewScreen);
}

// === СКАНИРОВАНИЕ ===
async function startScan() {
    log('Start scan');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: 1280, height: 720 } 
        });
        video.srcObject = stream;
        await video.play();
        scannerDiv.classList.remove('hidden');
        scanning = true;
        tick();
    } catch (e) {
        alert('Ошибка камеры: ' + e.message);
        log('Camera error: ' + e);
    }
}

function stopScan() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    scannerDiv.classList.add('hidden');
    scanning = false;
    log('Scan stopped');
}

function tick() {
    if (!scanning) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                barcodeInput.value = code.data;
                stopScan();
                alert('Штрихкод: ' + code.data);
                log('Scanned: ' + code.data);
                return;
            }
        }
    }
    requestAnimationFrame(tick);
}

// === ЗАГРУЗКА ФОТО ===
function uploadPhoto(file) {
    log('Upload photo');
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                barcodeInput.value = code.data;
                alert('Штрихкод распознан: ' + code.data);
                log('Decoded: ' + code.data);
            } else {
                alert('Штрихкод не найден на фото');
                log('No code found');
            }
        }
    };
    img.src = URL.createObjectURL(file);
}

// === СОБЫТИЯ ===
$('add-btn').onclick = () => {
    nameInput.value = '';
    barcodeInput.value = '';
    colorInput.value = '#3390ec';
    showScreen(addScreen);
};

$('save-btn').onclick = () => {
    const name = nameInput.value.trim();
    const barcode = barcodeInput.value.trim();
    const color = colorInput.value;
    if (!name || !barcode) {
        alert('Заполните все поля!');
        return;
    }
    const newCard = { id: Date.now(), name, barcode, color };
    cards.push(newCard);
    saveCards();
    renderCards();
    showScreen(mainScreen);
    log('Card added: ' + name);
};

$('cancel-btn').onclick = () => {
    stopScan();
    showScreen(mainScreen);
};

$('back-btn').onclick = () => showScreen(mainScreen);

$('delete-btn').onclick = () => {
    if (confirm('Удалить карту?')) {
        cards = cards.filter(c => c.id !== currentCardId);
        saveCards();
        renderCards();
        showScreen(mainScreen);
        log('Card deleted');
    }
};

$('scan-btn').onclick = startScan;
$('stop-scan').onclick = stopScan;
$('upload-btn').onclick = () => fileInput.click();
fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) uploadPhoto(file);
};

// === ЗАПУСК ===
tg.ready(() => {
    log('TG ready');
    loadCards();
    // Для теста в браузере
    if (!tg.initDataUnsafe.user) {
        log('Test mode');
    }
});