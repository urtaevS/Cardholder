// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM =====
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

// ===== СОСТОЯНИЕ =====
const STORAGE_KEY = 'loyaltyCards';

let cards = [];
let selectedColor = '#FF6B6B';
let currentCardId = null;
let editingCardId = null;

// ===== DOM =====
const addCardBtn = document.getElementById('addCardBtn');
const addModal   = document.getElementById('addModal');
const viewModal  = document.getElementById('viewModal');
const editModal  = document.getElementById('editModal');
const exportModal= document.getElementById('exportModal');

const cardsGrid  = document.getElementById('cardsGrid');

const saveCardBtn= document.getElementById('saveCardBtn');
const cameraBtn  = document.getElementById('cameraBtn');
const uploadBtn  = document.getElementById('uploadBtn');
const fileInput  = document.getElementById('fileInput');

const importBtn  = document.getElementById('importBtn');
const exportBtn  = document.getElementById('exportBtn');
const importInput= document.getElementById('importInput');
const copyExportBtn = document.getElementById('copyExportBtn');

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
});

// ===== ВЫБОР ЦВЕТА =====
function setupColorPicker(containerId) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            selectedColor = opt.dataset.color;
            container.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
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
        el.addEventListener('click', () => viewCard(card.id));
        cardsGrid.appendChild(el);
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

cameraBtn.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.capture = 'environment';
    inp.onchange = (e) => {
        if (e.target.files[0]) processBarcodeImage(e.target.files[0]);
    };
    inp.click();
});

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
        tg.showAlert?.('Штрихкод распознан (демо)');
    };
    reader.readAsDataURL(file);
}

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
        console.error('JsBarcode error:', e);
    }

    openModal(viewModal);
}

// ===== РЕДАКТИРОВАНИЕ =====
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

// ===== УДАЛЕНИЕ =====
document.getElementById('deleteBtn').addEventListener('click', () => {
    if (!currentCardId) return;

    const confirmDelete = (ok) => {
        if (!ok) return;
        cards = cards.filter(c => c.id !== currentCardId);
        saveCards();
        renderCards();
        closeModal(viewModal);
        tg.showAlert?.('Карта удалена');
    };

    if (tg.showConfirm) {
        tg.showConfirm('Удалить эту карту?', confirmDelete);
    } else {
        confirmDelete(window.confirm('Удалить эту карту?'));
    }
});

// ===== ЭКСПОРТ =====
exportBtn.addEventListener('click', () => {
    if (!cards.length) {
        tg.showAlert?.('Нет карт для экспорта');
        return;
    }

    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = `loyalty-cards-${new Date().toISOString().split('T')[0]}.json`;

    // Если это не Telegram (initData нет или platform unknown) — обычный download
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
        tg.showAlert?.('Файл экспортирован');
        return;
    }

    // В Telegram: прямой download заблокирован, показываем JSON
    URL.revokeObjectURL(url);
    document.getElementById('exportData').value = dataStr;
    openModal(exportModal);
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
        navigator.clipboard.writeText(ta.value).then(() => {
            copied = true;
            tg.showAlert?.('Данные скопированы. Вставьте их в «Избранное» и сохраните как .json');
        }).catch(() => {
            tg.showAlert?.('Выделите текст и скопируйте вручную');
        });
    } else {
        if (copied) {
            tg.showAlert?.('Данные скопированы. Вставьте их в «Избранное» и сохраните как .json');
        } else {
            tg.showAlert?.('Выделите текст и скопируйте вручную');
        }
    }
    closeModal(exportModal);
});

// ===== ИМПОРТ =====
importBtn.addEventListener('click', () => importInput.click());

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) {
                tg.showAlert?.('Неверный формат файла (ожидается массив)');
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
        } catch (err) {
            console.error('import error:', err);
            tg.showAlert?.('Ошибка чтения файла. Проверьте JSON');
        }
    };
    reader.readAsText(file);
    importInput.value = '';
});

// ===== СТАРТ =====
setupColorPicker('addColors');
setupColorPicker('editColors');
loadCards();
renderCards();
