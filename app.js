// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Получение элементов
const addCardBtn = document.getElementById('addCardBtn');
const cardsList = document.getElementById('cardsList');
const storeNameInput = document.getElementById('storeName');
const cardNumberInput = document.getElementById('cardNumber');
const barcodeInput = document.getElementById('barcode');

// Загрузка карт из localStorage
function loadCards() {
    const cards = JSON.parse(localStorage.getItem('loyaltyCards') || '[]');
    return cards;
}

// Сохранение карт в localStorage
function saveCards(cards) {
    localStorage.setItem('loyaltyCards', JSON.stringify(cards));
}

// Отображение карт
function renderCards() {
    const cards = loadCards();
    
    if (cards.length === 0) {
        cardsList.innerHTML = '<div class="empty-state">Нет добавленных карт. Добавьте первую карту!</div>';
        return;
    }
    
    cardsList.innerHTML = cards.map((card, index) => `
        <div class="card">
            <h3>${card.storeName}</h3>
            <p class="card-number">Номер: ${card.cardNumber}</p>
            ${card.barcode ? `<p>Штрих-код: ${card.barcode}</p>` : ''}
            <p style="font-size: 12px; color: var(--tg-theme-hint-color, #999);">
                Добавлено: ${new Date(card.dateAdded).toLocaleDateString('ru-RU')}
            </p>
            <div class="card-actions">
                <button class="copy-btn" onclick="copyCardNumber('${card.cardNumber}')">
                    Скопировать номер
                </button>
                <button class="delete-btn" onclick="deleteCard(${index})">
                    Удалить
                </button>
            </div>
        </div>
    `).join('');
}

// Добавление новой карты
addCardBtn.addEventListener('click', () => {
    const storeName = storeNameInput.value.trim();
    const cardNumber = cardNumberInput.value.trim();
    const barcode = barcodeInput.value.trim();
    
    if (!storeName || !cardNumber) {
        tg.showAlert('Пожалуйста, заполните название магазина и номер карты');
        return;
    }
    
    const cards = loadCards();
    cards.push({
        storeName,
        cardNumber,
        barcode,
        dateAdded: new Date().toISOString()
    });
    
    saveCards(cards);
    renderCards();
    
    // Очистка формы
    storeNameInput.value = '';
    cardNumberInput.value = '';
    barcodeInput.value = '';
    
    tg.showAlert('Карта успешно добавлена!');
});

// Копирование номера карты
function copyCardNumber(cardNumber) {
    navigator.clipboard.writeText(cardNumber).then(() => {
        tg.showAlert('Номер карты скопирован!');
    }).catch(() => {
        tg.showAlert('Ошибка копирования');
    });
}

// Удаление карты
function deleteCard(index) {
    const cards = loadCards();
    cards.splice(index, 1);
    saveCards(cards);
    renderCards();
    tg.showAlert('Карта удалена');
}

// Инициализация
renderCards();
