"use client";

import { useLayoutEffect } from "react";
import { redirectApexBrowserToWww } from "@/lib/client-canonical-www";

/** Publish/auth API must run on www — apex triggers 301 that breaks POST /api/listings. */
export default function ApexToWwwRedirect() {
  useLayoutEffect(() => {
    redirectApexBrowserToWww();
  }, []);
  return null;
}
