// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.disableClosingConfirmation();

let cards = [];
let currentCardId = null;
let editingId = null;
let scanning = false;
let stream = null;

// Элементы DOM
const $ = id => document.getElementById(id);
const mainScreen = $('#main-screen');
const addScreen = $('#add-screen');
const viewScreen = $('#view-screen');
const cardsList = $('#cards-list');
const addTitle = $('#add-title');
const nameInput = $('#name-input');
const colorInput = $('#color-input');
const barcodeInput = $('#barcode-input');
const scannerContainer = $('#scanner-container');
const video = $('#video');
const canvas = $('#canvas');
const fileInput = $('#file-input');
const saveBtn = $('#save-btn');
const cancelBtn = $('#cancel-btn');
const scanBtn = $('#scan-btn');
const uploadBtn = $('#upload-btn');
const exportBtn = $('#export-btn');
const importBtn = $('#import-btn');
const backBtn = $('#back-btn');
const editBtn = $('#edit-btn');
const deleteBtn = $('#delete-btn');
const viewName = $('#view-name');
const barcodeDisplay = $('#barcode-display');

// Функции хелперы
function log(msg) {
    console.log('[Loyalty App]', msg);
}

function showScreen(screen) {
    [mainScreen, addScreen, viewScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
    log(`Show screen: ${screen.id}`);
}

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// Загрузка/сохранение карт
function loadCards() {
    try {
        const stored = localStorage.getItem('loyaltyCards');
        cards = stored ? JSON.parse(stored) : [];
        log(`Loaded ${cards.length} cards`);
        renderCards();
    } catch (e) {
        log('Load error: ' + e.message);
        cards = [];
    }
}

function saveCards() {
    try {
        localStorage.setItem('loyaltyCards', JSON.stringify(cards));
        log(`Saved ${cards.length} cards`);
    } catch (e) {
        log('Save error: ' + e.message);
        tg.showAlert('Ошибка сохранения!');
    }
}

// Рендер списка карт (только название на фоне цвета)
function renderCards() {
    cardsList.innerHTML = '';
    if (cards.length === 0) {
        cardsList.innerHTML = '<p style="text-align: center; color: var(--tg-hint-color, #999);">Нет сохранённых карт. Добавьте первую!</p>';
        return;
    }
    cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'card-item';
        item.style.backgroundColor = card.color;
        item.textContent = card.name;
        item.onclick = () => viewCard(card.id);
        cardsList.appendChild(item);
    });
    log('Rendered cards');
}

// Просмотр карты (штрихкод с белым фоном)
function viewCard(id) {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    currentCardId = id;
    viewName.textContent = card.name;
    barcodeDisplay.innerHTML = `<svg id="barcode-svg"></svg><p>${escapeHtml(card.barcode)}</p>`;
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
        } else {
            barcodeDisplay.innerHTML = `<p style="font-size: 24px; color: #000; font-family: monospace;">${escapeHtml(card.barcode)}</p>`;
        }
    } catch (e) {
        log('Barcode error: ' + e.message);
        barcodeDisplay.innerHTML = `<p style="font-size: 24px; color: #000;">${escapeHtml(card.barcode)}</p>`;
    }
    showScreen(viewScreen);
}

// Сканирование камерой
async function startScanning() {
    if (scanning) return;
    scanning = true;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = stream;
        video.play();
        scannerContainer.classList.remove('hidden');
        scanBtn.textContent = '⏹ Остановить';
        scanBtn.classList.add('danger');
        scanBtn.classList.remove('secondary');
        tick();
        log('Scanning started');
    } catch (e) {
        tg.showAlert('Ошибка доступа к камере: ' + e.message);
        log('Scan error: ' + e.message);
        stopScanning();
    }
}

function stopScanning() {
    scanning = false;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    scannerContainer.classList.add('hidden');
    scanBtn.textContent = '📷 Сканировать камерой';
    scanBtn.classList.remove('danger');
    scanBtn.classList.add('secondary');
    log('Scanning stopped');
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
                tg.showAlert(`Штрихкод: ${code.data}`);
                stopScanning();
                return;
            }
        }
    }
    requestAnimationFrame(tick);
}

