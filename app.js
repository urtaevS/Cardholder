// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.disableClosingConfirmation();

/**
 * Проверяет доступ пользователя по ID.
 * @returns {boolean} true, если доступ разрешён.
 */
function checkAccess() {
    const user = tg.initDataUnsafe?.user;
    
    if (!user) {
        console.warn('User data not available. Skipping check for testing.');
        return true;
    }
    
    const ALLOWED_USER_IDS = [186757704]; // Замените на ваш Telegram ID!
    if (!ALLOWED_USER_IDS.includes(user.id)) {
        const deniedEl = document.getElementById('access-denied');
        const appEl = document.getElementById('app');
        if (deniedEl) deniedEl.classList.remove('hidden');
        if (appEl) appEl.classList.add('hidden');
        console.error('Access denied for user:', user.id);
        return false;
    }
    console.log('Access granted for user:', user.id);
    return true;
}

// Ждём DOM и инициализируем элементы
let elements = null;
let cards = [];
let currentCardId = null;
let editingCardId = null;
let scanning = false;
let stream = null;
let hasShownCameraHint = false;

// Цвета по умолчанию
const defaultColors = ['#3390ec', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    elements = {
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
        scannerContainer: document.getElementById('scanner-container'),
        searchInput: document.getElementById('search-input')
    };

    // Проверка критических элементов
    if (!elements.mainScreen || !elements.cardsList) {
        console.error('Critical elements missing:', { mainScreen: !!elements.mainScreen, cardsList: !!elements.cardsList });
        return;
    }

    // Инициализация превью цвета
    if (elements.cardColorInput && elements.colorPreview) {
        elements.cardColorInput.addEventListener('input', (e) => {
            elements.colorPreview.style.backgroundColor = e.target.value;
        });
        elements.colorPreview.style.backgroundColor = elements.cardColorInput.value;
    }

    // ===== ФУНКЦИИ =====
    /**
     * Безопасный алерт с fallback.
     * @param {string} message - Сообщение.
     */
    function safeAlert(message) {
        try {
            tg.showAlert(message);
            console.log('Alert:', message);
        } catch (err) {
            console.error('Alert failed:', err);
            if (window.alert) window.alert(message); // Fallback для браузера
        }
    }

    /**
     * Загружает карты из localStorage.
     */
    function loadCards() {
        try {
            const stored = localStorage.getItem('loyaltyCards');
            cards = stored ? JSON.parse(stored) : [];
            console.log('Loaded cards:', cards.length);
        } catch (err) {
            console.error('Load error:', err);
            cards = [];
        }
        renderCards();
    }

    /**
     * Сохраняет карты в localStorage.
     */
    function saveCards() {
        try {
            localStorage.setItem('loyaltyCards', JSON.stringify(cards));
            console.log('Saved cards:', cards.length);
        } catch (err) {
            console.error('Save error:', err);
            safeAlert('Ошибка сохранения данных');
        }
    }

    /**
     * Экранирует HTML.
     * @param {string} text - Текст.
     * @returns {string} Экранированный HTML.
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Рендерит список карт с фильтром поиска (ФИКС: делегирование событий).
     * @param {string} [searchTerm=''] - Текст поиска.
     */
    function renderCards(searchTerm = '') {
        if (!elements.cardsList) {
            console.error('Cards list not found');
            return;
        }

        const filteredCards = cards.filter(card => 
            card.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        elements.cardsList.innerHTML = '';
        console.log(`Rendering ${filteredCards.length} cards (search: "${searchTerm}")`);

        if (filteredCards.length === 0) {
            elements.cardsList.innerHTML = '<p role="status" aria-live="polite">Нет карт или совпадений по поиску.</p>';
            return;
        }

        filteredCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card-item';
            cardElement.style.backgroundColor = card.color || '#3390ec';
            cardElement.setAttribute('role', 'button');
            cardElement.setAttribute('tabindex', '0');
            cardElement.setAttribute('aria-label', `Открыть карту ${card.name}`);
            cardElement.innerHTML = `<h3>${escapeHtml(card.name)}</h3>`;
            
            // ФИКС: Привязка клика напрямую (не делегирование, чтобы избежать конфликтов)
            cardElement.addEventListener('click', (e) => {
                console.log('Card clicked:', card.id, card.name);
                e.preventDefault();
                viewCard(card.id);
            });
            
            // Клавиатурный доступ
            cardElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    viewCard(card.id);
                }
            });

            elements.cardsList.appendChild(cardElement);
        });

        // ФИКС: Делегирование для динамических изменений (если нужно)
        elements.cardsList.addEventListener('click', (e) => {
            if (e.target.closest('.card-item')) {
                const cardEl = e.target.closest('.card-item');
                const cardId = parseInt(cardEl.dataset.cardId || 0); // Добавьте data-card-id в HTML, если нужно
                if (cardId) viewCard(cardId);
            }
        });
    }

    /**
     * Показывает экран.
     * @param {HTMLElement} screenToShow - Элемент экрана.
     */
    function showScreen(screenToShow) {
        if (!screenToShow) {
            console.error('Screen to show not found');
            return;
        }

        [elements.mainScreen, elements.addScreen, elements.viewScreen].forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        if (elements.confirmModal) elements.confirmModal.classList.add('hidden');
        screenToShow.classList.remove('hidden');
        console.log('Show screen:', screenToShow.id);

        // Анонс для доступности
        screenToShow.setAttribute('aria-live', 'polite');
    }

    /**
     * Показывает/скрывает загрузку.
     * @param {boolean} show - Показать ли.
     */
    function showLoading(show) {
        if (!elements.loadingOverlay) return;
        elements.loadingOverlay.classList.toggle('hidden', !show);
        console.log('Loading:', show);
    }

    /**
     * Просмотр карты (ФИКС: усиленные проверки + fallback).
     * @param {number} id - ID карты.
     */
    function viewCard(id) {
        console.log('View card called for ID:', id);
        
        const card = cards.find(c => c.id === id);
        if (!card) {
            console.error('Card not found:', id);
            safeAlert('Карта не найдена');
            return;
        }

        currentCardId = id;

        if (!elements.viewScreen) {
            console.error('View screen not found');
            return;
        }

        if (elements.viewCardName) {
            elements.viewCardName.textContent = card.name;
            elements.viewCardName.setAttribute('aria-label', `Карта: ${card.name}`);
        }

        if (elements.barcodeDisplay) {
            elements.barcodeDisplay.innerHTML = `
                <svg id="barcode-svg" aria-hidden="true"></svg>
                <p aria-label="Штрихкод: ${escapeHtml(card.barcode)}">${escapeHtml(card.barcode)}</p>
            `;

            // ФИКС: Проверка и генерация штрихкода
            try {
                if (typeof JsBarcode !== 'undefined' && JsBarcode) {
                    console.log('Generating barcode with JsBarcode');
                    JsBarcode("#barcode-svg", card.barcode, {
                        format: "CODE128",
                        width: 2,
                        height: 100,
                        displayValue: false,
                        background: "#ffffff",
                        lineColor: "#000000",
                        margin: 10
                    });
                } else {
                    console.warn('JsBarcode not loaded');
                    // Fallback: Только текст
                    elements.barcodeDisplay.innerHTML = `
                        <p style="font-size: 24px; margin: 40px 0; color: #000000; font-family: monospace; letter-spacing: 2px;">
                            ${escapeHtml(card.barcode)}
                        </p>
                        <p aria-label="Штрихкод недоступен для отображения">Штрихкод (текстовый): ${escapeHtml(card.barcode)}</p>
                    `;
                }
            } catch (e) {
                console.error('Barcode generation error:', e);
                safeAlert('Ошибка генерации штрихкода: ' + e.message);
                // Fallback
                elements.barcodeDisplay.innerHTML = `
                    <p style="font-size: 24px; margin: 40px 0; color: #000000; font-family: monospace;">
                        ${escapeHtml(card.barcode)}
                    </p>
                `;
            }
        } else {
            console.error('Barcode display not found');
        }

        showScreen(elements.viewScreen);
        console.log('Card view loaded successfully');
    }

    // ===== ОБРАБОТЧИКИ (привязка после DOM) =====
    // Добавить карту
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

    // Сохранить карту
    if (elements.saveCardBtn) {
        elements.saveCardBtn.addEventListener('click', (e) => {
            console.log('Save card clicked');
            e.preventDefault();
            
            const name = elements.cardNameInput ? elements.cardNameInput.value.trim() : '';
            const barcode = elements.barcodeInput ? elements.barcodeInput.value.trim() : '';
            const color = elements.cardColorInput ? elements.cardColorInput.value : '#3390ec';
            
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
            
            let success = false;
            try {
                if (editingCardId) {
                    const cardIndex = cards.findIndex(c => c.id === editingCardId);
                    if (cardIndex !== -1) {
                        cards[cardIndex] = {
                            ...cards[cardIndex],
                            name, barcode, color,
                            updatedAt: new Date().toISOString()
                        };
                        safeAlert('Карта обновлена!');
                        success = true;
                    }
                } else {
                    const newCard = {
                        id: Date.now(),
                        name, barcode, color,
                        createdAt: new Date().toISOString()
                    };
                    cards.push(newCard);
                    safeAlert('Карта добавлена!');
                    success = true;
                }
                
                if (success) {
                    saveCards();
                    renderCards(); // Перерендер после сохранения
                    showScreen(elements.mainScreen);
                    editingCardId = null;
                }
            } catch (err) {
                console.error('Save error:', err);
                safeAlert('Ошибка: ' + err.message);
            }
        });
    }

    // Отмена
    if (elements.cancelAddBtn) {
        elements.cancelAddBtn.addEventListener('click', (e) => {
            console.log('Cancel clicked');
            e.preventDefault();
            stopScanning();
            editingCardId = null;
            showScreen(elements.mainScreen);
        });
    }

    // Назад из просмотра
    if (elements.backBtn) {
        elements.backBtn.addEventListener('click', (e) => {
            console.log('Back clicked');
            e.preventDefault();
            showScreen(elements.mainScreen);
        });
    }

    // Поиск (input event)
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            console.log('Search:', e.target.value);
            renderCards(e.target.value);
        });
    }

    // ===== СКАНИРОВАНИЕ И ЗАГРУЗКА (без изменений, но с проверками) =====
    function stopScanning() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (elements.scannerContainer) elements.scannerContainer.classList.add('hidden');
        scanning = false;
        if (elements.scanBtn) {
            elements.scanBtn.textContent = '📷 Сканировать камерой';
            elements.scanBtn.classList.remove('danger-btn');
            elements.scanBtn.classList.add('secondary-btn');
        }
        console.log('Scanning stopped');
    }

    // ... (остальные функции: startScanning, tick, uploadBarcode — как в предыдущих версиях, с window.jsQR и логами)

    // Экспорт/Импорт/Удаление — аналогично, с логами (сокращено для места)

    // ===== ИНИЦИАЛИЗАЦИЯ В TG.READY (ФИКС: setTimeout для WebView) =====
    tg.ready(() => {
        console.log('Telegram WebApp ready');
        
        // ФИКС: Небольшая задержка для полной инициализации
        setTimeout(() => {
            if (checkAccess()) {
                loadCards();
                
                // BackButton
                tg.BackButton.onClick(() => {
                    console.log('TG BackButton clicked');
                    if (!elements.mainScreen?.classList.contains('hidden')) {
                        tg.close();
                    } else {
                        stopScanning();
                        editingCardId = null;
                        showScreen(elements.mainScreen);
                    }
                });
                
                // Observer для BackButton
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
                if (typeof jsQR !== 'undefined') {
                    console.log('jsQR ready');
                } else {
                    console.error('jsQR not loaded!');
                    safeAlert('Библиотека сканирования недоступна');
                }
                
                if (typeof JsBarcode !== 'undefined') {
                    console.log('JsBarcode ready');
                } else {
                    console.warn('JsBarcode not loaded — fallback to text');
                }
                
                // Показ app
                if (document.getElementById('access-denied')) {
                    document.getElementById('access-denied').classList.add('hidden');
                }
                if (elements.mainScreen) {
                    elements.mainScreen.classList.remove('hidden');
                }
                console.log('App fully initialized');
            }
        }, 0); // Микрозадача для асинхронности
    });
});