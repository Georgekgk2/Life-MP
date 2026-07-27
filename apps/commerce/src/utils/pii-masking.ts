export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***.***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return "+380********";
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    digits = `38${digits}`;
  }
  if (digits.length < 10) return "+380********";
  return `+${digits.slice(0, 5)}***${digits.slice(-4)}`;
}

export function maskName(name: string): string {
  if (!name) return "****";
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => (p.length > 1 ? `${p[0]}****` : p)).join(" ");
}

export function sanitizeLogPayload<T extends Record<string, unknown>>(
  payload: T,
): T {
  const result: Record<string, unknown> = { ...payload };

  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();
    const val = result[key];

    if (typeof val === "string") {
      if (lowerKey.includes("email")) {
        result[key] = maskEmail(val);
      } else if (lowerKey.includes("phone")) {
        result[key] = maskPhone(val);
      } else if (lowerKey.includes("name")) {
        result[key] = maskName(val);
      } else if (lowerKey.includes("address")) {
        result[key] = "[PROTECTED_ADDRESS]";
      }
    } else if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      !(val instanceof Date)
    ) {
      result[key] = sanitizeLogPayload(val as Record<string, unknown>);
    }
  }

  return result as T;
}