// Загрузка фото
function handleFileUpload(file) {
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
                tg.showAlert(`Распознано: ${code.data}`);
                log('Photo decoded: ' + code.data);
            } else {
                tg.showAlert('Штрихкод не найден на фото');
            }
        }
        URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
}

// Импорт/экспорт
function exportCards() {
    if (cards.length === 0) {
        tg.showAlert('Нет карт для экспорта');
        return;
    }
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cards-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    tg.showAlert(`Экспортировано ${cards.length} карт`);
}

function importCards() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    cards = imported.map(c => ({ ...c, id: c.id || Date.now() + Math.random() }));
                    saveCards();
                    renderCards();
                    tg.showAlert(`Импортировано ${imported.length} карт`);
                } else {
                    tg.showAlert('Неверный формат файла');
                }
            } catch (e) {
                tg.showAlert('Ошибка чтения файла');
                log('Import error: ' + e.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// События
scanBtn.onclick = startScanning;
uploadBtn.onclick = () => fileInput.click();
fileInput.onchange = e => handleFileUpload(e.target.files[0]);
exportBtn.onclick = exportCards;
importBtn.onclick = importCards;
backBtn.onclick = () => showScreen(mainScreen);
editBtn.onclick = () => {
    const card = cards.find(c => c.id === currentCardId);
    if (card) {
        editingId = card.id;
        addTitle.textContent = 'Редактировать карту';
        nameInput.value = card.name;
        colorInput.value = card.color;
        barcodeInput.value = card.barcode;
        showScreen(addScreen);
    }
};
deleteBtn.onclick = () => {
    if (confirm('Удалить карту?')) {
        cards = cards.filter(c => c.id !== currentCardId);
        saveCards();
        renderCards();
        showScreen(mainScreen);
        tg.showAlert('Карта удалена');
    }
};
cancelBtn.onclick = () => {
    stopScanning();
    editingId = null;
    addTitle.textContent = 'Добавить карту';
    nameInput.value = '';
    barcodeInput.value = '';
    colorInput.value = '#3390ec';
    showScreen(mainScreen);
};

// Добавление/редактирование
$('#add-btn').onclick = () => {
    editingId = null;
    addTitle.textContent = 'Добавить карту';
    nameInput.value = '';
    barcodeInput.value = '';
    colorInput.value = '#3390ec';
    showScreen(addScreen);
    stopScanning();
};
saveBtn.onclick = () => {
    const name = nameInput.value.trim();
    const barcode = barcodeInput.value.trim();
    const color = colorInput.value;
    if (!name || !barcode) {
        tg.showAlert('Заполните название и штрихкод');
        return;
    }
    if (editingId) {
        const index = cards.findIndex(c => c.id === editingId);
        if (index > -1) {
            cards[index] = { ...cards[index], name, barcode, color };
            tg.showAlert('Карта обновлена');
        }
    } else {
        cards.push({ id: Date.now(), name, barcode, color });
        tg.showAlert('Карта добавлена');
    }
    saveCards();
    renderCards();
    editingId = null;
    showScreen(mainScreen);
    stopScanning();
};

// Инициализация
tg.ready(() => {
    log('Telegram ready');
    loadCards();
    // BackButton для навигации
    tg.BackButton.onClick(() => {
        if (viewScreen.classList.contains('hidden') && addScreen.classList.contains('hidden')) {
            tg.close();
        } else {
            showScreen(mainScreen);
            stopScanning();
        }
    });
    tg.BackButton.hide(); // Скрыто на главном
    // Observer для показа BackButton
    const observer = new MutationObserver(() => {
        if (mainScreen.classList.contains('hidden')) {
            tg.BackButton.show();
        } else {
            tg.BackButton.hide();
        }
    });
    observer.observe(mainScreen, { attributes: true, attributeFilter: ['class'] });
});
