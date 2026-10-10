import OpenAI from "openai";
import { env } from "../config/env";
import { logger } from "./logger";

// All AI calls go through here. Without OPENAI_API_KEY every helper returns
// its fallback, so the whole app works (with simpler answers) with no key.
export const isAIConfigured = Boolean(env.openai.apiKey);
const client = isAIConfigured ? new OpenAI({ apiKey: env.openai.apiKey }) : null;

export async function aiText(system: string, user: string, fallback: string): Promise<string> {
  if (!client) return fallback;
  try {
    const res = await client.chat.completions.create({
      model: env.openai.model,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || fallback;
  } catch (err) {
    logger.error(`[ai] request failed: ${(err as Error).message}`);
    return fallback;
  }
}

export async function aiJSON<T>(system: string, user: string, fallback: T): Promise<T> {
  if (!client) return fallback;
  try {
    const res = await client.chat.completions.create({
      model: env.openai.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const content = res.choices[0]?.message?.content;
    return content ? ({ ...fallback, ...JSON.parse(content) } as T) : fallback;
  } catch (err) {
    logger.error(`[ai] request failed: ${(err as Error).message}`);
    return fallback;
  }
}
