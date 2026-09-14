import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { db } from './database';
import { destravarAudio, setAudioHabilitado, tocarSom, audioTravado, audioHabilitado } from './audio';
import type {
  CarrinhoItem,
  ConfiguracaoBar,
  FormaPagamento,
  ItemPedido,
  Mesa,
  Pedido,
  PedidoCompleto,
  PrintJob,
  Produto,
  StatusPedido,
  DestinoImpressao,
} from '@/types';

interface BarState {
  mesas: Mesa[];
  produtos: Produto[];
  itens: ItemPedido[];
  pedidos: PedidoCompleto[];
  printJobs: PrintJob[];
  config: ConfiguracaoBar;
  pronto: boolean;
}

export interface NovoPedidoInput {
  mesa: Mesa;
  carrinho: CarrinhoItem[];
  cliente?: string | null;
}

export interface FecharContaInput {
  pedidoId: string;
  formaPagamento: FormaPagamento;
  desconto?: number;
  imprimir?: boolean;
}

interface BarContextValue extends BarState {
  /** Pedidos em aberto (novo/preparando/pronto/entregue), mais recentes primeiro. */
  pedidosAbertos: PedidoCompleto[];
  pedidosEncerrados: PedidoCompleto[];
  pedidoPorId: (id: string) => PedidoCompleto | undefined;
  mesaPorId: (id: string) => Mesa | undefined;
  itensDoPedido: (pedidoId: string) => ItemPedido[];
  filaImpressao: PrintJob[];
  historicoImpressao: PrintJob[];

  criarPedido: (input: NovoPedidoInput) => Promise<PedidoCompleto>;
  avancarStatus: (pedidoId: string, status: StatusPedido) => Promise<void>;
  fecharConta: (input: FecharContaInput) => Promise<void>;
  cancelarPedido: (pedidoId: string) => Promise<void>;
  solicitarImpressao: (
    pedidoId: string,
    destino: DestinoImpressao,
    motivo?: string,
  ) => Promise<PrintJob | null>;
  marcarImpressao: (jobId: string, status: PrintJob['status'], erro?: string | null) => Promise<void>;
  atualizarConfig: (patch: Partial<ConfiguracaoBar>) => Promise<void>;
  gerarPedidoDemo: (mesaNumero?: number) => Promise<void>;
  limparOperacao: () => Promise<void>;

  // Audio
  somAtivo: boolean;
  alternarSom: () => void;
  destravarSom: () => Promise<boolean>;
  somBloqueado: () => boolean;
}

const BarContext = createContext<BarContextValue | null>(null);

