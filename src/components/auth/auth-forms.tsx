"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  login,
  requestPasswordReset,
  signup,
  updatePassword,
  type AuthState,
} from "@/lib/auth-actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, Field, Input } from "@/components/ui";

const idle: AuthState = { status: "idle" };

function ErrorMessage({ state }: { state: AuthState }) {
  const t = useTranslations("auth.errors");
  return state.status === "error" ? <Alert>{t(state.error)}</Alert> : null;
}

/** Kept in state so a failed attempt doesn't wipe the email (React resets forms after submit). */
function EmailField() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  return (
    <Field label={t("email")} htmlFor="email">
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={200}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </Field>
  );
}

export function LoginForm({ next, confirmed }: { next?: string; confirmed?: boolean }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(login, idle);
  return (
    <Card>
      <h1 className="text-2xl font-semibold">{t("loginTitle")}</h1>
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        {confirmed && state.status === "idle" ? <Alert tone="success">{t("emailConfirmed")}</Alert> : null}
        <ErrorMessage state={state} />
        <EmailField />
        <Field label={t("password")} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full">{t("loginSubmit")}</SubmitButton>
      </form>
      <div className="mt-6 space-y-2 text-sm text-stone-600">
        <p>
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-brand-700 hover:underline">
            {t("forgotLink")}
          </Link>
        </p>
        <p>
          {t("noAccount")}{" "}
          <Link href="/signup" className="inline-flex min-h-11 items-center font-medium text-brand-700 hover:underline">
            {t("signupLink")}
          </Link>
        </p>
      </div>
    </Card>
  );
}

export function SignupForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(signup, idle);

  if (state.status === "sent") {
    return (
      <Card>
        <h1 className="text-2xl font-semibold">{t("checkEmailTitle")}</h1>
        <p className="mt-4 text-stone-700">{t("checkEmailBody", { email: state.email })}</p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-2xl font-semibold">{t("signupTitle")}</h1>
      <form action={action} className="mt-6 space-y-4">
        <ErrorMessage state={state} />
        <EmailField />
        <Field label={t("password")} htmlFor="password" hint={t("passwordHint")}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <p className="text-sm text-stone-600">
          {t.rich("acceptPrivacy", {
            link: (chunks) => (
              <Link href="/privacy" className="text-brand-700 underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <SubmitButton className="w-full">{t("signupSubmit")}</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-stone-600">
        {t("haveAccount")}{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-brand-700 hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </Card>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(requestPasswordReset, idle);
  return (
    <Card>
      <h1 className="text-2xl font-semibold">{t("forgotTitle")}</h1>
      {state.status === "sent" ? (
        <div className="mt-6">
          <Alert tone="success">{t("forgotSent")}</Alert>
        </div>
      ) : (
        <>
          <p className="mt-2 text-stone-600">{t("forgotBody")}</p>
          <form action={action} className="mt-6 space-y-4">
            <ErrorMessage state={state} />
            <EmailField />
            <SubmitButton className="w-full">{t("forgotSubmit")}</SubmitButton>
          </form>
        </>
      )}
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-brand-700 hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </Card>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(updatePassword, idle);
  return (
    <Card>
      <h1 className="text-2xl font-semibold">{t("resetTitle")}</h1>
      <form action={action} className="mt-6 space-y-4">
        <ErrorMessage state={state} />
        <Field label={t("newPassword")} htmlFor="password" hint={t("passwordHint")}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton className="w-full">{t("resetSubmit")}</SubmitButton>
      </form>
    </Card>
  );
}
