/**
 * GoHighLevel client — Contact upsert + Note + call_outcome custom field.
 *
 * Mirrors the v2 LeadConnector flow already used by app/app.js, just with the
 * extra step of writing the outcome to a custom field (the SPA only tags it).
 * If the `call_outcome` custom field doesn't exist on the sub-account, we
 * fall back to a `outcome:<value>` tag so nothing fails silently.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";

export interface GHLProspect {
  name: string;
  email?: string;
  phone?: string;
  outcome?: string;
}

export interface GHLPushResult {
  ok: boolean;
  contactId?: string;
  reason?: string;
}

function ghlHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function splitName(full: string): { first: string; last: string } {
  const parts = (full || "").trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

/** Find the sub-account's `call_outcome` custom field id, if it exists. */
async function findOutcomeFieldId(apiKey: string, locationId: string): Promise<string | null> {
  try {
    const r = await fetch(`${GHL_BASE}/locations/${encodeURIComponent(locationId)}/customFields`, {
      method: "GET",
      headers: ghlHeaders(apiKey),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { customFields?: { id: string; fieldKey?: string; name?: string }[] };
    const list = j.customFields || [];
    const match = list.find(
      (f) =>
        (f.fieldKey || "").toLowerCase().includes("call_outcome") ||
        (f.name || "").toLowerCase() === "call outcome",
    );
    return match?.id || null;
  } catch (e) {
    console.error("GHL findOutcomeFieldId failed:", (e as Error).message);
    return null;
  }
}

/**
 * Upsert the contact, post the markdown review as a Note, set the outcome
 * (custom field if available, tag fallback). Best-effort — any sub-step
 * failure is reported in `reason` and earlier work is kept.
 */
export async function pushReviewToGHL(
  env: { GHL_API_KEY: string; GHL_LOCATION_ID: string },
  prospect: GHLProspect,
  reviewMarkdown: string,
): Promise<GHLPushResult> {
  if (!env.GHL_API_KEY || !env.GHL_LOCATION_ID) {
    return { ok: false, reason: "GHL_API_KEY or GHL_LOCATION_ID missing" };
  }
  if (!prospect.email && !prospect.phone) {
    return { ok: false, reason: "Need an email or phone to match a GHL contact" };
  }

  const { first, last } = splitName(prospect.name);
  const outcomeFieldId = prospect.outcome ? await findOutcomeFieldId(env.GHL_API_KEY, env.GHL_LOCATION_ID) : null;

  const upsertBody: Record<string, unknown> = {
    locationId: env.GHL_LOCATION_ID,
    firstName: first,
    lastName: last,
    tags: ["sales-call-review"].concat(prospect.outcome ? [`outcome:${prospect.outcome}`] : []),
  };
  if (prospect.email) upsertBody.email = prospect.email;
  if (prospect.phone) upsertBody.phone = prospect.phone;
  if (outcomeFieldId && prospect.outcome) {
    upsertBody.customFields = [{ id: outcomeFieldId, value: prospect.outcome }];
  }

  let contactId: string | undefined;
  try {
    const r = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: ghlHeaders(env.GHL_API_KEY),
      body: JSON.stringify(upsertBody),
    });
    const txt = await r.text();
    if (!r.ok) {
      console.error(`GHL upsert ${r.status}: ${txt.slice(0, 300)}`);
      return { ok: false, reason: `GHL upsert HTTP ${r.status}: ${txt.slice(0, 200)}` };
    }
    const j = JSON.parse(txt) as { contact?: { id: string }; id?: string };
    contactId = j.contact?.id || j.id;
    if (!contactId) return { ok: false, reason: "GHL upsert returned no contact id" };
  } catch (e) {
    return { ok: false, reason: `GHL upsert threw: ${(e as Error).message}` };
  }

  const noteBody = `Live sales call review — ${new Date().toLocaleString()}\n\n${reviewMarkdown}`;
  try {
    const r = await fetch(`${GHL_BASE}/contacts/${encodeURIComponent(contactId)}/notes`, {
      method: "POST",
      headers: ghlHeaders(env.GHL_API_KEY),
      body: JSON.stringify({ body: noteBody }),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error(`GHL note ${r.status}: ${txt.slice(0, 300)}`);
      return { ok: false, contactId, reason: `Note HTTP ${r.status}: ${txt.slice(0, 200)}` };
    }
  } catch (e) {
    return { ok: false, contactId, reason: `GHL note threw: ${(e as Error).message}` };
  }

  return { ok: true, contactId };
}
