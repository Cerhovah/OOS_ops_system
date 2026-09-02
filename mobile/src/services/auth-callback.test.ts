import { describe, expect, it } from 'vitest';

import { parseAuthCallbackUrl } from '@/services/auth-callback';

describe('magic-link auth callback', () => {
  it('reads implicit-flow session tokens from the URL fragment', () => {
    expect(
      parseAuthCallbackUrl(
        'oosops://auth/callback#access_token=header.payload.signature&refresh_token=refresh-token&type=magiclink',
      ),
    ).toEqual({
      kind: 'session',
      accessToken: 'header.payload.signature',
      refreshToken: 'refresh-token',
    });
  });

  it('reads a PKCE authorization code from the query string', () => {
    expect(parseAuthCallbackUrl('oosops://auth/callback?code=encoded%2Dcode')).toEqual({
      kind: 'code',
      code: 'encoded-code',
    });
  });

  it('returns a decoded provider error without accepting tokens', () => {
    expect(
      parseAuthCallbackUrl('oosops://auth/callback#error=access_denied&error_description=Link+expired'),
    ).toEqual({ kind: 'error', message: 'Link expired' });
  });

  it('ignores links outside the dedicated auth callback', () => {
    expect(parseAuthCallbackUrl('oosops://settings#access_token=not-accepted')).toBeNull();
  });
});
