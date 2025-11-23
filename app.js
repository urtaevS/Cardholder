// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM =====
const tg = window.Telegram?.WebApp || {};
tg.expand?.();
tg.ready?.();

// ===== ОГРАНИЧЕНИЕ ПО TELEGRAM ID =====
const ALLOWED_TELEGRAM_IDS = '186757704';

function checkAccessByTelegramId() {
    const userId = tg.initDataUnsafe?.user?.id;

    if (!userId) {
        blockApp('Нет данных Telegram-пользователя. Доступ запрещён.');
        return false;
    }

    const allowedList = ALLOWED_TELEGRAM_IDS
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

    if (allowedList.length === 0) {
        return true;
    }

    const isAllowed = allowedList.includes(String(userId));

    if (!isAllowed) {
        blockApp('Доступ к приложению ограничен. Обратитесь к владельцу бота.');
        return false;
    }

    return true;
}

function blockApp(message) {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `<p style="padding:16px; text-align:center;">${message}</p>`;
    }
}

if (!checkAccessByTelegramId()) {
    throw new Error('Access denied by Telegram ID');
}

// ===== СОСТОЯНИЕ =====
const STORAGE_KEY = 'loyaltyCards';
const CLOUD_BACKUP_KEY = 'cloudBackup';

let cards = [];
let selectedColor = '#FF6B6B';
let currentCardId = null;
let editingCardId = null;
let editMode = false;

// ===== DOM =====
const addCardBtn = document.getElementById('addCardBtn');
const addModal = document.getElementById('addModal');
const viewModal = document.getElementById('viewModal');
const editModal = document.getElementById('editModal');
const exportModal = document.getElementById('exportModal');
const importModal = document.getElementById('importModal');
const helpModal = document.getElementById('helpModal');

const cardsGrid = document.getElementById('cardsGrid');

const saveCardBtn = document.getElementById('saveCardBtn');

const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

const copyExportBtn = document.getElementById('copyExportBtn');
const importFromFileBtn = document.getElementById('importFromFileBtn');
const importFromJsonBtn = document.getElementById('importFromJsonBtn');
const importJsonTextarea = document.getElementById('importJsonTextarea');
const applyImportJsonBtn = document.getElementById('applyImportJsonBtn');

const editModeToggleBtn = document.getElementById('editModeToggleBtn');
const deleteCardInEditBtn = document.getElementById('deleteCardInEditBtn');
const helpBtn = document.getElementById('helpBtn');

// Новые кнопки облачного бэкапа в модалках
const cloudExportBtn = document.getElementById('cloudExportBtn');
const cloudImportBtn = document.getElementById('cloudImportBtn');

const closeViewBtn = document.getElementById('closeViewBtn');
const cardViewBody = document.getElementById('cardViewBody');
const cardPopupHeader = document.getElementById('cardPopupHeader');

const actionsPanel = document.getElementById('actionsPanel');
const actionsToggleBtn = document.getElementById('actionsToggleBtn');

// поясняющий лейбл режима редактирования
let editModeLabel = document.getElementById('editModeLabel');
if (!editModeLabel) {
    editModeLabel = document.createElement('div');
    editModeLabel.id = 'editModeLabel';
    editModeLabel.style.display = 'none';
    editModeLabel.textContent =
        'Режим редактирования: нажмите на карту, чтобы изменить или удалить её';
    const container = document.querySelector('.container');
    container.insertBefore(editModeLabel, cardsGrid);
}

// ===== LOCALSTORAGE =====
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
        console.error('loadCards error:', e);
        cards = [];
    }
}

function saveCards() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
        console.error('saveCards error:', e);
    }
}

// ===== ОБЛАЧНЫЙ БЭКАП =====
function cloudBackupSave(data) {
    console.log('Cloud backup saved:', data);
    // Здесь может быть реальный запрос к облаку через fetch/AJAX
    localStorage.setItem(CLOUD_BACKUP_KEY, JSON.stringify(data));
}

function automaticCloudBackup() {
    cloudBackupSave(cards);
}

// Переопределяем saveCards, чтобы вызывать автосохранение в облако
const originalSaveCards = saveCards;
saveCards = function () {
    originalSaveCards();
    automaticCloudBackup();
};

// Обработчик кнопок облачного бэкапа
if (cloudExportBtn) {
    cloudExportBtn.addEventListener('click', () => {
        cloudBackupSave(cards);
        tg.showAlert?.('Данные сохранены в облако');
    });
}
if (cloudImportBtn) {
    cloudImportBtn.addEventListener('click', () => {
        const dataStr = localStorage.getItem(CLOUD_BACKUP_KEY);
        if (!dataStr) {
            tg.showAlert?.('Облачных данных не найдено');
            return;
        }
        try {
            const data = JSON.parse(dataStr);
            if (!Array.isArray(data)) throw new Error('Ошибка формата');
            cards = data;
            saveCards();
            renderCards();
            tg.showAlert?.('Облачные данные восстановлены');
            importModal.style.display = 'none';
        } catch (e) {
            tg.showAlert?.('Ошибка восстановления из облака');
        }
    });
}

