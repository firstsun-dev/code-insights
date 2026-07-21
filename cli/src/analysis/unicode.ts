/**
 * Replace unpaired UTF-16 surrogate code units before passing text to a
 * subprocess or HTTP client. Node can hold these values in a string, but some
 * downstream clients reject them when encoding the request as UTF-8.
 *
 * Valid surrogate pairs (including emoji) are preserved unchanged.
 */
export function sanitizeForUtf8(value: string): string {
  let sanitized = '';

  for (let index = 0; index < value.length; index++) {
    const codeUnit = value.charCodeAt(index);
    const isHighSurrogate = codeUnit >= 0xD800 && codeUnit <= 0xDBFF;
    const isLowSurrogate = codeUnit >= 0xDC00 && codeUnit <= 0xDFFF;

    if (isHighSurrogate) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xDC00 && next <= 0xDFFF) {
        sanitized += value[index] + value[index + 1];
        index++;
      } else {
        sanitized += '\uFFFD';
      }
    } else if (isLowSurrogate) {
      sanitized += '\uFFFD';
    } else {
      sanitized += value[index];
    }
  }

  return sanitized;
}
