/**
 * Product-wide settings. The product name is not final; change it here only.
 */
export const APP_NAME = "AI Receptionist";

/** Who runs the service (shown on the privacy page). */
export const OPERATOR = {
  name: "CostaHub",
  website: "https://costahub.co",
  // TODO(founder): the contact address customers can use for privacy requests.
  contactEmail: "",
};

/** The AI receptionist. Change the model here only. */
export const AI = {
  model: "claude-opus-5-5",
  // "low" keeps replies fast and cheap; raise only if quality needs it.
  effort: "low" as const,
  maxTokens: 4000,
  // How many earlier messages of the conversation Claude sees.
  historyLimit: 30,
  timeoutMs: 45_000,
};

/** Protection against abuse and runaway costs (per business / visitor). */
export const CHAT_LIMITS = {
  maxMessageLength: 1000,
  // Customer messages per conversation per hour.
  messagesPerConversationPerHour: 30,
  // New conversations per visitor (IP address) per business per hour.
  conversationsPerIpPerHour: 10,
  // AI replies per business per 24 hours; after that, messages are passed to the team.
  aiRepliesPerBusinessPerDay: 300,
};

/** The AI team. Only the receptionist works so far; the others are shown as "coming soon". */
export const AI_TEAM = [
  { key: "receptionist", active: true },
  { key: "marketer", active: false },
  { key: "officeManager", active: false },
  { key: "analyst", active: false },
] as const;

/** Owner inbox. */
export const INBOX = {
  maxReplyLength: 2000,
  // How often an open inbox re-checks for news if live updates are unavailable.
  fallbackRefreshMs: 30_000,
  // How often the website chat checks for replies from the team.
  widgetPollWaitingMs: 4_000,
  widgetPollIdleMs: 15_000,
};
