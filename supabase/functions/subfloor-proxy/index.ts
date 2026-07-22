import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  // 1. CORS Preflight Handling (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
    }

    // 2. User Authentication (JWT Verification)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Initialize Supabase client with client's Authorization header to verify JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid JWT or session expired" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 3. Credential Retrieval (Database Query)
    // Initialize admin client with service role key to bypass RLS and retrieve credentials securely
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: profile, error: profileError } = await adminClient
      .from("app_settings")
      .select("subfloor_url, subfloor_api_key")
      .eq("id", 1)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile || !profile.subfloor_url || !profile.subfloor_api_key) {
      return new Response(
        JSON.stringify({ 
          error: "Subfloor integration is not configured. Please supply a valid URL and API key in your integration settings." 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 4. Payload Parsing & Routing
    let endpoint = "";
    let method = "GET";
    let bodyPayload: any = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        endpoint = body.endpoint || "";
        method = (body.method || "GET").toUpperCase();
        bodyPayload = body.body || null;
      } catch (parseErr) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON request body" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } else {
      // Support GET as fallback or query parameter fallback
      const urlObj = new URL(req.url);
      endpoint = urlObj.searchParams.get("endpoint") || "";
      method = (urlObj.searchParams.get("method") || "GET").toUpperCase();
    }

    // Normalize slashes for subfloor_url, "/api/integration", and endpoint
    let baseUrl = profile.subfloor_url.trim();
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    let cleanEndpoint = endpoint.trim();
    if (!cleanEndpoint.startsWith("/")) {
      cleanEndpoint = "/" + cleanEndpoint;
    }

    const targetUrl = `${baseUrl}/api/integration${cleanEndpoint}`;

    // 5. Executing the Subfloor Handshake
    console.log(`[Subfloor Proxy] Fetching target: ${method} ${targetUrl} for user ${user.id}`);

    const subfloorHeaders: HeadersInit = {
      "Authorization": `Bearer ${profile.subfloor_api_key}`,
      "Content-Type": "application/json",
    };

    const fetchOptions: RequestInit = {
      method,
      headers: subfloorHeaders,
    };

    if (method !== "GET" && method !== "HEAD" && bodyPayload) {
      fetchOptions.body = JSON.stringify(bodyPayload);
    }

    const subfloorResponse = await fetch(targetUrl, fetchOptions);
    let responseData;
    const contentType = subfloorResponse.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      responseData = await subfloorResponse.json();
    } else {
      responseData = { message: await subfloorResponse.text() };
    }

    return new Response(
      JSON.stringify(responseData),
      {
        status: subfloorResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        }
      }
    );

  } catch (err: any) {
    // 6. Graceful Error Handling
    console.error(`[Subfloor Proxy] Proxy failure:`, err);
    return new Response(
      JSON.stringify({ 
        error: "Subfloor handshake failed.", 
        details: err?.message || "An unexpected network or gateway error occurred while reaching Subfloor." 
      }),
      { 
        status: 502, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
