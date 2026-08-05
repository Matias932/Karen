import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY must be set.");
}

// Groq's API is OpenAI-compatible: same SDK, just a different base URL + key.
export const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
