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
    // Auth: get user from JWT
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

    const { text, overrides = {} } = await req.json();
    if (!text?.trim()) return jsonResponse({ error: "Text is required" }, 400);

    // Fetch user's categories and timezone
    const [categoriesResult, profileResult] = await Promise.all([
      supabase
        .from("categories")
        .select("value, label")
        .order("sort_order"),
      supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .single(),
    ]);

    const categories = categoriesResult.data || [];
    const timezone = profileResult.data?.timezone || "America/New_York";
    const categoryValues = categories.map((c: { value: string }) => c.value);

    // Build Gemini prompt
    const now = new Date();
    const systemPrompt = `You are a reminder parsing assistant. Parse the user's natural language text into structured reminder data.

Current date/time: ${now.toISOString()}
User timezone: ${timezone}
Available categories: ${categoryValues.join(", ")}

Return a JSON object with these fields:
- title: string (cleaned up, concise title for the reminder)
- description: string (additional details, or empty string)
- category: string (one of the available categories, best guess based on content)
- priority: "low" | "medium" | "high" (based on urgency/importance cues)
- event_time: string (ISO 8601 datetime, interpret relative dates like "tomorrow", "next monday", "in 2 hours" relative to current time)
- estimated_minutes: number (estimated time to complete this task, in minutes, default 30)

Rules:
- Remove filler phrases like "remind me to", "don't forget to", etc. from the title
- If no time is specified, default to tomorrow at 9:00 AM in the user's timezone
- If a date is given but no time, default to 9:00 AM
- Detect priority from words like "urgent", "important", "high priority", "low priority", "ASAP"
- Match category based on content keywords
- Return ONLY valid JSON, no markdown, no explanation`;

    const userPrompt = text.trim();

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\nUser input: " + userPrompt }] },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed: {
      title: string;
      description: string;
      category: string;
      priority: string;
      event_time: string;
      estimated_minutes: number;
    };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Fallback: basic parsing
      parsed = {
        title: text
          .replace(/^(remind me to |remember to |don't forget to )/i, "")
          .trim(),
        description: "",
        category: "personal",
        priority: "medium",
        event_time: new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        ).toISOString(),
        estimated_minutes: 30,
      };
    }

    // Apply user overrides
    if (overrides.category) parsed.category = overrides.category;
    if (overrides.priority) parsed.priority = overrides.priority;
    if (overrides.eventTime) parsed.event_time = new Date(overrides.eventTime).toISOString();

    // Validate category exists
    if (!categoryValues.includes(parsed.category)) {
      parsed.category = "personal";
    }

    // Validate priority
    if (!["low", "medium", "high"].includes(parsed.priority)) {
      parsed.priority = "medium";
    }

    // Insert into reminders table
    const { data: reminder, error: insertError } = await supabase
      .from("reminders")
      .insert({
        user_id: user.id,
        title: parsed.title,
        description: parsed.description || "",
        category: parsed.category,
        priority: parsed.priority,
        event_time: parsed.event_time,
        estimated_minutes: parsed.estimated_minutes || 30,
        completed: false,
        notify_before_minutes: 15,
      })
      .select()
      .single();

    if (insertError) return jsonResponse({ error: insertError.message }, 500);

    return jsonResponse({ success: true, reminder });
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
