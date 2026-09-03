export const AUTH_CALLBACK_URL = 'oosops://auth/callback';

type AuthCallbackResult =
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string };

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function readParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const queryIndex = url.indexOf('?');
  const fragmentIndex = url.indexOf('#');
  const parts: string[] = [];

  if (queryIndex >= 0) {
    const queryEnd = fragmentIndex > queryIndex ? fragmentIndex : url.length;
    parts.push(url.slice(queryIndex + 1, queryEnd));
  }
  if (fragmentIndex >= 0) parts.push(url.slice(fragmentIndex + 1));

  for (const part of parts) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const separator = pair.indexOf('=');
      const key = decode(separator >= 0 ? pair.slice(0, separator) : pair);
      const value = decode(separator >= 0 ? pair.slice(separator + 1) : '');
      params.set(key, value);
    }
  }
  return params;
}

export function parseAuthCallbackUrl(url: string): AuthCallbackResult | null {
  if (!/^oosops:\/\/auth\/callback\/?(?:[?#]|$)/i.test(url)) return null;

  const params = readParams(url);
  const callbackError = params.get('error_description') ?? params.get('error');
  if (callbackError) return { kind: 'error', message: callbackError };

  const code = params.get('code');
  if (code) return { kind: 'code', code };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken };

  return { kind: 'error', message: '로그인 링크에 세션 정보가 없습니다. 새 링크를 요청하십시오.' };
}
