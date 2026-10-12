import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CHAT_LIMITS } from "@/config/app";
import { getConversation, postCustomerMessage, type ChatResult } from "@/lib/chat/service";

// Claude usually answers in a few seconds; leave room for slow moments.
export const maxDuration = 60;

const STATUS: Record<Exclude<ChatResult, { ok: true }>["error"], number> = {
  not_found: 404,
  disabled: 403,
  forbidden: 403,
  rate_limited: 429,
  server: 500,
};

function respond(result: ChatResult) {
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: STATUS[result.error] });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

const postSchema = z.object({
  key: z.string().max(100),
  conversationId: z.uuid().optional(),
  token: z.string().max(100).optional(),
  text: z.string().trim().min(1).max(CHAT_LIMITS.maxMessageLength),
  language: z.enum(["cs", "en"]).default("cs"),
  preview: z.boolean().default(false),
});

function clientIp(request: NextRequest) {
  return (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "").split(",")[0].trim();
}

/** A visitor sends a message from the website chat. */
export async function POST(request: NextRequest) {
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    return respond(await postCustomerMessage({ ...parsed.data, publicKey: parsed.data.key, ip: clientIp(request) }));
  } catch (error) {
    console.error("Widget message failed", error);
    return respond({ ok: false, error: "server" });
  }
}

/** A visitor reopens the chat: return the conversation so far. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const key = params.get("key") ?? "";
  const conversationId = params.get("conversationId") ?? "";
  const token = params.get("token") ?? "";
  if (!z.uuid().safeParse(conversationId).success || !token) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    return respond(await getConversation(key, conversationId, token));
  } catch (error) {
    console.error("Widget history failed", error);
    return respond({ ok: false, error: "server" });
  }
}
