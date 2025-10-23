import crypto from 'crypto';

export function getProperties(x) {
  const length = x.length;
  const is_palindrome = x === x.split('').reverse().join('');
  const unique_characters = new Set(x.split('')).size;
  const word_count = x.trim().split(/\s+/).length;
  const sha256_hash = crypto.createHash('sha256').update(x).digest('hex');
  const character_frequency_map = {};
  for (const char of x) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
  }


  const properties = {
    length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map
  }
  return (properties);
}

export function parseNaturalLanguageQuery(query) {
  const lower = query.toLowerCase();
  const filters = {};

  // Example parsing rules
  if (lower.includes('palindromic')) filters.is_palindrome = true;
  if (lower.includes('single word')) filters.word_count = 1;
  if (lower.match(/longer than (\d+)/)) filters.min_length = parseInt(lower.match(/longer than (\d+)/)[1]) + 1;
  if (lower.match(/containing the letter (\w)/)) filters.contains_character = lower.match(/containing the letter (\w)/)[1];
  if (lower.match(/contain the first vowel/)) filters.contains_character = 'a';

  // Add more patterns as needed...

  return Object.keys(filters).length ? filters : null;
}

export function filterStrings(filters) {
  return Object.entries(inputs)
    .filter(([key, props]) => {
      const text = key.toLowerCase(); // e.g. "tunde ednut"

      // Word count filter
      if (filters.word_count && props.word_count !== filters.word_count) return false;

      // Palindrome filter
      if (filters.is_palindrome && !props.is_palindrome && !props.is_palindrome) return false;

      // Minimum length filter
      if (filters.min_length && props.length < filters.min_length) return false;

      // Contains specific character
      if (filters.contains_character && !text.includes(filters.contains_character)) return false;

      return true;
    })
    .map(([key]) => key); // return only the string names (keys)
}
