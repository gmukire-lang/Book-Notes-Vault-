import { highlightInto } from './search.js';
import { toDateKey } from './storage.js';

const editableFields = [
  { key: 'title', type: 'text', label: 'Title' },
  { key: 'author', type: 'text', label: 'Author' },
  { key: 'pages', type: 'number', label: 'Pages' },
  { key: 'tag', type: 'text', label: 'Tag' },
  { key: 'dateAdded', type: 'date', label: 'Date added' }
];

const numberFormat = new Intl.NumberFormat('en');

let capTone = 'under';

export function formatNumber(value) {
  return numberFormat.format(value);
}

export function announce(message, tone = 'polite') {
  const region = document.getElementById(tone === 'assertive' ? 'assertive-region' : 'polite-region');
  if (!region) {
    return;
  }
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 40);
}

export function sortRecords(records, filters) {
  const direction = filters.sortDirection === 'asc' ? 1 : -1;
  const key = filters.sortKey;
  return [...records].sort((first, second) => {
    const firstValue = first[key];
    const secondValue = second[key];
    if (typeof firstValue === 'number' && typeof secondValue === 'number') {
      return (firstValue - secondValue) * direction;
    }
    return String(firstValue).localeCompare(String(secondValue), 'en', { sensitivity: 'base', numeric: true }) * direction;
  });
}

function sumPagesOn(records, dateKey) {
  return records
    .filter((record) => record.dateAdded === dateKey)
    .reduce((total, record) => total + Number(record.pages), 0);
}

function lastSevenDays() {
  const days = [];
  const today = new Date();
  for (let daysBack = 6; daysBack >= 0; daysBack -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysBack);
    days.push({ key: toDateKey(date), label: date.toLocaleDateString('en', { weekday: 'short' }) });
  }
  return days;
}

export function renderStats(records, settings) {
  const grid = document.getElementById('stat-grid');
  const totalPages = records.reduce((total, record) => total + Number(record.pages), 0);
  const todayPages = sumPagesOn(records, toDateKey(new Date()));
  const topTag = topTagOf(records);
  const averagePages = records.length === 0 ? 0 : Math.round(totalPages / records.length);
  const totalMinutes = (totalPages * settings.wordsPerPage) / settings.wordsPerMinute;
  const hours = totalMinutes / 60;

  const cards = [
    { label: 'Books in vault', value: formatNumber(records.length), note: 'records saved in this browser' },
    { label: 'Pages catalogued', value: formatNumber(totalPages), note: 'sum of the pages column' },
    { label: 'Added today', value: formatNumber(todayPages), note: 'pages catalogued today' },
    { label: 'Top tag', value: topTag, note: 'used by the most books' },
    { label: 'Average length', value: `${formatNumber(averagePages)} pages`, note: 'per book in the vault' },
    { label: 'Reading time', value: `${formatNumber(Math.round(hours))} h`, note: 'at the speed set in Settings' }
  ];

  grid.replaceChildren(
    ...cards.map((card, index) => {
      const element = document.createElement('article');
      element.className = 'stat-card';
      element.style.animationDelay = `${index * 60}ms`;
      const label = document.createElement('p');
      label.className = 'stat-label';
      label.textContent = card.label;
      const value = document.createElement('p');
      value.className = 'stat-value';
      value.textContent = card.value;
      const note = document.createElement('p');
      note.className = 'stat-note';
      note.textContent = card.note;
      element.append(label, value, note);
      return element;
    })
  );
}

function topTagOf(records) {
  const counts = {};
  records.forEach((record) => {
    counts[record.tag] = (counts[record.tag] || 0) + 1;
  });
  const tags = Object.keys(counts).sort();
  if (tags.length === 0) {
    return 'No tags yet';
  }
  return tags.reduce((best, tag) => (counts[tag] > counts[best] ? tag : best), tags[0]);
}

