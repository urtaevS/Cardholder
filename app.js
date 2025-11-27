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
    container.innerHTML = `<div style="text-align:center;padding:50px;"><h2>${message}</h2></div>`;
  }
}

if (!checkAccessByTelegramId()) {
  throw new Error('Access denied by Telegram ID');
}

// ===== СОСТОЯНИЕ =====
const STORAGE_KEY = 'loyaltyCards';
let cards = [];
let selectedColor = '#FF6B6B';
let currentCardId = null;
let editingCardId = null;
let editMode = false;

// drag&drop
let dragSrcIndex = null;

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
const closeViewBtn = document.getElementById('closeViewBtn');
const cardViewBody = document.getElementById('cardViewBody');
const cardPopupHeader = document.getElementById('cardPopupHeader');
const actionsPanel = document.getElementById('actionsPanel');
const actionsToggleBtn = document.getElementById('actionsToggleBtn');
// убрали кнопку copyNumberBtn, теперь копируем по клику на текст
const barcodeTextEl = document.getElementById('barcodeText');

let editModeLabel = document.getElementById('editModeLabel');
if (!editModeLabel) {
  editModeLabel = document.createElement('div');
  editModeLabel.id = 'editModeLabel';
  editModeLabel.style.display = 'none';
  editModeLabel.textContent = 'Режим редактирования: нажмите на карту, чтобы изменить или удалить её. Перетащите карту, чтобы изменить порядок.';
  const container = document.querySelector('.container');
  container.insertBefore(editModeLabel, cardsGrid);
}

// ===== ФУНКЦИЯ АНИМАЦИИ ИЗ КНОПКИ =====
let isAnimating = false;

function openModalFromButton(modal, buttonElement) {
  if (isAnimating) return;
  isAnimating = true;

  if (!modal || !buttonElement) {
    if (modal) modal.style.display = 'flex';
    isAnimating = false;
    return;
  }

  const modalContent = modal.querySelector('.modal-content');
  if (!modalContent) {
    modal.style.display = 'flex';
    isAnimating = false;
    return;
  }

  const buttonRect = buttonElement.getBoundingClientRect();
  const buttonCenterX = buttonRect.left + buttonRect.width / 2;
  const buttonCenterY = buttonRect.top + buttonRect.height / 2;

  const screenCenterX = window.innerWidth / 2;
  const screenCenterY = window.innerHeight / 2;

  const offsetX = buttonCenterX - screenCenterX;
  const offsetY = buttonCenterY - screenCenterY;

  modalContent.style.setProperty('--start-x', `${offsetX}px`);
  modalContent.style.setProperty('--start-y', `${offsetY}px`);

  modalContent.classList.remove('animate-from-button');
  void modalContent.offsetWidth;
  modalContent.classList.add('animate-from-button');

  modal.style.display = 'flex';

  setTimeout(() => {
    modalContent.classList.remove('animate-from-button');
    isAnimating = false;
  }, 400);
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
  if (e.target === helpModal) closeModal(helpModal);
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
  cards.forEach((card, index) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.background = card.color;
    el.style.animationDelay = `${index * 0.08}s`;
    el.innerHTML = `<h3>${card.name}</h3>`;
    el.dataset.index = index;

    // drag & drop только в режиме редактирования
    el.draggable = editMode;
    if (editMode) {
      el.classList.add('shake');
    }

    el.addEventListener('click', (e) => {
      if (editMode) {
        openEditModalFromCard(card.id, e.currentTarget);
      } else {
        openViewModalFromCard(card.id, e.currentTarget);
      }
    });

    // DnD события
    el.addEventListener('dragstart', onCardDragStart);
    el.addEventListener('dragover', onCardDragOver);
    el.addEventListener('dragleave', onCardDragLeave);
    el.addEventListener('drop', onCardDrop);
    el.addEventListener('dragend', onCardDragEnd);

    cardsGrid.appendChild(el);
  });
}

// ===== DnD обработчики =====
function onCardDragStart(e) {
  if (!editMode) {
    e.preventDefault();
    return;
  }
  const idx = Number(e.currentTarget.dataset.index);
  dragSrcIndex = idx;
  e.currentTarget.classList.add('dragging');
}

