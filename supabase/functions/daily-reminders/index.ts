// Daily reminders, run once a day by pg_cron (see supabase/remote-setup/reminders-cron.sql).
//   * Kids: the day before each meeting, a message with their name. When
//     ANTHROPIC_API_KEY is set the messages are written by Claude, otherwise a
//     fixed template is used.
//   * Servants: a reminder when kids assigned to them weren't visited for a week.
// Each one is saved in the user's in-app inbox and pushed to their devices.
//
// The cron secret and the Web Push keys live in Supabase Vault (see the
// reminder_keys migration); the push key pair is created on the first run.
// The only optional secret is ANTHROPIC_API_KEY. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import webpush from "npm:web-push@3.6.7";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://khedma-taupe.vercel.app";
const VISIT_DAYS = 7;
const KIDS_PER_AI_CALL = 40;

type MeetingTarget = {
  meeting_id: string;
  service_id: string;
  service_name: string;
  class_name: string | null;
  meeting_date: string;
  start_time: string | null;
  topic: string;
  details: string | null;
  speaker_name: string | null;
  served_id: string;
  served_name: string;
};

type VisitTarget = { servant_id: string; service_id: string; service_name: string; served_names: string[] };

type Note = { user_id: string; service_id: string; kind: string; ref_key: string; title: string; body: string; url: string };

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

let vapidReady = false;

/** Reads the cron secret and push keys from Vault, creating the key pair once. */
async function loadSettings() {
  const { data, error } = await db.rpc("reminder_settings").single<{
    cron_secret: string | null;
    vapid_public: string | null;
    vapid_private: string | null;
  }>();
  if (error) throw error;
  let { vapid_public: pub, vapid_private: priv } = data;
  if (!pub || !priv) {
    // First run: create the pair. If another run stored one first, the
    // stored pair wins, so read it back.
    const keys = webpush.generateVAPIDKeys();
    const { error: saveError } = await db.rpc("save_vapid_keys", { p_public: keys.publicKey, p_private: keys.privateKey });
    if (saveError) throw saveError;
    const { data: stored, error: readError } = await db.rpc("reminder_settings").single<typeof data>();
    if (readError) throw readError;
    ({ vapid_public: pub, vapid_private: priv } = stored);
    if (!pub || !priv) throw new Error("push keys missing");
  }
  webpush.setVapidDetails(SITE_URL, pub, priv);
  vapidReady = true;
  return { cronSecret: data.cron_secret, vapidPublic: pub };
}

// ---------------------------------------------------------------------------
// Dates (Cairo)
// ---------------------------------------------------------------------------
function cairoDay(offsetDays: number) {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(now);
}
const weekday = (day: string) =>
  new Intl.DateTimeFormat("ar-EG", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
const clock = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, 0, 1, h, m)),
  );
};
const firstName = (full: string) => full.trim().split(/\s+/)[0] || full;

// ---------------------------------------------------------------------------
// Kid messages
// ---------------------------------------------------------------------------
function templateMessage(m: MeetingTarget) {
  const when = m.start_time ? ` الساعة ${clock(m.start_time)}` : "";
  return `يا ${firstName(m.served_name)}، مستنينك بكرة ${weekday(m.meeting_date)}${when} في ${m.service_name} 🙏 موضوعنا: ${m.topic}`;
}

const SYSTEM = `انت بتكتب رسايل تذكير قصيرة لأطفال وشباب في مدارس الأحد بالكنيسة القبطية الأرثوذكسية في مصر، عشان يحضروا الاجتماع بكرة.
- اكتب بالعامية المصرية، بأسلوب دافي ومشجع ومناسب لسنهم.
- كل رسالة لازم تبدأ باسم المخدوم، وتذكر إن الاجتماع بكرة، واليوم والميعاد لو موجود، وموضوع الاجتماع بشكل يشوّقه.
- جملتين بالكتير، أقل من ٢٥٠ حرف. ممكن إيموجي واحد أو اتنين.
- ماتخترعش أي معلومة مش موجودة (لا مكان ولا ميعاد ولا هدايا).
- غيّر الصياغة من رسالة للتانية عشان ماتبقاش كلها شبه بعض.`;

