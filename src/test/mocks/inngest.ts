/**
 * Stub for the "inngest" package so routes that import @/inngest/client can load in Vitest
 * without resolving the real node_modules/inngest (which can fail in the test runner).
 * Tests can replace inngestSendMock.send with vi.fn() before loading the route to assert on calls.
 */
export const inngestSendMock: { send: (args?: unknown) => Promise<unknown> } = {
  send: async () => undefined,
};

export const Inngest = class {
  get send() {
    return inngestSendMock.send;
  }
};
