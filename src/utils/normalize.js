// src/utils/normalize.js
// Lowercase, trim and collapse spaces, so "  Mitochondria " matches "mitochondria"
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, " ");

module.exports = normalize;