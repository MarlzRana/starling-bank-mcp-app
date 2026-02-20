const BEARER_TOKEN = process.env.BEARER_TOKEN;
const STARLING_API_BASE_URL =
process.env.STARLING_API_BASE_URL ?? "https://api.starlingbank.com";

if (!BEARER_TOKEN) {
throw new Error("BEARER_TOKEN environment variable is required");
}
