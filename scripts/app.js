import {
  addRecord,
  deleteRecord,
  getRecord,
  replaceRecords,
  setFilters,
  state,
  subscribe,
  updateRecord,
  updateSettings,
  visibleRecords
} from './state.js';
import { compileSearch, countMatches, recordMatches } from './search.js';
import { exportRecords, hasSavedRecords, parseImportFile } from './storage.js';
import { fieldRules, cleanText } from './validators.js';
import {
  announce,
  formatNumber,
  readEditorValues,
  renderCap,
  renderChart,
  renderRecords,
  renderSortHeaders,
  renderStats,
  renderTagOptions,
  renderTagSuggestions,
  showEditorErrors,
  turnIntoEditor
} from './ui.js';

const formFields = [
  { key: 'title', inputId: 'title-input', errorId: 'title-error' },
  { key: 'author', inputId: 'author-input', errorId: 'author-error' },
  { key: 'pages', inputId: 'pages-input', errorId: 'pages-error' },
  { key: 'tag', inputId: 'tag-input', errorId: 'tag-error' },
  { key: 'dateAdded', inputId: 'date-input', errorId: 'date-error' },
  { key: 'isbn', inputId: 'isbn-input', errorId: 'isbn-error' }
];

const settingFields = [
  { key: 'wordsPerPage', inputId: 'words-per-page-input', min: 50, max: 2000 },
  { key: 'wordsPerMinute', inputId: 'words-per-minute-input', min: 50, max: 1000 },
  { key: 'monthlyTarget', inputId: 'target-input', min: 0, max: 100000 }
];

const searchInput = document.getElementById('search-input');
const searchError = document.getElementById('search-error');
const searchStatus = document.getElementById('search-status');
const caseToggle = document.getElementById('case-toggle');
const tagFilter = document.getElementById('tag-filter');
const sortSelect = document.getElementById('sort-select');
const bookForm = document.getElementById('book-form');
const settingsForm = document.getElementById('settings-form');
const unitsError = document.getElementById('units-error');
const importInput = document.getElementById('import-input');
const importError = document.getElementById('import-error');
const importStatus = document.getElementById('import-status');
const themeToggle = document.getElementById('theme-toggle');
const mobileNavToggle = document.getElementById('mobile-nav-toggle');

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function showFieldStatus(input, errorSlot, result) {
  input.setAttribute('aria-invalid', result.valid ? 'false' : 'true');
  if (!result.valid) {
    errorSlot.className = 'field-error';
    errorSlot.textContent = result.message;
    errorSlot.hidden = false;
    return;
  }
  if (result.warning) {
    errorSlot.className = 'field-hint-ok';
    errorSlot.textContent = result.warning;
    errorSlot.hidden = false;
    return;
  }
  errorSlot.textContent = '';
  errorSlot.hidden = true;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  const label = theme === 'dark' ? 'Light mode' : 'Dark mode';
  themeToggle.querySelector('.theme-toggle-label').textContent = label;
  themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
}

function setMobileNavOpen(isOpen) {
  mobileNavToggle.setAttribute('aria-expanded', String(isOpen));
  mobileNavToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  document.body.classList.toggle('nav-open', isOpen);
}

function renderVault() {
  if (!searchInput) {
    return;
  }
  const regex = state.filters.regex;
  const visible = visibleRecords().filter(
    (record) => recordMatches(record, regex) && (state.filters.tag === '' || record.tag === state.filters.tag)
  );
  renderRecords(visible, regex, state.records.length);
  renderSortHeaders(state.filters);

  const total = state.records.length;
  if (regex === null && state.filters.pattern !== '') {
    searchStatus.textContent = `${formatNumber(total)} books in the vault. The search pattern is not valid yet.`;
  } else if (regex) {
    const matches = visible.reduce((total2, record) => total2 + countMatches(record, regex), 0);
    searchStatus.textContent = `Showing ${formatNumber(visible.length)} of ${formatNumber(total)} books with ${formatNumber(matches)} highlighted matches.`;
  } else {
    searchStatus.textContent = `Showing all ${formatNumber(total)} books.`;
  }
}

function renderCurrentPage() {
  if (document.getElementById('stat-grid')) {
    renderStats(state.records, state.settings);
    renderCap(state.records, state.settings);
    renderChart(state.records);
  }
  if (searchInput) {
    renderVault();
    renderTagOptions(state.records, state.filters.tag);
  }
  if (document.getElementById('tag-suggestions')) {
    renderTagSuggestions(state.records);
  }
}

