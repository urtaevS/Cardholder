// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Применение темы Telegram
document.body.style.backgroundColor = tg.backgroundColor || '#ffffff';

// Хранилище карт
let cards = JSON.parse(localStorage.getItem('loyaltyCards')) || [];
let selectedColor = '#FF6B6B';
let currentCardId = null;
let editingCardId = null;

// DOM элементы
const addCardBtn = document.getElementById('addCardBtn');
const addModal = document.getElementById('addModal');
const viewModal = document.getElementById('viewModal');
const editModal = document.getElementById('editModal');
const cardsGrid = document.getElementById('cardsGrid');
const saveCardBtn = document.getElementById('saveCardBtn');
const cameraBtn = document.getElementById('cameraBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

// Открытие модального окна добавления
addCardBtn.addEventListener('click', () => {
    addModal.style.display = 'flex';
    document.getElementById('cardName').value = '';
    document.getElementById('barcodeNumber').value = '';
    selectedColor = '#FF6B6B';
    updateColorSelection();
});

// Закрытие модальных окон
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        addModal.style.display = 'none';
        viewModal.style.display = 'none';
        editModal.style.display = 'none';
    });
});

// Выбор цвета
document.querySelectorAll('.color-option').forEach(colorOption => {
    colorOption.addEventListener('click', (e) => {
        selectedColor = e.target.dataset.color;
        updateColorSelection();
    });
});

function updateColorSelection() {
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.color === selectedColor) {
            option.classList.add('selected');
        }
    });
}

// Камера
cameraBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => processBarcodeImage(e.target.files[0]);
    input.click();
});

// Загрузка файла
uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        processBarcodeImage(e.target.files[0]);
    }
});

// Обработка изображения штрихкода (упрощенная версия)
function processBarcodeImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        // Здесь должна быть логика распознавания штрихкода
        // Для демонстрации используем случайный номер
        const randomBarcode = Math.floor(Math.random() * 1000000000000);
        document.getElementById('barcodeNumber').value = randomBarcode;
        tg.showAlert('Штрихкод распознан (демо)');
    };
    reader.readAsDataURL(file);
}

// Сохранение карты
saveCardBtn.addEventListener('click', () => {
    const name = document.getElementById('cardName').value.trim();
    const barcodeNumber = document.getElementById('barcodeNumber').value.trim();

    if (!name || !barcodeNumber) {
        tg.showAlert('Заполните все поля');
        return;
    }

    const card = {
        id: Date.now(),
        name: name,
        barcode: barcodeNumber,
        color: selectedColor
    };

    cards.push(card);
    saveCards();
    renderCards();
    addModal.style.display = 'none';
    tg.showAlert('Карта добавлена');
});

// Отображение карт
function renderCards() {
    cardsGrid.innerHTML = '';
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.style.background = card.color;
        cardElement.innerHTML = `<h3>${card.name}</h3>`;
        cardElement.addEventListener('click', () => viewCard(card.id));
        cardsGrid.appendChild(cardElement);
    });
}

// Просмотр карты
function viewCard(cardId) {
    currentCardId = cardId;
    const card = cards.find(c => c.id === cardId);
    
    document.getElementById('viewCardName').textContent = card.name;
    document.getElementById('cardFront').style.background = card.color;
    document.getElementById('barcodeText').textContent = card.barcode;
    
    // Генерация штрихкода
    try {
        JsBarcode('#barcodeSvg', card.barcode, {
            format: 'CODE128',
            width: 2,
            height: 100,
            displayValue: false
        });
    } catch (e) {
        console.error('Ошибка генерации штрихкода:', e);
    }

    viewModal.style.display = 'flex';
}

// Редактирование карты
document.getElementById('editBtn').addEventListener('click', () => {
    editingCardId = currentCardId;
    const card = cards.find(c => c.id === currentCardId);
    
    document.getElementById('editCardName').value = card.name;
    document.getElementById('editBarcodeNumber').value = card.barcode;
    selectedColor = card.color;
    
    // Обновляем выбор цвета в модальном окне редактирования
    document.querySelectorAll('#editColors .color-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.color === selectedColor) {
            option.classList.add('selected');
        }
    });

    viewModal.style.display = 'none';
    editModal.style.display = 'flex';
});

// Обработка выбора цвета в окне редактирования
document.querySelectorAll('#editColors .color-option').forEach(colorOption => {
    colorOption.addEventListener('click', (e) => {
        selectedColor = e.target.dataset.color;
        document.querySelectorAll('#editColors .color-option').forEach(option => {
            option.classList.remove('selected');
        });
        e.target.classList.add('selected');
    });
});

// Сохранение изменений
document.getElementById('saveEditBtn').addEventListener('click', () => {
    const name = document.getElementById('editCardName').value.trim();
    const barcodeNumber = document.getElementById('editBarcodeNumber').value.trim();

    if (!name || !barcodeNumber) {
        tg.showAlert('Заполните все поля');
        return;
    }

    const cardIndex = cards.findIndex(c => c.id === editingCardId);
    cards[cardIndex] = {
        ...cards[cardIndex],
        name: name,
        barcode: barcodeNumber,
        color: selectedColor
    };

    saveCards();
    renderCards();
    editModal.style.display = 'none';
    tg.showAlert('Изменения сохранены');
});

// Удаление карты
document.getElementById('deleteBtn').addEventListener('click', () => {
    tg.showConfirm('Вы уверены, что хотите удалить эту карту?', (confirmed) => {
        if (confirmed) {
            cards = cards.filter(c => c.id !== currentCardId);
            saveCards();
            renderCards();
            viewModal.style.display = 'none';
            tg.showAlert('Карта удалена');
        }
    });
});

// Экспорт карт
exportBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(cards, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'loyalty_cards.json';
    link.click();
    URL.revokeObjectURL(url);
    tg.showAlert('Карты экспортированы');
});

// Импорт карт
importBtn.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedCards = JSON.parse(event.target.result);
                cards = [...cards, ...importedCards];
                saveCards();
                renderCards();
                tg.showAlert('Карты импортированы');
            } catch (error) {
                tg.showAlert('Ошибка импорта');
            }
        };
        reader.readAsText(file);
    }
});

// Сохранение в localStorage
function saveCards() {
    localStorage.setItem('loyaltyCards', JSON.stringify(cards));
}

// Закрытие модальных окон при клике вне их
window.addEventListener('click', (e) => {
    if (e.target === addModal) addModal.style.display = 'none';
    if (e.target === viewModal) viewModal.style.display = 'none';
    if (e.target === editModal) editModal.style.display = 'none';
});

// Инициализация
renderCards();
