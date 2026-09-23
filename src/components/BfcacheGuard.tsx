"use client";

import { useEffect } from "react";

// iOS Safari (including the installed home-screen app) can restore a page from
// its back-forward cache — an in-memory snapshot — instead of doing a real
// navigation, which is invisible to any server-side check: no request is made at
// all, so a page frozen from before logout can reappear looking fully signed in.
// `pageshow`'s `persisted` flag is true exactly for a bfcache restore; forcing a
// real reload there makes the app re-hit the server (and its session check) every time.
export default function BfcacheGuard() {
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
