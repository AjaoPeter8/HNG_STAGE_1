import express from "express";
import bodyParser from "body-parser";
import crypto from 'crypto';
import axios from "axios";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json({ strict: false }));  // Parses JSON; strict: false allows non-strict types if needed

const inputs = {};


function getProperties(x) {
  const length = x.length;
  const isPalindrome = x === x.split('').reverse().join('');
  const unique_characters = new Set(x.split('')).size;
  const word_count = x.trim().split(/\s+/).length;
  const sha256_hash = crypto.createHash('sha256').update(x).digest('hex');
  const character_frequency_map = {};
  for (const char of x) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
  }


  const properties = {
    length,
    isPalindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map
  }
  return (properties);
}



app.post("/strings", async (req, res) => {

  // Check if body exists and has 'value' field
  if (!req.body || typeof req.body.value === 'undefined') {
    return res.status(400).json({ error: 'Invalid request body or missing "value" field' });
  }

  const request = req.body.value.trim();
  console.log(request);


  //checks if requests is string
  if (typeof request !== 'string') {
    return res.status(422).json({ error: 'Input must be a string' });
  }


  //converts requests to lowercase
  const text = request.toLowerCase();
  if (text in inputs) {
    console.log('String exists!');
    return res.status(409).json({ error: 'String already exists in the system' })
  } else {
    inputs[text] = getProperties(text);
  }

  const properties = getProperties(text);

  res.json({ id: properties.sha256_hash, value: text, properties, created_at: new Date().toISOString() })


});


app.get("/strings/:string_value", (req, res) => {
  // Decode and process the param to match POST logic
  let stringValue = req.params.string_value;
  console.log(req.params);
  stringValue = stringValue.toLowerCase().trim();  // Match: lowercase and trim

  // Lookup in inputs 
  if (!(stringValue in inputs)) {
    return res.status(404).json({ error: 'String does not exist in the system' });
  }

  const properties = getProperties(stringValue);

  res.status(200).json({ id: properties.sha256_hash, value: stringValue, properties, created_at: new Date().toISOString() });
});

// New GET /strings with filters
app.get("/strings", (req, res) => {
  // Parse and validate query params
  const {
    is_palindrome,
    min_length = 0,
    max_length = Infinity,
    word_count,
    contains_character
  } = req.query;

  // Validation
  if (is_palindrome !== undefined && is_palindrome !== 'true' && is_palindrome !== 'false') {
    return res.status(400).json({ error: 'is_palindrome must be "true" or "false"' });
  }
  if (min_length !== undefined && (isNaN(min_length) || parseInt(min_length) < 0)) {
    return res.status(400).json({ error: 'min_length must be a non-negative integer' });
  }
  if (max_length !== undefined && (isNaN(max_length) || parseInt(max_length) < 0)) {
    return res.status(400).json({ error: 'max_length must be a non-negative integer' });
  }
  if (word_count !== undefined && (isNaN(word_count) || parseInt(word_count) < 0)) {
    return res.status(400).json({ error: 'word_count must be a non-negative integer' });
  }
  if (contains_character !== undefined && contains_character.length !== 1) {
    return res.status(400).json({ error: 'contains_character must be a single character' });
  }

  // Convert to usable types
  const boolPalindrome = is_palindrome === 'true';
  const intMinLen = parseInt(min_length) || 0;
  const intMaxLen = parseInt(max_length) || Infinity;
  const intWordCount = parseInt(word_count);
  const charToContain = contains_character;

  // Filter stored entries
  const matches = Object.entries(inputs)
    .filter(([text, properties]) => {
      // Apply each filter (skip if param undefined)
      if (is_palindrome !== undefined && properties.isPalindrome !== boolPalindrome) return false;
      if (min_length !== undefined && properties.length < intMinLen) return false;
      if (max_length !== undefined && properties.length > intMaxLen) return false;
      if (word_count !== undefined && properties.word_count !== intWordCount) return false;
      if (contains_character !== undefined && (properties.character_frequency_map[charToContain] || 0) === 0) return false;
      return true;
    })
    .map(([text, properties]) => ({
      id: properties.sha256_hash,
      value: text,
      properties
    }));

  res.status(200).json({
    data: matches,
    count: matches.length,
    filters_applied: filtersApplied
  });
});


