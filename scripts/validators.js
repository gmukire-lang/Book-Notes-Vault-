export const patterns = {
  title: /^\S(?:.*\S)?$/,
  repeatedSpace: /\s{2,}/,
  repeatedWord: /\b(\w+)\s+\1\b/i,
  author: /^[A-Za-z .'-]+$/,
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  pages: /^(0|[1-9]\d*)$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  isbn: /^(?:97[89](?:-?\d){10}|\d(?:-?\d){8}[\dXx])$/,
  plainDigits: /^\d+$/
};

export const fieldRules = {
  title: {
    label: 'Title',
    patternSource: String(patterns.title),
    validate: validateTitle
  },
  author: {
    label: 'Author',
    patternSource: String(patterns.author),
    validate: validateAuthor
  },
  pages: {
    label: 'Pages',
    patternSource: String(patterns.pages),
    validate: validatePages
  },
  tag: {
    label: 'Tag',
    patternSource: String(patterns.tag),
    validate: validateTag
  },
  dateAdded: {
    label: 'Date added',
    patternSource: String(patterns.date),
    validate: validateDate
  },
  isbn: {
    label: 'ISBN',
    patternSource: String(patterns.isbn),
    validate: validateIsbn
  }
};

export function cleanText(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function isRealDate(value) {
  if (!patterns.date.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function validateTitle(value) {
  const text = String(value);
  if (text.length === 0) {
    return { valid: false, message: 'Title is required.' };
  }
  if (!patterns.title.test(text)) {
    return { valid: false, message: 'Title cannot start or end with a space.' };
  }
  if (patterns.repeatedSpace.test(text)) {
    return { valid: false, message: 'Title has a double space. One space between words is enough.' };
  }
  if (/[\u0000-\u001f<>]/.test(text)) {
    return { valid: false, message: 'Title cannot contain control characters or angle brackets.' };
  }
  const repeated = findRepeatedWord(text);
  if (repeated) {
    return { valid: true, message: 'Looks good.', warning: `Heads up: "${repeated}" is repeated in a row.` };
  }
  return { valid: true, message: 'Looks good.' };
}

export function validateAuthor(value) {
  const text = String(value);
  if (text.length === 0) {
    return { valid: false, message: 'Author is required.' };
  }
  if (text.length > 80) {
    return { valid: false, message: 'Author name is too long (80 characters max).' };
  }
  if (!patterns.title.test(text)) {
    return { valid: false, message: 'Author cannot start or end with a space.' };
  }
  if (patterns.repeatedSpace.test(text)) {
    return { valid: false, message: 'Author has a double space. One space between words is enough.' };
  }
  if (!patterns.author.test(text)) {
    return { valid: false, message: 'Use letters with spaces, periods, apostrophes or hyphens only.' };
  }
  return { valid: true, message: 'Looks good.' };
}

export function validatePages(value) {
  const text = String(value).trim();
  if (text.length === 0) {
    return { valid: false, message: 'Pages is required.' };
  }
  if (!patterns.plainDigits.test(text)) {
    return { valid: false, message: 'Pages must be digits only. No decimals or letters.' };
  }
  if (!patterns.pages.test(text)) {
    return { valid: false, message: 'Pages cannot start with a zero, such as 012.' };
  }
  const number = Number(text);
  if (number > 99999) {
    return { valid: false, message: 'Pages must be 99999 or less.' };
  }
  return { valid: true, message: 'Looks good.' };
}

export function validateTag(value) {
  const text = String(value);
  if (text.length === 0) {
    return { valid: false, message: 'Tag is required.' };
  }
  if (!patterns.tag.test(text)) {
    return { valid: false, message: 'Tag allows letters separated by single spaces or hyphens, such as Sci-Fi.' };
  }
  return { valid: true, message: 'Looks good.' };
}

export function validateDate(value) {
  const text = String(value).trim();
  if (text.length === 0) {
    return { valid: false, message: 'Date added is required.' };
  }
  if (!patterns.date.test(text)) {
    return { valid: false, message: 'Use the format YYYY-MM-DD, such as 2025-09-29.' };
  }
  if (!isRealDate(text)) {
    return { valid: false, message: 'That date does not exist on the calendar.' };
  }
  return { valid: true, message: 'Looks good.' };
}

export function validateIsbn(value) {
  const text = String(value).trim();
  if (text.length === 0) {
    return { valid: true, message: 'ISBN is optional, so this is fine.' };
  }
  if (!patterns.isbn.test(text)) {
    return { valid: false, message: 'Use an ISBN-10 or ISBN-13, hyphens allowed, such as 978-0-13-235088-4.' };
  }
  return { valid: true, message: 'Looks good.' };
}

export function findRepeatedWord(text) {
  const match = String(text).match(patterns.repeatedWord);
  return match ? match[1] : '';
}

export function isValidField(name, value) {
  const rule = fieldRules[name];
  return rule ? rule.validate(value).valid : true;
}

export function validateRecordShape(record) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return 'entry is not an object';
  }
  if (typeof record.id !== 'string' || record.id.length === 0) {
    return 'id is missing or not a string';
  }
  if (!isValidField('title', record.title)) {
    return 'title is invalid';
  }
  if (!isValidField('author', record.author)) {
    return 'author is invalid';
  }
  if (typeof record.pages !== 'number' || !Number.isFinite(record.pages) || record.pages < 0) {
    return 'pages must be a number of 0 or more';
  }
  if (!isValidField('tag', record.tag)) {
    return 'tag is invalid';
  }
  if (!isValidField('dateAdded', record.dateAdded)) {
    return 'dateAdded is invalid';
  }
  if (record.isbn !== undefined && !isValidField('isbn', record.isbn)) {
    return 'isbn is invalid';
  }
  return '';
}
