const SENSITIVE_KEY_PATTERN = /token|secret|password|api[_-]?key|authorization|bearer|session|cookie|private|ssh|credentials/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function findSensitiveKeys(payload: unknown): string[] {
  const matches: string[] = [];
  const seen = new WeakSet<object>();

  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        walk(item, `${path}[${index}]`);
      });
      return;
    }
    if (!isObject(value)) return;
    if (seen.has(value)) return;
    seen.add(value);

    Object.entries(value).forEach(([key, child]) => {
      const nextPath = path ? `${path}.${key}` : key;
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        matches.push(nextPath);
      }
      walk(child, nextPath);
    });
  };

  walk(payload, '');
  return matches;
}

export function redactSensitiveValues(payload: unknown): unknown {
  const seen = new WeakMap<object, unknown>();

  const redact = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => redact(item));
    }
    if (!isObject(value)) return value;
    if (seen.has(value)) return seen.get(value);

    const clone: Record<string, unknown> = {};
    seen.set(value, clone);

    Object.entries(value).forEach(([key, child]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        clone[key] = '[REDACTED]';
      } else {
        clone[key] = redact(child);
      }
    });

    return clone;
  };

  return redact(payload);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}
