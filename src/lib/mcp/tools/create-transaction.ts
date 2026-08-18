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
  name: "create_transaction",
  title: "Registrar transação",
  description: "Cria uma nova transação (receita ou despesa) em um workspace do usuário.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("Workspace onde criar a transação."),
    type: z.enum(["income", "expense"]).describe("Tipo: income (receita) ou expense (despesa)."),
    amount: z.number().positive().describe("Valor em BRL (positivo)."),
    category: z.string().min(1).describe("Categoria (ex.: Alimentação, Moradia, Salário)."),
    description: z.string().optional(),
    date: z.string().describe("Data ISO YYYY-MM-DD."),
    payment_method: z.enum(["dinheiro", "débito", "crédito"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("transactions")
      .insert({
        workspace_id: input.workspace_id,
        type: input.type,
        amount: input.amount,
        category: input.category,
        description: input.description ?? null,
        date: input.date,
        payment_method: input.payment_method ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Transação criada: ${data.id}` }],
      structuredContent: { transaction: data },
    };
  },
});
