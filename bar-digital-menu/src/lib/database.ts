import type { Mesa, Produto, Pedido, ItemPedido, PrintJob, PrintTipo, FormaPagamento, PedidoStatus } from "../types";
import { produtos as produtosData } from "../data/produtos";
import { mesas as mesasData } from "../data/mesas";

type Listener = () => void;

class Database {
  private listeners = new Set<Listener>();
  version = 0;

  mesas: Mesa[] = [];
  produtos: Produto[] = [];
  pedidos: Pedido[] = [];
  printJobs: PrintJob[] = [];
  private pedidoCounter = 0;

  constructor() {
    this.mesas = mesasData.map((m) => ({ ...m }));
    this.produtos = produtosData.map((p) => ({ ...p }));
  }

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private notify() {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  criarPedido(mesaId: string, itens: ItemPedido[]): Pedido {
    const mesa = this.mesas.find((m) => m.id === mesaId);
    if (!mesa) throw new Error("Mesa não encontrada");

    this.pedidoCounter++;
    const now = Date.now();
    const subtotal = itens.reduce((sum, i) => sum + i.preco * i.quantidade, 0);
    const servico = subtotal * 0.1;
    const total = subtotal + servico;

    const pedido: Pedido = {
      id: `ped-${now}`,
      numero: this.pedidoCounter,
      mesaId,
      mesaNumero: mesa.numero,
      itens,
      status: "novo",
      subtotal,
      servico,
      total,
      formaPagamento: null,
      createdAt: now,
      fechadoEm: null,
    };

    this.pedidos.unshift(pedido);

    mesa.status = "ocupada";
    mesa.pedidoId = pedido.id;
    mesa.aberturaEm = now;

    const barJob: PrintJob = {
      id: `print-${now}-bar`,
      pedidoId: pedido.id,
      pedidoNumero: pedido.numero,
      tipo: "bar",
      status: "pendente",
      createdAt: now,
      impressoEm: null,
    };
    const caixaJob: PrintJob = {
      id: `print-${now}-caixa`,
      pedidoId: pedido.id,
      pedidoNumero: pedido.numero,
      tipo: "caixa",
      status: "pendente",
      createdAt: now,
      impressoEm: null,
    };
    this.printJobs.unshift(barJob, caixaJob);

    this.notify();
    return pedido;
  }

  atualizarStatusPedido(pedidoId: string, status: PedidoStatus) {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    pedido.status = status;
    if (status === "fechado") {
      pedido.fechadoEm = Date.now();
      const mesa = this.mesas.find((m) => m.id === pedido.mesaId);
      if (mesa) {
        mesa.status = "livre";
        mesa.pedidoId = null;
        mesa.aberturaEm = null;
      }
    }
    this.notify();
  }

  fecharConta(pedidoId: string, formaPagamento: FormaPagamento) {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    pedido.formaPagamento = formaPagamento;
    pedido.status = "fechado";
    pedido.fechadoEm = Date.now();
    const mesa = this.mesas.find((m) => m.id === pedido.mesaId);
    if (mesa) {
      mesa.status = "livre";
      mesa.pedidoId = null;
      mesa.aberturaEm = null;
    }
    this.notify();
  }

  marcarImpresso(printJobId: string) {
    const job = this.printJobs.find((j) => j.id === printJobId);
    if (job) {
      job.status = "impresso";
      job.impressoEm = Date.now();
      this.notify();
    }
  }

  reimprimir(pedidoId: string, tipo: PrintTipo) {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    const now = Date.now();
    const job: PrintJob = {
      id: `print-${now}-${tipo}-reprint`,
      pedidoId,
      pedidoNumero: pedido.numero,
      tipo,
      status: "pendente",
      createdAt: now,
      impressoEm: null,
    };
    this.printJobs.unshift(job);
    this.notify();
  }

  getPedidosByStatus(status: PedidoStatus): Pedido[] {
    return this.pedidos.filter((p) => p.status === status);
  }

  getPrintJobsPendentes(): PrintJob[] {
    return this.printJobs.filter((j) => j.status === "pendente");
  }

  getPedidoById(id: string): Pedido | undefined {
    return this.pedidos.find((p) => p.id === id);
  }
}

export const db = new Database();
