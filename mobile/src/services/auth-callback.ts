export const AUTH_CALLBACK_URL = 'oosops://auth/callback';

type AuthCallbackResult =
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string };

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function readParams(value: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const pair of value.split('&')) {
    if (!pair) continue;
    const separator = pair.indexOf('=');
    const key = decode(separator >= 0 ? pair.slice(0, separator) : pair);
    const parameterValue = decode(separator >= 0 ? pair.slice(separator + 1) : '');
    params.set(key, parameterValue);
  }
  return params;
}

export function parseAuthCallbackUrl(url: string): AuthCallbackResult | null {
  if (!/^oosops:\/\/auth\/callback\/?(?:[?#]|$)/i.test(url)) return null;

  const queryIndex = url.indexOf('?');
  const fragmentIndex = url.indexOf('#');
  const hasQuery = queryIndex >= 0 && (fragmentIndex < 0 || queryIndex < fragmentIndex);
  const queryEnd = hasQuery && fragmentIndex > queryIndex ? fragmentIndex : url.length;
  const query = readParams(hasQuery ? url.slice(queryIndex + 1, queryEnd) : '');
  const fragment = readParams(fragmentIndex >= 0 ? url.slice(fragmentIndex + 1) : '');
  const callbackError = query.get('error_description') ?? query.get('error')
    ?? fragment.get('error_description') ?? fragment.get('error');
  if (callbackError) return { kind: 'error', message: callbackError };

  const code = query.get('code');
  if (code) return { kind: 'code', code };

  return { kind: 'error', message: 'PKCE 로그인 코드가 없습니다. 새 로그인 링크를 요청하십시오.' };
}
