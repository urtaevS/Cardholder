// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Элементы DOM
const mainScreen = document.getElementById('main-screen');
const addScreen = document.getElementById('add-screen');
const viewScreen = document.getElementById('view-screen');
const confirmModal = document.getElementById('confirm-modal');

const addCardBtn = document.getElementById('add-card-btn');
const scanBtn = document.getElementById('scan-btn');
const saveCardBtn = document.getElementById('save-card-btn');
const cancelAddBtn = document.getElementById('cancel-add-btn');
const deleteCardBtn = document.getElementById('delete-card-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

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

// Загрузка карт из localStorage
function loadCards() {
    const stored = localStorage.getItem('loyaltyCards');
    if (stored) {
        cards = JSON.parse(stored);
    }
    renderCards();
}

// Сохранение карт в localStorage
function saveCards() {
    localStorage.setItem('loyaltyCards', JSON.stringify(cards));
}

// Отрисовка списка карт
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
function showScreen(screen) {
    mainScreen.classList.add('hidden');
    addScreen.classList.add('hidden');
    viewScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}

// Добавление карты
addCardBtn.addEventListener('click', () => {
    showScreen(addScreen);
    cardNameInput.value = '';
    barcodeInput.value = '';
});

// Сканирование штрихкода
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
            video: { facingMode: 'environment' } 
        });
        video.srcObject = stream;
        scannerContainer.classList.remove('hidden');
        scanning = true;
        scanBtn.textContent = 'Остановить сканирование';
        requestAnimationFrame(tick);
    } catch (err) {
        alert('Не удалось получить доступ к камере');
        console.error(err);
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
            tg.showAlert('Штрихкод успешно отсканирован!');
            return;
        }
    }
    
    requestAnimationFrame(tick);
}

// Сохранение карты
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

// Отмена добавления
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
    
    // Отображение штрихкода с использованием JsBarcode
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
        // Если не удалось сгенерировать штрихкод, показываем просто текст
        barcodeDisplay.innerHTML = `<p style="font-size: 24px; margin-top: 40px;">${card.barcode}</p>`;
    }
    
    showScreen(viewScreen);
}

// Удаление карты
deleteCardBtn.addEventListener('click', () => {
    confirmModal.classList.remove('hidden');
});

confirmDeleteBtn.addEventListener('click', () => {
    cards = cards.filter(c => c.id !== currentCardId);
    saveCards();
    renderCards();
    confirmModal.classList.add('hidden');
    showScreen(mainScreen);
    tg.showAlert('Карта удалена');
});

cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
});

// Инициализация
loadCards();
