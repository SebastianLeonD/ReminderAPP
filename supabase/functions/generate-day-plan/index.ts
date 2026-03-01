import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return jsonResponse({ error: "Unauthorized" }, 401);

    const { date } = await req.json();
    const planDate = date || new Date().toISOString().split("T")[0];
    const targetDate = new Date(planDate + "T00:00:00");
    const dayOfWeek = targetDate.getDay(); // 0=Sunday

    // Fetch user's schedule blocks for this day
    const { data: scheduleBlocks } = await supabase
      .from("user_schedules")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .order("start_time");

    // Fetch user's timezone
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();

    const timezone = profile?.timezone || "America/New_York";

    // Fetch incomplete reminders sorted by priority then event_time
    const { data: reminders } = await supabase
      .from("reminders")
      .select("*")
      .eq("completed", false)
      .order("event_time", { ascending: true });

    const fixedBlocks = (scheduleBlocks || [])
      .filter((b: { is_available: boolean }) => !b.is_available)
      .map(
        (b: { block_name: string; start_time: string; end_time: string }) => ({
          name: b.block_name,
          start: b.start_time.slice(0, 5),
          end: b.end_time.slice(0, 5),
        })
      );

    const tasks = (reminders || []).map(
      (r: {
        id: string;
        title: string;
        priority: string;
        event_time: string;
        estimated_minutes: number;
        category: string;
      }) => ({
        id: r.id,
        title: r.title,
        priority: r.priority,
        deadline: r.event_time,
        estimated_minutes: r.estimated_minutes || 30,
        category: r.category,
      })
    );

    // Build Gemini prompt
    const systemPrompt = `You are a day planning assistant. Create an optimized daily schedule.

Date: ${planDate} (${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek]})
Timezone: ${timezone}

Fixed blocks (cannot be moved):
${fixedBlocks.length > 0 ? fixedBlocks.map((b: { name: string; start: string; end: string }) => `- ${b.name}: ${b.start} - ${b.end}`).join("\n") : "- None"}

Tasks to schedule:
${tasks.length > 0 ? tasks.map((t: { title: string; priority: string; deadline: string; estimated_minutes: number; category: string }) => `- "${t.title}" (${t.priority} priority, ~${t.estimated_minutes}min, category: ${t.category}, deadline: ${t.deadline})`).join("\n") : "- No tasks"}

Rules:
1. Place tasks in available free time windows (not during fixed blocks)
2. Prioritize by: deadline proximity first, then priority level (high > medium > low)
3. Include 5-10 minute breaks between tasks
4. Don't schedule before 7:00 AM or after 10:00 PM
5. Group similar categories together when possible
6. Leave some buffer time for unexpected things

Return a JSON array of time blocks:
[
  { "start": "HH:MM", "end": "HH:MM", "title": "Block Name", "type": "fixed"|"task"|"break", "reminder_id": "uuid-or-null" }
]

Include fixed blocks in the output. Return ONLY valid JSON array, no markdown, no explanation.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let planData: Array<{
      start: string;
      end: string;
      title: string;
      type: string;
      reminder_id?: string;
    }>;
    try {
      planData = JSON.parse(responseText);
      if (!Array.isArray(planData)) planData = [];
    } catch {
      planData = [];
    }

    // Upsert the day plan
    const { data: plan, error: upsertError } = await supabase
      .from("day_plans")
      .upsert(
        {
          user_id: user.id,
          plan_date: planDate,
          plan_data: planData,
          generated_at: new Date().toISOString(),
          accepted: false,
        },
        { onConflict: "user_id,plan_date" }
      )
      .select()
      .single();

    if (upsertError)
      return jsonResponse({ error: upsertError.message }, 500);

    return jsonResponse({ success: true, plan });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
