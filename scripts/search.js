export const searchableFields = ['title', 'author', 'tag', 'pages', 'dateAdded', 'isbn'];

export function compileSearch(input, ignoreCase) {
  const pattern = String(input || '').trim();
  if (pattern === '') {
    return { regex: null, error: '' };
  }
  const flags = ignoreCase ? 'gi' : 'g';
  try {
    return { regex: new RegExp(pattern, flags), error: '' };
  } catch (error) {
    return { regex: null, error: `That pattern could not be compiled: ${error.message}` };
  }
}

function withGlobalFlag(regex) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  return new RegExp(regex.source, flags);
}

function withoutGlobalFlag(regex) {
  return new RegExp(regex.source, regex.flags.replace(/g/g, ''));
}

export function nonEmptyFields(record) {
  return searchableFields
    .map((field) => String(record[field] ?? ''))
    .filter((value) => value !== '');
}

export function recordSearchText(record) {
  return nonEmptyFields(record).join(' ');
}

export function recordMatches(record, regex) {
  if (!regex) {
    return true;
  }
  const tester = withoutGlobalFlag(regex);
  return nonEmptyFields(record).some((value) => tester.test(value));
}

export function countMatches(record, regex) {
  if (!regex) {
    return 0;
  }
  const matcher = withGlobalFlag(regex);
  return nonEmptyFields(record).reduce((total, value) => {
    const found = value.match(matcher);
    return total + (found ? found.length : 0);
  }, 0);
}

export function highlightInto(element, text, regex) {
  const value = String(text ?? '');
  element.replaceChildren();
  if (!regex) {
    element.textContent = value;
    return 0;
  }
  const globalRegex = withGlobalFlag(regex);
  let cursor = 0;
  let count = 0;
  for (const match of value.matchAll(globalRegex)) {
    const matched = match[0];
    if (matched === '') {
      continue;
    }
    if (match.index > cursor) {
      element.append(value.slice(cursor, match.index));
    }
    const mark = document.createElement('mark');
    mark.textContent = matched;
    element.append(mark);
    cursor = match.index + matched.length;
    count += 1;
  }
  element.append(value.slice(cursor));
  return count;
}
