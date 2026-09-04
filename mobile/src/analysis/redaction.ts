const secretPatterns = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\b\d{8,12}:[A-Za-z0-9_-]{20,}\b/g,
];

const namedSecretPattern = /(\b(?:authorization|api[_ -]?key|access[_ -]?token|refresh[_ -]?token)\b\s*[:=]\s*(?:Bearer\s+)?)[^\s,;]+/gi;

export function redactSensitiveText(value: string): string {
  let redacted = value.replace(namedSecretPattern, '$1[REDACTED]');
  for (const pattern of secretPatterns) redacted = redacted.replace(pattern, '[REDACTED]');
  return redacted;
}

export function redactNullableText(value: string | null): string | null {
  return value === null ? null : redactSensitiveText(value);
}
