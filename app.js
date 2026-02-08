const editables = document.querySelectorAll('.editable[contenteditable="true"]');
const adminPanel = document.getElementById('adminPanel');
const inputs = document.querySelectorAll('[data-input]');
const metricNodes = document.querySelectorAll('[data-metric]');
const overlayItems = document.querySelectorAll('.overlay-item');
const mockCanvas = document.getElementById('mockCanvas');
const visibilityList = document.getElementById('visibilityList');
const resetValuesBtn = document.getElementById('resetValues');
const resetLabelsBtn = document.getElementById('resetLabels');
const resetLayoutBtn = document.getElementById('resetLayout');
const showAllBtn = document.getElementById('showAllItems');
const hideAllBtn = document.getElementById('hideAllItems');

const storageKey = 'metricsAdminState';
const labelStorageKey = 'metricsLabelState';
const positionStorageKey = 'metricsPositionState';
const visibilityStorageKey = 'metricsVisibilityState';

const defaultState = {
  salesCount: 0,
  avgSalePrice: 0,
  unitsPerSale: 1,
  visits: 0,
  canceledSales: 0,
  costPerUnit: 0,
  feeRate: 0,
  adSpend: 0,
  otherCosts: 0,
};

const formatters = {
  number: new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }),
  currency: new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  percent: new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }),
};

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const normalized = String(value).replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeState(state) {
  const salesCount = Math.max(0, Math.round(toNumber(state.salesCount)));
  const avgSalePrice = Math.max(0, toNumber(state.avgSalePrice));
  const unitsPerSale = Math.max(0.1, toNumber(state.unitsPerSale) || 1);
  const visits = Math.max(0, Math.round(toNumber(state.visits)));
  const canceledSalesRaw = Math.max(0, Math.round(toNumber(state.canceledSales)));
  const canceledSales = Math.min(canceledSalesRaw, salesCount);
  const costPerUnit = Math.max(0, toNumber(state.costPerUnit));
  const feeRate = Math.min(100, Math.max(0, toNumber(state.feeRate)));
  const adSpend = Math.max(0, toNumber(state.adSpend));
  const otherCosts = Math.max(0, toNumber(state.otherCosts));

  return {
    salesCount,
    avgSalePrice,
    unitsPerSale,
    visits,
    canceledSales,
    costPerUnit,
    feeRate,
    adSpend,
    otherCosts,
  };
}

function computeMetrics(state) {
  const base = normalizeState(state);

  const grossSales = base.salesCount * base.avgSalePrice;
  const unitsSold = base.salesCount * base.unitsPerSale;
  const avgUnitPrice = unitsSold > 0 ? grossSales / unitsSold : 0;
  const conversion = base.visits > 0 ? (base.salesCount / base.visits) * 100 : 0;
  const cancelRate = base.salesCount > 0 ? (base.canceledSales / base.salesCount) * 100 : 0;
  const netSalesCount = Math.max(0, base.salesCount - base.canceledSales);
  const canceledRevenue = base.canceledSales * base.avgSalePrice;
  const netSales = grossSales - canceledRevenue;
  const cogs = unitsSold * base.costPerUnit;
  const platformFees = netSales * (base.feeRate / 100);
  const grossProfit = netSales - cogs;
  const netProfit = grossProfit - platformFees - base.adSpend - base.otherCosts;
  const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  return {
    ...base,
    grossSales,
    unitsSold,
    avgUnitPrice,
    conversion,
    cancelRate,
    netSalesCount,
    canceledRevenue,
    netSales,
    cogs,
    platformFees,
    grossProfit,
    netProfit,
    netMargin,
  };
}

function formatValue(value, format) {
  const safe = Number.isFinite(value) ? value : 0;
  const formatter = formatters[format] || formatters.number;
  return formatter.format(format === 'number' ? Math.round(safe) : safe);
}

