import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SourcePick {
  source_id: string;
  quantity: number;
}
interface ItemPick {
  lend_request_item_id: string;
  picks: SourcePick[];
}
interface Body {
  request_id: string;
  items: ItemPick[];
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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
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
    if (!body?.request_id || !Array.isArray(body.items)) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch request items to validate sums
    const { data: reqItems, error: riErr } = await admin
      .from("lend_request_items")
      .select("id, item_id, quantity, request_id")
      .eq("request_id", body.request_id);
    if (riErr) throw riErr;
    const byId = new Map(reqItems!.map((r) => [r.id, r]));

    for (const it of body.items) {
      const ri = byId.get(it.lend_request_item_id);
      if (!ri) throw new Error("Unknown lend_request_item_id");
      const sum = it.picks.reduce((s, p) => s + (p.quantity || 0), 0);
      if (sum !== ri.quantity) {
        throw new Error(`כמות לא תואמת לפריט (נדרש ${ri.quantity}, נבחר ${sum})`);
      }
    }

    // Validate stock availability per source/item
    for (const it of body.items) {
      const ri = byId.get(it.lend_request_item_id)!;
      for (const p of it.picks) {
        if (p.quantity <= 0) continue;
        const { data: cis, error } = await admin
          .from("catalog_item_sources")
          .select("quantity")
          .eq("item_id", ri.item_id)
          .eq("source_id", p.source_id)
          .maybeSingle();
        if (error) throw error;
        if (!cis || cis.quantity < p.quantity) {
          throw new Error("מלאי לא מספיק במקור שנבחר");
        }
      }
    }

    // Apply: decrement source quantities + insert lris rows
    for (const it of body.items) {
      const ri = byId.get(it.lend_request_item_id)!;
      for (const p of it.picks) {
        if (p.quantity <= 0) continue;
        const { data: cis } = await admin
          .from("catalog_item_sources")
          .select("id, quantity")
          .eq("item_id", ri.item_id)
          .eq("source_id", p.source_id)
          .single();
        const { error: upErr } = await admin
          .from("catalog_item_sources")
          .update({ quantity: cis!.quantity - p.quantity })
          .eq("id", cis!.id);
        if (upErr) throw upErr;
        const { error: insErr } = await admin
          .from("lend_request_item_sources")
          .insert({
            lend_request_item_id: it.lend_request_item_id,
            source_id: p.source_id,
            quantity: p.quantity,
          });
        if (insErr) throw insErr;
      }
    }

    const { error: stErr } = await admin
      .from("lend_requests")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
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
