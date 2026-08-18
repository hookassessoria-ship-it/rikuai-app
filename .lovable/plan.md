# Etapa 3 — SaaS: Auth, Workspaces e Stripe

Grande mudança de arquitetura. Vou dividir em 4 sub-etapas para reduzir risco e permitir validação incremental.

## Sub-etapa 3.1 — Autenticação
- Habilitar Email+Senha e Google (Lovable Cloud gerenciado, sem chaves).
- Página `/auth` com abas Entrar / Criar conta + botão "Continuar com Google".
- `ProtectedRoute` envolve toda a app. Sem sessão → redireciona para `/auth`.
- Listener `onAuthStateChange` no topo; `getUser()` para checagens sensíveis.
- Tabela `profiles` (id ↔ auth.users, display_name) com trigger de auto-criação.

## Sub-etapa 3.2 — Migração + Multi-workspace
- Tabelas com RLS (todas escopadas por `workspace_id` + `user_workspaces`):
  - `workspaces` (name, owner_id)
  - `workspace_members` (workspace_id, user_id, role)
  - `transactions`, `bills`, `settings` (uma linha por workspace), `dream_goals` (para etapa futura)
- Function `has_workspace_access(uid, wid)` SECURITY DEFINER para evitar recursão em RLS.
- No 1º login: criar automaticamente workspaces "Pessoal" e "Yakin Box" (owner = user).
- Seletor de workspace no header (dropdown). Estado atual em `useFinance`.
- Modal de 1º login: "Detectamos dados salvos neste navegador. Importar para o workspace Pessoal?" → Sim/Não. Se Sim, faz bulk insert e limpa localStorage.
- Refatorar `useFinance.ts`: substitui localStorage por queries Supabase filtradas por `workspace_id` ativo. Mantém a mesma API pública dos hooks para não quebrar componentes.

## Sub-etapa 3.3 — Stripe (pagamentos)
- Rodar `recommend_payment_provider` (obrigatório) → `enable_stripe_payments`.
- Criar 1 produto "Riku AI Premium" com preço mensal (valor a definir; sugiro R$ 19,90/mês) via `batch_create_product`.
- Tabela `subscriptions` (user_id, status, current_period_end) preenchida por webhook padrão Stripe.
- Página `/premium` com botão "Assinar" → checkout.
- Hook `usePremium()`: consulta `subscriptions.status === 'active'` (com fallback ao botão "Simular Premium" só em dev).

## Sub-etapa 3.4 — Premium gate real
- Bloquear (com overlay "Premium"): temas coloridos (exceto purple), IA Advisor, MonthlyHistory avançado, aba Sonho (futura).
- Botão "Simular Premium" é removido; substituído por link para `/premium`.

## Detalhes técnicos
- Migração SQL única com CREATE TABLE + GRANT + RLS + POLICY para todas as tabelas.
- Policies usam `has_workspace_access(auth.uid(), workspace_id)`.
- `settings` vira 1 linha por workspace (JSONB para categorias custom + colorTheme).
- `useFinance` mantém interface (`addTransaction`, `addBill`, etc.) mas passa `workspace_id` ativo em todos os inserts.
- Loading states: skeleton no Dashboard enquanto queries iniciais rodam.

## Ordem de execução proposta
1. Migração DB (tabelas + RLS + trigger de profile).
2. Configurar auth (email + Google).
3. Página `/auth` + `ProtectedRoute` + header com workspace switcher + modal de migração.
4. Refatorar `useFinance` para Cloud.
5. `recommend_payment_provider` → `enable_stripe_payments` → produto → `/premium` → gate.

## Riscos
- Refatorar `useFinance` é a parte mais frágil (muitos componentes consomem). Vou manter a assinatura idêntica.
- Consumo de créditos alto (auth + migração + Stripe). Se quiser pausar entre sub-etapas, é só avisar.
- Migração automática do localStorage roda 1 vez por dispositivo — se o usuário logar em outro navegador, esses dados ficam órfãos (aviso claro no modal).

Confirma para eu começar pela sub-etapa 3.1?