const SCHEMA = {
  type: "object",
  properties: {
    messages: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, text: { type: "string" } },
        required: ["id", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["messages"],
  additionalProperties: false,
};

/** One Claude call per meeting chunk; any kid it misses gets the template. */
async function aiMessages(kids: MeetingTarget[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!anthropic || !kids.length) return out;
  const m = kids[0];
  const meeting = [
    `الخدمة: ${m.service_name}${m.class_name ? ` (فصل ${m.class_name})` : ""}`,
    `اليوم: بكرة ${weekday(m.meeting_date)}`,
    m.start_time ? `الميعاد: ${clock(m.start_time)}` : null,
    `الموضوع: ${m.topic}`,
    m.details ? `تفاصيل: ${m.details}` : null,
    m.speaker_name ? `الكلمة: ${m.speaker_name}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const names = kids.map((k, i) => `${i + 1}: ${firstName(k.served_name)}`).join("\n");

  try {
    const response = await anthropic.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `بيانات الاجتماع:\n${meeting}\n\nاكتب رسالة لكل واحد من دول (id: الاسم):\n${names}`,
        },
      ],
    });
    if (response.stop_reason !== "end_turn") return out;
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return out;
    const parsed = JSON.parse(text.text) as { messages: { id: string; text: string }[] };
    for (const { id, text: body } of parsed.messages) {
      const kid = kids[Number(id) - 1];
      if (kid && body.trim()) out.set(kid.served_id, body.trim().slice(0, 400));
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error("claude", error.status, error.message);
    else console.error("claude", error);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------
async function deliver(notes: Note[]) {
  if (!notes.length) return { saved: 0, pushed: 0 };
  // ignoreDuplicates: a rerun on the same day never repeats a notification.
  const { data: saved, error } = await db
    .from("notifications")
    .upsert(notes, { onConflict: "user_id,kind,ref_key", ignoreDuplicates: true })
    .select("user_id, title, body, url");
  if (error) throw error;
  if (!saved?.length || !vapidReady) return { saved: saved?.length ?? 0, pushed: 0 };

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", [...new Set(saved.map((n) => n.user_id))]);
  let pushed = 0;
  const gone: string[] = [];
  await Promise.all(
    (subs ?? []).flatMap((s) =>
      saved
        .filter((n) => n.user_id === s.user_id)
        .map(async (n) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: n.title, body: n.body, url: n.url }),
              { TTL: 12 * 3600 },
            );
            pushed++;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) gone.push(s.id); // device unsubscribed
            else console.error("push", status, (e as Error).message);
          }
        }),
    ),
  );
  if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  return { saved: saved.length, pushed };
}

/** Sends one test push to a user's devices (nothing is saved). */
async function testPush(userId: string) {
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
  let pushed = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: "خدمتي 🔔", body: "الإشعارات شغالة على الجهاز ده ✓", url: "/notifications" }),
      );
      pushed++;
    } catch (e) {
      console.error("push", (e as { statusCode?: number }).statusCode, (e as Error).message);
    }
  }
  return { pushed, devices: subs?.length ?? 0 };
}

async function meetingReminders(day: string) {
  const { data, error } = await db.rpc("meeting_reminder_targets", { p_day: day });
  if (error) throw error;
  const byMeeting = new Map<string, MeetingTarget[]>();
  for (const t of (data ?? []) as MeetingTarget[]) byMeeting.set(t.meeting_id, [...(byMeeting.get(t.meeting_id) ?? []), t]);

  const notes: Note[] = [];
  let ai = 0;
  for (const kids of byMeeting.values()) {
    const chunks = [];
    for (let i = 0; i < kids.length; i += KIDS_PER_AI_CALL) chunks.push(kids.slice(i, i + KIDS_PER_AI_CALL));
    const written = await Promise.all(chunks.map(aiMessages));
    for (const [i, chunk] of chunks.entries()) {
      for (const k of chunk) {
        const body = written[i].get(k.served_id);
        if (body) ai++;
        notes.push({
          user_id: k.served_id,
          service_id: k.service_id,
          kind: "meeting_reminder",
          ref_key: k.meeting_id,
          title: `اجتماع بكرة: ${k.topic}`,
          body: body ?? templateMessage(k),
          url: `/s/${k.service_id}/home/meetings`,
        });
      }
    }
  }
  return { ...(await deliver(notes)), ai };
}

async function visitReminders() {
  const { data, error } = await db.rpc("visit_reminder_targets", { p_days: VISIT_DAYS });
  if (error) throw error;
  const today = cairoDay(0);
  const notes: Note[] = ((data ?? []) as VisitTarget[]).map((t) => {
    const names = t.served_names.map(firstName);
    const shown = names.slice(0, 3).join("، ");
    const more = names.length > 3 ? ` و${(names.length - 3).toLocaleString("ar-EG")} كمان` : "";
    return {
      user_id: t.servant_id,
      service_id: t.service_id,
      kind: "visit_reminder",
      ref_key: `${t.service_id}:${today}`,
      title: "افتقاد مخدوميك",
      body:
        names.length === 1
          ? `${shown} محدش افتقده من أكتر من أسبوع. كلمة أو زيارة بتفرق معاه 🙏`
          : `عندك ${names.length.toLocaleString("ar-EG")} مخدومين محدش افتقدهم من أكتر من أسبوع: ${shown}${more}. كلمة أو زيارة بتفرق معاهم 🙏`,
      url: `/s/${t.service_id}/servant/served`,
    };
  });
  return deliver(notes);
}

Deno.serve(async (req) => {
  let settings;
  try {
    settings = await loadSettings();
  } catch (error) {
    console.error(error);
    return new Response("not configured", { status: 500 });
  }
  if (!settings.cronSecret || req.headers.get("x-cron-secret") !== settings.cronSecret) {
    return new Response("forbidden", { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  // {"init": true} only makes sure the push keys exist.
  if (body.init) return Response.json({ vapid_public: settings.vapidPublic });
  if (typeof body.test_user === "string") return Response.json(await testPush(body.test_user));
  // `day` overrides "tomorrow" for testing.
  const day = typeof body.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : cairoDay(1);
  try {
    const [meetings, visits] = await Promise.all([meetingReminders(day), visitReminders()]);
    return Response.json({ day, meetings, visits, ai: Boolean(anthropic) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 });
  }
});
