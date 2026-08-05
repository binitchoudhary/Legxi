import { getSafeRedirectUrl } from '../redirect';

describe('Safe Redirect Validator Unit Tests', () => {
  it('allows safe relative application paths', () => {
    expect(getSafeRedirectUrl('/user/dashboard')).toBe('/user/dashboard');
    expect(getSafeRedirectUrl('/admin/auctions?page=2')).toBe('/admin/auctions?page=2');
    expect(getSafeRedirectUrl('/auctions/active#live')).toBe('/auctions/active#live');
  });

  it('rejects external URLs and returns fallback', () => {
    expect(getSafeRedirectUrl('https://evil.com')).toBe('/');
    expect(getSafeRedirectUrl('http://attacker.com/steal')).toBe('/');
    expect(getSafeRedirectUrl('https://legxi.com.evil.com')).toBe('/');
  });

  it('rejects protocol-relative URLs and returns fallback', () => {
    expect(getSafeRedirectUrl('//evil.com')).toBe('/');
    expect(getSafeRedirectUrl('//google.com/path')).toBe('/');
    expect(getSafeRedirectUrl('\\\\evil.com')).toBe('/');
    expect(getSafeRedirectUrl('/\\evil.com')).toBe('/');
  });

  it('rejects javascript: and data: script injections', () => {
    expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/');
    expect(getSafeRedirectUrl('javascript:void(0)')).toBe('/');
    expect(getSafeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe('/');
  });

  it('handles null, undefined, or empty inputs gracefully with fallback', () => {
    expect(getSafeRedirectUrl(null)).toBe('/');
    expect(getSafeRedirectUrl(undefined)).toBe('/');
    expect(getSafeRedirectUrl('')).toBe('/');
    expect(getSafeRedirectUrl(null, '/custom-fallback')).toBe('/custom-fallback');
  });
});
