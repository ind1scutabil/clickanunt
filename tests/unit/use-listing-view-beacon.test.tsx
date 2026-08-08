/**
 * @jest-environment jsdom
 *
 * The SSR regression was that a server-rendered detail page made no request at all,
 * so nothing recorded the visit. These tests pin the beacon to the listing id only —
 * it must never depend on whether the page was hydrated from SSR data.
 */

import React from "react";
import { act, render, waitFor } from "@testing-library/react";

jest.mock("@/lib/security/csrf-client", () => ({
  getCsrfToken: jest.fn(async () => "csrf-token-test"),
}));

jest.mock("@/lib/analytics-session-client", () => ({
  analyticsSessionHeaders: () => ({ "x-analytics-session-id": "sess-test" }),
}));

import { useListingViewBeacon } from "@/lib/listings/use-listing-view-beacon";

const LISTING_A = "11111111-2222-3333-4444-555555555555";
const LISTING_B = "99999999-8888-7777-6666-555555555555";

function Probe({ id, initialViews }: { id: string | null; initialViews?: number }) {
  const views = useListingViewBeacon(id);
  return <span data-testid="views">{views ?? initialViews ?? 0}</span>;
}

function mockFetchOk(views: number, counted = true) {
  const fn = jest.fn(async () => ({
    ok: true,
    json: async () => ({ counted, views }),
  }));
  (global as unknown as { fetch: unknown }).fetch = fn;
  return fn;
}

function viewCalls(fetchMock: jest.Mock, id: string) {
  return fetchMock.mock.calls.filter((c) => String(c[0]) === `/api/listings/${id}/view`);
}

describe("useListingViewBeacon", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("posts exactly one view beacon for a page rendered from SSR data", async () => {
    const fetchMock = mockFetchOk(43);
    // initialViews mirrors an SSR-hydrated page: data is already present, yet the
    // beacon must still fire.
    const { getByTestId } = render(<Probe id={LISTING_A} initialViews={42} />);

    await waitFor(() => expect(viewCalls(fetchMock, LISTING_A)).toHaveLength(1));
    await waitFor(() => expect(getByTestId("views").textContent).toBe("43"));

    const [, init] = viewCalls(fetchMock, LISTING_A)[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.keepalive).toBe(true);
    expect(init.body).toBe("{}");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((init.headers as Record<string, string>)["x-csrf-token"]).toBe("csrf-token-test");
    expect((init.headers as Record<string, string>)["x-analytics-session-id"]).toBe("sess-test");
    // sendBeacon cannot carry custom CSRF/session headers — this path must stay on fetch.
    expect(String(init.method)).not.toBe("BEACON");
  });

  it("does not double-post when the component re-renders", async () => {
    const fetchMock = mockFetchOk(1);
    const { rerender } = render(<Probe id={LISTING_A} />);
    await waitFor(() => expect(viewCalls(fetchMock, LISTING_A)).toHaveLength(1));

    rerender(<Probe id={LISTING_A} />);
    rerender(<Probe id={LISTING_A} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(viewCalls(fetchMock, LISTING_A)).toHaveLength(1);
  });

  it("does not double-post under StrictMode double effects", async () => {
    const fetchMock = mockFetchOk(1);
    render(
      <React.StrictMode>
        <Probe id={LISTING_A} />
      </React.StrictMode>,
    );

    await waitFor(() => expect(viewCalls(fetchMock, LISTING_A)).toHaveLength(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(viewCalls(fetchMock, LISTING_A)).toHaveLength(1);
  });

  it("posts again after a client-side navigation to another listing", async () => {
    const fetchMock = mockFetchOk(7);
    const { rerender } = render(<Probe id={LISTING_A} />);
    await waitFor(() => expect(viewCalls(fetchMock, LISTING_A)).toHaveLength(1));

    rerender(<Probe id={LISTING_B} />);
    await waitFor(() => expect(viewCalls(fetchMock, LISTING_B)).toHaveLength(1));
    expect(viewCalls(fetchMock, LISTING_A)).toHaveLength(1);
  });

  it("shows the deduplicated server value instead of inventing one", async () => {
    const fetchMock = mockFetchOk(42, false);
    const { getByTestId } = render(<Probe id={LISTING_A} initialViews={42} />);

    await waitFor(() => expect(viewCalls(fetchMock, LISTING_A)).toHaveLength(1));
    await waitFor(() => expect(getByTestId("views").textContent).toBe("42"));
  });

  it("keeps the page usable when the beacon fails", async () => {
    const fetchMock = jest.fn(async () => {
      throw new Error("network down");
    });
    (global as unknown as { fetch: unknown }).fetch = fetchMock;

    const { getByTestId } = render(<Probe id={LISTING_A} initialViews={42} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(getByTestId("views").textContent).toBe("42");
  });

  it("sends nothing without a listing id", async () => {
    const fetchMock = mockFetchOk(1);
    render(<Probe id={null} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
