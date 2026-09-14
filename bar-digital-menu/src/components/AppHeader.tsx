import { NavLink } from 'react-router-dom';
import { ClipboardList, LayoutGrid, Printer, QrCode, UtensilsCrossed } from 'lucide-react';
import { useBar } from '@/lib/bar-context';

const LINKS = [
  { to: '/', label: 'Mesas', icone: QrCode, exato: true },
  { to: '/bar', label: 'Cozinha / Bar', icone: UtensilsCrossed, exato: false },
  { to: '/caixa', label: 'Caixa', icone: LayoutGrid, exato: false },
  { to: '/impressao', label: 'Impressão', icone: Printer, exato: false },
];

export function AppHeader({ variante = 'operacional' }: { variante?: 'operacional' | 'cliente' }) {
  const { config, filaImpressao, pedidosAbertos } = useBar();

  if (variante === 'cliente') {
    return (
      <header className="sticky top-0 z-30 border-b border-white/[.07] bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-base leading-none text-amber-300">{config.nome}</p>
            <p className="mt-1 truncate text-[11px] text-ink-100/50">{config.subtitulo}</p>
          </div>
          <NavLink
            to="/"
            className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-100/70 transition-colors hover:border-amber-400/50 hover:text-amber-300"
          >
            Trocar mesa
          </NavLink>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[.07] bg-ink-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
            <UtensilsCrossed size={18} />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm text-amber-300">{config.nome}</span>
            <span className="block text-[10px] uppercase tracking-[.18em] text-ink-100/40">
              Sistema de pedidos
            </span>
          </span>
        </NavLink>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto no-scrollbar sm:order-none sm:w-auto">
          {LINKS.map(({ to, label, icone: Icone, exato }) => (
            <NavLink
              key={to}
              to={to}
              end={exato}
              className={({ isActive }) =>
                [
                  'flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
                  'transition-all duration-200',
                  isActive
                    ? 'bg-amber-400/15 text-amber-200 border border-amber-400/30'
                    : 'border border-transparent text-ink-100/60 hover:bg-white/[.05] hover:text-ink-50',
                ].join(' ')
              }
            >
              <Icone size={16} />
              {label}
              {to === '/impressao' && filaImpressao.length > 0 && (
                <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-ink-950">
                  {filaImpressao.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-xs text-ink-100/50">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/[.07] px-3 py-1.5 sm:inline-flex">
            <ClipboardList size={13} />
            {pedidosAbertos.length} {pedidosAbertos.length === 1 ? 'comanda aberta' : 'comandas abertas'}
          </span>
        </div>
      </div>
    </header>
  );
}
