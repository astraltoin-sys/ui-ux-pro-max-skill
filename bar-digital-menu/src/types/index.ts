export type MesaStatus = "libero" | "occupato";
export type PedidoStatus = "nuovo" | "in_preparazione" | "pronto" | "pagato";
export type FormaPagamento = "contanti" | "carta" | null;
export type PrintTipo = "bar" | "cassa";
export type PrintStatus = "pendente" | "stampato";
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
  emoji: string;
  disponivel: boolean;
}

export interface ItemPedido {
  id: string;
  produtoId: string;
  nome: string;
  emoji: string;
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
