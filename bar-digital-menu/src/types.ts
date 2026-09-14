/**
 * Modelo de dados do sistema.
 *
 * As entidades abaixo espelham 1:1 o schema sugerido para o Supabase
 * (ver README.md -> "Integracao com Supabase"), entao a troca da classe
 * `Database` por chamadas reais nao exige mudancas nas telas.
 */

export type CategoriaId =
  | 'cervejas'
  | 'drinks'
  | 'destilados'
  | 'refrigerantes'
  | 'porcoes'
  | 'petiscos';

export interface Categoria {
  id: CategoriaId;
  nome: string;
  icone: string;
  descricao: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: CategoriaId;
  /** Tempo medio de preparo em minutos (usado no KDS). */
  tempo_preparo: number;
  /** Secao de destaque no topo do cardapio (ex.: "Mais pedidos"). */
  destaque: boolean;
  /** Controla se o item aparece para o cliente. */
  disponivel: boolean;
  /** Volume/porcao exibida no cardapio (ex.: "600ml", "Dose 50ml"). */
  rotulo?: string;
  /** Observacoes pre-definidas sugeridas ao cliente. */
  observacoes_sugeridas?: string[];
}

export interface ItemPedido {
  id: string;
  pedido_id: string;
  produto_id: string;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  /** Observacoes pre-definidas marcadas pelo cliente (ex.: "sem gelo"). */
  observacoes: string[];
  /** Nota livre digitada pelo cliente. */
  nota: string | null;
  /** Lucro/Subtotal calculado no momento do envio. */
  subtotal: number;
  /** Status individual do item no KDS. */
  status: ItemStatus;
}

export type ItemStatus = 'pendente' | 'preparando' | 'pronto';

export type StatusPedido = 'novo' | 'preparando' | 'pronto' | 'entregue' | 'pago' | 'cancelado';

export type FormaPagamento = 'dinheiro' | 'cartao' | 'pix';

export interface Pedido {
  id: string;
  /** Numero sequencial da comanda (exibido nos cupons e no PDV). */
  comanda: number;
  mesa_id: string;
  mesa_numero: number;
  /** Snapshot dos itens para leitura rapida; a tabela `itens` e a fonte da verdade. */
  status: StatusPedido;
  subtotal: number;
  taxa_servico: number;
  desconto: number;
  total: number;
  criado_em: string;
  iniciado_em: string | null;
  pronto_em: string | null;
  entregue_em: string | null;
  pago_em: string | null;
  forma_pagamento: FormaPagamento | null;
  origem: 'cliente' | 'caixa';
  /** Nome de quem pediu (opcional, digitado pelo cliente). */
  cliente: string | null;
}

export type StatusMesa = 'livre' | 'ocupada' | 'fechando';

export interface Mesa {
  id: string;
  numero: number;
  status: StatusMesa;
  /** ISO timestamp de quando a mesa foi aberta (primeiro pedido). */
  aberta_em: string | null;
  /** Comanda atualmente vinculada a mesa. */
  comanda_atual: number | null;
}

export type DestinoImpressao = 'bar' | 'caixa' | 'duplo';
export type StatusPrintJob = 'pendente' | 'imprimindo' | 'impresso' | 'erro' | 'simulado';

export interface PrintJob {
  id: string;
  pedido_id: string;
  comanda: number;
  mesa_numero: number;
  destino: DestinoImpressao;
  /** Largura da bobina usada na geracao do ESC/POS. */
  largura: 80 | 58;
  status: StatusPrintJob;
  origem: 'auto' | 'manual';
  criado_em: string;
  impresso_em: string | null;
  tentativas: number;
  erro: string | null;
  /** Motivo do reenvio (ex.: "Reimpressao solicitada pelo caixa"). */
  motivo: string | null;
  /** Recibo gerado no fechamento da conta (inclui forma de pagamento). */
  fechamento: boolean;
}

export interface PedidoCompleto extends Pedido {
  itens: ItemPedido[];
  mesa: Mesa | null;
}

/** Item no carrinho do cliente (ainda nao persistido). */
export interface CarrinhoItem {
  key: string;
  produto: Produto;
  quantidade: number;
  observacoes: string[];
  nota: string;
}

export interface ConfiguracaoBar {
  nome: string;
  subtitulo: string;
  endereco: string;
  telefone: string;
  cnpj: string;
  /** Percentual da taxa de servico (10 = 10%). */
  taxa_servico: number;
  /** Largura padrao da bobina. */
  largura_bobina: 80 | 58;
  /** Emite bipe na impressora termica a cada cupom. */
  bipe_impressora: boolean;
  /** Dispara a gaveta automaticamente ao fechar uma conta no dinheiro. */
  abrir_gaveta: boolean;
  codepage: 'cp850' | 'cp860' | 'ascii';
  /** Nome da impressora exibido na estacao de impressao. */
  impressora_bar: string;
  impressora_caixa: string;
}
