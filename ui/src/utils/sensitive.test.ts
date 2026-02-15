import { describe, it, expect } from 'vitest';
import { findSensitiveKeys, redactSensitiveValues } from './sensitive';

describe('sensitive utils', () => {
  it('finds sensitive keys in nested objects', () => {
    const payload = {
      auth: { apiKey: 'secret', token: 'abc' },
      headers: { authorization: 'Bearer abc' },
      nested: { meta: { safe: true } },
    };

    const keys = findSensitiveKeys(payload);
    expect(keys).toEqual(['auth.apiKey', 'auth.token', 'headers.authorization']);
  });

  it('redacts sensitive values by key name', () => {
    const payload = {
      password: 'hunter2',
      nested: { api_key: 'abcd', safe: 'ok' },
    };

    const redacted = redactSensitiveValues(payload);
    expect(redacted).toEqual({
      password: '[REDACTED]',
      nested: { api_key: '[REDACTED]', safe: 'ok' },
    });
  });
});
