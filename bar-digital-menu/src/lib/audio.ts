/**
 * Aviso sonoro do KDS usando a Web Audio API (nenhum arquivo de audio).
 *
 * Navegadores exigem uma interacao do usuario antes de liberar o audio, entao
 * o AudioContext e criado sob demanda e "destravado" no primeiro clique/toque
 * (ver `useBar().destravarAudio()`).
 */

type SomPadrao = 'novo' | 'pronto' | 'atencao' | 'erro' | 'confirma';

interface Nota {
  freq: number;
  inicio: number;
  duracao: number;
  ganho: number;
  tipo?: OscillatorType;
}

const PADROES: Record<SomPadrao, Nota[]> = {
  // Tres notas ascendentes: chama atencao sem ser irritante.
  novo: [
    { freq: 880, inicio: 0, duracao: 0.13, ganho: 0.28 },
    { freq: 1174.7, inicio: 0.16, duracao: 0.13, ganho: 0.28 },
    { freq: 1567.98, inicio: 0.32, duracao: 0.2, ganho: 0.3 },
  ],
  pronto: [
    { freq: 659.25, inicio: 0, duracao: 0.12, ganho: 0.22 },
    { freq: 987.77, inicio: 0.14, duracao: 0.24, ganho: 0.24 },
  ],
  atencao: [
    { freq: 740, inicio: 0, duracao: 0.16, ganho: 0.24 },
    { freq: 740, inicio: 0.26, duracao: 0.16, ganho: 0.24 },
  ],
  erro: [
    { freq: 392, inicio: 0, duracao: 0.18, ganho: 0.22, tipo: 'sawtooth' },
    { freq: 294, inicio: 0.2, duracao: 0.26, ganho: 0.22, tipo: 'sawtooth' },
  ],
  confirma: [
    { freq: 523.25, inicio: 0, duracao: 0.1, ganho: 0.2 },
    { freq: 783.99, inicio: 0.1, duracao: 0.18, ganho: 0.2 },
  ],
};

let ctx: AudioContext | null = null;
let habilitado = true;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** Deve ser chamado dentro de um handler de clique/toque. */
export async function destravarAudio(): Promise<boolean> {
  const c = getContext();
  if (!c) return false;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === 'running';
}

export function audioTravado(): boolean {
  return !ctx || ctx.state !== 'running';
}

export function setAudioHabilitado(valor: boolean): void {
  habilitado = valor;
}

export function audioHabilitado(): boolean {
  return habilitado;
}

export function tocarSom(padrao: SomPadrao = 'novo'): void {
  if (!habilitado) return;
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') {
    void c.resume().catch(() => undefined);
  }

  const notas = PADROES[padrao];
  const master = c.createGain();
  master.gain.value = 0.9;
  master.connect(c.destination);

  notas.forEach((nota) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = nota.tipo ?? 'sine';
    osc.frequency.value = nota.freq;

    const t0 = c.currentTime + nota.inicio;
    const t1 = t0 + nota.duracao;
    // Envelope curto evita o "clique" no inicio/fim de cada nota.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(nota.ganho, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  });
}

/** Feedback haptico curto (mobile), quando disponivel. */
export function vibrar(ms: number | number[] = 40): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignorado */
    }
  }
}