export function renderCap(records, settings) {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthPages = records
    .filter((record) => record.dateAdded.startsWith(monthPrefix))
    .reduce((total, record) => total + Number(record.pages), 0);
  const target = Number(settings.monthlyTarget);
  const percentage = target === 0 ? 0 : Math.min(100, (monthPages / target) * 100);

  const meterFill = document.getElementById('cap-meter-fill');
  const meter = document.getElementById('cap-meter');
  const message = document.getElementById('cap-message');

  meterFill.style.width = `${percentage}%`;
  meterFill.classList.toggle('over', monthPages > target);
  meter.setAttribute('aria-label', `${formatNumber(monthPages)} of ${formatNumber(target)} pages this month`);

  if (monthPages > target) {
    const overage = monthPages - target;
    message.textContent = `Over target by ${formatNumber(overage)} pages this month (${formatNumber(monthPages)} of ${formatNumber(target)}).`;
    if (capTone !== 'over') {
      announce(`Monthly target exceeded by ${overage} pages.`, 'assertive');
    }
    capTone = 'over';
  } else {
    message.textContent = `${formatNumber(monthPages)} of ${formatNumber(target)} pages this month. ${formatNumber(target - monthPages)} pages to go.`;
    capTone = 'under';
  }
}

export function renderChart(records) {
  const chart = document.getElementById('bar-chart');
  const days = lastSevenDays();
  const values = days.map((day) => sumPagesOn(records, day.key));
  const highest = Math.max(...values, 1);

  chart.replaceChildren(
    ...days.map((day, index) => {
      const pages = values[index];
      const item = document.createElement('li');
      const value = document.createElement('span');
      value.className = 'bar-value';
      value.textContent = pages === 0 ? '0' : formatNumber(pages);
      const bar = document.createElement('span');
      bar.className = pages === 0 ? 'bar empty' : 'bar';
      bar.setAttribute('aria-hidden', 'true');
      bar.style.height = `${Math.max(4, (pages / highest) * 100)}%`;
      bar.style.animationDelay = `${index * 70}ms`;
      const label = document.createElement('span');
      label.className = 'bar-day';
      label.textContent = day.label;
      item.append(value, bar, label);
      return item;
    })
  );
  chart.setAttribute('aria-label', `Pages added per day: ${days.map((day, index) => `${day.label} ${values[index]}`).join(', ')}`);
}

export function renderTagOptions(records, selectedTag) {
  const select = document.getElementById('tag-filter');
  const tags = [...new Set(records.map((record) => record.tag))].sort();
  select.replaceChildren();
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All tags';
  select.append(allOption);
  tags.forEach((tag) => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    select.append(option);
  });
  select.value = tags.includes(selectedTag) ? selectedTag : '';
}

export function renderTagSuggestions(records) {
  const datalist = document.getElementById('tag-suggestions');
  const tags = [...new Set(records.map((record) => record.tag))].sort();
  datalist.replaceChildren(
    ...tags.map((tag) => {
      const option = document.createElement('option');
      option.value = tag;
      return option;
    })
  );
}

function tagBadge(tag, regex) {
  const badge = document.createElement('span');
  badge.className = 'tag-badge';
  highlightInto(badge, tag, regex);
  return badge;
}

function actionButton(action, label, record, extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `row-button ${extraClass}`.trim();
  button.dataset.action = action;
  button.dataset.recordId = record.id;
  button.textContent = label;
  button.setAttribute('aria-label', `${label} ${record.title}`);
  return button;
}

function buildActionCell(record) {
  const cell = document.createElement('td');
  const wrapper = document.createElement('div');
  wrapper.className = 'row-actions';
  wrapper.dataset.role = 'actions';
  wrapper.append(actionButton('edit', 'Edit', record), actionButton('delete', 'Delete', record, 'delete'));
  cell.append(wrapper);
  return cell;
}

function buildTableRow(record, regex) {
  const row = document.createElement('tr');
  row.dataset.recordId = record.id;

  const titleCell = document.createElement('td');
  titleCell.className = 'cell-title';
  titleCell.dataset.field = 'title';
  highlightInto(titleCell, record.title, regex);
  if (record.isbn !== '') {
    const note = document.createElement('p');
    note.className = 'cell-note';
    note.textContent = `ISBN ${record.isbn}`;
    titleCell.append(note);
  }
  row.append(titleCell);

  [['author', record.author], ['pages', formatNumber(record.pages)]].forEach(([field, value]) => {
    const cell = document.createElement('td');
    cell.dataset.field = field;
    highlightInto(cell, value, regex);
    row.append(cell);
  });

  const tagCell = document.createElement('td');
  tagCell.dataset.field = 'tag';
  tagCell.append(tagBadge(record.tag, regex));
  row.append(tagCell);

  const dateCell = document.createElement('td');
  dateCell.dataset.field = 'dateAdded';
  highlightInto(dateCell, record.dateAdded, regex);
  row.append(dateCell, buildActionCell(record));
  return row;
}

