import { describe, expect, it } from 'vitest';
import { sanitizeForUtf8 } from '../unicode.js';

describe('sanitizeForUtf8', () => {
  it('preserves valid Unicode surrogate pairs', () => {
    expect(sanitizeForUtf8('Status: \uD83E\uDE80')).toBe('Status: \uD83E\uDE80');
  });

  it('replaces unpaired high and low surrogates', () => {
    expect(sanitizeForUtf8('before\uD83Eafter\uDC00end')).toBe('before\uFFFDafter\uFFFDend');
  });
});
