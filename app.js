// ===== БАЗОВАЯ ИНИЦИАЛИЗАЦИЯ =====
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

document.body.style.backgroundColor = tg.backgroundColor || '#ffffff';

// ===== СОСТОЯНИЕ =====
const STORAGE_KEY = 'loyaltyCards';

let cards = [];
let selectedColor = '#FF6B6B';
let currentCardId = null;
let editingCardId = null;

// ===== DOM ЭЛЕМЕНТЫ =====
const addCardBtn = document.getElementById('addCardBtn');
const addModal = document.getElementById('addModal');
const viewModal = document.getElementById('viewModal');
const editModal = document.getElementById('editModal');
const exportModal = document.getElementById('exportModal');

const cardsGrid = document.getElementById('cardsGrid');
const saveCardBtn = document.getElementById('saveCardBtn');
const cameraBtn = document.getElementById('cameraBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');

const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

const copyExportBtn = document.getElementById('copyExportBtn');

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ХРАНИЛИЩА =====
function loadCards() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            cards = [];
            return;
        }
        const parsed = JSON.parse(raw);
        cards = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Ошибка чтения localStorage:', e);
        cards = [];
    }
}

function saveCards() {
    try {
        const str = JSON.stringify(cards);
        localStorage.setItem(STORAGE_KEY, str);
    } catch (e) {
        console.error('Ошибка записи localStorage:', e);
    }
}

// ===== UI: ОТРИСОВКА =====
function renderCards() {
    cardsGrid.innerHTML = '';
    cards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'card';
        el.style.background = card.color;
        el.innerHTML = `<h3>${card.name}</h3>`;
        el.addEventListener('click', () => viewCard(card.id));
        cardsGrid.appendChild(el);
    });
}

// ===== МОДАЛЫ =====
function openModal(modal) {
    if (modal) modal.style.display = 'flex';
}

function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        if (targetId) {
            closeModal(document.getElementById(targetId));
        }
    });
});

window.addEventListener('click', (e) => {
    if (e.target === addModal) closeModal(addModal);
    if (e.target === viewModal) closeModal(viewModal);
    if (e.target === editModal) closeModal(editModal);
    if (e.target === exportModal) closeModal(exportModal);
});

// ===== ВЫБОР ЦВЕТА =====
function setupColorPicker(containerId) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            selectedColor = option.dataset.color;
            container.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
}

function setSelectedColor(containerId, color) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.color-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.color === color);
    });
}

// ===== ДОБАВЛЕНИЕ КАРТЫ =====
addCardBtn.addEventListener('click', () => {
    document.getElementById('cardName').value = '';
    document.getElementById('barcodeNumber').value = '';
    selectedColor = '#FF6B6B';
    setSelectedColor('addColors', selectedColor);
    openModal(addModal);
});

// Камера (демо: просто выбираем файл)
cameraBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
        if (e.target.files[0]) processBarcodeImage(e.target.files[0]);
    };
    input.click();
});

// Выбор файла с фото штрихкода
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processBarcodeImage(e.target.files[0]);
});

// Заглушка распознавания штрихкода
function processBarcodeImage(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const randomBarcode = String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
        document.getElementById('barcodeNumber').value = randomBarcode;
        if (tg.showAlert) tg.showAlert('Штрихкод распознан (демо)');
    };
    reader.readAsDataURL(file);
}

saveCardBtn.addEventListener('click', () => {
    const name = document.getElementById('cardName').value.trim();
    const barcode = document.getElementById('barcodeNumber').value.trim();

    if (!name || !barcode) {
        if (tg.showAlert) tg.showAlert('Заполните все поля');
        return;
    }

    const card = {
        id: Date.now(),
        name,
        barcode,
        color: selectedColor
    };

    cards.push(card);
    saveCards();
    renderCards();
    closeModal(addModal);
    if (tg.showAlert) tg.showAlert('Карта добавлена');
});

// ===== ПРОСМОТР КАРТЫ =====
function viewCard(id) {
    currentCardId = id;
    const card = cards.find(c => c.id === id);
    if (!card) return;

    document.getElementById('viewCardName').textContent = card.name;
    document.getElementById('cardFront').style.background = card.color;
    document.getElementById('barcodeText').textContent = card.barcode;

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

    openModal(viewModal);
}

