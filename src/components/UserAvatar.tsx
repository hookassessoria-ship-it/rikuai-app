import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signedAvatar } from "@/hooks/useSocial";

let cachedPath: string | null | undefined;
let cachedName: string | null | undefined;

/**
 * Avatar do usuário logado — usado no header, settings, IA e social.
 * Busca o perfil uma única vez por sessão (cache em memória).
 */
export function UserAvatar({ size = 44, className = "" }: { size?: number; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(cachedName ?? null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (cachedPath === undefined) {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url, display_name")
          .eq("id", auth.user.id)
          .maybeSingle();
        cachedPath = data?.avatar_url ?? null;
        cachedName = data?.display_name ?? null;
      }
      if (!alive) return;
      setName(cachedName ?? null);
      const signed = await signedAvatar(cachedPath ?? null);
      if (alive) setUrl(signed);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-surface-overlay ring-1 ring-border/70 ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt={name ?? "avatar"} className="w-full h-full object-cover" />
      ) : (
        <span className="font-black text-muted-custom" style={{ fontSize: size * 0.36 }}>
          {(name ?? "R").slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/** Limpa o cache (chamado após editar o perfil ou trocar de conta). */
export function resetAvatarCache() {
  cachedPath = undefined;
  cachedName = undefined;
}