// Helper function: Parse natural language to filter params
function parseNaturalLanguageQuery(query) {
  const filters = {};
  const lowerQuery = query.toLowerCase().trim();

  // If no recognizable patterns, return empty (triggers 400 in route)
  if (!lowerQuery || lowerQuery.length < 5) {
    throw new Error('Unable to parse natural language query');  // For 400
  }

  // Palindrome
  if (lowerQuery.includes('palindromic') || lowerQuery.includes('palindrome')) {
    filters.is_palindrome = true;
  }

  // Word count
  if (lowerQuery.includes('single word')) {
    filters.word_count = 1;
  } else {
    const wordMatch = lowerQuery.match(/(\d+)\s*(word|words)/);
    if (wordMatch) {
      filters.word_count = parseInt(wordMatch[1]);
    }
  }

  // Length
  const lengthMatch = lowerQuery.match(/(?:longer|more) than (\d+) character/);
  if (lengthMatch) {
    filters.min_length = parseInt(lengthMatch[1]) + 1;  // e.g., >10 → min=11
  }

  // Contains character
  const charMatch = lowerQuery.match(/(?:contain|with)\s+(?:the\s+)?(?:letter\s+|first\s+)?([a-z])/);
  if (charMatch) {
    let char = charMatch[1];
    if (lowerQuery.includes('first vowel')) {
      char = 'a';  // Heuristic for first vowel
    }
    filters.contains_character = char;
  }

  // Additional examples like "containing the letter z"
  const letterMatch = lowerQuery.match(/letter\s+([a-z])/);
  if (letterMatch && !charMatch) {
    filters.contains_character = letterMatch[1];
  }

  // Conflict check (e.g., for future max_length; extend as needed)
  if (filters.min_length && filters.max_length && filters.min_length > filters.max_length) {
    throw new Error('Query parsed but resulted in conflicting filters');  // For 422
  }

  return filters;
}

// New GET /strings/filter-by-natural-language
app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req.query;

  // Validation
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty "query" parameter.' });
  }
  if (query.length > 500) {
    return res.status(400).json({ error: 'Query too long (max 500 chars).' });
  }

  const decodedQuery = decodeURIComponent(query.trim());

  try {
    // Parse
    const parsedFilters = parseNaturalLanguageQuery(decodedQuery);

    if (Object.keys(parsedFilters).length === 0) {
      throw new Error('Unable to parse natural language query');  // No filters inferred
    }

    // Apply filters (reuse logic; convert to strings for consistency)
    const filterParams = {};
    if (parsedFilters.is_palindrome !== undefined) filterParams.is_palindrome = parsedFilters.is_palindrome ? 'true' : 'false';
    if (parsedFilters.min_length !== undefined) filterParams.min_length = parsedFilters.min_length.toString();
    if (parsedFilters.max_length !== undefined) filterParams.max_length = parsedFilters.max_length.toString();
    if (parsedFilters.word_count !== undefined) filterParams.word_count = parsedFilters.word_count.toString();
    if (parsedFilters.contains_character !== undefined) filterParams.contains_character = parsedFilters.contains_character;

    // Type conversion (as before)
    const {
      is_palindrome,
      min_length = '0',
      max_length = Infinity,
      word_count,
      contains_character
    } = filterParams;

    const boolPalindrome = is_palindrome === 'true';
    const intMinLen = parseInt(min_length) || 0;
    const intMaxLen = isFinite(parseInt(max_length)) ? parseInt(max_length) : Infinity;
    const intWordCount = parseInt(word_count);
    const charToContain = contains_character;

    // Filter matches
    const matches = Object.entries(inputs)
      .filter(([text, entry]) => {
        if (is_palindrome !== undefined && entry.isPalindrome !== boolPalindrome) return false;
        if (min_length !== undefined && entry.length < intMinLen) return false;
        if (max_length !== undefined && entry.length > intMaxLen) return false;
        if (word_count !== undefined && entry.word_count !== intWordCount) return false;
        if (contains_character !== undefined && (entry.character_frequency_map[charToContain] || 0) === 0) return false;
        return true;
      })
      .map(([text, entry]) => ({
        id: entry.sha256_hash,
        value: text,
        properties: { ...entry, created_at: undefined },  // Exclude created_at from properties
        created_at: entry.created_at
      }));

    // Response
    res.status(200).json({
      data: matches,
      count: matches.length,
      interpreted_query: {
        original: decodedQuery,
        parsed_filters: parsedFilters  // As object, e.g., { word_count: 1, is_palindrome: true }
      }
    });

  } catch (error) {
    if (error.message.includes('conflicting')) {
      return res.status(422).json({ error: 'Query parsed but resulted in conflicting filters' });
    }
    return res.status(400).json({ error: 'Unable to parse natural language query' });
  }
});


// DELETE /strings/{string_value}
app.delete("/strings/:string_value", (req, res) => {
  // Process param to match POST key
  let stringValue = req.params.string_value;
  stringValue = stringValue.toLowerCase().trim();

  // Check if exists
  if (!(stringValue in inputs)) {
    return res.status(404).json({ error: 'String does not exist in the system' });
  }

  // Delete
  delete inputs[stringValue];

  // Success: 204 No Content (empty body)
  res.status(204).send();
});


console.log(inputs);

app.listen(port, () => {
  console.log(`Running on http://localhost:${port}`);
});