// ===== РЕДАКТИРОВАНИЕ КАРТЫ =====
document.getElementById('editBtn').addEventListener('click', () => {
    if (!currentCardId) return;
    editingCardId = currentCardId;
    const card = cards.find(c => c.id === editingCardId);
    if (!card) return;

    document.getElementById('editCardName').value = card.name;
    document.getElementById('editBarcodeNumber').value = card.barcode;
    selectedColor = card.color;
    setSelectedColor('editColors', selectedColor);

    closeModal(viewModal);
    openModal(editModal);
});

document.getElementById('saveEditBtn').addEventListener('click', () => {
    if (!editingCardId) return;

    const name = document.getElementById('editCardName').value.trim();
    const barcode = document.getElementById('editBarcodeNumber').value.trim();

    if (!name || !barcode) {
        if (tg.showAlert) tg.showAlert('Заполните все поля');
        return;
    }

    const idx = cards.findIndex(c => c.id === editingCardId);
    if (idx === -1) return;

    cards[idx] = {
        ...cards[idx],
        name,
        barcode,
        color: selectedColor
    };

    saveCards();
    renderCards();
    closeModal(editModal);
    if (tg.showAlert) tg.showAlert('Изменения сохранены');
});

// ===== УДАЛЕНИЕ КАРТЫ =====
document.getElementById('deleteBtn').addEventListener('click', () => {
    if (!currentCardId) return;

    const confirmDelete = (confirmed) => {
        if (!confirmed) return;
        cards = cards.filter(c => c.id !== currentCardId);
        saveCards();
        renderCards();
        closeModal(viewModal);
        if (tg.showAlert) tg.showAlert('Карта удалена');
    };

    if (tg.showConfirm) {
        tg.showConfirm('Удалить эту карту?', confirmDelete);
    } else {
        const res = window.confirm('Удалить эту карту?');
        confirmDelete(res);
    }
});

// ===== ЭКСПОРТ =====
function exportCardsToFile() {
    if (!cards.length) {
        if (tg.showAlert) tg.showAlert('Нет карт для экспорта');
        return;
    }

    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = `loyalty-cards-${new Date().toISOString().split('T')[0]}.json`;

    // В браузере — обычная загрузка файла
    if (!tg.initData || tg.platform === 'unknown') {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        if (tg.showAlert) tg.showAlert('Файл экспортирован');
        return;
    }

    // В Telegram: пытаемся через downloadFile (если реализован) или fallback
    if (typeof tg.downloadFile === 'function') {
        tg.downloadFile({ url, file_name: fileName }, (result) => {
            URL.revokeObjectURL(url);
            if (result && tg.showAlert) tg.showAlert('Файл загружен');
        });
    } else {
        URL.revokeObjectURL(url);
        // Fallback: показываем JSON пользователю
        document.getElementById('exportData').value = dataStr;
        openModal(exportModal);
    }
}

exportBtn.addEventListener('click', exportCardsToFile);

// Копирование JSON в Telegram
copyExportBtn.addEventListener('click', () => {
    const ta = document.getElementById('exportData');
    ta.select();
    ta.setSelectionRange(0, 999999);

    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch (e) {
        copied = false;
    }

    if (!copied && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(ta.value)
            .then(() => { copied = true; })
            .catch(() => { copied = false; });
    }

    if (tg.showAlert) {
        if (copied) {
            tg.showAlert('Данные скопированы. Вставьте в «Избранное» и сохраните как .json');
        } else {
            tg.showAlert('Выделите текст и скопируйте вручную (долгое нажатие → Копировать)');
        }
    }
    closeModal(exportModal);
});

// ===== ИМПОРТ =====
importBtn.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) {
                if (tg.showAlert) tg.showAlert('Неверный формат файла');
                return;
            }
            // Объединяем без потери существующих
            const existingIds = new Set(cards.map(c => c.id));
            imported.forEach(card => {
                if (card && typeof card === 'object' && !existingIds.has(card.id)) {
                    cards.push({
                        id: card.id || Date.now() + Math.random(),
                        name: card.name || 'Без названия',
                        barcode: card.barcode || '',
                        color: card.color || '#FF6B6B'
                    });
                }
            });
            saveCards();
            renderCards();
            if (tg.showAlert) tg.showAlert(`Импортировано карт: ${imported.length}`);
        } catch (err) {
            console.error('Ошибка парсинга JSON:', err);
            if (tg.showAlert) tg.showAlert('Ошибка чтения файла. Проверьте JSON');
        }
    };
    reader.readAsText(file);
    importInput.value = '';
});

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАПУСКЕ =====
setupColorPicker('addColors');
setupColorPicker('editColors');
loadCards();
renderCards();
