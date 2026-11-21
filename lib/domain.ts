export function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/\.$/, "");
  } catch {
    return trimmed
      .replace(/^[a-z]+:\/\//, "")
      .split("/")[0]
      .split(":")[0]
      .replace(/\.$/, "");
  }
}
