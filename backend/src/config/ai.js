// The AI models Catalyst may use, as a LIST. Exactly one is the default. A model picker (and a paid model) can be
// added later by adding rows here: nothing else in the app names a model.
//
//   id             short name used inside Catalyst and by a future picker
//   provider       "gemini" (Google Gemini API), "cloudflare" (Workers AI) or "fake" (tests, never calls the network)
//   model          the provider's own model name
//   label          what a student would see
//   maxInputChars  the most text (all messages together) one request may send
//   maxOutputTokens the most the model may write back (a hard cap on every answer)
//   timeoutMs      give up after this long
//   files          true when the model can read a PDF sent with the request
//   inputPrice, outputPrice  US dollars per 1,000,000 tokens on the PAID tier, for the admin cost view. The free tier
//                  costs nothing: the numbers answer "what would this use cost if we paid for it".
//
// Keys live in .env only (GEMINI_API_KEY, or CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN).
const MODELS = [
  {
    id: "gemini-flash-lite",
    provider: "gemini",
    model: "gemini-3.5-flash-lite",
    label: "Gemini Flash-Lite",
    maxInputChars: 300000,
    maxOutputTokens: 8192,
    timeoutMs: 60000,
    files: true,
    inputPrice: 0.10,
    outputPrice: 0.40,
    default: true
  },
  {
    id: "llama-3.1-8b",
    provider: "cloudflare",
    model: "@cf/meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B (free)",
    maxInputChars: 12000,
    maxOutputTokens: 600,
    timeoutMs: 20000,
    files: false,
    inputPrice: 0,
    outputPrice: 0,
    default: false
  },
  {
    id: "fake",
    provider: "fake",
    model: "fake",
    label: "Test model",
    maxInputChars: 300000,
    maxOutputTokens: 8192,
    timeoutMs: 1000,
    files: true,
    inputPrice: 0,
    outputPrice: 0,
    default: false
  }
];

// Which model is used when the caller names none. AI_MODEL in .env can pick another id from the list above.
// AI_PROVIDER=fake switches to the test model without touching any code.
const defaultModel = () => {
  if (process.env.AI_PROVIDER === "fake") return MODELS.find((item) => item.id === "fake");
  const wanted = process.env.AI_MODEL && MODELS.find((item) => item.id === process.env.AI_MODEL && item.provider !== "fake");
  return wanted || MODELS.find((item) => item.default);
};

const findModel = (id) => MODELS.find((item) => item.id === id) || null;

module.exports = { MODELS, defaultModel, findModel };
