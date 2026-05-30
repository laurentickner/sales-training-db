// Edge password gate for the Sales Call Copilot.
//
// Enforces HTTP Basic Auth on every request before the static app is served.
// The password lives in the `APP_PASSWORD` env var on Netlify. If the env var
// is unset, the gate fails OPEN (so a misconfig can't lock Lauren out — the
// app is still source-private on GitHub and obscured by URL, just no auth).
//
// Username can be anything non-empty. Only the password is validated. This
// keeps the prompt minimal while still being server-enforced at the edge.
//
// To rotate: change APP_PASSWORD in Netlify → Site → Environment variables →
// trigger a redeploy (or just save — env changes apply on the next request).

import type { Context } from "https://edge.netlify.com/";

export default async (req: Request, ctx: Context): Promise<Response> => {
  const expected = Netlify.env.get("APP_PASSWORD");

  // Fail open if no password is configured — safer than locking out the owner.
  if (!expected) return ctx.next();

  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(":");
      const submitted = idx >= 0 ? decoded.slice(idx + 1) : "";
      if (timingSafeEqual(submitted, expected)) {
        return ctx.next();
      }
    } catch {
      // fall through to 401
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Sales Call Copilot", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
};

// Constant-time string compare so an attacker can't time-distinguish a wrong
// password by character.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const config = {
  // Run on every path so the gate catches the HTML shell, JS, CSS, and data.
  path: "/*",
};
