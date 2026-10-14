import { loadRecords, loadSettings, saveRecords, saveSettings } from './storage.js';
import { sortRecords } from './ui.js';

const listeners = [];

export const state = {
  records: loadRecords(),
  settings: loadSettings(),
  filters: {
    pattern: '',
    ignoreCase: true,
    tag: '',
    sortKey: 'dateAdded',
    sortDirection: 'desc',
    regex: null
  }
};

export function subscribe(listener) {
  listeners.push(listener);
}

function notify() {
  listeners.forEach((listener) => listener(state));
}

export function nextRecordId() {
  const highest = state.records.reduce((best, record) => {
    const number = Number(String(record.id).replace(/\D/g, ''));
    return Number.isFinite(number) && number > best ? number : best;
  }, 0);
  return `book_${String(highest + 1).padStart(4, '0')}`;
}

export function addRecord(values) {
  const now = new Date().toISOString();
  const record = {
    id: nextRecordId(),
    title: values.title,
    author: values.author,
    pages: Number(values.pages),
    tag: values.tag,
    dateAdded: values.dateAdded,
    isbn: values.isbn || '',
    createdAt: now,
    updatedAt: now
  };
  state.records = [record, ...state.records];
  return persist();
}

export function updateRecord(recordId, values) {
  let updated = null;
  state.records = state.records.map((record) => {
    if (record.id !== recordId) {
      return record;
    }
    updated = { ...record, ...values, pages: Number(values.pages), updatedAt: new Date().toISOString() };
    return updated;
  });
  return persist(updated);
}

export function deleteRecord(recordId) {
  state.records = state.records.filter((record) => record.id !== recordId);
  return persist();
}

export function replaceRecords(records) {
  state.records = records;
  return persist();
}

export function getRecord(recordId) {
  return state.records.find((record) => record.id === recordId) || null;
}

export function visibleRecords() {
  return sortRecords(state.records, state.filters);
}

export function setFilters(changes) {
  state.filters = { ...state.filters, ...changes };
  notify();
}

export function updateSettings(changes) {
  state.settings = { ...state.settings, ...changes };
  saveSettings(state.settings);
  notify();
}

function persist(updatedRecord = null) {
  const result = saveRecords(state.records);
  notify();
  return { ...result, record: updatedRecord };
}