function uid(prefix: string): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return `${prefix}_${c.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function calcularTotais(subtotal: number, taxaPercentual: number, desconto = 0) {
  const taxa = Math.round(subtotal * (taxaPercentual / 100) * 100) / 100;
  const total = Math.max(0, Math.round((subtotal + taxa - desconto) * 100) / 100);
  return { subtotal: Math.round(subtotal * 100) / 100, taxa, desconto, total };
}

export function BarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BarState>({
    mesas: [],
    produtos: [],
    itens: [],
    pedidos: [],
    printJobs: [],
    config: {} as ConfiguracaoBar,
    pronto: false,
  });
  const [somAtivo, setSomAtivo] = useState(true);
  // Evita re-entrar na rotina de carregamento durante um refresh disparado por evento.
  const carregandoRef = useRef(false);

  const carregar = useCallback(async () => {
    if (carregandoRef.current) return;
    carregandoRef.current = true;
    try {
      const [mesas, produtos, pedidos, itens, printJobs, configRows] = await Promise.all([
        db.from<Mesa>('mesas').select().order('numero'),
        db.from<Produto>('produtos').select().order('nome'),
        db.from<Pedido>('pedidos').select().order('criado_em', { ascending: false }),
        db.from<ItemPedido>('itens').select(),
        db.from<PrintJob>('print_jobs').select().order('criado_em', { ascending: false }),
        db.from<ConfiguracaoBar & { id: string }>('config').select().limit(1),
      ]);

      const mesasData = (mesas.data ?? []) as Mesa[];
      const pedidosData = (pedidos.data ?? []) as Pedido[];
      const itensData = (itens.data ?? []) as ItemPedido[];
      const configData = ((configRows.data ?? []) as Array<ConfiguracaoBar & { id: string }>)[0];

      const pedidosCompletos: PedidoCompleto[] = pedidosData.map((p) => ({
        ...p,
        itens: itensData
          .filter((i) => i.pedido_id === p.id)
          .sort((a, b) => a.nome.localeCompare(b.nome)),
        mesa: mesasData.find((m) => m.id === p.mesa_id) ?? null,
      }));

      setState({
        mesas: mesasData,
        produtos: (produtos.data ?? []) as Produto[],
        itens: itensData,
        pedidos: pedidosCompletos,
        printJobs: (printJobs.data ?? []) as PrintJob[],
        config: configData ?? ({} as ConfiguracaoBar),
        pronto: true,
      });
    } finally {
      carregandoRef.current = false;
    }
  }, []);

  useEffect(() => {
    void carregar();
    const off = db.on('*', () => {
      void carregar();
    });
    return () => {
      off();
    };
  }, [carregar]);

  // -------------------------------------------------------------------------
  // Acoes
  // -------------------------------------------------------------------------

  const proximaComanda = useCallback(() => {
    const comandas = state.pedidos.map((p) => p.comanda);
    return Math.max(1000, ...comandas) + 1;
  }, [state.pedidos]);

  const criarPedido = useCallback(
    async ({ mesa, carrinho, cliente }: NovoPedidoInput): Promise<PedidoCompleto> => {
      if (!carrinho.length) throw new Error('Carrinho vazio.');

      const agora = new Date().toISOString();
      const subtotal = carrinho.reduce((acc, i) => acc + i.produto.preco * i.quantidade, 0);
      const { taxa, total } = calcularTotais(subtotal, state.config.taxa_servico ?? 10);
      const comanda = proximaComanda();
      const pedidoId = uid('ped');

      const pedido: Pedido = {
        id: pedidoId,
        comanda,
        mesa_id: mesa.id,
        mesa_numero: mesa.numero,
        status: 'novo',
        subtotal: Math.round(subtotal * 100) / 100,
        taxa_servico: taxa,
        desconto: 0,
        total,
        criado_em: agora,
        iniciado_em: null,
        pronto_em: null,
        entregue_em: null,
        pago_em: null,
        forma_pagamento: null,
        origem: 'cliente',
        cliente: cliente?.trim() ? cliente.trim() : null,
      };

      const itens: ItemPedido[] = carrinho.map((item) => ({
        id: uid('item'),
        pedido_id: pedidoId,
        produto_id: item.produto.id,
        nome: item.produto.nome,
        preco_unitario: item.produto.preco,
        quantidade: item.quantidade,
        observacoes: item.observacoes,
        nota: item.nota?.trim() ? item.nota.trim() : null,
        subtotal: Math.round(item.produto.preco * item.quantidade * 100) / 100,
        status: 'pendente',
      }));

      await db.from<Pedido>('pedidos').insert(pedido as unknown as Partial<Pedido>);
      await db.from<ItemPedido>('itens').insert(itens as unknown as Partial<ItemPedido>[]);

      // A mesa passa a ficar ocupada (ou registra nova comanda se ja estava aberta).
      await db
        .from<Mesa>('mesas')
        .update({ status: 'ocupada', aberta_em: mesa.aberta_em ?? agora, comanda_atual: comanda })
        .eq('id', mesa.id);

      // Impressao dupla: bar + caixa, disparada na hora.
      await db.from<PrintJob>('print_jobs').insert({
        id: uid('job'),
        pedido_id: pedidoId,
        comanda,
        mesa_numero: mesa.numero,
        destino: 'duplo',
        largura: state.config.largura_bobina ?? 80,
        status: 'pendente',
        origem: 'auto',
        criado_em: agora,
        impresso_em: null,
        tentativas: 0,
        erro: null,
        motivo: 'Envio do cliente',
        fechamento: false,
      } as unknown as Partial<PrintJob>);

      tocarSom('confirma');
      return { ...pedido, itens, mesa: { ...mesa, status: 'ocupada', comanda_atual: comanda } };
    },
    [proximaComanda, state.config.largura_bobina, state.config.taxa_servico],
  );

  const avancarStatus = useCallback(
    async (pedidoId: string, status: StatusPedido) => {
      const agora = new Date().toISOString();
      const patch: Partial<Pedido> = { status };
      if (status === 'preparando') patch.iniciado_em = agora;
      if (status === 'pronto') patch.pronto_em = agora;
      if (status === 'entregue') {
        patch.entregue_em = agora;
        await db.from<ItemPedido>('itens').update({ status: 'pronto' }).eq('pedido_id', pedidoId);
      }
      if (status === 'preparando') {
        await db.from<ItemPedido>('itens').update({ status: 'preparando' }).eq('pedido_id', pedidoId);
      }
      await db.from<Pedido>('pedidos').update(patch).eq('id', pedidoId);
      if (status === 'pronto') tocarSom('pronto');
    },
    [],
  );

  const fecharConta = useCallback(
    async ({ pedidoId, formaPagamento, desconto = 0, imprimir = true }: FecharContaInput) => {
      const pedido = state.pedidos.find((p) => p.id === pedidoId);
      if (!pedido) return;
      const agora = new Date().toISOString();
      const { taxa, total } = calcularTotais(pedido.subtotal, state.config.taxa_servico ?? 10, desconto);

      await db.from<Pedido>('pedidos').update({
        status: 'pago',
        forma_pagamento: formaPagamento,
        pago_em: agora,
        desconto,
        taxa_servico: taxa,
        total,
        entregue_em: pedido.entregue_em ?? agora,
      }).eq('id', pedidoId);

      // Libera a mesa se nao houver outros pedidos em aberto nela.
      const outrosAbertos = state.pedidos.some(
        (p) => p.mesa_id === pedido.mesa_id && p.id !== pedidoId && !['pago', 'cancelado'].includes(p.status),
      );
      if (!outrosAbertos) {
        await db
          .from<Mesa>('mesas')
          .update({ status: 'livre', aberta_em: null, comanda_atual: null })
          .eq('id', pedido.mesa_id);
      }

      if (imprimir) {
        await db.from<PrintJob>('print_jobs').insert({
          id: uid('job'),
          pedido_id: pedidoId,
          comanda: pedido.comanda,
          mesa_numero: pedido.mesa_numero,
          destino: 'caixa',
          largura: state.config.largura_bobina ?? 80,
          status: 'pendente',
          origem: 'auto',
          criado_em: agora,
          impresso_em: null,
          tentativas: 0,
          erro: null,
          motivo: 'Fechamento de conta',
          fechamento: true,
        } as unknown as Partial<PrintJob>);
      }
      tocarSom('confirma');
    },
    [state.pedidos, state.config.largura_bobina, state.config.taxa_servico],
  );

  const cancelarPedido = useCallback(
    async (pedidoId: string) => {
      const pedido = state.pedidos.find((p) => p.id === pedidoId);
      if (!pedido) return;
      await db.from<Pedido>('pedidos').update({ status: 'cancelado' }).eq('id', pedidoId);
      const outrosAbertos = state.pedidos.some(
        (p) => p.mesa_id === pedido.mesa_id && p.id !== pedidoId && !['pago', 'cancelado'].includes(p.status),
      );
      if (!outrosAbertos) {
        await db
          .from<Mesa>('mesas')
          .update({ status: 'livre', aberta_em: null, comanda_atual: null })
          .eq('id', pedido.mesa_id);
      }
      tocarSom('erro');
    },
    [state.pedidos],
  );

  const solicitarImpressao = useCallback(
    async (pedidoId: string, destino: DestinoImpressao, motivo = 'Reimpressao manual') => {
      const pedido = state.pedidos.find((p) => p.id === pedidoId);
      if (!pedido) return null;
      const job: Partial<PrintJob> = {
        id: uid('job'),
        pedido_id: pedidoId,
        comanda: pedido.comanda,
        mesa_numero: pedido.mesa_numero,
        destino,
        largura: state.config.largura_bobina ?? 80,
        status: 'pendente',
        origem: 'manual',
        criado_em: new Date().toISOString(),
        impresso_em: null,
        tentativas: 0,
        erro: null,
        motivo,
        fechamento: false,
      };
      await db.from<PrintJob>('print_jobs').insert(job);
      return job as PrintJob;
    },
    [state.config.largura_bobina, state.pedidos],
  );

  const marcarImpressao = useCallback(async (jobId: string, status: PrintJob['status'], erro: string | null = null) => {
    const jobAtual = state.printJobs.find((j) => j.id === jobId);
    await db.from<PrintJob>('print_jobs').update({
      status,
      erro,
      tentativas: (jobAtual?.tentativas ?? 0) + 1,
      impresso_em: status === 'impresso' || status === 'simulado' ? new Date().toISOString() : jobAtual?.impresso_em ?? null,
    }).eq('id', jobId);
  }, [state.printJobs]);

  const atualizarConfig = useCallback(async (patch: Partial<ConfiguracaoBar>) => {
    await db.from<ConfiguracaoBar & { id: string }>('config').update(patch).eq('id', 'config-1');
  }, []);

  const gerarPedidoDemo = useCallback(
    async (mesaNumero?: number) => {
      const disponiveis = state.produtos.filter((p) => p.disponivel);
      if (!disponiveis.length) return;
      const mesa =
        (mesaNumero ? state.mesas.find((m) => m.numero === mesaNumero) : undefined) ??
        state.mesas.find((m) => m.status === 'livre') ??
        state.mesas[0];
      if (!mesa) return;

      const qtdItens = 1 + Math.floor(Math.random() * 3);
      const escolhidos = [...disponiveis].sort(() => Math.random() - 0.5).slice(0, qtdItens);
      const carrinho: CarrinhoItem[] = escolhidos.map((produto) => {
        const obs = produto.observacoes_sugeridas ?? [];
        return {
          key: `${produto.id}-${Math.random().toString(36).slice(2, 7)}`,
          produto,
          quantidade: 1 + Math.floor(Math.random() * 2),
          observacoes: Math.random() > 0.55 && obs.length ? [obs[Math.floor(Math.random() * obs.length)]] : [],
          nota: Math.random() > 0.85 ? 'Capricha no capricho, por favor!' : '',
        };
      });
      await criarPedido({ mesa, carrinho, cliente: null });
    },
    [criarPedido, state.mesas, state.produtos],
  );

  const limparOperacao = useCallback(async () => {
    await db.limparEncerrados();
  }, []);

  const alternarSom = useCallback(() => {
    setSomAtivo((atual) => {
      const novo = !atual;
      setAudioHabilitado(novo);
      if (novo) tocarSom('confirma');
      return novo;
    });
  }, []);

  const destravarSom = useCallback(() => destravarAudio(), []);

  useEffect(() => {
    setAudioHabilitado(somAtivo);
  }, [somAtivo]);

  // -------------------------------------------------------------------------
  // Derivados
  // -------------------------------------------------------------------------

  const value = useMemo<BarContextValue>(() => {
    const abertos = state.pedidos.filter((p) => !['pago', 'cancelado'].includes(p.status));
    const encerrados = state.pedidos.filter((p) => ['pago', 'cancelado'].includes(p.status));
    return {
      ...state,
      pedidosAbertos: abertos,
      pedidosEncerrados: encerrados,
      pedidoPorId: (id: string) => state.pedidos.find((p) => p.id === id),
      mesaPorId: (id: string) => state.mesas.find((m) => m.id === id),
      itensDoPedido: (pedidoId: string) => state.itens.filter((i) => i.pedido_id === pedidoId),
      filaImpressao: state.printJobs.filter((j) => j.status === 'pendente' || j.status === 'imprimindo'),
      historicoImpressao: state.printJobs.filter((j) => !['pendente', 'imprimindo'].includes(j.status)),
      criarPedido,
      avancarStatus,
      fecharConta,
      cancelarPedido,
      solicitarImpressao,
      marcarImpressao,
      atualizarConfig,
      gerarPedidoDemo,
      limparOperacao,
      somAtivo,
      alternarSom,
      destravarSom,
      somBloqueado: audioTravado,
    };
  }, [
    state,
    criarPedido,
    avancarStatus,
    fecharConta,
    cancelarPedido,
    solicitarImpressao,
    marcarImpressao,
    atualizarConfig,
    gerarPedidoDemo,
    limparOperacao,
    somAtivo,
    alternarSom,
    destravarSom,
  ]);

  return <BarContext.Provider value={value}>{children}</BarContext.Provider>;
}

export function useBar(): BarContextValue {
  const ctx = useContext(BarContext);
  if (!ctx) throw new Error('useBar precisa estar dentro de <BarProvider>.');
  return ctx;
}

/** Total consumido (nao pago) de uma mesa, somando todos os pedidos em aberto. */
export function consumoDaMesa(pedidos: PedidoCompleto[], mesaId: string): number {
  return pedidos
    .filter((p) => p.mesa_id === mesaId && !['pago', 'cancelado'].includes(p.status))
    .reduce((acc, p) => acc + p.total, 0);
}

export { audioHabilitado };