function updateSearch() {
  const compiled = compileSearch(state.filters.pattern, state.filters.ignoreCase);
  setFilters({ regex: compiled.regex });
  searchError.textContent = compiled.error;
  searchError.hidden = compiled.error === '';
  searchInput.setAttribute('aria-invalid', compiled.error === '' ? 'false' : 'true');
  markActivePreset();
}

function markActivePreset() {
  document.querySelectorAll('.preset-button').forEach((button) => {
    const isActive = button.dataset.pattern === state.filters.pattern;
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function setSort(key, direction) {
  const nextDirection = direction || (key === 'pages' || key === 'dateAdded' ? 'desc' : 'asc');
  setFilters({ sortKey: key, sortDirection: nextDirection });
  sortSelect.value = `${key}-${nextDirection}`;
}

function containerForAction(button) {
  return button.closest('tr[data-record-id], li[data-record-id]');
}

function handleAction(button) {
  const action = button.dataset.action;

  if (action === 'load-sample') {
    loadSampleData();
    return;
  }
  if (action === 'export') {
    exportRecords(state.records);
    announce(`${formatNumber(state.records.length)} records exported as JSON.`);
    return;
  }
  if (action === 'import') {
    importInput.click();
    return;
  }
  if (action === 'clear') {
    clearVault();
    return;
  }

  const recordId = button.dataset.recordId;
  const record = getRecord(recordId);
  if (!record) {
    announce('That record no longer exists.', 'assertive');
    renderCurrentPage();
    return;
  }
  const container = containerForAction(button);

  if (action === 'edit') {
    turnIntoEditor(container, record);
    const firstInput = container.querySelector('input[data-edit-field]');
    if (firstInput) {
      firstInput.focus();
    }
    announce(`Editing ${record.title}. Press Escape to cancel.`);
    return;
  }

  if (action === 'cancel-edit') {
    renderCurrentPage();
    announce(`Edit cancelled for ${record.title}.`);
    return;
  }

  if (action === 'save-edit') {
    const values = readEditorValues(container);
    const errors = {};
    let firstBadField = '';
    Object.entries(values).forEach(([key, value]) => {
      const rule = fieldRules[key];
      if (!rule) {
        return;
      }
      const result = rule.validate(value);
      if (!result.valid) {
        errors[key] = result.message;
        if (firstBadField === '') {
          firstBadField = key;
        }
      }
    });
    if (firstBadField !== '') {
      showEditorErrors(container, errors);
      announce('Fix the highlighted fields before saving.', 'assertive');
      return;
    }
    const cleaned = {
      title: cleanText(values.title),
      author: cleanText(values.author),
      pages: Number(values.pages),
      tag: cleanText(values.tag),
      dateAdded: values.dateAdded,
      isbn: cleanText(values.isbn || '')
    };
    const result = updateRecord(recordId, cleaned);
    renderCurrentPage();
    announce(result.saved ? `${cleaned.title} updated.` : result.error, result.saved ? 'polite' : 'assertive');
    return;
  }

  if (action === 'delete') {
    const confirmed = window.confirm(`Delete "${record.title}" from the vault?`);
    if (!confirmed) {
      announce('Delete cancelled.');
      return;
    }
    const result = deleteRecord(recordId);
    renderCurrentPage();
    announce(result.saved ? `${record.title} deleted.` : result.error, result.saved ? 'polite' : 'assertive');
  }
}

async function loadSampleData() {
  try {
    const response = await fetch('seed.json');
    if (!response.ok) {
      throw new Error(`seed.json returned ${response.status}`);
    }
    const parsed = parseImportFile(await response.text(), { rebaseDates: true });
    if (!parsed.ok) {
      announce(parsed.problems[0] || 'The sample file could not be read.', 'assertive');
      return;
    }
    replaceRecords(parsed.records);
    announce(`Sample data loaded: ${formatNumber(parsed.records.length)} books.`);
  } catch (error) {
    announce('Sample data needs a local server. Run "npx serve ." or "python -m http.server" and try again.', 'assertive');
  }
}

function clearVault() {
  const confirmed = window.confirm('Clear every record in this browser? Export first if you want a copy.');
  if (!confirmed) {
    return;
  }
  replaceRecords([]);
  announce('Vault cleared.');
}

function readFormValues() {
  const values = {};
  formFields.forEach((field) => {
    values[field.key] = document.getElementById(field.inputId).value;
  });
  return values;
}

function resetForm() {
  bookForm.reset();
  document.getElementById('date-input').value = todayKey();
  formFields.forEach((field) => {
    document.getElementById(field.errorId).hidden = true;
    document.getElementById(field.inputId).setAttribute('aria-invalid', 'false');
  });
}

function fillSettingsForm() {
  settingFields.forEach((field) => {
    document.getElementById(field.inputId).value = state.settings[field.key];
  });
}

function updatePagesConversion() {
  const pages = Number(document.getElementById('convert-pages-input').value);
  const output = document.getElementById('pages-conversion');
  if (!Number.isFinite(pages) || pages <= 0) {
    output.textContent = 'Enter a page count to see words and time.';
    return;
  }
  const words = pages * state.settings.wordsPerPage;
  const minutes = Math.round(words / state.settings.wordsPerMinute);
  output.textContent = `${formatNumber(pages)} pages ≈ ${formatNumber(words)} words ≈ ${formatNumber(minutes)} min (${(minutes / 60).toFixed(1)} h)`;
}

function updateMinutesConversion() {
  const minutes = Number(document.getElementById('convert-minutes-input').value);
  const output = document.getElementById('minutes-conversion');
  if (!Number.isFinite(minutes) || minutes <= 0) {
    output.textContent = 'Enter minutes to see words and pages.';
    return;
  }
  const words = minutes * state.settings.wordsPerMinute;
  const pages = Math.round(words / state.settings.wordsPerPage);
  output.textContent = `${formatNumber(minutes)} min ≈ ${formatNumber(words)} words ≈ ${formatNumber(pages)} pages`;
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  const changes = {};
  let problem = '';
  settingFields.forEach((field) => {
    const raw = document.getElementById(field.inputId).value.trim();
    const value = Number(raw);
    const isWhole = /^\d+$/.test(raw);
    if (!isWhole || value < field.min || value > field.max) {
      if (problem === '') {
        problem = `${field.key} must be a whole number between ${field.min} and ${field.max}.`;
      }
      return;
    }
    changes[field.key] = value;
  });
  if (problem !== '') {
    unitsError.textContent = problem;
    unitsError.hidden = false;
    announce(problem, 'assertive');
    return;
  }
  unitsError.hidden = true;
  updateSettings(changes);
  announce('Settings saved.');
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  importError.hidden = true;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = parseImportFile(String(reader.result));
    if (!parsed.ok) {
      importError.textContent = parsed.problems.slice(0, 3).join(' ');
      importError.hidden = false;
      importStatus.textContent = 'Import failed.';
      announce('Import failed. The file is not a valid records array.', 'assertive');
      return;
    }
    const confirmed = window.confirm(
      `Import ${parsed.records.length} records? This replaces the ${state.records.length} records currently in the vault.`
    );
    if (!confirmed) {
      importStatus.textContent = 'Import cancelled.';
      return;
    }
    replaceRecords(parsed.records);
    const skipped = parsed.problems.length;
    importStatus.textContent = `Imported ${parsed.records.length} records.${skipped > 0 ? ` ${skipped} skipped as invalid.` : ''}`;
    announce(importStatus.textContent, 'polite');
  };
  reader.onerror = () => {
    importError.textContent = 'The file could not be read.';
    importError.hidden = false;
    announce('The import file could not be read.', 'assertive');
  };
  reader.readAsText(file);
  event.target.value = '';
}

function wireEvents() {
  document.addEventListener('click', (event) => {
    if (event.target.closest('.site-nav a') || event.target.closest('.nav-backdrop')) {
      setMobileNavOpen(false);
    }

    const button = event.target.closest('[data-action]');
    if (button) {
      handleAction(button);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (mobileNavToggle?.getAttribute('aria-expanded') === 'true') {
      setMobileNavOpen(false);
      mobileNavToggle.focus();
      return;
    }
    const openEditor = document.querySelector('input[data-edit-field]');
    if (openEditor) {
      renderCurrentPage();
      announce('Edit cancelled.');
    }
  });

  wireVaultEvents();
  wireAddEvents();
  wireSettingsEvents();

  themeToggle?.addEventListener('click', () => {
    const nextTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
    applyTheme(nextTheme);
  });

  mobileNavToggle?.addEventListener('click', () => {
    const isOpen = mobileNavToggle.getAttribute('aria-expanded') === 'true';
    setMobileNavOpen(!isOpen);
  });
}

function wireVaultEvents() {
  if (!searchInput) {
    return;
  }
  searchInput.addEventListener('input', () => {
    setFilters({ pattern: searchInput.value });
    updateSearch();
  });
  caseToggle.addEventListener('change', () => {
    setFilters({ ignoreCase: caseToggle.checked });
    updateSearch();
  });
  document.querySelectorAll('.preset-button').forEach((button) => {
    button.addEventListener('click', () => {
      searchInput.value = button.dataset.pattern;
      setFilters({ pattern: button.dataset.pattern });
      updateSearch();
    });
  });
  tagFilter.addEventListener('change', () => setFilters({ tag: tagFilter.value }));
  sortSelect.addEventListener('change', () => {
    const [key, direction] = sortSelect.value.split('-');
    setFilters({ sortKey: key, sortDirection: direction });
  });
  document.querySelectorAll('.records-table thead th[data-sort-key]').forEach((header) => {
    header.querySelector('.sort-button').addEventListener('click', () => {
      const key = header.dataset.sortKey;
      const naturalDirection = key === 'pages' || key === 'dateAdded' ? 'desc' : 'asc';
      const isActive = state.filters.sortKey === key;
      const direction = isActive ? (state.filters.sortDirection === 'asc' ? 'desc' : 'asc') : naturalDirection;
      setSort(key, direction);
    });
  });
}

function wireAddEvents() {
  if (!bookForm) {
    return;
  }
  formFields.forEach((field) => {
    const input = document.getElementById(field.inputId);
    const errorSlot = document.getElementById(field.errorId);
    input.addEventListener('input', () => {
      if (input.value.trim() !== '') {
        showFieldStatus(input, errorSlot, fieldRules[field.key].validate(input.value));
      }
    });
    input.addEventListener('blur', () => {
      showFieldStatus(input, errorSlot, fieldRules[field.key].validate(input.value));
    });
  });
  bookForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = readFormValues();
    let firstBadField = '';
    formFields.forEach((field) => {
      const input = document.getElementById(field.inputId);
      const result = fieldRules[field.key].validate(values[field.key]);
      showFieldStatus(input, document.getElementById(field.errorId), result);
      if (!result.valid && firstBadField === '') {
        firstBadField = field.key;
      }
    });
    if (firstBadField !== '') {
      const target = formFields.find((field) => field.key === firstBadField);
      document.getElementById(target.inputId).focus();
      announce('The form has errors. Check the highlighted fields.', 'assertive');
      return;
    }
    const cleaned = {
      title: cleanText(values.title),
      author: cleanText(values.author),
      pages: Number(values.pages),
      tag: cleanText(values.tag),
      dateAdded: values.dateAdded,
      isbn: cleanText(values.isbn || '')
    };
    const result = addRecord(cleaned);
    resetForm();
    if (!result.saved) {
      announce(result.error, 'assertive');
      return;
    }
    announce(`${cleaned.title} added to the vault.`);
    window.location.href = 'vault.html';
  });
}

function wireSettingsEvents() {
  if (!settingsForm) {
    return;
  }
  settingsForm.addEventListener('submit', handleSettingsSubmit);
  importInput.addEventListener('change', handleImport);
  document.getElementById('convert-pages-input').addEventListener('input', updatePagesConversion);
  document.getElementById('convert-minutes-input').addEventListener('input', updateMinutesConversion);
}

function start() {
  if (themeToggle) {
    applyTheme(state.settings.theme);
  }
  if (caseToggle) {
    caseToggle.checked = state.filters.ignoreCase;
    sortSelect.value = `${state.filters.sortKey}-${state.filters.sortDirection}`;
  }
  const dateInput = document.getElementById('date-input');
  if (dateInput) {
    dateInput.value = todayKey();
  }
  if (settingsForm) {
    fillSettingsForm();
    updatePagesConversion();
    updateMinutesConversion();
  }
  wireEvents();
  subscribe(renderCurrentPage);
  renderCurrentPage();
  announce(`${state.records.length} books in the vault.`);

  if (!hasSavedRecords()) {
    loadSampleData();
  }
}

start();
