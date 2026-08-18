import { useEffect, useRef, useState } from "react";
import bg from "@/assets/riku-bg.mp4.asset.json";
import poster from "@/assets/riku-bg-poster.jpg.asset.json";

/**
 * HERO cinematográfico da Home ("RikuAI Worlds").
 * Vídeo decorativo em loop, sem controles, com véu de vidro premium por cima.
 * Respeita prefers-reduced-motion e pausa quando a aba fica oculta.
 */
export function HomeHero({
  enabled = true,
  title,
  subtitle,
  children,
}: {
  enabled?: boolean;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotionOk(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onVis = () => {
      const v = ref.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else void v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const showVideo = enabled && motionOk;

  return (
    <section
      className="relative overflow-hidden rounded-b-[32px] sm:rounded-[28px] border-b sm:border border-border/50 shadow-card animate-scale-in"
      style={{ height: "clamp(200px, 30dvh, 320px)" }}
    >
      {showVideo ? (
        <video
          ref={ref}
          src={bg.url}
          poster={poster.url}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover scale-105 motion-safe:animate-[hero-drift_28s_ease-in-out_infinite]"
        />
      ) : (
        <img src={poster.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      )}

      {/* Véu premium: escurece a base para o texto sempre ter contraste */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(252 30% 4% / 0.15) 0%, hsl(252 30% 4% / 0.55) 55%, hsl(252 30% 4% / 0.88) 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 p-5">
        {subtitle && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{subtitle}</p>
        )}
        <h2 className="mt-1 text-[28px] leading-none font-black tracking-tight text-white drop-shadow-sm">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
