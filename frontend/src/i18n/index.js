import en from "./en";

// One language for now. Add others to this table and pick by the saved language code.
const tables = { en };
let current = "en";

export const t = (key) => tables[current][key] ?? tables.en[key] ?? key;
export const setLanguage = (code) => { if (tables[code]) current = code; };
