# String Properties Analyzer API

## Overview
A robust Node.js Express API engineered to store, analyze, and retrieve strings based on their intrinsic properties. It computes various characteristics such as length, palindrome status, word count, SHA-256 hash, and character frequency, providing advanced filtering capabilities including natural language queries. All data is managed in-memory, ensuring quick analysis and retrieval.

## Features
- **String Storage**: Securely store unique strings with their automatically derived properties.
- **Comprehensive String Analysis**: Each submitted string is processed to determine its length, identify if it's a palindrome, count unique characters, determine word count, generate a SHA-256 hash, and map character frequencies.
- **Direct String Retrieval**: Efficiently fetch the complete set of properties for any stored string using its exact value.
- **Advanced Filtered Retrieval**: Query the stored string collection using specific criteria such as palindrome status, length ranges, precise word counts, or the presence of a particular character.
- **Natural Language Querying**: Interact with the API using human-readable phrases to filter strings, enabling intuitive searches like "palindromic single word" or "longer than 10 characters".
- **String Deletion**: Provides a mechanism to remove stored strings from the system, maintaining data integrity.

## Getting Started
To set up and run this project locally, follow these steps.

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/AjaoPeter8/HNG_STAGE_1.git
    cd HNG_STAGE_1
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the server**:
    ```bash
    npm start
    ```
    The API will then be accessible at `http://localhost:3000`. If you have `nodemon` installed globally or as a dev dependency, you can also use `nodemon index.js` for automatic server restarts during development.

### Environment Variables
While no `.env` file is explicitly required for basic functionality, the application listens on port `3000`. This port can be configured via an environment variable if needed for deployment or local preference.

- `PORT`: Specifies the port number for the API server to listen on.
  *Example*: `PORT=8080`

## API Documentation

### Base URL
`http://localhost:3000` (or `http://localhost:{PORT}`)

### Endpoints

#### POST /strings
Registers a new string in the system and computes all its associated properties.

**Request**:
```json
{
  "value": "example string"
}
```
**Response**:
```json
{
  "id": "782071d7820a232e29307d72111c47c2b3e80d46d03d42e6f477011d13f57262",
  "value": "example string",
  "properties": {
    "length": 14,
    "isPalindrome": false,
    "unique_characters": 8,
    "word_count": 2,
    "sha256_hash": "782071d7820a232e29307d72111c47c2b3e80d46d03d42e6f477011d13f57262",
    "character_frequency_map": {
      "e": 3, "x": 1, "a": 1, "m": 1, "p": 1, "l": 1, " ": 1, "s": 1, "t": 1, "r": 1, "i": 1, "n": 1, "g": 1
    }
  },
  "created_at": "2024-07-30T12:00:00.000Z"
}
```
**Errors**:
- `400 Bad Request`: Invalid request body or missing "value" field.
- `422 Unprocessable Entity`: Input provided is not a string.
- `409 Conflict`: The submitted string already exists in the system.

#### GET /strings/:string_value
Retrieves the properties of a specific string that has been previously stored. The `string_value` in the path parameter is case-insensitive and trimmed for lookup.

**Request**:
_No request body_

**Response**:
```json
{
  "id": "782071d7820a232e29307d72111c47c2b3e80d46d03d42e6f477011d13f57262",
  "value": "example string",
  "properties": {
    "length": 14,
    "isPalindrome": false,
    "unique_characters": 8,
    "word_count": 2,
    "sha256_hash": "782071d7820a232e29307d72111c47c2b3e80d46d03d42e6f477011d13f57262",
    "character_frequency_map": {
      "e": 3, "x": 1, "a": 1, "m": 1, "p": 1, "l": 1, " ": 1, "s": 1, "t": 1, "r": 1, "i": 1, "n": 1, "g": 1
    }
  },
  "created_at": "2024-07-30T12:00:00.000Z"
}
```
**Errors**:
- `404 Not Found`: The specified string does not exist in the system.

#### GET /strings
Retrieves a collection of all stored strings, supporting filtering by various property criteria via query parameters.

**Request**:
_No request body_
**Query Parameters**:
- `is_palindrome` (optional, string): Filter by palindrome status. Accepts `true` or `false`.
- `min_length` (optional, integer): Filter for strings with a minimum character length.
- `max_length` (optional, integer): Filter for strings with a maximum character length.
- `word_count` (optional, integer): Filter for strings with an exact number of words.
- `contains_character` (optional, string): Filter for strings that contain a specific single character.

