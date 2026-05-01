// js/supabase-config.js

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://cpxaywxaiohjnqskhufr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNweGF5d3hhaW9oam5xc2todWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NzA1MzIsImV4cCI6MjA4MjI0NjUzMn0.VWdleQygaC2CGIoEGC84proIgLfq3DSO6ah8Ayen7Jk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔥 TRACK GLOBAL
export async function trackEvent(eventName, metadata = {}) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) return;

  await supabase.from("events").insert({
    user_id: user.id,
    event_name: eventName,
    metadata,
  });
}
