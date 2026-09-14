import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Clock,
  Info,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBar } from '@/lib/bar-context';
import { Badge, Button, Modal, Vazio } from '@/components/ui';
import { vibrar } from '@/lib/audio';
import { moeda, pluralizar } from '@/lib/format';
import { CATEGORIAS } from '@/data/seed';
import type { CarrinhoItem, CategoriaId, Produto } from '@/types';

const EMOJI_POR_ICONE: Record<string, string> = {
  beer: '🍺',
  cocktail: '🍹',
  whisky: '🥃',
  soda: '🥤',
  plate: '🍽️',
  peanut: '🥜',
};

interface EdicaoItem {
  produto: Produto;
  quantidade: number;
  observacoes: string[];
  nota: string;
}

export function Cardapio() {
  const { mesaNumero } = useParams<{ mesaNumero: string }>();
  const navigate = useNavigate();
  const { produtos, mesas, config, criarPedido, pedidoPorId } = useBar();

  const mesa = useMemo(
    () => mesas.find((m) => m.numero === Number(mesaNumero)),
    [mesas, mesaNumero],
  );

  const [categoria, setCategoria] = useState<CategoriaId>('cervejas');
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [edicao, setEdicao] = useState<EdicaoItem | null>(null);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [cliente, setCliente] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviadoId, setPedidoEnviadoId] = useState<string | null>(null);

  const pedidoEnviado = pedidoEnviadoId ? pedidoPorId(pedidoEnviadoId) : undefined;

  const disponiveis = useMemo(() => produtos.filter((p) => p.disponivel), [produtos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return disponiveis.filter((p) => {
      const casaCategoria = p.categoria === categoria;
      const casaBusca =
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        p.descricao.toLowerCase().includes(termo);
      return casaCategoria && casaBusca;
    });
  }, [disponiveis, categoria, busca]);

  const destaques = useMemo(() => disponiveis.filter((p) => p.destaque).slice(0, 6), [disponiveis]);

  const totalItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0);
  const subtotal = carrinho.reduce((acc, i) => acc + i.produto.preco * i.quantidade, 0);
  const taxa = Math.round(subtotal * ((config.taxa_servico ?? 10) / 100) * 100) / 100;
  const total = subtotal + taxa;

  /* ------------------------------- carrinho ------------------------------- */

  function adicionarAoCarrinho(item: EdicaoItem) {
    setCarrinho((atual) => {
      const key = `${item.produto.id}|${[...item.observacoes].sort().join(',')}|${item.nota.trim().toLowerCase()}`;
      const existente = atual.find((i) => i.key === key);
      if (existente) {
        return atual.map((i) =>
          i.key === key ? { ...i, quantidade: i.quantidade + item.quantidade } : i,
        );
      }
      return [
        ...atual,
        {
          key,
          produto: item.produto,
          quantidade: item.quantidade,
          observacoes: item.observacoes,
          nota: item.nota.trim(),
        },
      ];
    });
    vibrar(12);
    toast.success(`${item.quantidade}x ${item.produto.nome} adicionado`, {
      description: item.observacoes.length
        ? `Obs: ${item.observacoes.join(', ')}`
        : item.nota.trim() || undefined,
      duration: 2200,
    });
  }

  function alterarQuantidade(key: string, delta: number) {
    setCarrinho((atual) =>
      atual
        .map((i) => (i.key === key ? { ...i, quantidade: i.quantidade + delta } : i))
        .filter((i) => i.quantidade > 0),
    );
  }

  function removerItem(key: string) {
    setCarrinho((atual) => atual.filter((i) => i.key !== key));
    vibrar(20);
  }

  async function enviarPedido() {
    if (!mesa || !carrinho.length) return;
    setEnviando(true);
    try {
      const pedido = await criarPedido({ mesa, carrinho, cliente });
      setPedidoEnviadoId(pedido.id);
      setCarrinho([]);
      setCarrinhoAberto(false);
      setCliente('');
      vibrar([30, 60, 30]);
      toast.success(`Pedido enviado! Comanda #${pedido.comanda}`, {
        description: 'Imprimindo no bar e no caixa…',
      });
    } catch (err) {
      toast.error('Não foi possível enviar o pedido', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setEnviando(false);
    }
  }

  /* ------------------------- tela de acompanhamento ----------------------- */

  if (pedidoEnviado) {
    const etapas = [
      { chave: 'novo', rotulo: 'Recebido pelo bar', icone: Check },
      { chave: 'preparando', rotulo: 'Em preparo', icone: UtensilsCrossed },
      { chave: 'pronto', rotulo: 'Pronto para retirada', icone: Sparkles },
    ];
    const ordem = ['novo', 'preparando', 'pronto', 'entregue', 'pago'];
    const indiceAtual = Math.max(0, ordem.indexOf(pedidoEnviado.status));

    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-6">
        <div className="animate-pop-in rounded-3xl border border-emerald-500/25 bg-emerald-500/[.07] p-6 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-400/40 bg-emerald-400/15 text-emerald-300">
            <Check size={30} />
          </span>
          <h1 className="mt-5 font-display text-2xl text-ink-50">Pedido enviado!</h1>
          <p className="mt-2 text-sm text-ink-100/60">
            Mesa {String(pedidoEnviado.mesa_numero).padStart(2, '0')} · Comanda{' '}
            <strong className="text-amber-300">#{pedidoEnviado.comanda}</strong>
          </p>
          <p className="mt-4 font-display text-3xl text-amber-300">{moeda(pedidoEnviado.total)}</p>
          <p className="mt-1 text-[11px] text-ink-100/45">
            Inclui {config.taxa_servico}% de serviço · a comanda já está sendo impressa
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[.07] bg-ink-850/70 p-5">
          <p className="label-xs">Acompanhe o preparo</p>
          <ol className="mt-4 space-y-4">
            {etapas.map((etapa, idx) => {
              const concluido = indiceAtual >= idx;
              const ativo = indiceAtual === idx;
              return (
                <li key={etapa.chave} className="flex items-center gap-3">
                  <span
                    className={[
                      'grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors duration-300',
                      concluido
                        ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300'
                        : 'border-white/10 bg-ink-800 text-ink-100/35',
                      ativo ? 'animate-alert-pulse' : '',
                    ].join(' ')}
                  >
                    <etapa.icone size={16} />
                  </span>
                  <span
                    className={[
                      'text-sm',
                      concluido ? 'font-medium text-ink-50' : 'text-ink-100/40',
                    ].join(' ')}
                  >
                    {etapa.rotulo}
                  </span>
                  {ativo && (
                    <span className="ml-auto text-[11px] uppercase tracking-wider text-amber-300">
                      agora
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[.07] bg-ink-850/70 p-5">
          <p className="label-xs">Resumo do pedido</p>
          <ul className="mt-3 space-y-2.5">
            {pedidoEnviado.itens.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm text-ink-50">
                    <strong className="text-amber-300">{item.quantidade}x</strong> {item.nome}
                  </span>
                  {item.observacoes.length > 0 && (
                    <span className="mt-0.5 block text-[11px] text-ink-100/50">
                      {item.observacoes.join(' · ')}
                    </span>
                  )}
                  {item.nota && (
                    <span className="mt-0.5 block text-[11px] italic text-ink-100/45">
                      “{item.nota}”
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm text-ink-100/70 tabular">
                  {moeda(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            size="lg"
            bloco
            onClick={() => {
              setPedidoEnviadoId(null);
              setCategoria('cervejas');
            }}
          >
            Fazer novo pedido
          </Button>
          <Button size="lg" variant="ghost" bloco onClick={() => navigate('/')}>
            Voltar para o início
          </Button>
        </div>
      </div>
    );
  }

  /* --------------------------------- mesa -------------------------------- */

  if (!mesa) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Vazio
          icone={<Info size={22} />}
          titulo="Mesa não encontrada"
          descricao="O QR Code pode estar desatualizado. Escolha a mesa na tela inicial."
          acao={
            <Button onClick={() => navigate('/')} icone={<ChevronRight size={16} />}>
              Escolher mesa
            </Button>
          }
        />
      </div>
    );
  }

  /* -------------------------------- render ------------------------------- */

  return (
    <div className="mx-auto max-w-md pb-32">
      {/* Cabeçalho da mesa */}
      <div className="border-b border-white/[.07] bg-gradient-to-b from-amber-400/[.07] to-transparent px-4 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label-xs">Você está na</p>
            <h1 className="font-display text-3xl leading-tight text-amber-300">
              Mesa {String(mesa.numero).padStart(2, '0')}
            </h1>
          </div>
          <Badge tom={mesa.status === 'livre' ? 'pronto' : 'novo'}>
            {mesa.status === 'livre' ? 'Disponível' : 'Em atendimento'}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-ink-100/50">
          Monte seu pedido e envie direto para o bar. Os {config.taxa_servico}% de serviço são
          calculados no fechamento.
        </p>
      </div>

      {/* Busca */}
      <div className="sticky top-[57px] z-20 -mx-0 bg-ink-950/92 px-4 py-3 backdrop-blur-md">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-100/35"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no cardápio…"
            className="h-11 w-full rounded-xl border border-white/[.08] bg-ink-850 pl-10 pr-9 text-sm text-ink-50 placeholder:text-ink-100/35 focus:border-amber-400/50"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-ink-100/45 hover:bg-white/10"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categorias */}
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIAS.map((cat) => {
            const ativa = cat.id === categoria;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                className={[
                  'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold',
                  'transition-all duration-200 active:scale-95',
                  ativa
                    ? 'border-amber-400 bg-amber-400 text-ink-950'
                    : 'border-white/[.08] bg-ink-850 text-ink-100/65 hover:border-amber-400/40 hover:text-amber-200',
                ].join(' ')}
              >
                <span aria-hidden>{EMOJI_POR_ICONE[cat.icone]}</span>
                {cat.nome}
              </button>
            );
          })}
        </div>
      </div>

      {/* Destaques */}
      {!busca && categoria === 'cervejas' && destaques.length > 0 && (
        <section className="px-4 pt-4">
          <h2 className="font-display text-lg text-ink-50">Mais pedidos</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {destaques.map((produto) => (
              <button
                key={produto.id}
                onClick={() =>
                  setEdicao({ produto, quantidade: 1, observacoes: [], nota: '' })
                }
                className="w-40 shrink-0 cursor-pointer rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[.08] to-transparent p-3 text-left transition-transform duration-200 active:scale-[.97]"
              >
                <span className="text-2xl" aria-hidden>
                  {EMOJI_POR_ICONE[CATEGORIAS.find((c) => c.id === produto.categoria)?.icone ?? '']}
                </span>
                <span className="mt-2 block truncate text-sm font-semibold text-ink-50">
                  {produto.nome}
                </span>
                <span className="mt-1 block text-amber-300">{moeda(produto.preco)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lista de produtos */}
      <section className="px-4 pt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg text-ink-50">
            {CATEGORIAS.find((c) => c.id === categoria)?.nome}
          </h2>
          <span className="text-xs text-ink-100/40">
            {filtrados.length} {pluralizar(filtrados.length, 'item', 'itens')}
          </span>
        </div>

        {filtrados.length === 0 ? (
          <Vazio
            titulo="Nada por aqui"
            descricao="Tente outra categoria ou limpe a busca."
            acao={
              <Button variant="secondary" onClick={() => setBusca('')}>
                Limpar busca
              </Button>
            }
          />
        ) : (
          <ul className="mt-3 space-y-2.5">
            {filtrados.map((produto) => (
              <li
                key={produto.id}
                className="rounded-2xl border border-white/[.07] bg-ink-850/70 p-4 transition-colors hover:border-white/15"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold leading-snug text-ink-50">
                      {produto.nome}
                    </h3>
                    {produto.rotulo && (
                      <span className="mt-1 inline-block rounded-md bg-white/[.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-100/60">
                        {produto.rotulo}
                      </span>
                    )}
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-100/55">
                      {produto.descricao}
                    </p>
                    <span className="mt-2 flex items-center gap-1 text-[11px] text-ink-100/40">
                      <Clock size={11} /> ~{produto.tempo_preparo} min
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-lg text-amber-300 tabular">
                      {moeda(produto.preco)}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      icone={<Plus size={14} />}
                      onClick={() =>
                        setEdicao({ produto, quantidade: 1, observacoes: [], nota: '' })
                      }
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Barra do carrinho */}
      {totalItens > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 safe-bottom">
          <div className="mx-auto max-w-md">
            <button
              onClick={() => setCarrinhoAberto(true)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400 px-4 py-3 text-ink-950 shadow-[0_12px_40px_-12px_rgba(245,179,43,.75)] transition-transform duration-200 active:scale-[.98]"
            >
              <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-ink-950/10">
                <ShoppingCart size={18} />
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink-950 px-1 text-[10px] font-bold text-amber-300">
                  {totalItens}
                </span>
              </span>
              <span className="flex-1 text-left">
                <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">
                  Ver carrinho
                </span>
                <span className="block text-lg font-extrabold leading-tight tabular">
                  {moeda(total)}
                </span>
              </span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de observações */}
      <Modal
        aberto={Boolean(edicao)}
        onFechar={() => setEdicao(null)}
        titulo={edicao?.produto.nome ?? ''}
        subtitulo={edicao?.produto.descricao}
      >
        {edicao && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-white/[.07] bg-ink-800/60 px-4 py-3">
              <span className="text-sm text-ink-100/70">Quantidade</span>
              <span className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setEdicao({ ...edicao, quantidade: Math.max(1, edicao.quantidade - 1) })
                  }
                  aria-label="Diminuir quantidade"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/10 text-ink-100/70 transition-colors hover:bg-white/[.07] active:scale-95"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center text-lg font-bold text-ink-50 tabular">
                  {edicao.quantidade}
                </span>
                <button
                  onClick={() =>
                    setEdicao({ ...edicao, quantidade: Math.min(30, edicao.quantidade + 1) })
                  }
                  aria-label="Aumentar quantidade"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-300 transition-colors hover:bg-amber-400/20 active:scale-95"
                >
                  <Plus size={16} />
                </button>
              </span>
            </div>

            {edicao.produto.observacoes_sugeridas?.length ? (
              <div>
                <p className="label-xs">Observações</p>
                <p className="mt-1 text-xs text-ink-100/45">
                  Toque para marcar. As observações aparecem destacadas na comanda do bar.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {edicao.produto.observacoes_sugeridas.map((obs) => {
                    const marcada = edicao.observacoes.includes(obs);
                    return (
                      <button
                        key={obs}
                        onClick={() =>
                          setEdicao({
                            ...edicao,
                            observacoes: marcada
                              ? edicao.observacoes.filter((o) => o !== obs)
                              : [...edicao.observacoes, obs],
                          })
                        }
                        className={[
                          'cursor-pointer rounded-full border px-3.5 py-2 text-xs font-medium',
                          'transition-all duration-200 active:scale-95',
                          marcada
                            ? 'border-amber-400 bg-amber-400 text-ink-950'
                            : 'border-white/[.10] bg-ink-800 text-ink-100/70 hover:border-amber-400/50 hover:text-amber-200',
                        ].join(' ')}
                      >
                        {marcada && <Check size={12} className="mr-1 inline" />}
                        {obs}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <label htmlFor="nota-livre" className="label-xs">
                Algum recado para a cozinha?
              </label>
              <textarea
                id="nota-livre"
                value={edicao.nota}
                onChange={(e) => setEdicao({ ...edicao, nota: e.target.value.slice(0, 120) })}
                rows={3}
                placeholder="Ex.: bem passado, capricha no gelo, sem cebola…"
                className="mt-2 w-full resize-none rounded-xl border border-white/[.08] bg-ink-800 px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-100/30 focus:border-amber-400/50"
              />
              <p className="mt-1 text-right text-[10px] text-ink-100/35">
                {edicao.nota.length}/120
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/[.07] bg-ink-800/60 px-4 py-3">
              <span className="text-sm text-ink-100/70">Subtotal</span>
              <span className="font-display text-xl text-amber-300 tabular">
                {moeda(edicao.produto.preco * edicao.quantidade)}
              </span>
            </div>

            <Button
              size="lg"
              bloco
              icone={<Plus size={17} />}
              onClick={() => {
                adicionarAoCarrinho(edicao);
                setEdicao(null);
              }}
            >
              Adicionar ao pedido
            </Button>
          </div>
        )}
      </Modal>

      {/* Carrinho */}
      <Modal
        aberto={carrinhoAberto}
        onFechar={() => setCarrinhoAberto(false)}
        titulo="Seu pedido"
        subtitulo={`Mesa ${String(mesa.numero).padStart(2, '0')} · revise os itens antes de enviar`}
        largura="md"
      >
        {carrinho.length === 0 ? (
          <Vazio
            icone={<ShoppingCart size={22} />}
            titulo="Carrinho vazio"
            descricao="Adicione bebidas, drinks e porções para enviar ao bar."
          />
        ) : (
          <div className="space-y-4">
            <ul className="space-y-3">
              {carrinho.map((item) => (
                <li
                  key={item.key}
                  className="rounded-xl border border-white/[.07] bg-ink-800/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-50">{item.produto.nome}</p>
                      <p className="text-[11px] text-ink-100/45">
                        {moeda(item.produto.preco)} cada
                      </p>
                      {item.observacoes.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-amber-300/85">
                          {item.observacoes.join(' · ')}
                        </p>
                      )}
                      {item.nota && (
                        <p className="mt-1 text-[11px] italic text-ink-100/50">“{item.nota}”</p>
                      )}
                    </div>
                    <button
                      onClick={() => removerItem(item.key)}
                      aria-label={`Remover ${item.produto.nome}`}
                      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-100/40 transition-colors hover:bg-red-500/15 hover:text-red-300"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => alterarQuantidade(item.key, -1)}
                        aria-label="Diminuir"
                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 text-ink-100/70 transition-colors hover:bg-white/[.07] active:scale-95"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-bold text-ink-50 tabular">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => alterarQuantidade(item.key, 1)}
                        aria-label="Aumentar"
                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-300 transition-colors hover:bg-amber-400/20 active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-semibold text-ink-50 tabular">
                      {moeda(item.produto.preco * item.quantidade)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-white/[.07] bg-ink-800/40 p-4">
              <div className="flex justify-between text-sm text-ink-100/60">
                <span>Subtotal</span>
                <span className="tabular">{moeda(subtotal)}</span>
              </div>
              <div className="mt-1.5 flex justify-between text-sm text-ink-100/60">
                <span>Serviço ({config.taxa_servico}%)</span>
                <span className="tabular">{moeda(taxa)}</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-white/[.07] pt-3">
                <span className="font-display text-base text-ink-50">Total</span>
                <span className="font-display text-2xl text-amber-300 tabular">{moeda(total)}</span>
              </div>
            </div>

            <div>
              <label htmlFor="nome-cliente" className="label-xs">
                Seu nome (opcional)
              </label>
              <input
                id="nome-cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value.slice(0, 40))}
                placeholder="Para o garçom chamar na hora da entrega"
                className="mt-2 h-11 w-full rounded-xl border border-white/[.08] bg-ink-800 px-3.5 text-sm text-ink-50 placeholder:text-ink-100/30 focus:border-amber-400/50"
              />
            </div>

            <Button
              size="lg"
              bloco
              carregando={enviando}
              icone={<UtensilsCrossed size={18} />}
              onClick={enviarPedido}
            >
              {enviando ? 'Enviando…' : 'Enviar pedido ao bar'}
            </Button>
            <p className="text-center text-[11px] text-ink-100/40">
              Ao enviar, a comanda é impressa automaticamente no caixa e no bar.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
