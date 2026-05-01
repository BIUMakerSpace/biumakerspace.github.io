import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Override {
  // override the source per existing lris row id (optional)
  lris_id: string;
  source_id: string;
}
interface Body {
  request_id: string;
  overrides?: Override[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = !!roleData?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.request_id) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply per-row overrides
    const overrideMap = new Map<string, string>();
    (body.overrides ?? []).forEach((o) => overrideMap.set(o.lris_id, o.source_id));

    // Fetch lris rows for the request
    const { data: lris, error: lErr } = await admin
      .from("lend_request_item_sources")
      .select("id, source_id, quantity, lend_request_item_id, lend_request_items!inner(item_id, request_id)")
      .eq("lend_request_items.request_id", body.request_id);
    if (lErr) throw lErr;

    for (const row of lris ?? []) {
      const targetSource = overrideMap.get(row.id) ?? row.source_id;
      const itemId = (row as any).lend_request_items.item_id as string;

      // Increment (or create) target source row
      const { data: existing } = await admin
        .from("catalog_item_sources")
        .select("id, quantity")
        .eq("item_id", itemId)
        .eq("source_id", targetSource)
        .maybeSingle();
      if (existing) {
        const { error } = await admin
          .from("catalog_item_sources")
          .update({ quantity: existing.quantity + row.quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await admin
          .from("catalog_item_sources")
          .insert({ item_id: itemId, source_id: targetSource, quantity: row.quantity });
        if (error) throw error;
      }
      // Delete the lris row so on-loan total drops
      const { error: delErr } = await admin
        .from("lend_request_item_sources")
        .delete()
        .eq("id", row.id);
      if (delErr) throw delErr;
    }

    const { error: stErr } = await admin
      .from("lend_requests")
      .update({ status: "returned", returned_at: new Date().toISOString() })
      .eq("id", body.request_id);
    if (stErr) throw stErr;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
