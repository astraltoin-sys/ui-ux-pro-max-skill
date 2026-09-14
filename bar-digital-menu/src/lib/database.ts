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

  addProduto(produto: Omit<Produto, "id" | "disponivel">): Produto {
    const newProduto: Produto = {
      ...produto,
      id: `p${Date.now()}`,
      disponivel: true,
    };
    this.produtos.push(newProduto);
    this.notify();
    return newProduto;
  }

  removeProduto(id: string) {
    this.produtos = this.produtos.filter((p) => p.id !== id);
    this.notify();
  }

  criarPedido(mesaId: string, itens: ItemPedido[]): Pedido {
    const mesa = this.mesas.find((m) => m.id === mesaId);
    if (!mesa) throw new Error("Tavolo non trovato");

    this.pedidoCounter++;
    const now = Date.now();
    const total = itens.reduce((sum, i) => sum + i.preco * i.quantidade, 0);

    const pedido: Pedido = {
      id: `ped-${now}`,
      numero: this.pedidoCounter,
      mesaId,
      mesaNumero: mesa.numero,
      itens,
      status: "nuovo",
      total,
      formaPagamento: null,
      createdAt: now,
      fechadoEm: null,
    };

    this.pedidos.unshift(pedido);
    mesa.status = "occupato";
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
    const cassaJob: PrintJob = {
      id: `print-${now}-cassa`,
      pedidoId: pedido.id,
      pedidoNumero: pedido.numero,
      tipo: "cassa",
      status: "pendente",
      createdAt: now,
      impressoEm: null,
    };
    this.printJobs.unshift(barJob, cassaJob);
    this.notify();
    return pedido;
  }

  atualizarStatusPedido(pedidoId: string, status: PedidoStatus) {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    pedido.status = status;
    if (status === "pagato") {
      pedido.fechadoEm = Date.now();
      const mesa = this.mesas.find((m) => m.id === pedido.mesaId);
      if (mesa) {
        mesa.status = "libero";
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
    pedido.status = "pagato";
    pedido.fechadoEm = Date.now();
    const mesa = this.mesas.find((m) => m.id === pedido.mesaId);
    if (mesa) {
      mesa.status = "libero";
      mesa.pedidoId = null;
      mesa.aberturaEm = null;
    }
    this.notify();
  }

  marcarImpresso(printJobId: string) {
    const job = this.printJobs.find((j) => j.id === printJobId);
    if (job) {
      job.status = "stampato";
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

  getPedidosAttivi(): Pedido[] {
    return this.pedidos.filter((p) => p.status !== "pagato");
  }
}

export const db = new Database();