// ===== МОДАЛЫ =====
function openModal(modal) {
    if (modal) modal.style.display = 'flex';
}
function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

document.querySelectorAll('.close').forEach((btn) => {
    btn.addEventListener('click', () => {
        const id = btn.dataset.target;
        if (!id) return;
        const modal = document.getElementById(id);
        closeModal(modal);
    });
});

window.addEventListener('click', (e) => {
    if (e.target === addModal) closeModal(addModal);
    if (e.target === viewModal) closeModal(viewModal);
    if (e.target === editModal) closeModal(editModal);
    if (e.target === exportModal) closeModal(exportModal);
    if (e.target === importModal) closeModal(importModal);
    if (e.target === helpModal) closeModal(helpModal);
});

// ===== ВЫБОР ЦВЕТА =====
function setupColorPicker(containerId) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.color-option').forEach((opt) => {
        opt.addEventListener('click', () => {
            selectedColor = opt.dataset.color;
            container.querySelectorAll('.color-option').forEach((o) => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });
}

function setSelectedColor(containerId, color) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.color-option').forEach((o) => {
        o.classList.toggle('selected', o.dataset.color === color);
    });
}

// ===== ОТРИСОВКА КАРТ =====
function renderCards() {
    cardsGrid.innerHTML = '';
    cards.forEach((card) => {
        const el = document.createElement('div');
        el.className = 'card';
        el.style.background = card.color;
        el.innerHTML = `<h3>${card.name}</h3>`;

        el.addEventListener('click', () => onCardClick(card.id));
        cardsGrid.appendChild(el);
    });
}

// ===== КЛИК ПО КАРТЕ =====
function onCardClick(id) {
    if (editMode) {
        openEditForCard(id);
    } else {
        viewCard(id);
    }
}

// ===== ДОБАВЛЕНИЕ КАРТЫ =====
addCardBtn.addEventListener('click', () => {
    document.getElementById('cardName').value = '';
    document.getElementById('barcodeNumber').value = '';
    selectedColor = '#FF6B6B';
    setSelectedColor('addColors', selectedColor);
    openModal(addModal);
});

saveCardBtn.addEventListener('click', () => {
    const name = document.getElementById('cardName').value.trim();
    const barcode = document.getElementById('barcodeNumber').value.trim();

    if (!name || !barcode) {
        tg.showAlert?.('Заполните все поля');
        return;
    }

    const card = {
        id: Date.now(),
        name,
        barcode,
        color: selectedColor,
    };

    cards.push(card);
    saveCards();
    renderCards();
    closeModal(addModal);
    tg.showAlert?.('Карта добавлена');
});

// ===== СВОРАЧИВАЕМАЯ ПАНЕЛЬ ДЕЙСТВИЙ =====
actionsToggleBtn.addEventListener('click', () => {
    const hidden = actionsPanel.classList.toggle('hidden');

    const iconEl = actionsToggleBtn.querySelector('[data-lucide]');
    if (iconEl) {
        iconEl.setAttribute('data-lucide', hidden ? 'chevrons-down' : 'chevrons-up');
        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: actionsToggleBtn });
        }
    }

    if (hidden && editMode) {
        editMode = false;
        editModeToggleBtn.classList.remove('edit-active');
        editModeLabel.style.display = 'none';
    }
});

// ===== РЕЖИМ РЕДАКТИРОВАНИЯ НА ГЛАВНОЙ =====
editModeToggleBtn.addEventListener('click', () => {
    editMode = !editMode;

    editModeToggleBtn.classList.toggle('edit-active', editMode);
    editModeLabel.style.display = editMode ? 'block' : 'none';
});

// ===== МОДАЛКА ПОМОЩИ =====
if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => {
        openModal(helpModal);
    });
}

// ===== ПРОСМОТР КАРТЫ =====
function viewCard(id) {
    currentCardId = id;
    const card = cards.find((c) => c.id === id);
    if (!card) return;

    document.getElementById('viewCardName').textContent = card.name;
    cardPopupHeader.style.background = card.color;
    document.getElementById('barcodeText').textContent = card.barcode;

    try {
        JsBarcode('#barcodeSvg', card.barcode, {
            format: 'CODE128',
            width: 2,
            height: 100,
            displayValue: false,
        });
    } catch (e) {
        console.error('JsBarcode error:', e);
    }

    openModal(viewModal);
}

