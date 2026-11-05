import 'reflect-metadata';
import { parseTrustProxy } from 'app/lib/trustProxy';
import { getClientKey } from 'app/modules/api/plugins/rateLimit';

describe('parseTrustProxy', () => {
  test.each([
    [undefined, false],
    ['', false],
    ['  ', false],
    ['false', false],
    ['FALSE', false],
    ['true', true],
    ['1', 1],
    ['2', 2],
    ['loopback', 'loopback'],
    ['10.0.0.0/8', '10.0.0.0/8'],
  ])('%p -> %p', (input, expected) => {
    expect(parseTrustProxy(input as string | undefined)).toBe(expected);
  });
});

describe('getClientKey', () => {
  test('is the network address, whatever token the caller presents', () => {
    expect(getClientKey({ ip: '203.0.113.7', auth: { uid: 'a' } })).toBe('203.0.113.7');
    expect(getClientKey({ ip: '203.0.113.7', auth: { uid: 'b' } })).toBe('203.0.113.7');
    expect(getClientKey({ ip: '203.0.113.7' })).toBe('203.0.113.7');
  });
  test('falls back to a shared key rather than throwing when there is no address', () => {
    expect(getClientKey({})).toBe('unknown');
  });
});
