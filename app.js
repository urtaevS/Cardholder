// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// ===== НАСТРОЙКА ДОСТУПА =====
const ALLOWED_USER_IDS = [
    186757704    // ЗАМЕНИТЕ НА ВАШ ID!
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
const editCardBtn = document.getElementById('edit-card-btn');
const deleteCardBtn = document.getElementById('delete-card-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const backBtn = document.getElementById('back-btn');

const cardNameInput = document.getElementById('card-name');
const barcodeInput = document.getElementById('barcode-input');
const cardColorInput = document.getElementById('card-color');
const colorPreview = document.getElementById('color-preview');
const addScreenTitle = document.getElementById('add-screen-title');
const cardsList = document.getElementById('cards-list');
const viewCardName = document.getElementById('view-card-name');
const barcodeDisplay = document.getElementById('barcode-display');

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const scannerContainer = document.getElementById('scanner-container');

let cards = [];
let currentCardId = null;
let editingCardId = null;
let scanning = false;
let stream = null;

// Цвета по умолчанию для выбора
const defaultColors = ['#3390ec', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

// Обновление превью цвета
cardColorInput.addEventListener('input', (e) => {
    colorPreview.style.backgroundColor = e.target.value;
});

// Инициализация превью
colorPreview.style.backgroundColor = cardColorInput.value;

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
    link.download = `loyalty-cards-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    tg.showAlert(`Экспортировано ${cards.length} карт(ы)`);
}

function importCards() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedCards = JSON.parse(event.target.result);
                
                if (!Array.isArray(importedCards)) {
                    tg.showAlert('Неверный формат файла');
                    return;
                }
                
                const isValid = importedCards.every(card => 
                    card.id && card.name && card.barcode
                );
                
                if (!isValid) {
                    tg.showAlert('Файл содержит некорректные данные');
                    return;
                }
                
                cards = importedCards;
                saveCards();
                renderCards();
                tg.showAlert(`Импортировано ${importedCards.length} карт(ы)`);
                
            } catch (err) {
                tg.showAlert('Ошибка чтения файла');
                console.error('Import error:', err);
            }
        };
        reader.readAsText(file);
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

// Загрузка и сохранение
function loadCards() {
    try {
        const stored = localStorage.getItem('loyaltyCards');
        if (stored) {
            cards = JSON.parse(stored);
        }
    } catch (err) {
        console.error('Load error:', err);
        cards = [];
    }
    renderCards();
}

function saveCards() {
    try {
        localStorage.setItem('loyaltyCards', JSON.stringify(cards));
    } catch (err) {
        console.error('Save error:', err);
        tg.showAlert('Ошибка сохранения данных');
    }
}

// Отрисовка списка карт - КОМПАКТНЫЙ ДИЗАЙН
function renderCards() {
    cardsList.innerHTML = '';
    
    if (cards.length === 0) {
        cardsList.innerHTML = '<p>Пока нет сохранённых карт.<br>Добавьте первую!</p>';
        return;
    }
    
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        cardElement.style.backgroundColor = card.color || '#3390ec';
        cardElement.innerHTML = `<h3>${escapeHtml(card.name)}</h3>`;
        cardElement.addEventListener('click', () => viewCard(card.id));
        cardsList.appendChild(cardElement);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Переключение экранов
function showScreen(screenToShow) {
    [mainScreen, addScreen, viewScreen].forEach(screen => 
        screen.classList.add('hidden')
    );
    confirmModal.classList.add('hidden');
    screenToShow.classList.remove('hidden');
}

// Добавление карты
addCardBtn.addEventListener('click', () => {
    editingCardId = null;
    addScreenTitle.textContent = 'Добавить карту';
    showScreen(addScreen);
    cardNameInput.value = '';
    barcodeInput.value = '';
    cardColorInput.value = defaultColors[Math.floor(Math.random() * defaultColors.length)];
    colorPreview.style.backgroundColor = cardColorInput.value;
    stopScanning();
});

// Редактирование карты
editCardBtn.addEventListener('click', () => {
    const card = cards.find(c => c.id === currentCardId);
    if (!card) return;
    
    editingCardId = currentCardId;
    addScreenTitle.textContent = 'Редактировать карту';
    showScreen(addScreen);
    cardNameInput.value = card.name;
    barcodeInput.value = card.barcode;
    cardColorInput.value = card.color || '#3390ec';
    colorPreview.style.backgroundColor = cardColorInput.value;
    stopScanning();
});

exportBtn.addEventListener('click', exportCards);
importBtn.addEventListener('click', importCards);

// Сканирование
scanBtn.addEventListener('click', async () => {
    if (!scanning) {
        await startScanning();
    } else {
        stopScanning();
    }
});

async function startScanning() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        await video.play();
        
        scannerContainer.classList.remove('hidden');
        scanning = true;
        scanBtn.textContent = '⏹ Остановить сканирование';
        scanBtn.classList.remove('secondary-btn');
        scanBtn.classList.add('danger-btn');
        
        requestAnimationFrame(tick);
        
    } catch (err) {
        console.error('Camera error:', err);
        let errorMsg = 'Не удалось получить доступ к камере.';
        
        if (err.name === 'NotAllowedError') {
            errorMsg = 'Доступ к камере запрещён. Разрешите в настройках.';
        } else if (err.name === 'NotFoundError') {
            errorMsg = 'Камера не найдена на устройстве.';
        }
        
        tg.showAlert(errorMsg);
    }
}

function stopScanning() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    scannerContainer.classList.add('hidden');
    scanning = false;
    scanBtn.textContent = '📷 Сканировать штрихкод';
    scanBtn.classList.remove('danger-btn');
    scanBtn.classList.add('secondary-btn');
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
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            return;
        }
    }
    
    requestAnimationFrame(tick);
}

// Сохранение карты
saveCardBtn.addEventListener('click', () => {
    const name = cardNameInput.value.trim();
    const barcode = barcodeInput.value.trim();
    const color = cardColorInput.value;
    
    if (!name) {
        tg.showAlert('Введите название магазина');
        cardNameInput.focus();
        return;
    }
    
    if (!barcode) {
        tg.showAlert('Введите или отсканируйте штрихкод');
        barcodeInput.focus();
        return;
    }
    
    if (editingCardId) {
        // Редактирование существующей карты
        const cardIndex = cards.findIndex(c => c.id === editingCardId);
        if (cardIndex !== -1) {
            cards[cardIndex] = {
                ...cards[cardIndex],
                name: name,
                barcode: barcode,
                color: color,
                updatedAt: new Date().toISOString()
            };
            tg.showAlert('Карта обновлена!');
        }
    } else {
        // Добавление новой карты
        const newCard = {
            id: Date.now(),
            name: name,
            barcode: barcode,
            color: color,
            createdAt: new Date().toISOString()
        };
        cards.push(newCard);
        tg.showAlert('Карта добавлена!');
    }
    
    saveCards();
    renderCards();
    showScreen(mainScreen);
    editingCardId = null;
});

cancelAddBtn.addEventListener('click', () => {
    stopScanning();
    editingCardId = null;
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
        <p>${escapeHtml(card.barcode)}</p>
    `;
    
    try {
        JsBarcode("#barcode-svg", card.barcode, {
            format: "CODE128",
            width: 2,
            height: 100,
            displayValue: false,
            background: "#ffffff",
            lineColor: "#000000"
        });
    } catch (e) {
        console.error('Barcode generation error:', e);
        barcodeDisplay.innerHTML = `
            <p style="font-size: 24px; margin: 40px 0; color: #000000;">
                ${escapeHtml(card.barcode)}
            </p>
        `;
    }
    
    showScreen(viewScreen);
}

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
    
    tg.BackButton.onClick(() => {
        if (!mainScreen.classList.contains('hidden')) {
            tg.close();
        } else {
            stopScanning();
            editingCardId = null;
            showScreen(mainScreen);
        }
    });
    
    const observer = new MutationObserver(() => {
        if (mainScreen.classList.contains('hidden')) {
            tg.BackButton.show();
        } else {
            tg.BackButton.hide();
        }
    });
    
    observer.observe(mainScreen, { attributes: true, attributeFilter: ['class'] });
}
