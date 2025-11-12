// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// ===== НАСТРОЙКА ДОСТУПА =====
const ALLOWED_USER_IDS = [
        // ЗАМЕНИТЕ НА ВАШ ID!
];

function checkAccess() {
    const user = tg.initDataUnsafe?.user;
    if (!user || !ALLOWED_USER_IDS.includes(user.id)) {
        document.getElementById('access-denied').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        return false;
    }
    return true;
}

// Элементы DOM
const mainScreen = document.getElementById('main-screen');
const addScreen = document.getElementById('add-screen');
const viewScreen = document.getElementById('view-screen');
const confirmModal = document.getElementById('confirm-modal');

const addCardBtn = document.getElementById('add-card-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const scanBtn = document.getElementById('scan-btn');
const saveCardBtn = document.getElementById('save-card-btn');
const cancelAddBtn = document.getElementById('cancel-add-btn');
const deleteCardBtn = document.getElementById('delete-card-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const backBtn = document.getElementById('back-btn');

const cardNameInput = document.getElementById('card-name');
const barcodeInput = document.getElementById('barcode-input');
const cardsList = document.getElementById('cards-list');
const viewCardName = document.getElementById('view-card-name');
const barcodeDisplay = document.getElementById('barcode-display');

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const scannerContainer = document.getElementById('scanner-container');

let cards = [];
let currentCardId = null;
let scanning = false;
let stream = null;

// ===== РЕЗЕРВНОЕ КОПИРОВАНИЕ =====
function exportCards() {
    if (cards.length === 0) {
        tg.showAlert('Нет карт для экспорта');
        return;
    }
    const dataStr = JSON.stringify(cards, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loyalty-cards-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    tg.showAlert('Данные экспортированы');
}

function importCards() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedCards = JSON.parse(event.target.result);
                if (Array.isArray(importedCards)) {
                    cards = importedCards;
                    saveCards();
                    renderCards();
                    tg.showAlert(`${importedCards.length} карт импортировано`);
                } else {
                    tg.showAlert('Неверный формат файла');
                }
            } catch (err) {
                tg.showAlert('Ошибка чтения файла');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Загрузка и сохранение
function loadCards() {
    const stored = localStorage.getItem('loyaltyCards');
    if (stored) {
        cards = JSON.parse(stored);
    }
    renderCards();
}

function saveCards() {
    localStorage.setItem('loyaltyCards', JSON.stringify(cards));
}

function renderCards() {
    cardsList.innerHTML = '';
    if (cards.length === 0) {
        cardsList.innerHTML = '<p style="text-align: center; color: var(--tg-theme-hint-color, #999);">Нет сохранённых карт</p>';
        return;
    }
    
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        cardElement.innerHTML = `
            <h3>${card.name}</h3>
            <p>${card.barcode}</p>
        `;
        cardElement.addEventListener('click', () => viewCard(card.id));
        cardsList.appendChild(cardElement);
    });
}

// Переключение экранов
function showScreen(screenToShow) {
    [mainScreen, addScreen, viewScreen, confirmModal].forEach(screen => screen.classList.add('hidden'));
    screenToShow.classList.remove('hidden');
}

// Добавление карты
addCardBtn.addEventListener('click', () => {
    showScreen(addScreen);
    cardNameInput.value = '';
    barcodeInput.value = '';
    stopScanning();
});

exportBtn.addEventListener('click', exportCards);
importBtn.addEventListener('click', importCards);

// Сканирование - ИСПРАВЛЕНО
scanBtn.addEventListener('click', async () => {
    if (!scanning) {
        await startScanning();
    } else {
        stopScanning();
    }
});

async function startScanning() {
    try {
        // ИСПРАВЛЕНО: добавлены constraints для мобильных
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        video.srcObject = stream;
        video.setAttribute('playsinline', ''); // ВАЖНО для iOS
        video.play(); // ИСПРАВЛЕНО: явный запуск
        scannerContainer.classList.remove('hidden');
        scanning = true;
        scanBtn.textContent = 'Остановить сканирование';
        requestAnimationFrame(tick);
    } catch (err) {
        tg.showAlert('Не удалось получить доступ к камере. Проверьте разрешения.');
        console.error('Camera error:', err);
    }
}

function stopScanning() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    scannerContainer.classList.add('hidden');
    scanning = false;
    scanBtn.textContent = 'Сканировать штрихкод';
}

function tick() {
    if (!scanning) return;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
            barcodeInput.value = code.data;
            stopScanning();
            tg.showAlert('Штрихкод отсканирован!');
            return;
        }
    }
    
    requestAnimationFrame(tick);
}

saveCardBtn.addEventListener('click', () => {
    const name = cardNameInput.value.trim();
    const barcode = barcodeInput.value.trim();
    
    if (!name || !barcode) {
        tg.showAlert('Заполните все поля');
        return;
    }
    
    const newCard = {
        id: Date.now(),
        name: name,
        barcode: barcode
    };
    
    cards.push(newCard);
    saveCards();
    renderCards();
    showScreen(mainScreen);
    tg.showAlert('Карта добавлена!');
});

cancelAddBtn.addEventListener('click', () => {
    stopScanning();
    showScreen(mainScreen);
});

// Просмотр карты
function viewCard(id) {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    
    currentCardId = id;
    viewCardName.textContent = card.name;
    
    barcodeDisplay.innerHTML = `
        <svg id="barcode-svg"></svg>
        <p>${card.barcode}</p>
    `;
    
    try {
        JsBarcode("#barcode-svg", card.barcode, {
            format: "CODE128",
            width: 2,
            height: 100,
            displayValue: false
        });
    } catch (e) {
        barcodeDisplay.innerHTML = `<p style="font-size: 24px; margin-top: 40px;">${card.barcode}</p>`;
    }
    
    showScreen(viewScreen);
}

// ИСПРАВЛЕНО: кнопка "Назад" теперь работает
backBtn.addEventListener('click', () => {
    showScreen(mainScreen);
});

deleteCardBtn.addEventListener('click', () => {
    confirmModal.classList.remove('hidden');
});

confirmDeleteBtn.addEventListener('click', () => {
    cards = cards.filter(c => c.id !== currentCardId);
    saveCards();
    renderCards();
    showScreen(mainScreen);
    tg.showAlert('Карта удалена');
});

cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
});

// Инициализация
if (checkAccess()) {
    loadCards();
}
