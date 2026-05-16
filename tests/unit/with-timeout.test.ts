/**
 * @jest-environment node
 */

import { withTimeout, StabilityTimeoutError } from '@/lib/stability/with-timeout';

describe('withTimeout', () => {
  it('resolves when promise finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it('rejects on timeout', async () => {
    await expect(
      withTimeout(new Promise(() => {}), 50, 'slow')
    ).rejects.toBeInstanceOf(StabilityTimeoutError);
  });
});
