import { describe, expect, it } from 'vitest';

import { redactNullableText, redactSensitiveText } from './redaction';

describe('analysis text redaction', () => {
  it.each([
    'API_KEY=fake-secret-value-that-is-long',
    'Authorization: Bearer fake-bearer-token',
    'sk-proj-fake_key_value_1234567890',
    '123456789:fakeTelegramTokenValue_12345',
    'eyJfakeHeader123.eyJfakePayload123.fakeSignature123',
  ])('redacts likely credentials before packaging: %s', (value) => {
    const result = redactSensitiveText(`메모 ${value} 끝`);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain(value);
  });

  it('preserves ordinary text and null', () => {
    expect(redactSensitiveText('공부 120분')).toBe('공부 120분');
    expect(redactNullableText(null)).toBeNull();
  });
});
