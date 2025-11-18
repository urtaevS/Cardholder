// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM =====
const tg = window.Telegram?.WebApp || {};
tg.expand?.();
tg.ready?.();

// ===== СОСТОЯНИЕ =====
const STORAGE_KEY = 'loyaltyCards';

let cards = [];
let selectedColor = '#FF6B6B';
let currentCardId = null;   // карта, которую сейчас смотрим
let editingCardId = null;   // карта, которую сейчас редактируем
let editMode = false;       // режим редактирования на главном экране

// ===== DOM =====
const addCardBtn       = document.getElementById('addCardBtn');
const addModal         = document.getElementById('addModal');
const viewModal        = document.getElementById('viewModal');
const editModal        = document.getElementById('editModal');
const exportModal      = document.getElementById('exportModal');
const importModal      = document.getElementById('importModal');

const cardsGrid        = document.getElementById('cardsGrid');

const saveCardBtn      = document.getElementById('saveCardBtn');

const importBtn        = document.getElementById('importBtn');
const exportBtn        = document.getElementById('exportBtn');
const importInput      = document.getElementById('importInput');

const copyExportBtn        = document.getElementById('copyExportBtn');
const importFromFileBtn    = document.getElementById('importFromFileBtn');
const importFromJsonBtn    = document.getElementById('importFromJsonBtn');
const importJsonTextarea   = document.getElementById('importJsonTextarea');
const applyImportJsonBtn   = document.getElementById('applyImportJsonBtn');

const editModeToggleBtn    = document.getElementById('editModeToggleBtn');
const deleteCardInEditBtn  = document.getElementById('deleteCardInEditBtn');

const closeViewBtn         = document.getElementById('closeViewBtn');
const cardViewBody         = document.getElementById('cardViewBody');
const cardPopupHeader      = document.getElementById('cardPopupHeader');

const actionsPanel         = document.getElementById('actionsPanel');
const actionsToggleBtn     = document.getElementById('actionsToggleBtn');

// поясняющий лейбл режима редактирования
let editModeLabel = document.getElementById('editModeLabel');
if (!editModeLabel) {
    editModeLabel = document.createElement('div');
    editModeLabel.id = 'editModeLabel';
    editModeLabel.style.display = 'none';
    editModeLabel.textContent = 'Режим редактирования: нажмите на карту, чтобы изменить или удалить её';
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

// ===== МОДАЛЫ =====
function openModal(modal) {
    if (modal) modal.style.display = 'flex';
}
function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

document.querySelectorAll('.close').forEach(btn => {
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
});

// ===== ВЫБОР ЦВЕТА =====
function setupColorPicker(containerId) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            selectedColor = opt.dataset.color;
            container.querySelectorAll('.color-option')
                .forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });
}

function setSelectedColor(containerId, color) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.color-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.color === color);
    });
}

// ===== ОТРИСОВКА КАРТ =====
function renderCards() {
    cardsGrid.innerHTML = '';
    cards.forEach(card => {
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
        color: selectedColor
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

    // меняем иконку chevrons-left / chevrons-down
    const iconEl = actionsToggleBtn.querySelector('[data-lucide]');
    if (iconEl) {
        iconEl.setAttribute('data-lucide', hidden ? 'chevrons-left' : 'chevrons-down');

        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ root: actionsToggleBtn });
        }
    }

    // Если панель свернули — выходим из режима редактирования
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

// Открыть редактор для выбранной карты
function openEditForCard(id) {
    editingCardId = id;
    const card = cards.find(c => c.id === editingCardId);
    if (!card) return;

    document.getElementById('editCardName').value = card.name;
    document.getElementById('editBarcodeNumber').value = card.barcode;
    selectedColor = card.color;
    setSelectedColor('editColors', selectedColor);

    openModal(editModal);
}

