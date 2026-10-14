import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { AI } from "@/config/app";
import { buildSystemPrompt, formatNow, localDate, type ReceptionistKnowledge } from "./prompt";

export type ChatTurn = { sender: "customer" | "ai" | "human" | "system"; content: string };

const ReplySchema = z.object({
  decision: z.enum(["answer", "handoff"]),
  reply: z.string(),
  handoff_reason: z.string(),
  customer_name: z.string(),
  customer_phone: z.string(),
  customer_email: z.string(),
  lead_ready: z.boolean(),
  lead_summary: z.string(),
});

export type ReceptionistReply = z.infer<typeof ReplySchema> & {
  /** False when the AI could not be used and a standard holding message was returned. */
  fromAi: boolean;
  meta: Record<string, unknown>;
};

const HOLDING_MESSAGE: Record<string, string> = {
  cs: "Děkujeme za zprávu! Předám ji kolegům a ozveme se vám co nejdříve. Můžete mi prosím nechat své jméno a telefon nebo e-mail?",
  en: "Thank you for your message! I'll pass it on to the team and we'll get back to you as soon as possible. Could you leave your name and a phone number or email?",
};

/** The standard reply when the AI is unavailable (no key, limit reached, outage…). */
export function holdingReply(language: string, reason: string): ReceptionistReply {
  return {
    decision: "handoff",
    reply: HOLDING_MESSAGE[language] ?? HOLDING_MESSAGE.cs,
    handoff_reason: reason,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    lead_ready: false,
    lead_summary: "",
    fromAi: false,
    meta: { reason },
  };
}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.replace(/\s+/g, ""), timeout: AI.timeoutMs, maxRetries: 1 });
  return client;
}

/** Earlier messages in the format Claude expects (customer = user, us = assistant). */
function toMessages(history: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  const turns = history.filter((m) => m.sender !== "system" && m.content.trim());
  // The conversation must start with the customer.
  while (turns.length && turns[0].sender !== "customer") turns.shift();
  return turns.map((m) => ({
    role: m.sender === "customer" ? "user" : "assistant",
    content: m.content,
  }));
}

/**
 * Asks Claude for the next reply. Never throws: on any problem it returns the
 * standard holding message as a handoff, so the customer always gets an answer
 * and the team gets the conversation.
 */
export async function getReceptionistReply(
  knowledge: ReceptionistKnowledge,
  history: ChatTurn[],
  language: string,
  now = new Date(),
): Promise<ReceptionistReply> {
  const anthropic = getClient();
  if (!anthropic) return holdingReply(language, "AI is not configured (missing ANTHROPIC_API_KEY).");

  const timeZone = knowledge.business.timezone || "Europe/Prague";
  const messages = toMessages(history);
  if (messages.length === 0) return holdingReply(language, "Empty conversation.");

  try {
    const response = await anthropic.beta.messages.parse({
      model: AI.model,
      max_tokens: AI.maxTokens,
      // If Claude's safety filters decline a message, Anthropic retries it on
      // another model automatically instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: AI.effort, format: betaZodOutputFormat(ReplySchema) },
      system: [
        {
          type: "text",
          text: buildSystemPrompt(knowledge, localDate(now, timeZone)),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        ...messages,
        // Sent after the cached part, so the changing time doesn't break caching.
        { role: "system", content: `Current date and time at the business (${timeZone}): ${formatNow(now, timeZone)}.` },
      ],
    });

    const meta = {
      model: response.model,
      stop_reason: response.stop_reason,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cache_read: response.usage.cache_read_input_tokens,
        cache_write: response.usage.cache_creation_input_tokens,
      },
    };

    const parsed = response.parsed_output;
    if (response.stop_reason === "refusal" || !parsed || !parsed.reply.trim()) {
      return { ...holdingReply(language, `AI gave no usable reply (${response.stop_reason}).`), meta };
    }
    return { ...parsed, reply: parsed.reply.trim().slice(0, 3000), fromAi: true, meta };
  } catch (error) {
    const reason =
      error instanceof Anthropic.APIError ? `AI error ${error.status ?? ""}: ${error.message}` : `AI error: ${String(error)}`;
    console.error("Receptionist AI call failed", reason);
    return holdingReply(language, reason.slice(0, 500));
  }
}
