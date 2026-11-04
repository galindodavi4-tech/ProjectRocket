"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tutorial de abertura em cenas animadas, como a primeira configuração de um
 * celular: barras de progresso, avança sozinho, toque nos lados para voltar ou
 * pular, narração opcional (voz do navegador) e música. Dura ~1 minuto.
 */

type Scene = { kicker: string; title: string; text: string; art: () => React.ReactNode };

const delay = (s: number) => ({ animationDelay: `${s}s` });

function Stars() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 60 }, (_, i) => (
        <span key={i} className="absolute size-0.5 rounded-full bg-white"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animation: `ob-twinkle ${2 + (i % 5)}s ease-in-out ${(i % 7) * 0.3}s infinite` }} />
      ))}
    </div>
  );
}

function RocketSvg({ className = "", flame = true }: { className?: string; flame?: boolean }) {
  return (
    <svg viewBox="0 0 60 160" className={className} aria-hidden>
      {flame && (
        <g style={{ transformOrigin: "30px 128px", animation: "ob-flicker .15s ease-in-out infinite" }}>
          <path d="M20 128 Q30 175 40 128 Z" fill="#ffc29a" />
          <path d="M25 128 Q30 156 35 128 Z" fill="#fff6dc" />
        </g>
      )}
      <path d="M30 4 C44 22 46 46 46 60 L46 118 L14 118 L14 60 C14 46 16 22 30 4 Z" fill="#e8fbf9" />
      <path d="M30 4 C40 16 43 30 44 40 L16 40 C17 30 20 16 30 4 Z" fill="#2ee6d6" />
      <circle cx="30" cy="62" r="7" fill="#0e3038" stroke="#6eeadf" strokeWidth="2" />
      <rect x="14" y="88" width="32" height="4" fill="#123a40" />
      <path d="M14 98 L2 126 L14 120 Z M46 98 L58 126 L46 120 Z" fill="#14b8a6" />
      <rect x="20" y="118" width="20" height="10" rx="2" fill="#58787c" />
    </svg>
  );
}

