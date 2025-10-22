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

  res.status(201).json({ id: properties.sha256_hash, value: text, properties, created_at: new Date().toISOString() })


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

function filterStrings(filters) {
  return Object.values(inputs).filter(strObj => {
    const text = strObj.value;

    // Apply filters
    if (filters.word_count && text.trim().split(/\s+/).length !== filters.word_count) return false;
    if (filters.is_palindrome && text !== text.split('').reverse().join('')) return false;
    if (filters.min_length && text.length < filters.min_length) return false;
    if (filters.contains_character && !text.includes(filters.contains_character)) return false;

    return true;
  });
}



// New GET /strings/filter-by-natural-language
app.get('/strings/filter-by-natural-language', (req, res) => {
  const query = req.query.query;

  // 1️⃣ Missing query
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Missing natural language query' });
  }

  try {
    // 2️⃣ Parse query into filters
    const parsedFilters = parseNaturalLanguageQuery(query);

    if (!parsedFilters) {
      return res.status(400).json({ error: 'Unable to parse natural language query' });
    }

    // 3️⃣ Detect conflicting filters (logical contradictions)
    if (parsedFilters.is_palindrome && parsedFilters.word_count > 1) {
      return res.status(422).json({
        error: 'Query parsed but resulted in conflicting filters',
        details: 'Palindromes cannot have more than one word'
      });
    }

    // 4️⃣ Filter results
    const results = filterStrings(parsedFilters);

    // 5️⃣ Send success response
    res.status(200).json({
      data: results,
      count: results.length,
      interpreted_query: {
        original: query,
        parsed_filters: parsedFilters
      }
    });

  } catch (error) {
    // 6️⃣ Unexpected internal error
    console.error('Error processing natural language query:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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