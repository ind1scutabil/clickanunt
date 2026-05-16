/**
 * @jest-environment node
 */

import { resolveConversationsTake } from '@/lib/messaging/conversations-limit';

describe('resolveConversationsTake', () => {
  const orig = process.env.MESSAGING_CONVERSATIONS_MAX;

  afterEach(() => {
    if (orig === undefined) delete process.env.MESSAGING_CONVERSATIONS_MAX;
    else process.env.MESSAGING_CONVERSATIONS_MAX = orig;
  });

  it('defaults to 250 when no limit param', () => {
    delete process.env.MESSAGING_CONVERSATIONS_MAX;
    expect(resolveConversationsTake(null)).toBe(250);
  });

  it('respects env cap', () => {
    process.env.MESSAGING_CONVERSATIONS_MAX = '100';
    expect(resolveConversationsTake(null)).toBe(100);
  });

  it('clamps requested limit to cap', () => {
    expect(resolveConversationsTake('9999')).toBe(250);
    process.env.MESSAGING_CONVERSATIONS_MAX = '500';
    expect(resolveConversationsTake('9999')).toBe(500);
  });
});
