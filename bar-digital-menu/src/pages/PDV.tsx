import { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  History,
  LayoutGrid,
  Printer,
  QrCode as PixIcon,
  Receipt,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBar, consumoDaMesa } from '@/lib/bar-context';
import { Badge, Button, Card, LinhaInfo, Modal, Stat, Vazio } from '@/components/ui';
import { dataHora, moeda, tempoDecorrido } from '@/lib/format';
import type { FormaPagamento, Mesa, PedidoCompleto, PrintJob } from '@/types';

const FORMAS: Array<{ id: FormaPagamento; rotulo: string; icone: typeof Banknote }> = [
  { id: 'dinheiro', rotulo: 'Dinheiro', icone: Banknote },
  { id: 'cartao', rotulo: 'Cartão', icone: CreditCard },
  { id: 'pix', rotulo: 'Pix', icone: PixIcon },
];

const STATUS_JOB: Record<PrintJob['status'], { rotulo: string; tom: 'neutro' | 'pronto' | 'alerta' | 'erro' | 'info' }> = {
  pendente: { rotulo: 'Na fila', tom: 'alerta' },
  imprimindo: { rotulo: 'Imprimindo', tom: 'info' },
  impresso: { rotulo: 'Impresso', tom: 'pronto' },
  simulado: { rotulo: 'Simulado', tom: 'info' },
  erro: { rotulo: 'Erro', tom: 'erro' },
};

const STATUS_PEDIDO: Record<string, { rotulo: string; tom: 'novo' | 'preparando' | 'pronto' | 'pago' | 'erro' | 'neutro' }> = {
  novo: { rotulo: 'Novo', tom: 'novo' },
  preparando: { rotulo: 'Preparando', tom: 'preparando' },
  pronto: { rotulo: 'Pronto', tom: 'pronto' },
  entregue: { rotulo: 'Entregue', tom: 'info' as never },
  pago: { rotulo: 'Pago', tom: 'pago' },
  cancelado: { rotulo: 'Cancelado', tom: 'erro' },
};

