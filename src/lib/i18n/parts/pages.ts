// Chaves de tradução: contas, sonhos, workspaces, onboarding, premium e checkout.
export const pt: Record<string, string> = {
  // Workspace switcher
  ws_created_toast: 'Workspace "{name}" criado',
  ws_name_ph: "Nome do workspace",
  ws_create: "Criar",
  ws_cancel: "Cancelar",
  ws_new: "Novo workspace",

  // Import legacy modal
  import_found_title: "Dados salvos encontrados",
  import_found_desc: "Detectamos transações e contas guardadas neste navegador de antes de você criar sua conta. Deseja importar tudo para o workspace {workspace}?",
  import_button: "Importar dados",
  import_start_fresh: "Começar do zero",
  import_once_note: "Você pode importar apenas uma vez. Ao começar do zero, os dados locais são descartados.",

  // Premium page
  premium_back: "Voltar",
  premium_headline: "Desbloqueie todo o poder do Riku",
  premium_monthly_note: "Assinatura mensal — cancele quando quiser",
  premium_loading: "Carregando...",
  premium_you_are: "Você é Premium",
  premium_active_until: "Acesso ativo até {date}",
  premium_active_sub: "Assinatura ativa",
  premium_manage: "Gerenciar assinatura",
  premium_opening: "Abrindo...",
  premium_per_month: "/mês",
  premium_feature_ai: "Consultor IA ilimitado (sem limite mensal)",
  premium_feature_themes: "Temas coloridos exclusivos",
  premium_feature_history: "Histórico mensal avançado (12+ meses)",
  premium_feature_dreams: "Aba Sonho — metas de longo prazo",
  premium_feature_support: "Suporte prioritário",
  premium_subscribe_now: "Assinar agora",
  premium_portal_error: "Falha ao abrir portal",

  // Checkout return
  checkout_success_title: "Pagamento recebido!",
  checkout_success_desc: "Seu Premium está sendo ativado. Isso leva alguns segundos.",
  checkout_view_sub: "Ver minha assinatura",
  checkout_not_found_title: "Sessão não encontrada",
  checkout_back: "Voltar",

  // OAuth consent
  oauth_missing_id: "authorization_id ausente na URL.",
  oauth_load_error_title: "Não foi possível carregar a autorização",
  oauth_no_redirect_url: "O servidor de autorização não retornou uma URL de redirecionamento.",
  oauth_default_client: "Aplicativo externo",
  oauth_connect_title: "Conectar {client} ao Riku AI",
  oauth_connect_desc: "{client} poderá chamar as ferramentas do Riku AI agindo em seu nome enquanto você estiver logado.",
  oauth_redirect_url_label: "URL de retorno",
  oauth_permissions_label: "Permissões solicitadas",
  oauth_perm_read: "Ler seus workspaces, transações e contas",
  oauth_perm_write: "Registrar novas transações em seu nome",
  oauth_scope_label: "Escopo OAuth: {scopes}",
  oauth_scope_note: "Isto não ignora as regras de acesso do app: apenas seus próprios dados ficam disponíveis.",
  oauth_cancel: "Cancelar",
  oauth_approve: "Aprovar",

  // Not found
  nf_title: "404",
  nf_subtitle: "Ops! Página não encontrada",
  nf_return_home: "Voltar para o início",
};
export const en: Record<string, string> = {
  // Workspace switcher
  ws_created_toast: 'Workspace "{name}" created',
  ws_name_ph: "Workspace name",
  ws_create: "Create",
  ws_cancel: "Cancel",
  ws_new: "New workspace",

  // Import legacy modal
  import_found_title: "Saved data found",
  import_found_desc: "We detected transactions and bills stored in this browser from before you created your account. Do you want to import everything into the workspace {workspace}?",
  import_button: "Import data",
  import_start_fresh: "Start fresh",
  import_once_note: "You can only import once. Starting fresh discards the local data.",

  // Premium page
  premium_back: "Back",
  premium_headline: "Unlock the full power of Riku",
  premium_monthly_note: "Monthly subscription — cancel anytime",
  premium_loading: "Loading...",
  premium_you_are: "You are Premium",
  premium_active_until: "Active access until {date}",
  premium_active_sub: "Active subscription",
  premium_manage: "Manage subscription",
  premium_opening: "Opening...",
  premium_per_month: "/mo",
  premium_feature_ai: "Unlimited AI advisor (no monthly limit)",
  premium_feature_themes: "Exclusive color themes",
  premium_feature_history: "Advanced monthly history (12+ months)",
  premium_feature_dreams: "Dreams tab — long-term goals",
  premium_feature_support: "Priority support",
  premium_subscribe_now: "Subscribe now",
  premium_portal_error: "Failed to open portal",

  // Checkout return
  checkout_success_title: "Payment received!",
  checkout_success_desc: "Your Premium is being activated. This takes a few seconds.",
  checkout_view_sub: "View my subscription",
  checkout_not_found_title: "Session not found",
  checkout_back: "Back",

  // OAuth consent
  oauth_missing_id: "authorization_id missing from URL.",
  oauth_load_error_title: "Could not load the authorization",
  oauth_no_redirect_url: "The authorization server did not return a redirect URL.",
  oauth_default_client: "External application",
  oauth_connect_title: "Connect {client} to Riku AI",
  oauth_connect_desc: "{client} will be able to call Riku AI tools acting on your behalf while you're logged in.",
  oauth_redirect_url_label: "Return URL",
  oauth_permissions_label: "Requested permissions",
  oauth_perm_read: "Read your workspaces, transactions and bills",
  oauth_perm_write: "Record new transactions on your behalf",
  oauth_scope_label: "OAuth scope: {scopes}",
  oauth_scope_note: "This does not bypass the app's access rules: only your own data is available.",
  oauth_cancel: "Cancel",
  oauth_approve: "Approve",

  // Not found
  nf_title: "404",
  nf_subtitle: "Oops! Page not found",
  nf_return_home: "Return to Home",
};