const SCENES: Scene[] = [
  {
    kicker: "Bem-vindo",
    title: "Space Agent",
    text: "Aqui você inventa um foguete, testa se ele chega ao espaço e cria a empresa que vai vendê-lo. Tudo com dados reais e uma inteligência artificial para ajudar.",
    art: () => (
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute bottom-0 left-1/2 h-[70%] w-24 -translate-x-1/2" style={{ animation: "ob-rise 7s ease-in 0.6s forwards" }}>
          <RocketSvg className="h-full w-full" />
        </div>
      </div>
    ),
  },
  {
    kicker: "Passo 1",
    title: "Construa",
    text: "Escolha motores de verdade, o combustível, o material e quantos estágios. O app calcula o peso, a força e a velocidade que o seu foguete consegue.",
    art: () => (
      <div className="flex h-full items-end justify-center gap-10 pb-4">
        <div className="flex w-24 flex-col items-stretch">
          <div className="ob-fade mx-auto h-0 w-0 border-x-[48px] border-b-[60px] border-x-transparent border-b-primary" style={{ animation: "ob-drop .8s ease-out 2.4s both" }} />
          <div className="h-20 rounded-t-md bg-ink" style={{ animation: "ob-drop .8s ease-out 1.6s both" }} />
          <div className="h-32 bg-primary-200" style={{ animation: "ob-drop .8s ease-out .8s both" }} />
          <div className="mx-auto flex gap-2" style={{ animation: "ob-drop .8s ease-out .2s both" }}>
            {[0, 1, 2].map((i) => <div key={i} className="h-6 w-5 rounded-b-lg bg-[#58787c]" />)}
          </div>
        </div>
        <ul className="space-y-3 text-sm">
          {["🔥 Motor: Merlin, Raptor, RS-25…", "🛢️ Combustível: querosene, metano, hidrogênio", "🧱 Material: alumínio, aço, carbono", "🧩 1 a 3 estágios"].map((t, i) => (
            <li key={t} className="ob-fade rounded-xl bg-surface/70 px-3 py-2" style={delay(0.6 + i * 0.6)}>{t}</li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    kicker: "Passo 2",
    title: "Lance",
    text: "Aperte lançar e veja a subida segundo a segundo: gravidade, resistência do ar e separação dos estágios. Se algo estiver errado, o foguete falha, e você descobre por quê.",
    art: () => (
      <svg viewBox="0 0 400 220" className="h-full w-full overflow-hidden" overflow="hidden" aria-hidden>
        <defs>
          <linearGradient id="ob-earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d5f8f" />
            <stop offset="1" stopColor="#0a2f4a" />
          </linearGradient>
          <clipPath id="ob-clip">
            <rect width="400" height="220" />
          </clipPath>
        </defs>
        <g clipPath="url(#ob-clip)">
          <ellipse cx="200" cy="470" rx="420" ry="300" fill="url(#ob-earth)" />
          <ellipse cx="200" cy="470" rx="428" ry="306" fill="none" stroke="#6fd3ff" strokeOpacity=".35" strokeWidth="6" />
        </g>
        <path id="ob-path" d="M60 182 C 90 90, 200 60, 360 70" fill="none" stroke="#ffc29a" strokeWidth="3" strokeDasharray="420" strokeDashoffset="420" style={{ animation: "ob-draw 5s ease-in-out .5s forwards" }} />
        <circle r="6" fill="#e8fbf9">
          <animateMotion dur="5s" begin="0.5s" fill="freeze" path="M60 182 C 90 90, 200 60, 360 70" />
        </circle>
        {[["Max-Q", 92, 120, 1.6], ["Separação", 150, 84, 2.6], ["Órbita!", 330, 58, 4.8]].map(([t, x, y, d]) => (
          <text key={t as string} x={x as number} y={y as number} className="ob-fade fill-ink text-[13px] font-semibold" style={delay(d as number)}>{t}</text>
        ))}
      </svg>
    ),
  },
  {
    kicker: "Passo 3",
    title: "Faça as contas",
    text: "Quanto custa cada lançamento? Quanto você cobra por quilo? Compare com o Falcon 9 e descubra se o seu negócio se paga.",
    art: () => (
      <div className="flex h-full items-end justify-center gap-6 pb-6">
        {[["Electron", 92, "#a99bff"], ["Ariane 6", 52, "#6eeadf"], ["Falcon 9", 22, "#14b8a6"], ["Você?", 34, "#ffc29a"]].map(([label, h, color], i) => (
          <div key={label as string} className="flex h-full w-16 flex-col items-center justify-end gap-2">
            <div className="w-full origin-bottom rounded-t-xl" style={{ height: `${h}%`, background: color as string, animation: `ob-grow 1s ease-out ${0.4 + i * 0.5}s both` }} />
            <span className="text-xs text-ink-muted">{label}</span>
          </div>
        ))}
        <p className="ob-fade absolute top-4 right-6 text-xs text-ink-faint" style={delay(2.8)}>US$ por kg em órbita</p>
      </div>
    ),
  },
  {
    kicker: "Passo 4",
    title: "Crie sua empresa",
    text: "Comece com 100 milhões de dólares. Escolha o país no globo, faça contatos, aceite investidores, cumpra missões e, quem sabe, abra capital na bolsa.",
    art: () => (
      <div className="flex h-full items-center justify-center gap-8">
        <div className="relative size-40 rounded-full bg-[radial-gradient(circle_at_35%_30%,#2b7a72,#0a2a35)] shadow-[0_0_60px_rgba(46,230,214,.35)]">
          <div className="absolute inset-0 rounded-full border border-primary/40" style={{ animation: "ob-spin 12s linear infinite" }}>
            <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-peach shadow-[0_0_12px_#ffc29a]" />
          </div>
          <span className="absolute top-[46%] left-[34%] text-2xl" style={{ animation: "ob-pop .6s ease-out .6s both" }}>📍</span>
        </div>
        <ul className="space-y-2 text-sm">
          <li className="ob-fade text-3xl font-semibold text-primary" style={delay(0.3)}>US$ 100 mi</li>
          {["🤝 Investidores e contatos", "🏛️ Contratos do governo", "🚀 Missões pagas + incentivos", "📈 IPO: abrir capital"].map((t, i) => (
            <li key={t} className="ob-fade rounded-xl bg-surface/70 px-3 py-1.5" style={delay(1 + i * 0.6)}>{t}</li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    kicker: "Passo 5",
    title: "Pergunte à IA",
    text: "O agente de inteligência artificial explica, dá conselhos e até muda e lança o seu foguete. Mas os números vêm sempre dos cálculos: a IA não chuta.",
    art: () => (
      <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-3 text-sm">
        <p className="ob-fade self-end rounded-2xl rounded-br-md border border-primary/40 bg-surface-3 px-4 py-2" style={delay(0.4)}>Como deixo meu foguete mais barato?</p>
        <p className="ob-fade self-start rounded-2xl rounded-bl-md bg-surface/80 px-4 py-2" style={delay(1.6)}>Reutilize o 1º estágio: o custo cai de US$ 49 mi para ~US$ 22 mi por voo. Quer que eu mude?</p>
        <p className="ob-fade self-end rounded-2xl rounded-br-md border border-primary/40 bg-surface-3 px-4 py-2" style={delay(3)}>Pode mudar e lançar!</p>
        <p className="ob-fade self-start rounded-2xl rounded-bl-md bg-primary/20 px-4 py-2 text-primary" style={delay(4)}>🚀 Missão cumprida!</p>
      </div>
    ),
  },
  {
    kicker: "Sua missão",
    title: "Chegue a US$ 1 bilhão",
    text: "Construa um foguete que funcione, crie uma empresa que dê lucro e transforme ela num unicórnio espacial. Na dúvida, clique no ponto de interrogação ao lado de cada coisa.",
    art: () => (
      <div className="flex h-full items-center justify-center">
        <div className="text-center" style={{ animation: "ob-float 3s ease-in-out infinite" }}>
          <p className="text-7xl" style={{ animation: "ob-pop .7s ease-out .3s both" }}>🦄</p>
          <p className="ob-fade mt-3 inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-sm" style={delay(1.2)}>
            <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-bg-deep">?</span> = explicação de cada termo
          </p>
        </div>
      </div>
    ),
  },
];

/** Tempo de cada cena: dá para ler (ou ouvir) o texto com calma. */
const durationOf = (s: Scene) => Math.max(7, s.text.split(/\s+/).length / 2.6 + 1.5);

type Props = {
  onFinish: (next: "company" | "lab") => void;
  musicOn: boolean;
  onMusic: (on: boolean) => void;
};

export function Onboarding({ onFinish, musicOn, onMusic }: Props) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [narrate, setNarrate] = useState(true);
  const [progress, setProgress] = useState(0);
  const elapsed = useRef(0);
  const last = SCENES.length - 1;
  const scene = SCENES[index];

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      if (!narrate) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      u.rate = 1.05;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt-br")) ?? window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt"));
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    },
    [narrate],
  );

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(last, i));
      elapsed.current = 0;
      setProgress(0);
      setIndex(next);
      speak(`${SCENES[next].title}. ${SCENES[next].text}`);
    },
    [last, speak],
  );

  // Relógio da cena.
  useEffect(() => {
    if (!started || paused) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      elapsed.current += (now - prev) / 1000;
      prev = now;
      const d = durationOf(SCENES[index]);
      setProgress(Math.min(1, elapsed.current / d));
      if (elapsed.current >= d && index < last) {
        go(index + 1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, paused, index, last, go]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (paused) window.speechSynthesis.pause();
    else window.speechSynthesis.resume();
  }, [paused]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const finish = (next: "company" | "lab") => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    onFinish(next);
  };

  const begin = () => {
    setStarted(true);
    onMusic(musicOn);
    speak(`${SCENES[0].title}. ${SCENES[0].text}`);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Tutorial do Space Agent" className="fixed inset-0 z-[60] flex flex-col overflow-hidden text-ink"
      style={{ background: "radial-gradient(1200px 700px at 50% -10%, rgba(46,230,214,.18), transparent 60%), var(--color-bg-deep)" }}>
      <Stars />

      {!started ? (
        <div className="relative m-auto flex max-w-lg flex-col items-center px-6 text-center">
          <span className="ds-gradient-primary grid size-20 place-items-center rounded-3xl text-4xl text-bg-deep shadow-[var(--shadow-glow)]" style={{ animation: "ob-pop .7s ease-out both" }}>✦</span>
          <h1 className="ob-fade mt-6 text-4xl font-semibold" style={delay(0.3)}>Olá!</h1>
          <p className="ob-fade mt-3 text-ink-muted" style={delay(0.6)}>Em 1 minuto você vai entender o Space Agent: construir, lançar, fazer as contas e criar sua empresa espacial.</p>
          <button type="button" onClick={begin} className="ob-fade ds-gradient-primary mt-8 rounded-full px-8 py-3.5 text-sm font-semibold tracking-[0.14em] text-bg-deep uppercase shadow-[var(--shadow-glow)]" style={delay(0.9)}>
            ▶ Começar
          </button>
          <div className="ob-fade mt-6 flex flex-wrap justify-center gap-4 text-xs text-ink-muted" style={delay(1.1)}>
            <label className="flex items-center gap-2"><input type="checkbox" checked={narrate} onChange={(e) => setNarrate(e.target.checked)} className="accent-[var(--color-primary)]" /> Narração em voz</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={musicOn} onChange={(e) => onMusic(e.target.checked)} className="accent-[var(--color-primary)]" /> Música</label>
          </div>
          <button type="button" onClick={() => finish("lab")} className="ob-fade mt-6 text-xs text-ink-faint hover:text-ink" style={delay(1.3)}>Pular tutorial</button>
        </div>
      ) : (
        <>
          <div className="relative z-10 flex gap-1.5 px-4 pt-4 sm:px-8">
            {SCENES.map((s, i) => (
              <button key={s.title} type="button" aria-label={`Ir para: ${s.title}`} onClick={() => go(i)} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span className="block h-full rounded-full bg-primary" style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }} />
              </button>
            ))}
          </div>
          <div className="relative z-10 flex items-center justify-between px-4 pt-3 text-xs sm:px-8">
            <span className="text-ink-faint">{index + 1} / {SCENES.length}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-full bg-surface/70 px-3 py-1.5 hover:text-primary">{paused ? "▶ Continuar" : "❚❚ Pausar"}</button>
              <button type="button" onClick={() => { setNarrate((n) => !n); if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }} className="rounded-full bg-surface/70 px-3 py-1.5 hover:text-primary">{narrate ? "🔊 Voz" : "🔇 Voz"}</button>
              <button type="button" onClick={() => onMusic(!musicOn)} className="rounded-full bg-surface/70 px-3 py-1.5 hover:text-primary">{musicOn ? "🎵 Música" : "🔇 Música"}</button>
              <button type="button" onClick={() => finish("lab")} className="rounded-full bg-surface/70 px-3 py-1.5 hover:text-coral">Pular</button>
            </div>
          </div>

          <div key={index} className="relative z-0 mx-auto grid w-full max-w-5xl flex-1 content-center gap-6 px-6 py-6 lg:grid-cols-2 lg:gap-12">
            <div className="relative order-2 h-[34dvh] min-h-[220px] overflow-hidden rounded-[var(--radius-card)] lg:order-1 lg:h-[52dvh]">{scene.art()}</div>
            <div className="order-1 lg:order-2">
              <p className="ob-fade ds-label" style={delay(0.1)}>{scene.kicker}</p>
              <h2 className="ob-fade mt-2 text-4xl font-semibold sm:text-5xl" style={delay(0.25)}>{scene.title}</h2>
              <p className="ob-fade mt-4 text-lg leading-relaxed text-ink-muted" style={delay(0.45)}>{scene.text}</p>
              {index === last && (
                <div className="ob-fade mt-8 flex flex-wrap gap-3" style={delay(1.5)}>
                  <button type="button" onClick={() => finish("company")} className="ds-gradient-primary rounded-full px-6 py-3 text-sm font-semibold tracking-[0.12em] text-bg-deep uppercase shadow-[var(--shadow-glow)]">Criar minha empresa</button>
                  <button type="button" onClick={() => finish("lab")} className="rounded-full border border-line px-6 py-3 text-sm font-semibold tracking-[0.12em] text-ink-muted uppercase hover:text-ink">Explorar o laboratório</button>
                </div>
              )}
            </div>
          </div>

          {/* Toque nos lados para voltar/avançar, como nos stories. */}
          {index < last && (
            <>
              <button type="button" aria-label="Cena anterior" onClick={() => go(index - 1)} className="absolute top-24 bottom-0 left-0 z-0 w-[18%] cursor-w-resize" />
              <button type="button" aria-label="Próxima cena" onClick={() => go(index + 1)} className="absolute top-24 right-0 bottom-0 z-0 w-[18%] cursor-e-resize" />
            </>
          )}
        </>
      )}
    </div>
  );
}
