/** Removes anything that looks like an API key from an error text before it is shown. */
export function redactSecrets(text: string, secrets: string[]): string {
  let out = text;
  for (const secret of secrets) if (secret) out = out.split(secret).join("[key]");
  return out
    .replace(/sb_(secret|publishable)_[^\s"']*/gi, "[key]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[key]")
    .replace(/sk-ant-[^\s"']*/g, "[key]")
    .replace(/"[^"]{20,}"/g, '"[hidden]"');
}
