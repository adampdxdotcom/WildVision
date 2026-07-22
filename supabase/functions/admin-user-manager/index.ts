import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight Options Request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
    }

    // 2. Validate Authorization Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Client with the caller's JWT to verify identity
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
        JSON.stringify({ error: "Unauthorized JWT or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify requester is an Admin
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Requester must be an administrator" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse incoming body and action
    const body = await req.json();
    const { action } = body;

    console.log(`[Admin User Manager] Action invoked: ${action} by user ${user.email} (${user.id})`);

    // 5. Handle Actions
    if (action === "create") {
      const { email, password, role } = body;
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password are required for user creation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user in Auth
      const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update their profile role if specified (triggers or RLS handles profiles generally, but we make sure)
      if (role && authUser?.user) {
        const { error: roleError } = await adminClient
          .from("profiles")
          .update({ role })
          .eq("id", authUser.user.id);
        
        if (roleError) {
          console.error(`[Admin User Manager] Failed to update role for new user:`, roleError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, user: authUser.user }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "delete") {
      const { userId } = body;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required for deletion" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userId === user.id) {
        return new Response(
          JSON.stringify({ error: "Self-deletion is not permitted administratively" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "sendResetEmail") {
      const { email, redirectTo } = body;
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Target email is required for password recovery trigger" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[Admin User Manager] Administrative password reset initiated for email: ${email}`);

      // Determine redirect URL
      const origin = req.headers.get("origin") || "https://ais-dev-zp25pp4nq3nb4jmujjxsi4-264275564530.us-west1.run.app";
      const finalRedirectTo = redirectTo || `${origin}/`;

      // 1. Directly instruct Supabase Auth to dispatch the system recovery email to the target email
      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: finalRedirectTo,
      });

      if (resetError) {
        console.error(`[Admin User Manager] Error during resetPasswordForEmail:`, resetError);
        return new Response(
          JSON.stringify({ error: resetError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Programmatically generate a secure single-use recovery link to return in the JSON payload (as fallback/utility)
      let recoveryLink = null;
      try {
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: email,
          options: {
            redirectTo: finalRedirectTo,
          },
        });

        if (!linkError && linkData?.properties?.action_link) {
          recoveryLink = linkData.properties.action_link;
        }
      } catch (linkErr) {
        console.warn(`[Admin User Manager] Non-blocking warning: Could not programmatically generate recovery link fallback:`, linkErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Administrative recovery workflow initialized for ${email}. Email sent successfully.`,
          recoveryLink: recoveryLink,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "list") {
      const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) {
        console.error(`[Admin User Manager] Error listing auth users:`, listError);
        return new Response(
          JSON.stringify({ error: listError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, users: listData?.users || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported command action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error(`[Admin User Manager] Fatal uncaught error:`, error);
    return new Response(
      JSON.stringify({ error: error?.message || "An unexpected server-side error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
