import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_bills",
  title: "Listar contas",
  description: "Lista as contas (fixas, dívidas, cartões) do usuário autenticado, com filtro opcional por workspace e status de pagamento.",
  inputSchema: {
    workspace_id: z.string().uuid().optional(),
    only_unpaid: z.boolean().optional().describe("Se true, retorna apenas contas não pagas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, only_unpaid }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    let q = supabaseForUser(ctx).from("bills").select("*").order("due_date", { ascending: true });
    if (workspace_id) q = q.eq("workspace_id", workspace_id);
    if (only_unpaid) q = q.eq("is_paid", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { bills: data ?? [] },
    };
  },
});
