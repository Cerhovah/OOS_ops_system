const secretPatterns = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\b\d{8,12}:[A-Za-z0-9_-]{20,}\b/g,
  /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g,
];

const namedSecretPattern = /(\b(?:authorization|api[_ -]?key|access[_ -]?token|refresh[_ -]?token)\b\s*[:=]\s*(?:Bearer\s+)?)[^\s,;]+/gi;
const environmentSecretPattern = /((?:^|[\s,;])[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*_(?:KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*(?:Bearer\s+)?)[^\s,;]+/gim;

export function redactSensitiveText(value: string): string {
  let redacted = value
    .replace(environmentSecretPattern, '$1[REDACTED]')
    .replace(namedSecretPattern, '$1[REDACTED]');
  for (const pattern of secretPatterns) redacted = redacted.replace(pattern, '[REDACTED]');
  return redacted;
}

export function redactNullableText(value: string | null): string | null {
  return value === null ? null : redactSensitiveText(value);
}