function onCardDragOver(e) {
  if (!editMode) return;
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function onCardDragLeave(e) {
  if (!editMode) return;
  e.currentTarget.classList.remove('drag-over');
}

function onCardDrop(e) {
  if (!editMode) return;
  e.preventDefault();
  const targetIndex = Number(e.currentTarget.dataset.index);
  e.currentTarget.classList.remove('drag-over');

  if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

  const moved = cards.splice(dragSrcIndex, 1)[0];
  cards.splice(targetIndex, 0, moved);

  saveCards();
  dragSrcIndex = null;
  renderCards();
}

function onCardDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  const all = cardsGrid.querySelectorAll('.card');
  all.forEach(c => c.classList.remove('drag-over'));
}

// ===== ПРОСМОТР КАРТЫ =====
function openViewModalFromCard(cardId, cardElement) {
  const card = cards.find(c => c.id === cardId);
  if (!card) return;

  currentCardId = cardId;
  document.getElementById('popupCardName').textContent = card.name;
  cardPopupHeader.style.background = card.color;

  const svg = document.getElementById('barcodeSvg');
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  try {
    JsBarcode(svg, card.number, {
      format: 'CODE128',
      width: 2,
      height: 80,
      displayValue: false
    });
  } catch (e) {
    console.error('Barcode error:', e);
  }

  barcodeTextEl.textContent = card.number;
  openModalFromButton(viewModal, cardElement);
}

// ===== КОПИРОВАНИЕ НОМЕРА ПО КЛИКУ НА ТЕКСТ =====
barcodeTextEl.addEventListener('click', () => {
  const card = cards.find(c => c.id === currentCardId);
  if (!card) return;
  navigator.clipboard.writeText(card.number).then(() => {
    alert('Номер скопирован!');
  });
});

// ===== ДОБАВЛЕНИЕ КАРТЫ =====
addCardBtn.addEventListener('click', (e) => {
  document.getElementById('cardName').value = '';
  document.getElementById('cardNumber').value = '';
  selectedColor = '#FF6B6B';
  setSelectedColor('colorPicker', selectedColor);
  openModalFromButton(addModal, e.currentTarget);
});

saveCardBtn.addEventListener('click', () => {
  const name = document.getElementById('cardName').value.trim();
  const number = document.getElementById('cardNumber').value.trim();
  if (!name || !number) {
    alert('Заполните все поля');
    return;
  }
  const newCard = {
    id: Date.now(),
    name,
    number,
    color: selectedColor
  };
  cards.push(newCard);
  saveCards();
  renderCards();
  closeModal(addModal);
});

// ===== РЕДАКТИРОВАНИЕ КАРТЫ =====
function openEditModalFromCard(cardId, cardElement) {
  const card = cards.find(c => c.id === cardId);
  if (!card) return;

  editingCardId = cardId;
  document.getElementById('editCardName').value = card.name;
  document.getElementById('editCardNumber').value = card.number;
  selectedColor = card.color;
  setSelectedColor('editColorPicker', selectedColor);
  openModalFromButton(editModal, cardElement);
}

document.getElementById('saveEditBtn').addEventListener('click', () => {
  const name = document.getElementById('editCardName').value.trim();
  const number = document.getElementById('editCardNumber').value.trim();
  if (!name || !number) {
    alert('Заполните все поля');
    return;
  }
  const card = cards.find(c => c.id === editingCardId);
  if (card) {
    card.name = name;
    card.number = number;
    card.color = selectedColor;
    saveCards();
    renderCards();
    closeModal(editModal);
  }
});

deleteCardInEditBtn.addEventListener('click', () => {
  if (confirm('Удалить эту карту?')) {
    cards = cards.filter(c => c.id !== editingCardId);
    saveCards();
    renderCards();
    closeModal(editModal);
  }
});

// ===== ЭКСПОРТ =====
exportBtn.addEventListener('click', (e) => {
  const json = JSON.stringify(cards, null, 2);
  document.getElementById('exportTextarea').value = json;
  openModalFromButton(exportModal, e.currentTarget);
});

copyExportBtn.addEventListener('click', () => {
  const textarea = document.getElementById('exportTextarea');
  textarea.select();
  document.execCommand('copy');
  alert('JSON скопирован в буфер обмена!');
});

// ===== ИМПОРТ =====
importBtn.addEventListener('click', (e) => {
  document.getElementById('importJsonBlock').style.display = 'none';
  importJsonTextarea.value = '';
  openModalFromButton(importModal, e.currentTarget);
});

importFromFileBtn.addEventListener('click', () => {
  importInput.click();
});

importInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!Array.isArray(parsed)) throw new Error('Неверный формат');
      cards = parsed;
      saveCards();
      renderCards();
      closeModal(importModal);
      alert('Карты успешно импортированы!');
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  };
  reader.readAsText(file);
});