export function PDV() {
  const {
    mesas,
    pedidosAbertos,
    pedidosEncerrados,
    printJobs,
    config,
    fecharConta,
    cancelarPedido,
    solicitarImpressao,
    gerarPedidoDemo,
    limparOperacao,
  } = useBar();

  const [mesaFiltro, setMesaFiltro] = useState<string | null>(null);
  const [fechando, setFechando] = useState<PedidoCompleto | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [desconto, setDesconto] = useState('');
  const [processando, setProcessando] = useState(false);

  const pedidosVisiveis = useMemo(() => {
    if (!mesaFiltro) return pedidosAbertos;
    return pedidosAbertos.filter((p) => p.mesa_id === mesaFiltro);
  }, [pedidosAbertos, mesaFiltro]);

  const resumo = useMemo(() => {
    const pagos = pedidosEncerrados.filter((p) => p.status === 'pago');
    const faturado = pagos.reduce((acc, p) => acc + p.total, 0);
    const emAberto = pedidosAbertos.reduce((acc, p) => acc + p.total, 0);
    const porForma = pagos.reduce<Record<string, number>>((acc, p) => {
      const chave = p.forma_pagamento ?? 'outros';
      acc[chave] = (acc[chave] ?? 0) + p.total;
      return acc;
    }, {});
    return {
      faturado,
      emAberto,
      ticketMedio: pagos.length ? faturado / pagos.length : 0,
      quantidade: pagos.length,
      porForma,
    };
  }, [pedidosEncerrados, pedidosAbertos]);

  /* ------------------------------- acoes -------------------------------- */

  async function reimprimir(pedidoId: string, destino: 'bar' | 'caixa' | 'duplo') {
    const job = await solicitarImpressao(pedidoId, destino, 'Reimpressão pelo caixa');
    if (job) {
      toast.success(`Reimpressão enviada para a fila`, {
        description: `${destino === 'duplo' ? 'Caixa + Bar' : destino === 'bar' ? 'Bar' : 'Caixa'} · comanda #${job.comanda}`,
      });
    }
  }

  async function confirmarFechamento() {
    if (!fechando) return;
    setProcessando(true);
    try {
      const descontoValor = Math.max(0, Math.min(fechando.subtotal, Number(desconto.replace(',', '.')) || 0));
      await fecharConta({
        pedidoId: fechando.id,
        formaPagamento,
        desconto: descontoValor,
        imprimir: true,
      });
      toast.success(`Conta da comanda #${fechando.comanda} fechada!`, {
        description: `${moeda(fechando.total - descontoValor)} em ${formaPagamento} · cupom enviado para impressão`,
      });
      setFechando(null);
      setDesconto('');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      {/* ------------------------------ topo ------------------------------ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-xs">Painel do operador</p>
          <h1 className="font-display text-3xl text-ink-50">PDV · Caixa</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icone={<Sparkles size={15} />}
            onClick={async () => {
              await gerarPedidoDemo();
              toast.success('Pedido de demonstração criado');
            }}
          >
            Simular pedido
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icone={<Trash2 size={15} />}
            onClick={async () => {
              await limparOperacao();
              toast('Operação limpa', { description: 'Pedidos encerrados e fila de impressão apagados.' });
            }}
          >
            Limpar encerrados
          </Button>
        </div>
      </div>

      {/* ---------------------------- metricas ---------------------------- */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Faturado no turno" valor={moeda(resumo.faturado)} icone={<Wallet size={17} />} tom="pronto" />
        <Stat rotulo="Em aberto" valor={moeda(resumo.emAberto)} icone={<Receipt size={17} />} tom="alerta" />
        <Stat
          rotulo="Comandas abertas"
          valor={pedidosAbertos.length}
          icone={<Users size={17} />}
          tom={pedidosAbertos.length ? 'novo' : 'neutro'}
        />
        <Stat rotulo="Ticket médio" valor={moeda(resumo.ticketMedio)} icone={<LayoutGrid size={17} />} tom="info" />
      </div>

      {/* -------------------------- mapa de mesas ------------------------- */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink-50">Mapa de mesas</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-ink-100/50">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Livre
            </span>
            <span className="flex items-center gap-1.5 text-ink-100/50">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> Ocupada
            </span>
            {mesaFiltro && (
              <button
                onClick={() => setMesaFiltro(null)}
                className="cursor-pointer rounded-lg border border-white/10 px-2.5 py-1 text-ink-100/70 transition-colors hover:border-amber-400/50 hover:text-amber-300"
              >
                Limpar filtro
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {mesas.map((mesa) => (
            <MesaCard
              key={mesa.id}
              mesa={mesa}
              consumo={consumoDaMesa(pedidosAbertos, mesa.id)}
              selecionada={mesaFiltro === mesa.id}
              onClick={() => setMesaFiltro(mesaFiltro === mesa.id ? null : mesa.id)}
            />
          ))}
        </div>
      </section>

      {/* ------------------------ comandas em aberto ---------------------- */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink-50">
            {mesaFiltro
              ? `Comandas da mesa ${String(mesas.find((m) => m.id === mesaFiltro)?.numero ?? '').padStart(2, '0')}`
              : 'Comandas em aberto'}
          </h2>
          <span className="text-xs text-ink-100/45">
            {pedidosVisiveis.length} {pedidosVisiveis.length === 1 ? 'comanda' : 'comandas'}
          </span>
        </div>

        {pedidosVisiveis.length === 0 ? (
          <Card className="mt-4">
            <Vazio
              icone={<Receipt size={22} />}
              titulo="Nenhuma comanda em aberto"
              descricao="Os pedidos enviados pelo celular aparecem aqui na hora, prontos para fechamento."
              acao={
                <Button icone={<Sparkles size={16} />} onClick={() => void gerarPedidoDemo()}>
                  Simular um pedido
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {pedidosVisiveis.map((pedido) => (
              <Card key={pedido.id} className="p-5">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl leading-none text-ink-50">
                      Mesa {String(pedido.mesa_numero).padStart(2, '0')}
                      <span className="ml-2 text-base text-amber-300">#{pedido.comanda}</span>
                    </p>
                    <p className="mt-1 text-xs text-ink-100/45">
                      Aberta {tempoDecorrido(pedido.criado_em)} · {dataHora(pedido.criado_em)}
                      {pedido.cliente ? ` · ${pedido.cliente}` : ''}
                    </p>
                  </div>
                  <Badge tom={STATUS_PEDIDO[pedido.status]?.tom ?? 'neutro'}>
                    {STATUS_PEDIDO[pedido.status]?.rotulo ?? pedido.status}
                  </Badge>
                </header>

                <ul className="mt-4 space-y-1.5 border-y border-white/[.06] py-3">
                  {pedido.itens.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="text-ink-50">
                          <strong className="text-amber-300">{item.quantidade}x</strong> {item.nome}
                        </span>
                        {item.observacoes.length > 0 && (
                          <span className="ml-2 text-[11px] text-amber-300/70">
                            ({item.observacoes.join(', ')})
                          </span>
                        )}
                        {item.nota && (
                          <span className="block text-[11px] italic text-ink-100/40">“{item.nota}”</span>
                        )}
                      </span>
                      <span className="shrink-0 text-ink-100/70 tabular">{moeda(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm text-ink-100/60">
                    <span>Subtotal</span>
                    <span className="tabular">{moeda(pedido.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-ink-100/60">
                    <span>Serviço ({config.taxa_servico}%)</span>
                    <span className="tabular">{moeda(pedido.taxa_servico)}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="font-display text-base text-ink-50">Total</span>
                    <span className="font-display text-2xl text-amber-300 tabular">{moeda(pedido.total)}</span>
                  </div>
                </div>

                <footer className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    icone={<CheckCircle2 size={15} />}
                    onClick={() => {
                      setFechando(pedido);
                      setFormaPagamento('pix');
                      setDesconto('');
                    }}
                  >
                    Fechar conta
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icone={<Printer size={15} />}
                    onClick={() => void reimprimir(pedido.id, 'caixa')}
                  >
                    Caixa
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icone={<Printer size={15} />}
                    onClick={() => void reimprimir(pedido.id, 'bar')}
                  >
                    Bar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icone={<Printer size={15} />}
                    onClick={() => void reimprimir(pedido.id, 'duplo')}
                  >
                    Ambos
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icone={<XCircle size={15} />}
                    onClick={async () => {
                      await cancelarPedido(pedido.id);
                      toast(`Comanda #${pedido.comanda} cancelada`);
                    }}
                  >
                    Cancelar
                  </Button>
                </footer>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* --------------------- historico de impressoes -------------------- */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl text-ink-50">
              <History size={18} className="text-ink-100/50" />
              Histórico de impressões
            </h2>
            <span className="text-xs text-ink-100/45">{printJobs.length} registros</span>
          </div>

          {printJobs.length === 0 ? (
            <Vazio titulo="Nenhuma impressão ainda" descricao="A fila de impressão aparece aqui." />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[.07] text-[11px] uppercase tracking-wider text-ink-100/40">
                    <th className="pb-2 pr-3 font-semibold">Comanda</th>
                    <th className="pb-2 pr-3 font-semibold">Mesa</th>
                    <th className="pb-2 pr-3 font-semibold">Destino</th>
                    <th className="pb-2 pr-3 font-semibold">Origem</th>
                    <th className="pb-2 pr-3 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.04]">
                  {printJobs.slice(0, 14).map((job) => {
                    const status = STATUS_JOB[job.status];
                    return (
                      <tr key={job.id} className="text-ink-100/75">
                        <td className="py-2.5 pr-3 font-semibold text-ink-50 tabular">#{job.comanda}</td>
                        <td className="py-2.5 pr-3 tabular">
                          {String(job.mesa_numero).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={[
                              'rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase',
                              job.destino === 'duplo'
                                ? 'bg-amber-400/15 text-amber-200'
                                : job.destino === 'bar'
                                  ? 'bg-sky-500/15 text-sky-200'
                                  : 'bg-violet-500/15 text-violet-200',
                            ].join(' ')}
                          >
                            {job.destino === 'duplo' ? 'Caixa + Bar' : job.destino === 'bar' ? 'Bar' : 'Caixa'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-ink-100/50">
                          {job.origem === 'auto' ? 'Automática' : 'Manual'}
                          {job.fechamento ? ' · fechamento' : ''}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge tom={status.tom}>{status.rotulo}</Badge>
                        </td>
                        <td className="py-2.5 text-xs text-ink-100/50 tabular">
                          {dataHora(job.impresso_em ?? job.criado_em)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* -------------------------- resumo do turno ------------------------- */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-xl text-ink-50">
            <Wallet size={18} className="text-ink-100/50" />
            Resumo do turno
          </h2>
          <div className="mt-4">
            <LinhaInfo rotulo="Comandas fechadas" valor={resumo.quantidade} />
            <LinhaInfo rotulo="Faturamento" valor={moeda(resumo.faturado)} />
            <LinhaInfo rotulo="Em aberto" valor={moeda(resumo.emAberto)} />
            <LinhaInfo rotulo="Ticket médio" valor={moeda(resumo.ticketMedio)} />
            <div className="divider my-3" />
            <p className="label-xs">Por forma de pagamento</p>
            <div className="mt-2 space-y-2">
              {FORMAS.map(({ id, rotulo, icone: Icone }) => {
                const valor = resumo.porForma[id] ?? 0;
                const pct = resumo.faturado ? (valor / resumo.faturado) * 100 : 0;
                return (
                  <div key={id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-ink-100/70">
                        <Icone size={14} /> {rotulo}
                      </span>
                      <span className="font-semibold text-ink-50 tabular">{moeda(valor)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      {/* ------------------------- vendas encerradas ----------------------- */}
      {pedidosEncerrados.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl text-ink-50">Contas encerradas</h2>
          <div className="mt-4 space-y-2">
            {pedidosEncerrados.slice(0, 10).map((pedido) => (
              <div
                key={pedido.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-ink-850/60 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Badge tom={pedido.status === 'pago' ? 'pago' : 'erro'}>
                    {pedido.status === 'pago' ? 'Pago' : 'Cancelado'}
                  </Badge>
                  <span className="text-sm text-ink-50">
                    Mesa {String(pedido.mesa_numero).padStart(2, '0')} · #{pedido.comanda}
                  </span>
                  <span className="text-xs text-ink-100/45">{dataHora(pedido.pago_em)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink-50 tabular">
                    {moeda(pedido.total)}
                  </span>
                  {pedido.forma_pagamento && (
                    <Badge tom="neutro">
                      {FORMAS.find((f) => f.id === pedido.forma_pagamento)?.rotulo}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icone={<RefreshCw size={14} />}
                    onClick={() => void reimprimir(pedido.id, 'caixa')}
                  >
                    Recibo
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------ modal de fechamento --------------------- */}
      <Modal
        aberto={Boolean(fechando)}
        onFechar={() => setFechando(null)}
        titulo={`Fechar conta · Comanda #${fechando?.comanda ?? ''}`}
        subtitulo={`Mesa ${String(fechando?.mesa_numero ?? 0).padStart(2, '0')} · escolha a forma de pagamento`}
      >
        {fechando && (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/[.07] bg-ink-800/50 p-4">
              <LinhaInfo rotulo="Subtotal" valor={moeda(fechando.subtotal)} />
              <LinhaInfo rotulo={`Serviço (${config.taxa_servico}%)`} valor={moeda(fechando.taxa_servico)} />
              {Number(desconto.replace(',', '.')) > 0 && (
                <LinhaInfo
                  rotulo="Desconto"
                  valor={`- ${moeda(Number(desconto.replace(',', '.')) || 0)}`}
                />
              )}
              <div className="divider my-2" />
              <div className="flex items-baseline justify-between">
                <span className="font-display text-lg text-ink-50">Total a pagar</span>
                <span className="font-display text-3xl text-amber-300 tabular">
                  {moeda(Math.max(0, fechando.total - (Number(desconto.replace(',', '.')) || 0)))}
                </span>
              </div>
            </div>

            <div>
              <p className="label-xs">Forma de pagamento</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {FORMAS.map(({ id, rotulo, icone: Icone }) => (
                  <button
                    key={id}
                    onClick={() => setFormaPagamento(id)}
                    className={[
                      'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-sm font-semibold',
                      'transition-all duration-200 active:scale-[.97]',
                      formaPagamento === id
                        ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                        : 'border-white/[.08] bg-ink-800 text-ink-100/65 hover:border-amber-400/40',
                    ].join(' ')}
                  >
                    <Icone size={19} />
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="desconto" className="label-xs">
                Desconto (R$)
              </label>
              <input
                id="desconto"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value.replace(/[^\d,.]/g, ''))}
                inputMode="decimal"
                placeholder="0,00"
                className="mt-2 h-11 w-full rounded-xl border border-white/[.08] bg-ink-800 px-3.5 text-sm text-ink-50 placeholder:text-ink-100/30 focus:border-amber-400/50"
              />
            </div>

            <Button
              size="lg"
              bloco
              carregando={processando}
              icone={<CheckCircle2 size={18} />}
              onClick={confirmarFechamento}
            >
              {processando ? 'Fechando…' : 'Confirmar e imprimir recibo'}
            </Button>
            <p className="text-center text-[11px] text-ink-100/40">
              O recibo de pagamento é enviado automaticamente para a fila de impressão do caixa.
              {config.abrir_gaveta && formaPagamento === 'dinheiro' ? ' A gaveta será aberta.' : ''}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ========================================================================== */

function MesaCard({
  mesa,
  consumo,
  selecionada,
  onClick,
}: {
  mesa: Mesa;
  consumo: number;
  selecionada: boolean;
  onClick: () => void;
}) {
  const ocupada = mesa.status !== 'livre';
  return (
    <button
      onClick={onClick}
      className={[
        'group cursor-pointer rounded-2xl border p-4 text-left transition-all duration-200',
        'hover:-translate-y-0.5 active:scale-[.98]',
        selecionada
          ? 'border-amber-400 bg-amber-400/[.12]'
          : ocupada
            ? 'border-orange-500/25 bg-orange-500/[.06] hover:border-orange-400/50'
            : 'border-white/[.07] bg-ink-850/70 hover:border-amber-400/40',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <span className="font-display text-2xl leading-none text-ink-50">
          {String(mesa.numero).padStart(2, '0')}
        </span>
        <span
          className={[
            'h-2.5 w-2.5 rounded-full',
            ocupada ? 'bg-orange-400' : 'bg-emerald-400',
          ].join(' ')}
        />
      </div>
      <p
        className={[
          'mt-2 text-[11px] font-semibold uppercase tracking-wider',
          ocupada ? 'text-orange-300/90' : 'text-emerald-300/80',
        ].join(' ')}
      >
        {ocupada ? 'Ocupada' : 'Livre'}
      </p>
      {ocupada ? (
        <>
          <p className="mt-1 text-xs text-ink-100/45">{tempoDecorrido(mesa.aberta_em)}</p>
          <p className="mt-1 text-sm font-bold text-amber-300 tabular">{moeda(consumo)}</p>
          {mesa.comanda_atual && (
            <p className="mt-0.5 text-[10px] text-ink-100/35">#{mesa.comanda_atual}</p>
          )}
        </>
      ) : (
        <p className="mt-1 text-xs text-ink-100/35">Aguardando cliente</p>
      )}
    </button>
  );
}
