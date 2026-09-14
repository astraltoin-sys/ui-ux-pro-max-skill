import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

/* ==========================================================================
   Primitivas de UI do sistema.
   Seguem o checklist do ui-ux-pro-max: alvos de toque >= 44px, cursor-pointer
   em tudo que e clicavel, transicoes de 150-300ms e foco visivel.
   ========================================================================== */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-amber-400 text-ink-950 hover:bg-amber-300 active:bg-amber-500 shadow-[0_6px_20px_-8px_rgba(245,179,43,.7)] font-bold',
  secondary: 'bg-ink-700 text-ink-100 hover:bg-ink-600 active:bg-ink-600 border border-white/[.06]',
  ghost: 'bg-transparent text-ink-100/80 hover:bg-white/[.06] hover:text-ink-50',
  outline: 'bg-transparent border border-amber-400/40 text-amber-300 hover:bg-amber-400/10',
  danger: 'bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25',
  success: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/25',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icone?: ReactNode;
  carregando?: boolean;
  bloco?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icone,
  carregando = false,
  bloco = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || carregando}
      className={[
        'inline-flex cursor-pointer select-none items-center justify-center font-medium',
        'transition-all duration-200 ease-out active:scale-[.97]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        bloco ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {carregando ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icone
      )}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */

export function Card({
  className = '',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`surface ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type Tom = 'neutro' | 'novo' | 'preparando' | 'pronto' | 'pago' | 'alerta' | 'erro' | 'info';

const TONS: Record<Tom, string> = {
  neutro: 'bg-white/[.06] text-ink-100/80 border-white/[.08]',
  novo: 'bg-orange-500/15 text-orange-200 border-orange-500/30',
  preparando: 'bg-sky-500/15 text-sky-200 border-sky-500/30',
  pronto: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  pago: 'bg-violet-500/15 text-violet-200 border-violet-500/30',
  alerta: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
  erro: 'bg-red-500/15 text-red-200 border-red-500/30',
  info: 'bg-indigo-500/15 text-indigo-200 border-indigo-500/30',
};

export function Badge({
  tom = 'neutro',
  className = '',
  children,
}: {
  tom?: Tom;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        'uppercase tracking-[.08em] whitespace-nowrap',
        TONS[tom],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export function Modal({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  children,
  largura = 'md',
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  largura?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const larguras = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={[
          'relative z-10 w-full animate-slide-up overflow-hidden rounded-t-3xl border border-white/10',
          'bg-ink-850 shadow-2xl sm:rounded-3xl',
          larguras[largura],
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[.07] px-5 py-4">
          <div>
            <h3 className="text-lg leading-tight">{titulo}</h3>
            {subtitulo && <p className="mt-1 text-sm text-ink-100/60">{subtitulo}</p>}
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-100/60 transition-colors hover:bg-white/[.07] hover:text-ink-50"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function Toggle({
  ligado,
  onChange,
  rotulo,
  descricao,
}: {
  ligado: boolean;
  onChange: (v: boolean) => void;
  rotulo: string;
  descricao?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => onChange(!ligado)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[.07] bg-ink-800/50 px-4 py-3 text-left transition-colors hover:border-white/15"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-50">{rotulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-ink-100/55">{descricao}</span>}
      </span>
      <span
        className={[
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          ligado ? 'bg-amber-400' : 'bg-ink-600',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            ligado ? 'translate-x-[22px]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */

export function Stat({
  rotulo,
  valor,
  icone,
  tom = 'neutro',
}: {
  rotulo: string;
  valor: ReactNode;
  icone?: ReactNode;
  tom?: Tom;
}) {
  return (
    <div className="surface flex items-center gap-3 px-4 py-3">
      {icone && (
        <span
          className={[
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl border',
            TONS[tom],
          ].join(' ')}
        >
          {icone}
        </span>
      )}
      <div className="min-w-0">
        <p className="label-xs">{rotulo}</p>
        <p className="truncate text-xl font-bold leading-tight text-ink-50 tabular">{valor}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function Vazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icone && (
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/[.07] bg-ink-800/60 text-ink-100/40">
          {icone}
        </span>
      )}
      <p className="font-display text-lg text-ink-50">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-ink-100/55">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-ink-100/60">{rotulo}</span>
      <span className="text-sm font-semibold text-ink-50 tabular">{valor}</span>
    </div>
  );
}
