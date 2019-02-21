import { MaskAccountPipe } from './mask-account.pipe';

describe('MaskAccountPipe', () => {
  const pipe = new MaskAccountPipe();

  it('shows only the last four digits', () => {
    expect(pipe.transform('000123456789')).toMatch(/6789$/);
    expect(pipe.transform('000123456789')).not.toContain('1234');
  });

  it('copes with nothing', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('')).toBe('');
  });
});