**Example Query**: `/strings?is_palindrome=true&min_length=3&max_length=5`

**Response**:
```json
{
  "data": [
    {
      "id": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "value": "level",
      "properties": {
        "length": 5,
        "isPalindrome": true,
        "unique_characters": 3,
        "word_count": 1,
        "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "character_frequency_map": {
          "l": 2, "e": 2, "v": 1
        }
      }
    }
  ],
  "count": 1,
  "filters_applied": {
    "is_palindrome": "true",
    "min_length": "3",
    "max_length": "5"
  }
}
```
**Errors**:
- `400 Bad Request`: Invalid or malformed query parameter values (e.g., `is_palindrome` not 'true'/'false', non-integer length/word_count, `contains_character` not a single character).

#### GET /strings/filter-by-natural-language
Retrieves a list of stored strings by interpreting a natural language query into filter parameters.

**Request**:
_No request body_
**Query Parameters**:
- `query` (required, string): A human-readable phrase specifying desired string properties (e.g., "show palindromic single words longer than 5 characters").

**Example Query**: `/strings/filter-by-natural-language?query=find%20all%20palindromic%20strings%20with%20word%20count%20of%201`

**Response**:
```json
{
  "data": [
    {
      "id": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "value": "level",
      "properties": {
        "length": 5,
        "isPalindrome": true,
        "unique_characters": 3,
        "word_count": 1,
        "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "character_frequency_map": {
          "l": 2, "e": 2, "v": 1
        }
      },
      "created_at": "2024-07-30T12:00:00.000Z"
    }
  ],
  "count": 1,
  "interpreted_query": {
    "original": "find all palindromic strings with word count of 1",
    "parsed_filters": {
      "is_palindrome": true,
      "word_count": 1
    }
  }
}
```
**Errors**:
- `400 Bad Request`: Missing, empty, or excessively long (`>500` chars) "query" parameter, or if the system is unable to parse the natural language input into meaningful filters.
- `422 Unprocessable Entity`: The parsed natural language query results in contradictory filter conditions (e.g., specifying both `min_length > X` and `max_length < Y` where `X >= Y`).

#### DELETE /strings/:string_value
Deletes a specific string and its associated properties from the system. The `string_value` in the path parameter is case-insensitive and trimmed for lookup.

**Request**:
_No request body_

**Response**:
_204 No Content_ (An empty response body indicates successful deletion.)

**Errors**:
- `404 Not Found`: The specified string does not exist in the system.

## Technologies Used

| Technology     | Description                                                          | Link                                                       |
| :------------- | :------------------------------------------------------------------- | :--------------------------------------------------------- |
| **Node.js**    | A powerful JavaScript runtime environment built on Chrome's V8 engine. | [nodejs.org](https://nodejs.org/)                          |
| **Express.js** | A minimal and flexible Node.js web application framework that provides robust features for web and mobile applications. | [expressjs.com](https://expressjs.com/)                    |
| **Body-Parser**| Node.js middleware for handling and parsing incoming request bodies in a convenient format. | [npmjs.com/package/body-parser](https://www.npmjs.com/package/body-parser) |
| **Crypto**     | Node.js built-in module providing cryptographic functionality, used here for SHA-256 hashing. | [nodejs.org/api/crypto.html](https://nodejs.org/api/crypto.html) |
| **Axios**      | A popular promise-based HTTP client for making API requests, capable of running in both the browser and Node.js environments. | [axios-http.com](https://axios-http.com/)                  |
| **Nodemon**    | A utility that monitors for any changes in your source and automatically restarts your server, enhancing development workflow. | [nodemon.io](https://nodemon.io/)                          |

## License

This project is open-sourced under the ISC License. For full details, please refer to the [ISC License](https://spdx.org/licenses/ISC.html).

## Author Info

**Peter Ajao**

-   **GitHub**: [AjaoPeter8](https://github.com/AjaoPeter8)
-   **LinkedIn**: [Placeholder for LinkedIn Profile]
-   **Twitter**: [Placeholder for Twitter Handle]
-   **Portfolio**: [Placeholder for Personal Portfolio]

---

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-blue?logo=express&logoColor=white)](https://expressjs.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)
