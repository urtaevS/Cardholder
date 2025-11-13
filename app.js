// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.disableClosingConfirmation();

// ===== НАСТРОЙКА ДОСТУПА =====
const ALLOWED_USER_IDS = [
      186757704  // ЗАМЕНИТЕ НА ВАШ ID!
];

function checkAccess() {
    const user = tg.initDataUnsafe?.user;
    
    // Для тестирования в браузере/если user undefined (раскомментируйте для дебага)
    if (!user) {
        console.warn('User data not available yet. Skipping access check for testing.');
        return true;  // Временно разрешаем доступ
    }
    
    if (!ALLOWED_USER_IDS.includes(user.id)) {
        if (document.getElementById('access-denied')) {
            document.getElementById('access-denied').classList.remove('hidden');
        }
        if (document.getElementById('app')) {
            document.getElementById('app').classList.add('hidden');
        }
        console.error('Access denied: User ID not allowed');
        return false;
    }
    console.log('Access granted for user:', user.id);
    return true;
}

// ===== ЖДЁМ DOM + ИНИЦИАЛИЗАЦИЯ ЭЛЕМЕНТОВ =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    const elements = {
        mainScreen: document.getElementById('main-screen'),
        addScreen: document.getElementById('add-screen'),
        viewScreen: document.getElementById('view-screen'),
        confirmModal: document.getElementById('confirm-modal'),
        loadingOverlay: document.getElementById('loading-overlay'),
        addCardBtn: document.getElementById('add-card-btn'),
        exportBtn: document.getElementById('export-btn'),
        importBtn: document.getElementById('import-btn'),
        scanBtn: document.getElementById('scan-btn'),
        uploadBarcodeBtn: document.getElementById('upload-barcode-btn'),
        barcodeFileInput: document.getElementById('barcode-file-input'),
        saveCardBtn: document.getElementById('save-card-btn'),
        cancelAddBtn: document.getElementById('cancel-add-btn'),
        editCardBtn: document.getElementById('edit-card-btn'),
        deleteCardBtn: document.getElementById('delete-card-btn'),
        confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
        cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
        backBtn: document.getElementById('back-btn'),
        cardNameInput: document.getElementById('card-name'),
        barcodeInput: document.getElementById('barcode-input'),
        cardColorInput: document.getElementById('card-color'),
        colorPreview: document.getElementById('color-preview'),
        addScreenTitle: document.getElementById('add-screen-title'),
        cardsList: document.getElementById('cards-list'),
        viewCardName: document.getElementById('view-card-name'),
        barcodeDisplay: document.getElementById('barcode-display'),
        video: document.getElementById('video'),
        canvas: document.getElementById('canvas'),
        scannerContainer: document.getElementById('scanner-container')
    };

    // Проверяем критические элементы
    if (!elements.mainScreen) {
        console.error('Main screen not found!');
        return;
    }

    let cards = [];
    let currentCardId = null;
    let editingCardId = null;
    let scanning = false;
    let stream = null;
    let hasShownCameraHint = false;

    // Цвета по умолчанию
    const defaultColors = ['#3390ec', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

    // ===== ФУНКЦИИ =====
    function safeAlert(message) {
        try {
            tg.showAlert(message);
            console.log('Alert shown:', message);
        } catch (err) {
            console.error('Alert failed:', err, message);
            // Fallback для теста
            alert(message);
        }
    }

    function loadCards() {
        try {
            const stored = localStorage.getItem('loyaltyCards');
            if (stored) {
                cards = JSON.parse(stored);
                console.log('Loaded cards:', cards.length);
            } else {
                console.log('No stored cards');
                cards = [];
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
            console.log('Saved cards:', cards.length);
        } catch (err) {
            console.error('Save error:', err);
            safeAlert('Ошибка сохранения данных');
        }
    }

    function renderCards() {
        if (!elements.cardsList) {
            console.error('Cards list not found');
            return;
        }
        
        elements.cardsList.innerHTML = '';
        console.log('Rendering cards:', cards.length);
        
        if (cards.length === 0) {
            elements.cardsList.innerHTML = '<p>Пока нет сохранённых карт.<br>Добавьте первую!</p>';
            return;
        }
        
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card-item';
            cardElement.style.backgroundColor = card.color || '#3390ec';
            cardElement.innerHTML = `<h3>${escapeHtml(card.name)}</h3>`;
            cardElement.addEventListener('click', () => viewCard(card.id));
            elements.cardsList.appendChild(cardElement);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showScreen(screenToShow) {
        [elements.mainScreen, elements.addScreen, elements.viewScreen].forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        if (elements.confirmModal) elements.confirmModal.classList.add('hidden');
        if (screenToShow) screenToShow.classList.remove('hidden');
        console.log('Switched to screen:', screenToShow?.id);
    }

    function showLoading(show) {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.toggle('hidden', !show);
            console.log('Loading:', show);
        }
    }

    // ===== ОБРАБОТЧИКИ СО СТАРТОВЫМИ ЛОГАМИ =====
    if (elements.addCardBtn) {
        elements.addCardBtn.addEventListener('click', (e) => {
            console.log('Add card clicked');
            e.preventDefault();
            editingCardId = null;
            if (elements.addScreenTitle) elements.addScreenTitle.textContent = 'Добавить карту';
            showScreen(elements.addScreen);
            if (elements.cardNameInput) elements.cardNameInput.value = '';
            if (elements.barcodeInput) elements.barcodeInput.value = '';
            if (elements.cardColorInput && elements.colorPreview) {
                const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];
                elements.cardColorInput.value = randomColor;
                elements.colorPreview.style.backgroundColor = randomColor;
            }
            stopScanning();
        });
    }

    if (elements.saveCardBtn) {
        elements.saveCardBtn.addEventListener('click', (e) => {
            console.log('Save card clicked');
            e.preventDefault();
            
            const name = elements.cardNameInput ? elements.cardNameInput.value.trim() : '';
            const barcode = elements.barcodeInput ? elements.barcodeInput.value.trim() : '';
            const color = elements.cardColorInput ? elements.cardColorInput.value : '#3390ec';
            
            console.log('Save data:', { name, barcode, color });
            
            if (!name) {
                safeAlert('Введите название магазина');
                if (elements.cardNameInput) elements.cardNameInput.focus();
                return;
            }
            
            if (!barcode) {
                safeAlert('Введите или отсканируйте штрихкод');
                if (elements.barcodeInput) elements.barcodeInput.focus();
                return;
            }
            
            try {
                if (editingCardId) {
                    const cardIndex = cards.findIndex(c => c.id === editingCardId);
                    if (cardIndex !== -1) {
                        cards[cardIndex] = {
                            ...cards[cardIndex],
                            name: name,
                            barcode: barcode,
                            color: color,
                            updatedAt: new Date().toISOString()
                        };
                        safeAlert('Карта обновлена!');
                        console.log('Card updated:', cards[cardIndex]);
                    } else {
                        throw new Error('Card not found');
                    }
                } else {
                    const newCard = {
                        id: Date.now(),
                        name: name,
                        barcode: barcode,
                        color: color,
                        createdAt: new Date().toISOString()
                    };
                    cards.push(newCard);
                    safeAlert('Карта добавлена!');
                    console.log('New card added:', newCard);
                }
                
                saveCards();
                renderCards();
                showScreen(elements.mainScreen);
                editingCardId = null;
            } catch (err) {
                console.error('Save error:', err);
                safeAlert('Ошибка сохранения: ' + err.message);
            }
        });
    }

    if (elements.cancelAddBtn) {
        elements.cancelAddBtn.addEventListener('click', (e) => {
            console.log('Cancel add clicked');
            e.preventDefault();
            stopScanning();
            editingCardId = null;
            showScreen(elements.mainScreen);
        });
    }

    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', (e) => {
            console.log('Export clicked');
            e.preventDefault();
            if (cards.length === 0) {
                safeAlert('Нет карт для экспорта');
                return;
            }
            // ... (код экспорта без изменений, добавьте console.log('Export complete'))
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
            safeAlert(`Экспортировано ${cards.length} карт(ы)`);
        });
    }

    if (elements.importBtn) {
        elements.importBtn.addEventListener('click', (e) => {
            console.log('Import clicked');
            e.preventDefault();
            // ... (код импорта без изменений)
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
                            safeAlert('Неверный формат файла');
                            return;
                        }
                        const isValid = importedCards.every(card => card.id && card.name && card.barcode);
                        if (!isValid) {
                            safeAlert('Файл содержит некорректные данные');
                            return;
                        }
                        cards = importedCards;
                        saveCards();
                        renderCards();
                        safeAlert(`Импортировано ${importedCards.length} карт(ы)`);
                        console.log('Import complete');
                    } catch (err) {
                        safeAlert('Ошибка чтения файла');
                        console.error('Import error:', err);
                    }
                };
                reader.readAsText(file);
            };
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        });
    }

    // ===== СКАНИРОВАНИЕ (сокращено для примера, добавьте логи аналогично) =====
    function startScanning() {
        console.log('Start scanning clicked');
        // ... (полный код без изменений, но с console.log в try-catch)
    }

    function stopScanning() {
        console.log('Stop scanning');
        // ...
    }

    // Аналогично для других функций: upload, viewCard, delete — добавьте console.log('Function called')

    // ===== ИНИЦИАЛИЗАЦИЯ В TG.READY =====
    tg.ready(() => {
        console.log('Telegram ready, initializing app');
        
        if (checkAccess()) {
            loadCards();
            
            // BackButton
            tg.BackButton.onClick(() => {
                console.log('Back button clicked');
                if (!elements.mainScreen?.classList.contains('hidden')) {
                    tg.close();
                } else {
                    stopScanning();
                    editingCardId = null;
                    showScreen(elements.mainScreen);
                }
            });
            
            // Observer для BackButton visibility
            if (elements.mainScreen) {
                const observer = new MutationObserver(() => {
                    if (elements.mainScreen.classList.contains('hidden')) {
                        tg.BackButton.show();
                    } else {
                        tg.BackButton.hide();
                    }
                });
                observer.observe(elements.mainScreen, { attributes: true, attributeFilter: ['class'] });
            }
            
            // Проверки библиотек
            if (!window.jsQR) {
                console.error('jsQR not loaded!');
                safeAlert('Библиотека jsQR не загружена');
            } else {
                console.log('jsQR ready');
            }
            
            // Показываем app
            if (document.getElementById('access-denied')) {
                document.getElementById('access-denied').classList.add('hidden');
            }
            if (elements.mainScreen) {
                elements.mainScreen.classList.remove('hidden');
            }
            console.log('App initialized');
        }
    });
});