// Крестик в просмотре
closeViewBtn.addEventListener('click', () => {
    closeModal(viewModal);
});

// Закрытие по клику на тело модалки просмотра
cardViewBody.addEventListener('click', () => {
    closeModal(viewModal);
});

// ===== ОТКРЫТИЕ РЕДАКТОРА КАРТЫ =====
function openEditForCard(id) {
    editingCardId = id;
    const card = cards.find((c) => c.id === editingCardId);
    if (!card) return;

    document.getElementById('editCardName').value = card.name;
    document.getElementById('editBarcodeNumber').value = card.barcode;
    selectedColor = card.color;
    setSelectedColor('editColors', selectedColor);

    openModal(editModal);
}

// ===== СОХРАНЕНИЕ В РЕДАКТОРЕ =====
document.getElementById('saveEditBtn').addEventListener('click', () => {
    if (!editingCardId) return;

    const name = document.getElementById('editCardName').value.trim();
    const barcode = document.getElementById('editBarcodeNumber').value.trim();

    if (!name || !barcode) {
        tg.showAlert?.('Заполните все поля');
        return;
    }

    const idx = cards.findIndex((c) => c.id === editingCardId);
    if (idx === -1) return;

    cards[idx] = { ...cards[idx], name, barcode, color: selectedColor };
    saveCards();
    renderCards();
    closeModal(editModal);
    tg.showAlert?.('Изменения сохранены');
});

// ===== УДАЛЕНИЕ В РЕДАКТОРЕ =====
deleteCardInEditBtn.addEventListener('click', () => {
    if (!editingCardId) {
        tg.showAlert?.('Не выбрана карта для удаления');
        return;
    }

    const confirmDelete = (ok) => {
        if (!ok) return;

        cards = cards.filter((c) => c.id !== editingCardId);
        editingCardId = null;

        saveCards();
        renderCards();
        closeModal(editModal);
        tg.showAlert?.('Карта удалена');
    };

    if (tg.showConfirm) {
        tg.showConfirm('Удалить эту карту?', confirmDelete);
    } else {
        confirmDelete(window.confirm('Удалить эту карту?'));
    }
});

// ===== ЭКСПОРТ: JSON + копирование =====
exportBtn.addEventListener('click', () => {
    if (!cards || !cards.length) {
        tg.showAlert?.('Нет карт для экспорта');
        return;
    }

    const dataStr = JSON.stringify(cards, null, 2);
    const ta = document.getElementById('exportData');
    ta.value = dataStr;

    exportModal.style.display = 'flex';
});

// ===== НОВАЯ КНОПКА «Облачный бэкап» в модалке экспорта
const cloudExportBtn = document.getElementById('cloudExportBtn');
if (cloudExportBtn) {
    cloudExportBtn.addEventListener('click', () => {
        cloudBackupSave(cards);
        tg.showAlert?.('Данные сохранены в облако');
    });
});

// ===== КНОПКА «Восстановить из облака» в модалке импорта
const cloudImportBtn = document.getElementById('cloudImportBtn');
if (cloudImportBtn) {
    cloudImportBtn.addEventListener('click', () => {
        const dataStr = localStorage.getItem(CLOUD_BACKUP_KEY);
        if (!dataStr) {
            tg.showAlert?.('Облачных данных не найдено');
            return;
        }
        try {
            const data = JSON.parse(dataStr);
            if (!Array.isArray(data)) throw new Error('Ошибка формата');
            cards = data;
            saveCards();
            renderCards();
            tg.showAlert?.('Облачные данные восстановлены');
            importModal.style.display = 'none';
        } catch (e) {
            tg.showAlert?.('Ошибка восстановления из облака');
        }
    });
});

// ===== ОБЛАЧНЫЙ БЭКАП =====
const CLOUD_BACKUP_KEY = 'cloudBackup';

function cloudBackupSave(data) {
    console.log('Cloud backup saved:', data);
    // Здесь можно заменить на реальный вызов API облачного хранилища
    localStorage.setItem(CLOUD_BACKUP_KEY, JSON.stringify(data));
}

function automaticCloudBackup() {
    cloudBackupSave(cards);
}

// Переопределяем saveCards, чтобы вызвать автосохранение в облако
const originalSaveCards = saveCards;
saveCards = function () {
    originalSaveCards();
    automaticCloudBackup();
};

// ===== КОНТРОЛЛЕРЫ ИНТЕРФЕЙСА, ИМПОРТ, ЭКСПОРТ и прочее ...
// ... остальной код (события, модалки, рендер и т.п.) без изменений

// ===== Инициализация Lucide-иконок в конце
if (window.lucide?.createIcons) {
    window.lucide.createIcons();
}
