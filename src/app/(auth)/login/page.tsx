import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/safe-next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, confirmed } = await searchParams;
  return <LoginForm next={safeNextPath(next)} confirmed={confirmed === "1"} />;
}