function buildRecordCard(record, regex) {
  const card = document.createElement('li');
  card.className = 'record-card';
  card.dataset.recordId = record.id;

  const heading = document.createElement('h3');
  heading.dataset.field = 'title';
  highlightInto(heading, record.title, regex);
  card.append(heading);

  const list = document.createElement('dl');
  const entries = [
    ['Author', 'author', record.author],
    ['Pages', 'pages', formatNumber(record.pages)],
    ['Tag', 'tag', record.tag],
    ['Added', 'dateAdded', record.dateAdded]
  ];
  if (record.isbn !== '') {
    entries.push(['ISBN', 'isbn', record.isbn]);
  }
  entries.forEach(([label, field, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.dataset.field = field;
    highlightInto(description, value, regex);
    list.append(term, description);
  });
  card.append(list);

  const actions = document.createElement('div');
  actions.className = 'row-actions';
  actions.dataset.role = 'actions';
  actions.append(actionButton('edit', 'Edit', record), actionButton('delete', 'Delete', record, 'delete'));
  card.append(actions);
  return card;
}

export function renderRecords(records, regex, totalCount) {
  const body = document.getElementById('records-body');
  const cards = document.getElementById('record-cards');
  const emptyState = document.getElementById('vault-empty');
  const heading = emptyState.querySelector('h2');
  const buttonRow = emptyState.querySelector('.button-row');

  body.replaceChildren(...records.map((record) => buildTableRow(record, regex)));
  cards.replaceChildren(...records.map((record) => buildRecordCard(record, regex)));

  emptyState.hidden = records.length > 0;
  if (records.length === 0) {
    if (totalCount === 0) {
      heading.textContent = 'The vault is empty';
      buttonRow.hidden = false;
    } else {
      heading.textContent = 'No books match the current filters';
      buttonRow.hidden = true;
    }
  }
}

export function renderSortHeaders(filters) {
  document.querySelectorAll('.records-table thead th[data-sort-key]').forEach((header) => {
    const isActive = header.dataset.sortKey === filters.sortKey;
    header.setAttribute('aria-sort', isActive ? (filters.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
  });
}

function buildEditorInput(field, record, scope) {
  const wrapper = document.createElement('div');
  wrapper.className = 'edit-form';
  const inputId = `edit-${scope}-${field.key}-${record.id}`;
  const label = document.createElement('label');
  label.className = 'visually-hidden';
  label.textContent = `${field.label} for ${record.title}`;
  label.htmlFor = inputId;
  const input = document.createElement('input');
  input.type = field.type;
  input.id = inputId;
  input.value = record[field.key];
  if (field.key === 'pages') {
    input.min = '0';
    input.step = '1';
    input.inputMode = 'numeric';
  }
  input.dataset.editField = field.key;
  const error = document.createElement('p');
  error.className = 'field-error';
  error.dataset.role = 'field-error';
  error.hidden = true;
  wrapper.append(label, input, error);
  return wrapper;
}

export function turnIntoEditor(container, record) {
  const scope = container.tagName === 'TR' ? 'row' : 'card';
  editableFields.forEach((field) => {
    const slot = container.querySelector(`[data-field="${field.key}"]`);
    if (slot) {
      slot.replaceChildren(buildEditorInput(field, record, scope));
    }
  });

  const actions = container.querySelector('[data-role="actions"]');
  if (actions) {
    actions.replaceChildren(
      buildEditorInput({ key: 'isbn', type: 'text', label: 'ISBN' }, record, scope),
      actionButton('save-edit', 'Save', record),
      actionButton('cancel-edit', 'Cancel', record)
    );
  }
}

export function readEditorValues(container) {
  const values = {};
  container.querySelectorAll('input[data-edit-field]').forEach((input) => {
    values[input.dataset.editField] = input.value;
  });
  return values;
}

export function showEditorErrors(container, errors) {
  container.querySelectorAll('input[data-edit-field]').forEach((input) => {
    const message = errors[input.dataset.editField] || '';
    const errorSlot = input.parentElement.querySelector('[data-role="field-error"]');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorSlot) {
      errorSlot.textContent = message;
      errorSlot.hidden = message === '';
    }
  });
  const firstInvalid = container.querySelector('input[aria-invalid="true"]');
  if (firstInvalid) {
    firstInvalid.focus();
  }
}
