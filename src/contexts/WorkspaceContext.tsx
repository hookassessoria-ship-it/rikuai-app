import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

interface Ctx {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspaceId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
}

const WorkspaceContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "riku_active_workspace_id";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);
  const creatingDefault = useRef(false);

  /** Cria workspace + membership + settings.
   *  O id é gerado no cliente porque a linha só fica legível após o membership existir. */
  const createRow = useCallback(async (name: string): Promise<Workspace | null> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const id = crypto.randomUUID();
    const uid = userData.user.id;
    const { error } = await supabase.from("workspaces").insert({ id, name, owner_id: uid });
    if (error) { console.error(error); return null; }
    await supabase.from("workspace_members").insert({ workspace_id: id, user_id: uid, role: "owner" });
    await supabase.from("workspace_settings").insert({ workspace_id: id, data: {} });
    return { id, name, owner_id: uid };
  }, []);

  const ensureDefault = useCallback(() => createRow("Pessoal"), [createRow]);


  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("workspaces").select("id, name, owner_id").order("created_at");
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    let list = data ?? [];
    // Usuário sem workspace (ex.: primeiro acesso): cria a padrão automaticamente.
    if (list.length === 0 && !creatingDefault.current) {
      creatingDefault.current = true;
      const created = await ensureDefault();
      if (created) list = [created];
    }
    setWorkspaces(list);
    setActiveId((prev) => {
      if (prev && list.some((w) => w.id === prev)) return prev;
      const first = list[0]?.id ?? null;
      if (first) localStorage.setItem(STORAGE_KEY, first);
      return first;
    });
    setLoading(false);
  }, [ensureDefault]);

  useEffect(() => { refresh(); }, [refresh]);


  const setActiveWorkspaceId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
  }, []);

  const createWorkspace = useCallback(async (name: string) => {
    const created = await createRow(name);
    if (!created) return;
    await refresh();
    setActiveWorkspaceId(created.id);
  }, [createRow, refresh, setActiveWorkspaceId]);


  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? null;

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspaceId, loading, refresh, createWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
