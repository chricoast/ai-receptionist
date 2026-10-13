import { redirect } from "next/navigation";

/** Old address of a conversation (Milestone 2); the inbox replaced it. */
export default async function OldConversationPage({ params }: PageProps<"/conversations/[id]">) {
  const { id } = await params;
  redirect(`/inbox/${encodeURIComponent(id)}`);
}
