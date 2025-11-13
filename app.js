// Ждём загрузки DOM и Telegram SDK
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Init] DOM загружен');
    
    // Инициализация Telegram WebApp
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.disableClosingConfirmation();

    // Глобальные переменные
    let cards = [];
    let currentCardId = null;
    let editingId = null;
    let scanning = false;
    let stream = null;

    // Вспомогательная функция для получения элементов
    function $(id) {
        return document.getElementById(id);
    }

    // Функция логирования
    function log(msg) {
        console.log('[App]', msg);
    }

    // Экранирование HTML
    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // Переключение экранов
    function showScreen(screen) {
        if (!screen) {
            log('ОШИБКА: screen не найден');
            return;
        }
        const screens = [$('main-screen'), $('add-screen'), $('view-screen')];
        screens.forEach(s => {
            if (s) s.classList.add('hidden');
        });
        screen.classList.remove('hidden');
        log('Показан экран: ' + screen.id);
    }

    // Загрузка карт из localStorage
    function loadCards() {
        try {
            const stored = localStorage.getItem('loyaltyCards');
            cards = stored ? JSON.parse(stored) : [];
            log('Загружено карт: ' + cards.length);
            renderCards();
        } catch (e) {
            log('Ошибка загрузки: ' + e.message);
            cards = [];
            renderCards();
        }
    }

    // Сохранение карт в localStorage
    function saveCards() {
        try {
            localStorage.setItem('loyaltyCards', JSON.stringify(cards));
            log('Сохранено карт: ' + cards.length);
        } catch (e) {
            log('Ошибка сохранения: ' + e.message);
            if (tg.showAlert) tg.showAlert('Ошибка сохранения!');
        }
    }

    // Рендер списка карт
    function renderCards() {
        const cardsList = $('cards-list');
        if (!cardsList) {
            log('ОШИБКА: cards-list не найден');
            return;
        }

        cardsList.innerHTML = '';
        
        if (cards.length === 0) {
            cardsList.innerHTML = '<p style="text-align: center; color: var(--tg-hint-color, #999); padding: 40px;">Нет карт. Добавьте первую! 🎟️</p>';
            return;
        }

        cards.forEach(card => {
            const item = document.createElement('div');
            item.className = 'card-item';
            item.style.backgroundColor = card.color || '#3390ec';
            item.textContent = card.name || 'Без названия';
            item.onclick = () => {
                log('Клик на карту: ' + card.id);
                viewCard(card.id);
            };
            cardsList.appendChild(item);
        });
        
        log('Отрисовано карт: ' + cards.length);
    }

    // Просмотр карты
    function viewCard(id) {
        log('Открытие карты: ' + id);
        const card = cards.find(c => c.id === id);
        if (!card) {
            log('Карта не найдена: ' + id);
            return;
        }

        currentCardId = id;
        const viewName = $('view-name');
        const barcodeDisplay = $('barcode-display');

        if (viewName) viewName.textContent = card.name;
        
        if (barcodeDisplay) {
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
                    log('Штрихкод сгенерирован');
                } else {
                    log('JsBarcode не загружен');
                    barcodeDisplay.innerHTML = `<p style="font-size: 24px; color: #000; font-family: monospace;">${escapeHtml(card.barcode)}</p>`;
                }
            } catch (e) {
                log('Ошибка генерации штрихкода: ' + e.message);
                barcodeDisplay.innerHTML = `<p style="font-size: 24px; color: #000;">${escapeHtml(card.barcode)}</p>`;
            }
        }

        showScreen($('view-screen'));
    }

    // Сканирование камерой
    async function startScanning() {
        if (scanning) return;

        const scanBtn = $('scan-btn');
        const scannerContainer = $('scanner-container');
        const video = $('video');

        scanning = true;
        log('Запуск сканирования');

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', 
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 } 
                }
            });
            
            if (video) {
                video.srcObject = stream;
                await video.play();
            }
            
            if (scannerContainer) scannerContainer.classList.remove('hidden');
            
            if (scanBtn) {
                scanBtn.textContent = '⏹ Остановить';
                scanBtn.classList.add('danger-btn');
                scanBtn.classList.remove('secondary-btn');
            }
            
            tick();
        } catch (e) {
            log('Ошибка камеры: ' + e.message);
            if (tg.showAlert) tg.showAlert('Ошибка доступа к камере: ' + e.message);
            stopScanning();
        }
    }

    function stopScanning() {
        scanning = false;
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        const scannerContainer = $('scanner-container');
        const scanBtn = $('scan-btn');
        
        if (scannerContainer) scannerContainer.classList.add('hidden');
        
        if (scanBtn) {
            scanBtn.textContent = '📷 Сканировать камерой';
            scanBtn.classList.remove('danger-btn');
            scanBtn.classList.add('secondary-btn');
        }
        
        log('Сканирование остановлено');
    }

    function tick() {
        if (!scanning) return;

        const video = $('video');
        const canvas = $('canvas');
        const barcodeInput = $('barcode-input');

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (typeof jsQR !== 'undefined') {
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    if (barcodeInput) barcodeInput.value = code.data;
                    if (tg.showAlert) tg.showAlert('Отсканировано: ' + code.data);
                    log('Отсканирован код: ' + code.data);
                    stopScanning();
                    return;
                }
            }
        }
        
        requestAnimationFrame(tick);
    }

    // Загрузка фото
    function handleFileUpload(file) {
        if (!file) return;
        
        log('Загрузка фото');
        const img = new Image();
        const canvas = $('canvas');
        const barcodeInput = $('barcode-input');
        
        img.onload = () => {
            if (canvas) {
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code) {
                        if (barcodeInput) barcodeInput.value = code.data;
                        if (tg.showAlert) tg.showAlert('Распознано: ' + code.data);
                        log('Распознан код из фото: ' + code.data);
                    } else {
                        if (tg.showAlert) tg.showAlert('Штрихкод не найден');
                        log('Код не найден на фото');
                    }
                }
            }
            URL.revokeObjectURL(img.src);
        };
        
        img.src = URL.createObjectURL(file);
    }

    // Экспорт карт
    function exportCards() {
        if (cards.length === 0) {
            if (tg.showAlert) tg.showAlert('Нет карт для экспорта');
            return;
        }
        
        const dataStr = JSON.stringify(cards, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cards-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (tg.showAlert) tg.showAlert('Экспортировано ' + cards.length + ' карт');
        log('Экспорт выполнен');
    }

    // Импорт карт
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
                        cards = imported.map(c => ({
                            ...c,
                            id: c.id || Date.now() + Math.random()
                        }));
                        saveCards();
                        renderCards();
                        if (tg.showAlert) tg.showAlert('Импортировано ' + imported.length + ' карт');
                        log('Импорт выполнен');
                    } else {
                        if (tg.showAlert) tg.showAlert('Неверный формат файла');
                    }
                } catch (e) {
                    if (tg.showAlert) tg.showAlert('Ошибка чтения файла');
                    log('Ошибка импорта: ' + e.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ===== ИНИЦИАЛИЗАЦИЯ И ПРИВЯЗКА СОБЫТИЙ =====
    tg.ready(() => {
        log('Telegram WebApp готов');
        
        // Загрузка карт
        loadCards();
        
        // Получение всех элементов с проверкой
        const elements = {
            addBtn: $('add-btn'),
            saveBtn: $('save-btn'),
            cancelBtn: $('cancel-btn'),
            scanBtn: $('scan-btn'),
            uploadBtn: $('upload-btn'),
            fileInput: $('file-input'),
            exportBtn: $('export-btn'),
            importBtn: $('import-btn'),
            backBtn: $('back-btn'),
            editBtn: $('edit-btn'),
            deleteBtn: $('delete-btn')
        };
        
        // Проверка критических элементов
        const missing = Object.keys(elements).filter(key => !elements[key]);
        if (missing.length > 0) {
            log('КРИТИЧЕСКАЯ ОШИБКА: Не найдены элементы: ' + missing.join(', '));
            log('Проверьте ID в index.html!');
            return;
        }
        
        log('Все элементы найдены, привязка событий...');
        
        // Добавить карту
        elements.addBtn.onclick = () => {
            log('Клик: Добавить карту');
            editingId = null;
            const addTitle = $('add-title');
            const nameInput = $('name-input');
            const barcodeInput = $('barcode-input');
            const colorInput = $('color-input');
            
            if (addTitle) addTitle.textContent = 'Добавить карту';
            if (nameInput) nameInput.value = '';
            if (barcodeInput) barcodeInput.value = '';
            if (colorInput) colorInput.value = '#3390ec';
            
            stopScanning();
            showScreen($('add-screen'));
        };
        
        // Сохранить карту
        elements.saveBtn.onclick = () => {
            log('Клик: Сохранить');
            const nameInput = $('name-input');
            const barcodeInput = $('barcode-input');
            const colorInput = $('color-input');
            
            const name = nameInput ? nameInput.value.trim() : '';
            const barcode = barcodeInput ? barcodeInput.value.trim() : '';
            const color = colorInput ? colorInput.value : '#3390ec';
            
            if (!name || !barcode) {
                if (tg.showAlert) tg.showAlert('Заполните название и штрихкод');
                return;
            }
            
            if (editingId) {
                const index = cards.findIndex(c => c.id === editingId);
                if (index > -1) {
                    cards[index] = { ...cards[index], name, barcode, color };
                    if (tg.showAlert) tg.showAlert('Карта обновлена');
                }
            } else {
                cards.push({ id: Date.now(), name, barcode, color });
                if (tg.showAlert) tg.showAlert('Карта добавлена');
            }
            
            saveCards();
            renderCards();
            editingId = null;
            stopScanning();
            showScreen($('main-screen'));
        };
        
        // Остальные обработчики
        elements.cancelBtn.onclick = () => {
            log('Клик: Отмена');
            stopScanning();
            editingId = null;
            showScreen($('main-screen'));
        };
        
        elements.scanBtn.onclick = () => {
            log('Клик: Сканирование');
            scanning ? stopScanning() : startScanning();
        };
        
        elements.uploadBtn.onclick = () => {
            log('Клик: Загрузить фото');
            elements.fileInput.click();
        };
        
        elements.fileInput.onchange = e => {
            if (e.target.files[0]) handleFileUpload(e.target.files[0]);
        };
        
        elements.exportBtn.onclick = () => {
            log('Клик: Экспорт');
            exportCards();
        };
        
        elements.importBtn.onclick = () => {
            log('Клик: Импорт');
            importCards();
        };
        
        elements.backBtn.onclick = () => {
            log('Клик: Назад');
            showScreen($('main-screen'));
        };
        
        elements.editBtn.onclick = () => {
            log('Клик: Редактировать');
            const card = cards.find(c => c.id === currentCardId);
            if (card) {
                editingId = card.id;
                const addTitle = $('add-title');
                const nameInput = $('name-input');
                const colorInput = $('color-input');
                const barcodeInput = $('barcode-input');
                
                if (addTitle) addTitle.textContent = 'Редактировать карту';
                if (nameInput) nameInput.value = card.name;
                if (colorInput) colorInput.value = card.color;
                if (barcodeInput) barcodeInput.value = card.barcode;
                
                showScreen($('add-screen'));
            }
        };
        
        elements.deleteBtn.onclick = () => {
            log('Клик: Удалить');
            if (confirm('Удалить эту карту?')) {
                cards = cards.filter(c => c.id !== currentCardId);
                saveCards();
                renderCards();
                showScreen($('main-screen'));
                if (tg.showAlert) tg.showAlert('Карта удалена');
            }
        };
        
        // BackButton Telegram
        tg.BackButton.onClick(() => {
            const viewScreen = $('view-screen');
            const addScreen = $('add-screen');
            
            if (viewScreen && !viewScreen.classList.contains('hidden')) {
                showScreen($('main-screen'));
            } else if (addScreen && !addScreen.classList.contains('hidden')) {
                stopScanning();
                showScreen($('main-screen'));
            } else {
                tg.close();
            }
        });
        
        // Observer для BackButton
        const mainScreen = $('main-screen');
        if (mainScreen) {
            const observer = new MutationObserver(() => {
                if (mainScreen.classList.contains('hidden')) {
                    tg.BackButton.show();
                } else {
                    tg.BackButton.hide();
                }
            });
            observer.observe(mainScreen, { attributes: true, attributeFilter: ['class'] });
        }
        
        log('Инициализация завершена успешно');
    });
});
