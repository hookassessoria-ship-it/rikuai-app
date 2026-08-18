import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWorkspacesTool from "./tools/list-workspaces";
import listTransactionsTool from "./tools/list-transactions";
import listBillsTool from "./tools/list-bills";
import createTransactionTool from "./tools/create-transaction";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "riku-ai-mcp",
  title: "Riku AI — Finanças",
  version: "0.1.0",
  instructions:
    "Ferramentas para o app Riku AI (controle financeiro pessoal em BRL). " +
    "Use `list_workspaces` para descobrir os workspaces do usuário, " +
    "`list_transactions` e `list_bills` para ler dados, e `create_transaction` para registrar receitas/despesas. " +
    "Todos os valores são em Reais (BRL). Datas em ISO YYYY-MM-DD.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listWorkspacesTool, listTransactionsTool, listBillsTool, createTransactionTool],
});
