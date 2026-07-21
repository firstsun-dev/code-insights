import { describe, it, expect } from 'vitest';
import { parseIntParam, buildInCondition } from './utils.js';

describe('parseIntParam', () => {
  it('returns parsed integer for a valid string', () => {
    expect(parseIntParam('42', 10)).toBe(42);
  });

  it('returns default when value is undefined', () => {
    expect(parseIntParam(undefined, 25)).toBe(25);
  });

  it('returns default when value is NaN', () => {
    expect(parseIntParam('abc', 10)).toBe(10);
  });

  it('returns default when value is negative', () => {
    expect(parseIntParam('-5', 10)).toBe(10);
  });

  it('returns 0 when value is "0"', () => {
    expect(parseIntParam('0', 10)).toBe(0);
  });

  it('returns default for empty string', () => {
    expect(parseIntParam('', 10)).toBe(10);
  });

  it('returns default for Infinity', () => {
    expect(parseIntParam('Infinity', 10)).toBe(10);
  });
});

describe('buildInCondition', () => {
  it('returns null when value is undefined', () => {
    expect(buildInCondition('source_tool', undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(buildInCondition('source_tool', '')).toBeNull();
  });

  it('returns null when value is only commas/whitespace', () => {
    expect(buildInCondition('source_tool', ' , , ')).toBeNull();
  });

  it('builds an equality-shaped single-value IN clause (single value behaves like today)', () => {
    const result = buildInCondition('source_tool', 'cursor');
    expect(result).toEqual({ clause: 'source_tool IN (?)', params: ['cursor'] });
  });

  it('splits a comma-separated value into multiple IN params', () => {
    const result = buildInCondition('source_tool', 'cursor,claude-code');
    expect(result).toEqual({ clause: 'source_tool IN (?, ?)', params: ['cursor', 'claude-code'] });
  });

  it('trims whitespace around each value and drops empty entries', () => {
    const result = buildInCondition('source_tool', ' cursor , claude-code ,, ');
    expect(result).toEqual({ clause: 'source_tool IN (?, ?)', params: ['cursor', 'claude-code'] });
  });

  it('uses the provided column name verbatim in the clause', () => {
    const result = buildInCondition('s.source_tool', 'kilo');
    expect(result?.clause).toBe('s.source_tool IN (?)');
  });
});
