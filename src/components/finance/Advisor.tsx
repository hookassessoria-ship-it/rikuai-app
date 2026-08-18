import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Sparkles, Loader2, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { AdvisorMessage, AiPersonality } from "@/types/finance";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT, getLanguage } from "@/lib/i18n";

interface AdvisorProps {
  messages:           AdvisorMessage[];
  setMessages:        (updater: (m: AdvisorMessage[]) => AdvisorMessage[]) => void;
  onClear:            () => void;
  buildContext:       () => Record<string, unknown>;
  personality:        AiPersonality;
}

const SUGGESTION_KEYS = ["adv_sug_1", "adv_sug_2", "adv_sug_3", "adv_sug_4"];

// Renderiza texto simples com **negrito**, bullets (- ) e quebras de linha.
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const isBullet = /^\s*[-•]\s+/.test(line);
        const clean = line.replace(/^\s*[-•]\s+/, "");
        const parts = clean.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        const content = parts.map((p, i) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={i} className="text-primary font-black">{p.slice(2, -2)}</strong>
            : <span key={i}>{p}</span>
        );
        if (!clean.trim()) return <div key={idx} className="h-1" />;
        return isBullet
          ? <div key={idx} className="flex gap-2"><span className="text-primary">•</span><span>{content}</span></div>
          : <p key={idx}>{content}</p>;
      })}
    </div>
  );
}

function stripMarkdown(t: string) {
  return t.replace(/\*\*/g, "").replace(/^[\-•]\s+/gm, "");
}

export function Advisor({ messages, setMessages, onClear, buildContext, personality }: AdvisorProps) {
  const t = useT();
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const speak = (text: string, idx: number) => {
    if (!("speechSynthesis" in window)) {
      toast.error(t("adv_no_tts"));
      return;
    }
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(stripMarkdown(text));
    utter.lang = getLanguage();
    utter.rate = 1.05;
    utter.onend = () => setSpeakingIdx(null);
    utter.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utter);
  };

  const toggleListening = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error(t("adv_no_stt"));
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = getLanguage();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " : "") + text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: AdvisorMessage = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const ctx = buildContext();
      const { data, error } = await supabase.functions.invoke("financial-advisor", {
        body: { messages: [...messages, userMsg], financialContext: ctx, personality, language: getLanguage() },
      });

      const errMsg =
        (error as any)?.context?.error ||
        (error as any)?.message ||
        (data && typeof data === "object" && (data as any).error) ||
        null;

      if (errMsg) {
        // Normaliza acentos para detectar "credito"/"credit" em qualquer idioma.
        const norm = String(errMsg).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isCredits = norm.includes("credit");
        const friendly = isCredits
          ? `${t("adv_credits_msg")}\n\n[[ADD_CREDITS]]`
          : String(errMsg).includes("Muitas")
          ? t("adv_too_many")
          : `⚠️ ${errMsg}`;
        toast.error(isCredits ? t("adv_credits_out") : friendly.replace(/^⚠️\s*/, ""));
        setMessages((m) => [...m, { role: "assistant", content: friendly }]);
        return;
      }

      setMessages((m) => [...m, { role: "assistant", content: data?.reply ?? t("adv_no_reply") }]);
    } catch (e: any) {
      const msg = e?.message ?? t("adv_generic_error");
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col animate-slide-up" style={{ minHeight: "calc(100vh - 220px)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{t("adv_header")}</h2>
            <p className="text-[10px] text-muted-custom">{t("adv_style_line", { style: t(`ai_${personality}`) })}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={onClear} className="text-muted-custom hover:text-danger p-1.5 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="rounded-2xl p-5 gradient-card border border-border/60">
            <p className="text-sm text-foreground font-semibold mb-3">
              {t("adv_hello")}
            </p>
            <div className="space-y-2">
              {SUGGESTION_KEYS.map((k) => (
                <button key={k} onClick={() => send(t(k))}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-xl bg-surface-overlay border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground">
                  💬 {t(k)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const hasAddCredits = m.role === "assistant" && m.content.includes("[[ADD_CREDITS]]");
          const cleaned = hasAddCredits ? m.content.replace("[[ADD_CREDITS]]", "").trim() : m.content;
          return (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
              m.role === "user"
                ? "bg-primary text-primary-foreground font-medium whitespace-pre-wrap"
                : "bg-surface border border-border/60 text-foreground",
            )}>
              {m.role === "assistant" ? (
                <>
                  <RichText text={cleaned} />
                  {hasAddCredits && (
                    <a
                      href="https://lovable.dev/settings/plans"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
                      {t("adv_add_credits")}
                    </a>
                  )}
                  <div className="mt-2 flex justify-end">
                    <button onClick={() => speak(cleaned, i)}
                      className="text-[10px] flex items-center gap-1 text-muted-custom hover:text-primary transition-colors">
                      {speakingIdx === i
                        ? <><VolumeX className="w-3 h-3" /> {t("adv_stop")}</>
                        : <><Volume2 className="w-3 h-3" /> {t("adv_listen")}</>}
                    </button>
                  </div>
                </>
              ) : m.content}
            </div>
          </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3.5 py-2.5 bg-surface border border-border/60 text-muted-custom text-sm flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("adv_analyzing")}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mt-3 flex gap-2 sticky bottom-0">
        <button type="button" onClick={toggleListening} disabled={loading}
          className={cn(
            "px-3 py-3 rounded-2xl border transition-colors",
            listening
              ? "bg-danger/20 border-danger/60 text-danger animate-pulse"
              : "bg-surface border-border text-muted-custom hover:text-primary hover:border-primary/40"
          )}>
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
          placeholder={listening ? t("adv_listening") : t("adv_input_ph")}
          className="flex-1 px-4 py-3 rounded-2xl bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/60 text-sm" />
        <button type="submit" disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-2xl bg-primary text-primary-foreground disabled:opacity-40">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