function renderMetrics(metrics) {
  metricNodes.forEach((node) => {
    const key = node.dataset.metric;
    if (!key || !(key in metrics)) {
      return;
    }
    const format = node.dataset.format || 'number';
    const prefix = node.dataset.prefix || '';
    const suffix = node.dataset.suffix || '';
    let text = formatValue(metrics[key], format);
    if (prefix) {
      text = `${prefix} ${text}`;
    }
    if (suffix) {
      text = `${text}${suffix}`;
    }
    node.textContent = text;
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch (error) {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures.
  }
}

function loadLabels() {
  try {
    const raw = localStorage.getItem(labelStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveLabels(labels) {
  try {
    localStorage.setItem(labelStorageKey, JSON.stringify(labels));
  } catch (error) {
    // Ignore storage failures.
  }
}

function loadPositions() {
  try {
    const raw = localStorage.getItem(positionStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function savePositions(positions) {
  try {
    localStorage.setItem(positionStorageKey, JSON.stringify(positions));
  } catch (error) {
    // Ignore storage failures.
  }
}

function loadVisibility() {
  try {
    const raw = localStorage.getItem(visibilityStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveVisibility(state) {
  try {
    localStorage.setItem(visibilityStorageKey, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures.
  }
}

function syncInputs(state) {
  inputs.forEach((input) => {
    const key = input.dataset.input;
    if (!key || !(key in state)) {
      return;
    }
    input.value = state[key];
  });
}

function updateCanvasScale() {
  if (!mockCanvas) {
    return;
  }
  const rect = mockCanvas.getBoundingClientRect();
  const scale = rect.width / 1381;
  document.documentElement.style.setProperty('--canvas-scale', scale.toFixed(4));
}

function getPosKey(node) {
  return node.dataset.posKey || node.dataset.metric || node.dataset.editKey || null;
}

function applyVisibility(item, visible) {
  item.classList.toggle('is-hidden', !visible);
}

function buildVisibilityList(visibilityState) {
  if (!visibilityList) {
    return;
  }
  visibilityList.innerHTML = '';

  overlayItems.forEach((item) => {
    const key = getPosKey(item);
    if (!key) {
      return;
    }
    const title = item.dataset.title || key;
    const row = document.createElement('div');
    row.className = 'admin-item';

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = visibilityState[key] !== false;

    const name = document.createElement('span');
    name.textContent = title;

    checkbox.addEventListener('change', () => {
      const visible = checkbox.checked;
      visibilityState[key] = visible;
      applyVisibility(item, visible);
      saveVisibility(visibilityState);
    });

    label.appendChild(checkbox);
    label.appendChild(name);
    row.appendChild(label);
    visibilityList.appendChild(row);
  });
}

const initialPositions = new Map();
overlayItems.forEach((item) => {
  const key = getPosKey(item);
  const x = parseFloat(item.style.getPropertyValue('--x'));
  const y = parseFloat(item.style.getPropertyValue('--y'));
  if (key && Number.isFinite(x) && Number.isFinite(y)) {
    initialPositions.set(key, { x, y });
  }
});

let baseState = loadState() || { ...defaultState };
baseState = normalizeState(baseState);
syncInputs(baseState);
renderMetrics(computeMetrics(baseState));

inputs.forEach((input) => {
  input.addEventListener('input', () => {
    const key = input.dataset.input;
    if (!key) {
      return;
    }
    baseState[key] = input.value;
    renderMetrics(computeMetrics(baseState));
    saveState(baseState);
  });

  input.addEventListener('blur', () => {
    baseState = normalizeState(baseState);
    syncInputs(baseState);
    renderMetrics(computeMetrics(baseState));
    saveState(baseState);
  });
});

const labelState = loadLabels();
editables.forEach((el) => {
  el.setAttribute('spellcheck', 'false');
  const key = el.dataset.editKey;
  const fallback = el.dataset.default || el.textContent.trim() || '—';
  if (key && labelState[key]) {
    el.textContent = labelState[key];
  } else {
    el.textContent = fallback;
  }

  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      el.blur();
    }
  });

  el.addEventListener('paste', (event) => {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });

  el.addEventListener('focus', () => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });

  el.addEventListener('blur', () => {
    const text = el.textContent.trim() || fallback;
    el.textContent = text;
    if (key) {
      labelState[key] = text;
      saveLabels(labelState);
    }
  });
});

const positionState = loadPositions();
overlayItems.forEach((item) => {
  const key = getPosKey(item);
  if (!key || !positionState[key]) {
    return;
  }
  const { x, y } = positionState[key];
  if (typeof x === 'number' && typeof y === 'number') {
    item.style.setProperty('--x', x);
    item.style.setProperty('--y', y);
  }
});

const visibilityState = loadVisibility();
overlayItems.forEach((item) => {
  const key = getPosKey(item);
  if (!key) {
    return;
  }
  const visible = visibilityState[key] !== false;
  applyVisibility(item, visible);
});

buildVisibilityList(visibilityState);
updateCanvasScale();
window.addEventListener('resize', updateCanvasScale);

function toggleAdmin() {
  const isOpen = document.body.classList.toggle('admin-open');
  if (adminPanel) {
    adminPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }
}

function toggleLayoutMode() {
  document.body.classList.toggle('layout-mode');
}

let draggingItem = null;
let draggingKey = null;

overlayItems.forEach((item) => {
  item.addEventListener('pointerdown', (event) => {
    if (!document.body.classList.contains('layout-mode') || !mockCanvas) {
      return;
    }
    draggingItem = item;
    draggingKey = getPosKey(item);
    item.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  item.addEventListener('pointermove', (event) => {
    if (!draggingItem || draggingItem !== item || !mockCanvas) {
      return;
    }
    const rect = mockCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.min(100, Math.max(0, x));
    const clampedY = Math.min(100, Math.max(0, y));
    item.style.setProperty('--x', clampedX.toFixed(2));
    item.style.setProperty('--y', clampedY.toFixed(2));
  });

  item.addEventListener('pointerup', (event) => {
    if (!draggingItem || draggingItem !== item) {
      return;
    }
    item.releasePointerCapture(event.pointerId);
    draggingItem = null;
    if (draggingKey) {
      const x = parseFloat(item.style.getPropertyValue('--x'));
      const y = parseFloat(item.style.getPropertyValue('--y'));
      if (Number.isFinite(x) && Number.isFinite(y)) {
        positionState[draggingKey] = { x, y };
        savePositions(positionState);
      }
    }
    draggingKey = null;
  });

  item.addEventListener('pointercancel', () => {
    draggingItem = null;
    draggingKey = null;
  });
});

if (resetValuesBtn) {
  resetValuesBtn.addEventListener('click', () => {
    baseState = { ...defaultState };
    syncInputs(baseState);
    renderMetrics(computeMetrics(baseState));
    saveState(baseState);
  });
}

if (resetLabelsBtn) {
  resetLabelsBtn.addEventListener('click', () => {
    Object.keys(labelState).forEach((key) => delete labelState[key]);
    editables.forEach((el) => {
      const fallback = el.dataset.default || el.textContent.trim() || '—';
      el.textContent = fallback;
      const key = el.dataset.editKey;
      if (key) {
        labelState[key] = fallback;
      }
    });
    saveLabels(labelState);
  });
}

if (resetLayoutBtn) {
  resetLayoutBtn.addEventListener('click', () => {
    Object.keys(positionState).forEach((key) => delete positionState[key]);
    overlayItems.forEach((item) => {
      const key = getPosKey(item);
      if (!key || !initialPositions.has(key)) {
        return;
      }
      const { x, y } = initialPositions.get(key);
      item.style.setProperty('--x', x.toFixed(2));
      item.style.setProperty('--y', y.toFixed(2));
    });
    savePositions(positionState);
  });
}

function setAllVisibility(visible) {
  overlayItems.forEach((item) => {
    const key = getPosKey(item);
    if (!key) {
      return;
    }
    visibilityState[key] = visible;
    applyVisibility(item, visible);
  });
  saveVisibility(visibilityState);
  buildVisibilityList(visibilityState);
}

if (showAllBtn) {
  showAllBtn.addEventListener('click', () => setAllVisibility(true));
}

if (hideAllBtn) {
  hideAllBtn.addEventListener('click', () => setAllVisibility(false));
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'Insert' || event.key === 'Insert') {
    if (event.shiftKey) {
      toggleLayoutMode();
      return;
    }
    toggleAdmin();
  }
});
