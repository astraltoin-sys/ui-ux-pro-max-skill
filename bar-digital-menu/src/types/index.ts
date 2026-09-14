export type MesaStatus = "livre" | "ocupada";
export type PedidoStatus = "novo" | "preparando" | "pronto" | "fechado";
export type FormaPagamento = "dinheiro" | "cartao" | "pix" | null;
export type PrintTipo = "bar" | "caixa";
export type PrintStatus = "pendente" | "impresso";
export type BobinaSize = "80mm" | "58mm";

export interface Mesa {
  id: string;
  numero: number;
  status: MesaStatus;
  pedidoId: string | null;
  aberturaEm: number | null;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  descricao: string;
  disponivel: boolean;
}

export interface ItemPedido {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao: string;
}

export interface Pedido {
  id: string;
  numero: number;
  mesaId: string;
  mesaNumero: number;
  itens: ItemPedido[];
  status: PedidoStatus;
  subtotal: number;
  servico: number;
  total: number;
  formaPagamento: FormaPagamento;
  createdAt: number;
  fechadoEm: number | null;
}

export interface PrintJob {
  id: string;
  pedidoId: string;
  pedidoNumero: number;
  tipo: PrintTipo;
  status: PrintStatus;
  createdAt: number;
  impressoEm: number | null;
}
