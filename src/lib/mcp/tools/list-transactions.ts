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
  name: "list_transactions",
  title: "Listar transações",
  description: "Lista transações (receitas e despesas) do usuário autenticado, opcionalmente filtradas por workspace e intervalo de datas.",
  inputSchema: {
    workspace_id: z.string().uuid().optional().describe("ID do workspace (opcional; se omitido, retorna de todos os workspaces do usuário)."),
    from: z.string().optional().describe("Data inicial ISO (YYYY-MM-DD)."),
    to: z.string().optional().describe("Data final ISO (YYYY-MM-DD)."),
    limit: z.number().int().min(1).max(500).optional().describe("Máximo de registros (padrão 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    let q = supabaseForUser(ctx).from("transactions").select("*").order("date", { ascending: false }).limit(limit ?? 100);
    if (workspace_id) q = q.eq("workspace_id", workspace_id);
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { transactions: data ?? [] },
    };
  },
});