importFromJsonBtn.addEventListener('click', () => {
  const block = document.getElementById('importJsonBlock');
  block.style.display = block.style.display === 'none' ? 'block' : 'none';
});

applyImportJsonBtn.addEventListener('click', () => {
  const json = importJsonTextarea.value.trim();
  if (!json) {
    alert('Введите JSON-данные');
    return;
  }
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error('Неверный формат');
    cards = parsed;
    saveCards();
    renderCards();
    closeModal(importModal);
    alert('Карты успешно импортированы!');
  } catch (err) {
    alert('Ошибка импорта: ' + err.message);
  }
});

// ===== СВОРАЧИВАНИЕ ПАНЕЛИ =====
actionsToggleBtn.addEventListener('click', () => {
  const hidden = actionsPanel.classList.toggle('hidden');

  const iconEl = actionsToggleBtn.querySelector('[data-lucide]');
  if (iconEl) {
    iconEl.setAttribute('data-lucide', hidden ? 'chevron-left' : 'chevron-down');
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({ root: actionsToggleBtn });
    }
  }

  if (hidden && editMode) {
    editMode = false;
    editModeToggleBtn.classList.remove('edit-active');
    editModeLabel.style.display = 'none';
    // отключаем дрожание и dnd
    const all = cardsGrid.querySelectorAll('.card');
    all.forEach(c => {
      c.classList.remove('shake');
      c.draggable = false;
    });
  }
});

// ===== РЕЖИМ РЕДАКТИРОВАНИЯ =====
editModeToggleBtn.addEventListener('click', () => {
  editMode = !editMode;
  editModeToggleBtn.classList.toggle('edit-active', editMode);
  editModeLabel.style.display = editMode ? 'block' : 'none';

  const all = cardsGrid.querySelectorAll('.card');
  all.forEach(cardEl => {
    cardEl.draggable = editMode;
    if (editMode) {
      cardEl.classList.add('shake');
    } else {
      cardEl.classList.remove('shake');
    }
  });
});

// ===== ЗАКРЫТИЕ ПРОСМОТРА =====
closeViewBtn.addEventListener('click', () => {
  closeModal(viewModal);
});

// ===== СПРАВКА =====
helpBtn.addEventListener('click', (e) => {
  openModalFromButton(helpModal, e.currentTarget);
});

// ===== TELEGRAM CLOUD STORAGE =====
const CLOUD_STORAGE_KEY = 'loyaltyCardsBackup';

async function saveToCloud() {
  try {
    if (!tg.CloudStorage) {
      alert('Cloud Storage недоступен в вашей версии Telegram');
      return;
    }
    
    const data = JSON.stringify(cards);
    
    await new Promise((resolve, reject) => {
      tg.CloudStorage.setItem(CLOUD_STORAGE_KEY, data, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    
    alert('✅ Данные успешно сохранены в облако Telegram');
  } catch (error) {
    console.error('Ошибка сохранения в облако:', error);
    alert('❌ Ошибка при сохранении в облако');
  }
}

async function loadFromCloud() {
  try {
    if (!tg.CloudStorage) {
      alert('Cloud Storage недоступен в вашей версии Telegram');
      return;
    }
    
    const data = await new Promise((resolve, reject) => {
      tg.CloudStorage.getItem(CLOUD_STORAGE_KEY, (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
    
    if (!data) {
      alert('⚠️ В облаке нет сохраненных данных');
      return;
    }
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      throw new Error('Неверный формат данных');
    }
    
    if (confirm(`Найдено карт в облаке: ${parsed.length}. Загрузить и заменить текущие данные?`)) {
      cards = parsed;
      saveCards();
      renderCards();
      closeModal(importModal);
      alert('✅ Данные успешно загружены из облака');
    }
  } catch (error) {
    console.error('Ошибка загрузки из облака:', error);
    alert('❌ Ошибка при загрузке из облака');
  }
}

const saveToCloudBtn = document.getElementById('saveToCloudBtn');
const loadFromCloudBtn = document.getElementById('loadFromCloudBtn');

if (saveToCloudBtn) {
  saveToCloudBtn.addEventListener('click', saveToCloud);
}

if (loadFromCloudBtn) {
  loadFromCloudBtn.addEventListener('click', loadFromCloud);
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
setupColorPicker('colorPicker');
setupColorPicker('editColorPicker');
loadCards();
renderCards();

if (window.lucide?.createIcons) {
  window.lucide.createIcons();
}
