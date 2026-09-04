import { describe, expect, it } from 'vitest';

import { parseAuthCallbackUrl } from '@/services/auth-callback';

describe('magic-link auth callback', () => {
  it('rejects implicit-flow session tokens from the URL fragment', () => {
    expect(
      parseAuthCallbackUrl(
        'oosops://auth/callback#access_token=header.payload.signature&refresh_token=refresh-token&type=magiclink',
      ),
    ).toEqual({
      kind: 'error',
      message: 'PKCE 로그인 코드가 없습니다. 새 로그인 링크를 요청하십시오.',
    });
  });

  it('reads a PKCE authorization code from the query string', () => {
    expect(parseAuthCallbackUrl('oosops://auth/callback?code=encoded%2Dcode')).toEqual({
      kind: 'code',
      code: 'encoded-code',
    });
  });

  it('does not accept a PKCE-looking code from the URL fragment', () => {
    expect(parseAuthCallbackUrl('oosops://auth/callback#code=intercepted-code')).toEqual({
      kind: 'error',
      message: 'PKCE 로그인 코드가 없습니다. 새 로그인 링크를 요청하십시오.',
    });
    expect(parseAuthCallbackUrl('oosops://auth/callback#state=value?code=fragment-query-code')).toEqual({
      kind: 'error',
      message: 'PKCE 로그인 코드가 없습니다. 새 로그인 링크를 요청하십시오.',
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
