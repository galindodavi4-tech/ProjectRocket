/**
 * Narração com a voz do próprio navegador (Web Speech), em português.
 * - Prefere uma voz masculina pt-BR (Antonio e Daniel no Windows/Edge, Felipe no Mac).
 * - Sem voz masculina instalada, engrossa o tom da voz disponível.
 * - Fala frase por frase (o Chrome corta falas longas) e avisa quando terminou,
 *   para o tutorial só avançar depois da última palavra.
 */

const MALE = ["antonio", "daniel", "felipe", "fabio", "donato", "julio", "humberto", "valerio", "nicolau", "leonardo", "giovanni", "macerio", "ricardo", "joao", "paulo"];
const FEMALE = ["francisca", "maria", "luciana", "thalita", "yara", "leila", "manuela", "brenda", "elza", "giovanna", "leticia", "fernanda", "raquel", "heloisa", "joana", "vitoria", "camila", "luiza"];

const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type VoiceGender = "male" | "female" | "unknown";

export function voiceGender(v: SpeechSynthesisVoice): VoiceGender {
  const n = plain(v.name);
  if (MALE.some((m) => n.includes(m))) return "male";
  if (FEMALE.some((f) => n.includes(f)) || n.includes("google")) return "female";
  return "unknown";
}

export function portugueseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("pt"));
}

/** Melhor voz: masculina > desconhecida > feminina; pt-BR antes de pt-PT; vozes "Natural"/"Online" (neurais) primeiro. */
export function bestVoice(voices = portugueseVoices()): SpeechSynthesisVoice | null {
  const score = (v: SpeechSynthesisVoice) => {
    const g = voiceGender(v);
    const n = plain(v.name);
    return (g === "male" ? 100 : g === "unknown" ? 40 : 0) + (v.lang.toLowerCase() === "pt-br" ? 20 : 0) + (/natural|online|neural|premium|enhanced/.test(n) ? 10 : 0);
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Vozes carregam de forma assíncrona em alguns navegadores. */
export function whenVoicesReady(cb: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  if (window.speechSynthesis.getVoices().length) cb();
  const handler = () => cb();
  window.speechSynthesis.addEventListener("voiceschanged", handler);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
}

/** Tempo estimado de fala (s): ~14 caracteres por segundo em português. */
export const speechSeconds = (text: string, rate = 1) => text.length / (14 * rate) + 0.6;

let token = 0;

export function stopSpeaking() {
  token += 1;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/**
 * Fala o texto e chama onEnd uma única vez quando terminar. Chamar de novo
 * cancela a anterior. Quem usa deve ter um tempo de segurança próprio, que
 * respeite pausas: alguns navegadores não avisam o fim.
 */
export function speak(text: string, opts: { voice?: SpeechSynthesisVoice | null; onEnd?: () => void; rate?: number } = {}) {
  stopSpeaking();
  const my = token;
  const done = () => {
    if (my !== token) return;
    token += 1;
    opts.onEnd?.();
  };
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    globalThis.setTimeout(done, speechSeconds(text) * 1000);
    return;
  }
  const voice = opts.voice ?? bestVoice();
  const rate = opts.rate ?? 1;
  // Voz feminina ou desconhecida: tom mais grave para soar como narrador.
  const pitch = voice && voiceGender(voice) === "male" ? 1 : 0.7;
  const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  sentences.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(s);
    u.lang = voice?.lang ?? "pt-BR";
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    if (i === sentences.length - 1) {
      u.onend = done;
      u.onerror = done;
    }
    window.speechSynthesis.speak(u);
  });
}

export const pauseSpeaking = () => typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.pause();
export const resumeSpeaking = () => typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.resume();
