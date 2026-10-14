import { validateRecordShape } from './validators.js';

const RECORDS_KEY = 'vault:records';
const SETTINGS_KEY = 'vault:settings';

export const defaultSettings = {
  wordsPerPage: 250,
  wordsPerMinute: 238,
  monthlyTarget: 1200,
  theme: 'light'
};

export function hasSavedRecords() {
  try {
    return window.localStorage.getItem(RECORDS_KEY) !== null;
  } catch (error) {
    return false;
  }
}

export function loadRecords() {
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((record) => validateRecordShape(record) === '');
  } catch (error) {
    return [];
  }
}

export function saveRecords(records) {
  try {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return { saved: true, error: '' };
  } catch (error) {
    return { saved: false, error: 'The browser refused to save. Storage may be full or blocked.' };
  }
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...defaultSettings };
    }
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') {
      return { ...defaultSettings };
    }
    return { ...defaultSettings, ...parsed };
  } catch (error) {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { saved: true, error: '' };
  } catch (error) {
    return { saved: false, error: 'Settings could not be saved in this browser.' };
  }
}

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function applyRelativeDates(records, today = new Date()) {
  return records.map((record) => {
    if (typeof record.relativeDay !== 'number') {
      return record;
    }
    const shifted = new Date(today.getFullYear(), today.getMonth(), today.getDate() - record.relativeDay);
    return { ...record, dateAdded: toDateKey(shifted) };
  });
}

export function normaliseRecord(record, index) {
  const now = new Date().toISOString();
  return {
    id: String(record.id || `book_${index + 1}`),
    title: String(record.title ?? ''),
    author: String(record.author ?? ''),
    pages: Number(record.pages ?? 0),
    tag: String(record.tag ?? ''),
    dateAdded: String(record.dateAdded ?? ''),
    isbn: String(record.isbn ?? ''),
    createdAt: String(record.createdAt || now),
    updatedAt: String(record.updatedAt || record.createdAt || now)
  };
}

export function parseImportFile(text, options = {}) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, records: [], problems: ['The file is not valid JSON.'] };
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.records) ? parsed.records : [];
  if (list.length === 0) {
    return { ok: false, records: [], problems: ['No records found. Expected a JSON array of records.'] };
  }
  const entries = options.rebaseDates ? applyRelativeDates(list) : list;
  const problems = [];
  const records = [];
  entries.forEach((entry, index) => {
    const problem = validateRecordShape(entry);
    if (problem !== '') {
      problems.push(`Entry ${index + 1}: ${problem}.`);
      return;
    }
    records.push(normaliseRecord(entry, index));
  });
  if (records.length === 0) {
    return { ok: false, records: [], problems };
  }
  return { ok: true, records, problems };
}

export function exportRecords(records) {
  const payload = {
    app: 'book-notes-vault',
    version: 1,
    exportedAt: new Date().toISOString(),
    records
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vault-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
