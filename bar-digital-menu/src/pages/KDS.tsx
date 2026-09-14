import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChefHat,
  Clock,
  PackageCheck,
  Play,
  Sparkles,
  Timer,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBar } from '@/lib/bar-context';
import { Badge, Button, Card, Stat, Vazio } from '@/components/ui';
import { tocarSom } from '@/lib/audio';
import { minutosDesde, moeda, tempoDecorrido } from '@/lib/format';
import type { ItemPedido, PedidoCompleto, StatusPedido } from '@/types';

const COLUNAS: Array<{ status: StatusPedido; titulo: string; tom: 'novo' | 'preparando' | 'pronto'; icone: typeof Bell }> = [
  { status: 'novo', titulo: 'Novos pedidos', tom: 'novo', icone: Bell },
  { status: 'preparando', titulo: 'Preparando', tom: 'preparando', icone: ChefHat },
  { status: 'pronto', titulo: 'Prontos', tom: 'pronto', icone: PackageCheck },
];

/** Minutos a partir dos quais o cartao entra em estado de atraso. */
const MINUTOS_ATRASO = 8;

export function KDS() {
  const {
    pedidosAbertos,
    avancarStatus,
    gerarPedidoDemo,
    somAtivo,
    alternarSom,
    destravarSom,
    somBloqueado,
    config,
  } = useBar();

  const [alerta, setAlerta] = useState(false);
  const [silenciarAte, setSilenciarAte] = useState<number>(0);
  // Ids ja "anunciados" — evita bipes repetidos para o mesmo pedido.
  const anunciadosRef = useRef<Set<string>>(new Set());
  const montadoRef = useRef(false);

  const novos = useMemo(() => pedidosAbertos.filter((p) => p.status === 'novo'), [pedidosAbertos]);
  const preparando = useMemo(
    () => pedidosAbertos.filter((p) => p.status === 'preparando'),
    [pedidosAbertos],
  );
  const prontos = useMemo(() => pedidosAbertos.filter((p) => p.status === 'pronto'), [pedidosAbertos]);
  const despachados = useMemo(
    () => pedidosAbertos.filter((p) => p.status === 'entregue'),
    [pedidosAbertos],
  );

  /* --------------------- aviso sonoro + alerta visual --------------------- */
  useEffect(() => {
    const idsNovos = novos.map((p) => p.id);
    const naoAnunciados = idsNovos.filter((id) => !anunciadosRef.current.has(id));

    // Na primeira montagem apenas registra os pedidos existentes (sem bipe).
    if (!montadoRef.current) {
      idsNovos.forEach((id) => anunciadosRef.current.add(id));
      montadoRef.current = true;
      return;
    }

    if (naoAnunciados.length > 0) {
      naoAnunciados.forEach((id) => anunciadosRef.current.add(id));
      setAlerta(true);
      if (Date.now() > silenciarAte) {
        tocarSom('novo');
        // Reforco: um segundo bipe apos 1,2s se o pedido seguir sem aceitar.
        window.setTimeout(() => tocarSom('novo'), 1200);
      }
      const ultimo = novos.find((p) => p.id === naoAnunciados[naoAnunciados.length - 1]);
      if (ultimo) {
        toast(`Novo pedido · Mesa ${String(ultimo.mesa_numero).padStart(2, '0')}`, {
          description: `Comanda #${ultimo.comanda} · ${ultimo.itens.length} ${ultimo.itens.length === 1 ? 'item' : 'itens'}`,
          duration: 6000,
        });
      }
    }

    if (idsNovos.length === 0) setAlerta(false);
  }, [novos, silenciarAte]);

  /* ------------------------------- acoes -------------------------------- */
  async function avancar(pedido: PedidoCompleto, status: StatusPedido) {
    await avancarStatus(pedido.id, status);
    if (status === 'preparando') {
      toast.success(`Comanda #${pedido.comanda} em preparo`);
    } else if (status === 'pronto') {
      toast.success(`Comanda #${pedido.comanda} pronta!`, {
        description: `Mesa ${String(pedido.mesa_numero).padStart(2, '0')} pode retirar.`,
      });
    } else if (status === 'entregue') {
      toast.success(`Comanda #${pedido.comanda} entregue`);
    }
  }

  const totalItensFila = novos.reduce(
    (acc, p) => acc + p.itens.reduce((s, i) => s + i.quantidade, 0),
    0,
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      {/* ----------------------------- topo ----------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-xs">Tela de produção</p>
          <h1 className="font-display text-3xl text-ink-50">KDS · Bar</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={somAtivo ? 'secondary' : 'outline'}
            size="sm"
            icone={somAtivo ? <Volume2 size={15} /> : <BellOff size={15} />}
            onClick={() => {
              alternarSom();
              if (!somAtivo) void destravarSom();
            }}
          >
            {somAtivo ? 'Som ativo' : 'Som desligado'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icone={<Timer size={15} />}
            onClick={() => {
              setSilenciarAte(Date.now() + 5 * 60 * 1000);
              setAlerta(false);
              toast('Avisos sonoros silenciados por 5 minutos');
            }}
          >
            Silenciar 5 min
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icone={<Sparkles size={15} />}
            onClick={async () => {
              await gerarPedidoDemo();
              toast.success('Pedido de demonstração enviado ao bar');
            }}
          >
            Simular pedido
          </Button>
        </div>
      </div>

      {/* Aviso de audio bloqueado pelo navegador */}
      {somAtivo && somBloqueado() && (
        <button
          onClick={async () => {
            const ok = await destravarSom();
            toast[ok ? 'success' : 'error'](
              ok ? 'Som liberado!' : 'Não foi possível liberar o som',
              { description: ok ? 'Os próximos pedidos vão apitar.' : 'Toque novamente na página.' },
            );
          }}
          className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[.08] px-4 py-3 text-left text-sm text-amber-200 transition-colors hover:bg-amber-400/15"
        >
          <Volume2 size={16} />
          O navegador bloqueou o áudio automático. Toque aqui para liberar o aviso sonoro.
        </button>
      )}

      {/* ---------------------------- metricas ---------------------------- */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Novos pedidos"
          valor={novos.length}
          icone={<Bell size={17} />}
          tom={novos.length ? 'novo' : 'neutro'}
        />
        <Stat
          rotulo="Em preparo"
          valor={preparando.length}
          icone={<ChefHat size={17} />}
          tom={preparando.length ? 'preparando' : 'neutro'}
        />
        <Stat
          rotulo="Prontos p/ retirada"
          valor={prontos.length}
          icone={<PackageCheck size={17} />}
          tom={prontos.length ? 'pronto' : 'neutro'}
        />
        <Stat
          rotulo="Itens na fila"
          valor={totalItensFila}
          icone={<Timer size={17} />}
          tom={totalItensFila > 8 ? 'alerta' : 'neutro'}
        />
      </div>

      {/* ------------------------- alerta visual ------------------------- */}
      {alerta && novos.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div className="absolute inset-0 animate-screen-flash border-[10px] border-orange-500/70" />
        </div>
      )}
      {alerta && novos.length > 0 && (
        <button
          onClick={() => setAlerta(false)}
          className="mt-4 flex w-full animate-marquee-in cursor-pointer items-center gap-3 rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 py-3 text-left transition-colors hover:bg-orange-500/25"
        >
          <span className="grid h-9 w-9 shrink-0 animate-alert-pulse place-items-center rounded-full bg-orange-500/25 text-orange-200">
            <AlertTriangle size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-orange-100">
              {novos.length === 1
                ? 'Novo pedido recebido!'
                : `${novos.length} novos pedidos recebidos!`}
            </span>
            <span className="block text-xs text-orange-200/70">
              Toque para confirmar e parar o alerta visual.
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-orange-500/25 px-3 py-1.5 text-xs font-semibold text-orange-100">
            Ciente
          </span>
        </button>
      )}

      {/* ----------------------------- kanban ----------------------------- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {COLUNAS.map((coluna) => {
          const pedidos =
            coluna.status === 'novo' ? novos : coluna.status === 'preparando' ? preparando : prontos;
          return (
            <section key={coluna.status} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-lg text-ink-50">
                  <coluna.icone
                    size={17}
                    className={
                      coluna.tom === 'novo'
                        ? 'text-orange-400'
                        : coluna.tom === 'preparando'
                          ? 'text-sky-400'
                          : 'text-emerald-400'
                    }
                  />
                  {coluna.titulo}
                </h2>
                <Badge tom={coluna.tom}>{pedidos.length}</Badge>
              </div>

              <div className="flex flex-col gap-3">
                {pedidos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[.08] px-4 py-10 text-center">
                    <p className="text-sm text-ink-100/35">Nada por aqui</p>
                  </div>
                ) : (
                  pedidos.map((pedido) => (
                    <CartaoPedido
                      key={pedido.id}
                      pedido={pedido}
                      coluna={coluna.status}
                      onAvancar={avancar}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* --------------------------- despachados --------------------------- */}
      {despachados.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-display text-lg text-ink-100/60">
            <CheckCircle2 size={17} />
            Despachados (aguardando fechamento)
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {despachados.map((pedido) => (
              <button
                key={pedido.id}
                onClick={() => void avancar(pedido, 'novo')}
                className="cursor-pointer rounded-xl border border-white/[.07] bg-ink-850/60 px-4 py-3 text-left transition-colors hover:border-amber-400/40"
              >
                <p className="text-sm font-semibold text-ink-50">
                  Mesa {String(pedido.mesa_numero).padStart(2, '0')} · #{pedido.comanda}
                </p>
                <p className="mt-0.5 text-xs text-ink-100/45">
                  Entregue {tempoDecorrido(pedido.entregue_em)} · {moeda(pedido.total)}
                </p>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-amber-300/70">
                  Toque para reabrir no KDS
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {pedidosAbertos.length === 0 && (
        <Card className="mt-8">
          <Vazio
            icone={<ChefHat size={22} />}
            titulo="Nenhum pedido na fila"
            descricao="Quando um cliente enviar o pedido pelo celular, ele aparece aqui com aviso sonoro."
            acao={
              <Button icone={<Sparkles size={16} />} onClick={() => void gerarPedidoDemo()}>
                Simular um pedido
              </Button>
            }
          />
        </Card>
      )}

      <p className="mt-8 text-center text-xs text-ink-100/30">
        {config.nome} · KDS atualizado em tempo real · taxa de serviço {config.taxa_servico}%
      </p>
    </div>
  );
}

/* ========================================================================== */

function CartaoPedido({
  pedido,
  coluna,
  onAvancar,
}: {
  pedido: PedidoCompleto;
  coluna: StatusPedido;
  onAvancar: (pedido: PedidoCompleto, status: StatusPedido) => void | Promise<void>;
}) {
  const minutos = minutosDesde(pedido.criado_em);
  const atrasado = minutos >= MINUTOS_ATRASO;
  const temObservacoes = pedido.itens.some((i) => i.observacoes.length || i.nota);

  const borda =
    coluna === 'novo'
      ? 'border-orange-500/40 bg-gradient-to-b from-orange-500/[.10] to-ink-850/80'
      : coluna === 'preparando'
        ? 'border-sky-500/35 bg-gradient-to-b from-sky-500/[.07] to-ink-850/80'
        : 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/[.10] to-ink-850/80';

  return (
    <article
      className={[
        'animate-slide-up rounded-2xl border p-4 shadow-card',
        borda,
        coluna === 'novo' ? 'animate-alert-pulse' : '',
        atrasado && coluna !== 'pronto' ? 'ring-1 ring-red-500/40' : '',
      ].join(' ')}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl leading-none text-ink-50">
            Mesa {String(pedido.mesa_numero).padStart(2, '0')}
          </p>
          <p className="mt-1 text-xs text-ink-100/50">Comanda #{pedido.comanda}</p>
        </div>
        <div className="text-right">
          <span
            className={[
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular',
              atrasado ? 'bg-red-500/20 text-red-200' : 'bg-white/[.06] text-ink-100/70',
            ].join(' ')}
          >
            <Clock size={12} />
            {minutos} min
          </span>
          <p className="mt-1 text-[10px] text-ink-100/40">{tempoDecorrido(pedido.criado_em)}</p>
        </div>
      </header>

      {pedido.cliente && (
        <p className="mt-2 inline-block rounded-md bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
          Cliente: {pedido.cliente}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {pedido.itens.map((item) => (
          <ItemLinha key={item.id} item={item} />
        ))}
      </ul>

      <footer className="mt-4 flex flex-col gap-2">
        {coluna === 'novo' && (
          <Button
            bloco
            size="lg"
            icone={<Play size={17} />}
            onClick={() => void onAvancar(pedido, 'preparando')}
          >
            Iniciar preparo
          </Button>
        )}
        {coluna === 'preparando' && (
          <Button
            bloco
            size="lg"
            variant="success"
            icone={<CheckCircle2 size={17} />}
            onClick={() => void onAvancar(pedido, 'pronto')}
          >
            Marcar como pronto
          </Button>
        )}
        {coluna === 'pronto' && (
          <Button
            bloco
            size="lg"
            variant="secondary"
            icone={<PackageCheck size={17} />}
            onClick={() => void onAvancar(pedido, 'entregue')}
          >
            Despachar para a mesa
          </Button>
        )}
        {temObservacoes && (
          <p className="text-center text-[10px] uppercase tracking-[.12em] text-amber-300/70">
            Atenção às observações
          </p>
        )}
      </footer>
    </article>
  );
}

function ItemLinha({ item }: { item: ItemPedido }) {
  return (
    <li className="rounded-lg border border-white/[.06] bg-black/20 px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span
          className={[
            'grid h-6 min-w-6 place-items-center rounded-md text-xs font-bold tabular',
            item.quantidade > 1
              ? 'bg-amber-400 text-ink-950'
              : 'bg-white/[.08] text-ink-100/70',
          ].join(' ')}
        >
          {item.quantidade}x
        </span>
        <span className="text-sm font-medium text-ink-50">{item.nome}</span>
      </div>
      {(item.observacoes.length > 0 || item.nota) && (
        <div className="mt-1.5 space-y-1">
          {item.observacoes.map((obs) => (
            <p
              key={obs}
              className="inline-block rounded bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-100"
            >
              {obs}
            </p>
          ))}
          {item.observacoes.length > 0 && item.nota && <span className="mx-1" />}
          {item.nota && (
            <p className="text-[11px] italic text-sky-200/80">“{item.nota}”</p>
          )}
        </div>
      )}
    </li>
  );
}