// ===== ПРОСМОТР КАРТЫ =====
function viewCard(id) {
    currentCardId = id;
    const card = cards.find(c => c.id === id);
    if (!card) return;

    document.getElementById('viewCardName').textContent = card.name;
    cardPopupHeader.style.background = card.color;
    document.getElementById('barcodeText').textContent = card.barcode;

    try {
        JsBarcode('#barcodeSvg', card.barcode, {
            format: 'CODE128',
            width: 2,
            height: 100,
            displayValue: false
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

// ===== СОХРАНЕНИЕ В РЕДАКТОРЕ =====
document.getElementById('saveEditBtn').addEventListener('click', () => {
    if (!editingCardId) return;

    const name = document.getElementById('editCardName').value.trim();
    const barcode = document.getElementById('editBarcodeNumber').value.trim();

    if (!name || !barcode) {
        tg.showAlert?.('Заполните все поля');
        return;
    }

    const idx = cards.findIndex(c => c.id === editingCardId);
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

        cards = cards.filter(c => c.id !== editingCardId);
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
            .then(() => {
                copied = true;
                tg.showAlert?.('JSON скопирован. Сохраните его как файл .json');
            })
            .catch(() => {
                tg.showAlert?.('Выделите текст и скопируйте вручную');
            });
    } else {
        if (copied) {
            tg.showAlert?.('JSON скопирован. Сохраните его как файл .json');
        } else {
            tg.showAlert?.('Выделите текст и скопируйте вручную');
        }
    }

    exportModal.style.display = 'none';
});

// ===== ИМПОРТ: модалка (файл + ручной JSON) =====
importBtn.addEventListener('click', () => {
    importJsonTextarea.style.display = 'none';
    importJsonTextarea.value = '';
    applyImportJsonBtn.style.display = 'none';
    importModal.style.display = 'flex';
});

// Импорт из файла
importFromFileBtn.addEventListener('click', () => {
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
                tg.showAlert?.('Неверный формат файла (ожидается массив карт)');
                return;
            }

            const existingIds = new Set(cards.map(c => c.id));
            let added = 0;

            imported.forEach(src => {
                if (!src || typeof src !== 'object') return;
                const id = src.id || Date.now() + Math.random();
                if (existingIds.has(id)) return;
                existingIds.add(id);
                cards.push({
                    id,
                    name: src.name || 'Без названия',
                    barcode: src.barcode || '',
                    color: src.color || '#FF6B6B'
                });
                added++;
            });

            saveCards();
            renderCards();
            tg.showAlert?.(`Импортировано карт: ${added}`);
            importModal.style.display = 'none';
        } catch (err) {
            console.error('import from file error:', err);
            tg.showAlert?.('Ошибка чтения файла. Проверьте JSON');
        }
    };

    reader.readAsText(file);
    importInput.value = '';
});

// Импорт из вставленного JSON
importFromJsonBtn.addEventListener('click', () => {
    importJsonTextarea.style.display = 'block';
    applyImportJsonBtn.style.display = 'block';
});

applyImportJsonBtn.addEventListener('click', () => {
    const text = importJsonTextarea.value.trim();
    if (!text) {
        tg.showAlert?.('Вставьте JSON в поле');
        return;
    }

    try {
        const imported = JSON.parse(text);
        if (!Array.isArray(imported)) {
            tg.showAlert?.('Неверный формат JSON (ожидается массив карт)');
            return;
        }

        const existingIds = new Set(cards.map(c => c.id));
        let added = 0;

        imported.forEach(src => {
            if (!src || typeof src !== 'object') return;
            const id = src.id || Date.now() + Math.random();
            if (existingIds.has(id)) return;
            existingIds.add(id);
            cards.push({
                id,
                name: src.name || 'Без названия',
                barcode: src.barcode || '',
                color: src.color || '#FF6B6B'
            });
            added++;
        });

        saveCards();
        renderCards();
        tg.showAlert?.(`Импортировано карт: ${added}`);
        importModal.style.display = 'none';
    } catch (err) {
        console.error('import from JSON textarea error:', err);
        tg.showAlert?.('Ошибка парсинга JSON. Проверьте формат');
    }
});

// ===== СТАРТ =====
setupColorPicker('addColors');
setupColorPicker('editColors');
loadCards();
renderCards();

// Инициализация Lucide-иконок
if (window.lucide?.createIcons) {
    window.lucide.createIcons();
}
