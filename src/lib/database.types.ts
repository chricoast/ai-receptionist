/**
 * TypeScript description of the database (mirrors supabase/migrations).
 * Keep in sync by hand, or regenerate with:
 *   npx supabase gen types typescript --project-id dfavqhhjkbkothdybtkb > src/lib/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type BusinessRow = {
  id: string;
  name: string;
  type: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  booking_url: string;
  languages: string[];
  timezone: string;
  tone: string;
  tone_notes: string;
  approve_replies: boolean;
  plan: string;
  onboarding_step: string;
  onboarding_completed_at: string | null;
  goal: "answer" | "meeting";
  use_website_knowledge: boolean;
} & Timestamps;

export type BusinessMemberRow = {
  business_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price_from: number | null;
  price_to: number | null;
  currency: string;
  price_note: string;
  duration_minutes: number | null;
  position: number;
  active: boolean;
} & Timestamps;

export type OpeningHourRow = {
  id: string;
  business_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  created_at: string;
};

export type OpeningHourExceptionRow = {
  id: string;
  business_id: string;
  date: string;
  closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
  note: string;
  created_at: string;
};

export type FaqRow = {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  position: number;
} & Timestamps;

export type RuleRow = {
  id: string;
  business_id: string;
  kind: string;
  content: string;
  position: number;
} & Timestamps;

export type ChannelRow = {
  id: string;
  business_id: string;
  type: string;
  public_key: string;
  enabled: boolean;
  config: Json;
} & Timestamps;

export type ContactRow = {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string;
} & Timestamps;

export type ConversationRow = {
  id: string;
  business_id: string;
  channel_id: string;
  contact_id: string;
  status: "ai_active" | "needs_human" | "human_active" | "closed";
  visitor_token_hash: string;
  client_ip_hash: string;
  is_test: boolean;
  last_message_at: string;
  summary: string;
  lead_at: string | null;
} & Timestamps;

export type KnowledgePageRow = {
  id: string;
  business_id: string;
  url: string;
  title: string;
  content: string;
  fetched_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  business_id: string;
  sender: "customer" | "ai" | "human" | "system";
  content: string;
  metadata: Json;
  created_at: string;
};

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      businesses: Table<BusinessRow, "name">;
      business_members: Table<BusinessMemberRow, "business_id" | "user_id">;
      services: Table<ServiceRow, "business_id" | "name">;
      opening_hours: Table<OpeningHourRow, "business_id" | "weekday" | "opens_at" | "closes_at">;
      opening_hour_exceptions: Table<OpeningHourExceptionRow, "business_id" | "date">;
      faqs: Table<FaqRow, "business_id" | "question" | "answer">;
      rules: Table<RuleRow, "business_id" | "kind" | "content">;
      channels: Table<ChannelRow, "business_id" | "type">;
      contacts: Table<ContactRow, "business_id">;
      conversations: Table<ConversationRow, "business_id" | "channel_id" | "contact_id" | "visitor_token_hash">;
      messages: Table<MessageRow, "conversation_id" | "business_id" | "sender" | "content">;
      knowledge_pages: Table<KnowledgePageRow, "business_id" | "url" | "content">;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_business: {
        Args: { p_name: string; p_type: string; p_languages: string[] };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
