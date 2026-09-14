import type {
  Mesa,
  Produto,
  Pedido,
  ItemPedido,
  PrintJob,
  PrintTipo,
  FormaPagamento,
  PedidoStatus,
} from "../types";
import { produtos as defaultProdutos } from "../data/produtos";
import { mesas as defaultMesas } from "../data/mesas";

type Listener = () => void;
export type TableName = "mesas" | "produtos" | "pedidos" | "itens" | "print_jobs";

const STORAGE_KEY = "bar_digital_menu_db_v2";
const CHANNEL_NAME = "bar_digital_menu_realtime";

export interface DatabaseState {
  mesas: Mesa[];
  produtos: Produto[];
  pedidos: Pedido[];
  itens: ItemPedido[];
  print_jobs: PrintJob[];
  pedidoCounter: number;
}

/**
 * Supabase-style query filter builder
 */
export class QueryBuilder<T> {
  private data: T[];
  private tableName: TableName;
  private db: Database;
  private filters: Array<(item: T) => boolean> = [];
  private sortField: keyof T | null = null;
  private sortAscending = true;

  constructor(tableName: TableName, db: Database, data: T[]) {
    this.tableName = tableName;
    this.db = db;
    this.data = [...data];
  }

  select(_fields = "*"): this {
    return this;
  }

  eq(field: keyof T, value: unknown): this {
    this.filters.push((item) => (item as Record<string, unknown>)[field as string] === value);
    return this;
  }

  neq(field: keyof T, value: unknown): this {
    this.filters.push((item) => (item as Record<string, unknown>)[field as string] !== value);
    return this;
  }

  order(field: keyof T, options: { ascending?: boolean } = { ascending: true }): this {
    this.sortField = field;
    this.sortAscending = options.ascending ?? true;
    return this;
  }

  on(event: string, callback: (payload: { new?: T; old?: T; eventType: string }) => void): () => void {
    return this.db.subscribeToTable(this.tableName, callback as (payload: unknown) => void);
  }

  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.get()).then(onfulfilled, onrejected);
  }

  get(): T[] {
    let result = this.data;
    for (const filter of this.filters) {
      result = result.filter(filter);
    }
    if (this.sortField) {
      const field = this.sortField;
      const asc = this.sortAscending;
      result.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return asc ? -1 : 1;
        if (valB === null || valB === undefined) return asc ? 1 : -1;
        if (valA > valB) return asc ? 1 : -1;
        return asc ? -1 : 1;
      });
    }
    return result;
  }

  async insert(recordOrRecords: Partial<T> | Partial<T>[]): Promise<{ data: T[]; error: null }> {
    const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];
    const inserted = this.db.executeInsert(this.tableName, records as unknown as Record<string, unknown>[]) as T[];
    return { data: inserted, error: null };
  }

  async update(values: Partial<T>): Promise<{ data: T[]; error: null }> {
    const updated = this.db.executeUpdate(this.tableName, this.filters as ((item: unknown) => boolean)[], values as Record<string, unknown>) as T[];
    return { data: updated, error: null };
  }

  async delete(): Promise<{ data: T[]; error: null }> {
    const deleted = this.db.executeDelete(this.tableName, this.filters as ((item: unknown) => boolean)[]) as T[];
    return { data: deleted, error: null };
  }
}

/**
 * Main In-Memory Database with Supabase-compatible API,
 * LocalStorage persistence, and BroadcastChannel real-time sync.
 */
export class Database {
  private listeners = new Set<Listener>();
  private tableListeners = new Map<TableName, Set<(payload: unknown) => void>>();
  private broadcastChannel: BroadcastChannel | null = null;
  version = 0;

  mesas: Mesa[] = [];
  produtos: Produto[] = [];
  pedidos: Pedido[] = [];
  itens: ItemPedido[] = [];
  print_jobs: PrintJob[] = [];
  pedidoCounter = 0;

  constructor() {
    this.initStorage();
    this.initRealtime();
  }

  get printJobs(): PrintJob[] {
    return this.print_jobs;
  }
  set printJobs(val: PrintJob[]) {
    this.print_jobs = val;
  }

  private initStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DatabaseState;
        this.mesas = parsed.mesas || defaultMesas.map((m) => ({ ...m }));
        this.produtos = defaultProdutos.map((p) => ({ ...p }));
        this.pedidos = parsed.pedidos || [];
        this.itens = parsed.itens || [];
        this.print_jobs = parsed.print_jobs || [];
        this.pedidoCounter = parsed.pedidoCounter || this.pedidos.length;
        return;
      }
    } catch (e) {
      console.warn("Storage load failed, using fresh state:", e);
    }

    this.mesas = defaultMesas.map((m) => ({ ...m }));
    this.produtos = defaultProdutos.map((p) => ({ ...p }));
    this.pedidos = [];
    this.itens = [];
    this.print_jobs = [];
    this.pedidoCounter = 0;
    this.persist();
  }

  private persist() {
    try {
      const state: DatabaseState = {
        mesas: this.mesas,
        produtos: this.produtos,
        pedidos: this.pedidos,
        itens: this.itens,
        print_jobs: this.print_jobs,
        pedidoCounter: this.pedidoCounter,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Storage persist error:", e);
    }
  }

  private initRealtime() {
    if (typeof window === "undefined") return;

    if ("BroadcastChannel" in window) {
      this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === "SYNC") {
          this.initStorage();
          this.notifyLocal();
        }
      };
    }

    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        this.initStorage();
        this.notifyLocal();
      }
    });
  }

  private broadcast() {
    try {
      this.persist();
      this.broadcastChannel?.postMessage({ type: "SYNC", timestamp: Date.now() });
    } catch (_) {}
    this.notifyLocal();
  }

  private notifyLocal() {
    this.version++;
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    });
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  subscribeToTable(table: TableName, callback: (payload: unknown) => void): () => void {
    if (!this.tableListeners.has(table)) {
      this.tableListeners.set(table, new Set());
    }
    this.tableListeners.get(table)!.add(callback);
    return () => {
      this.tableListeners.get(table)?.delete(callback);
    };
  }

  /**
   * Supabase query interface: db.from('pedidos').select('*').eq(...)
   */
  from(tableName: "mesas"): QueryBuilder<Mesa>;
  from(tableName: "produtos"): QueryBuilder<Produto>;
  from(tableName: "pedidos"): QueryBuilder<Pedido>;
  from(tableName: "itens"): QueryBuilder<ItemPedido>;
  from(tableName: "print_jobs"): QueryBuilder<PrintJob>;
  from(tableName: TableName): QueryBuilder<any> {
    let source: unknown[] = [];
    if (tableName === "mesas") source = this.mesas;
    else if (tableName === "produtos") source = this.produtos;
    else if (tableName === "pedidos") source = this.pedidos;
    else if (tableName === "itens") source = this.itens;
    else if (tableName === "print_jobs") source = this.print_jobs;

    return new QueryBuilder(tableName, this, source);
  }

  /**
   * Supabase-style channel: db.channel('...').on('postgres_changes', ...).subscribe()
   */
  channel(_name: string) {
    return {
      on: (
        _event: string,
        filter: { table: TableName; [key: string]: unknown },
        callback: (payload: { new: unknown; old: unknown; eventType: string }) => void
      ) => {
        const unsubscribe = this.subscribeToTable(filter.table, callback as (payload: unknown) => void);
        return {
          subscribe: () => ({ unsubscribe }),
        };
      },
    };
  }

  executeInsert(tableName: TableName, records: Record<string, unknown>[]): Record<string, unknown>[] {
    const now = Date.now();
    const inserted: Record<string, unknown>[] = [];

    for (const rec of records) {
      const item = { ...rec, id: rec.id || `${tableName.substring(0, 3)}-${now}-${Math.random().toString(36).substr(2, 5)}` };
      if (tableName === "mesas") this.mesas.push(item as unknown as Mesa);
      else if (tableName === "produtos") this.produtos.push(item as unknown as Produto);
      else if (tableName === "pedidos") this.pedidos.unshift(item as unknown as Pedido);
      else if (tableName === "itens") this.itens.push(item as unknown as ItemPedido);
      else if (tableName === "print_jobs") this.print_jobs.unshift(item as unknown as PrintJob);
      inserted.push(item);
    }

    this.broadcast();
    return inserted;
  }

  executeUpdate(
    tableName: TableName,
    filters: Array<(item: unknown) => boolean>,
    values: Record<string, unknown>
  ): unknown[] {
    let source: unknown[] = [];
    if (tableName === "mesas") source = this.mesas;
    else if (tableName === "produtos") source = this.produtos;
    else if (tableName === "pedidos") source = this.pedidos;
    else if (tableName === "itens") source = this.itens;
    else if (tableName === "print_jobs") source = this.print_jobs;

    const updated: unknown[] = [];
    for (let i = 0; i < source.length; i++) {
      const item = source[i];
      const match = filters.every((fn) => fn(item));
      if (match) {
        Object.assign(item as object, values);
        updated.push(item);
      }
    }

    this.broadcast();
    return updated;
  }

  executeDelete(
    tableName: TableName,
    filters: Array<(item: unknown) => boolean>
  ): unknown[] {
    const deleted: unknown[] = [];

    if (tableName === "mesas") {
      this.mesas = this.mesas.filter((item) => {
        const match = filters.every((fn) => fn(item));
        if (match) deleted.push(item);
        return !match;
      });
    } else if (tableName === "pedidos") {
      this.pedidos = this.pedidos.filter((item) => {
        const match = filters.every((fn) => fn(item));
        if (match) deleted.push(item);
        return !match;
      });
    } else if (tableName === "itens") {
      this.itens = this.itens.filter((item) => {
        const match = filters.every((fn) => fn(item));
        if (match) deleted.push(item);
        return !match;
      });
    } else if (tableName === "print_jobs") {
      this.print_jobs = this.print_jobs.filter((item) => {
        const match = filters.every((fn) => fn(item));
        if (match) deleted.push(item);
        return !match;
      });
    }

    this.broadcast();
    return deleted;
  }

  criarPedido(mesaId: string, itens: ItemPedido[]): Pedido {
    const mesa = this.mesas.find((m) => m.id === mesaId);
    if (!mesa) throw new Error("Mesa não encontrada");

    this.pedidoCounter++;
    const now = Date.now();
    const subtotal = itens.reduce((sum, i) => sum + i.preco * i.quantidade, 0);
    const servico = Math.round(subtotal * 0.1 * 100) / 100;
    const total = subtotal + servico;

    const pedido: Pedido = {
      id: `ped-${now}-${Math.floor(Math.random() * 1000)}`,
      numero: this.pedidoCounter,
      mesaId,
      mesaNumero: mesa.numero,
      itens: itens.map((i, idx) => ({ ...i, id: i.id || `item-${now}-${idx}`, pedidoId: `ped-${now}` })),
      status: "novo",
      subtotal,
      servico,
      total,
      formaPagamento: null,
      createdAt: now,
      fechadoEm: null,
    };

    for (const item of pedido.itens) {
      this.itens.push(item);
    }

    this.pedidos.unshift(pedido);

    mesa.status = "ocupada";
    mesa.pedidoId = pedido.id;
    if (!mesa.aberturaEm) {
      mesa.aberturaEm = now;
    }

    const barJob: PrintJob = {
      id: `print-${now}-bar-${Math.floor(Math.random() * 1000)}`,
      pedidoId: pedido.id,
      pedidoNumero: pedido.numero,
      tipo: "bar",
      status: "pendente",
      createdAt: now,
      impressoEm: null,
    };

    const caixaJob: PrintJob = {
      id: `print-${now}-caixa-${Math.floor(Math.random() * 1000)}`,
      pedidoId: pedido.id,
      pedidoNumero: pedido.numero,
      tipo: "caixa",
      status: "pendente",
      createdAt: now + 1,
      impressoEm: null,
    };

    this.print_jobs.unshift(barJob, caixaJob);
    this.broadcast();
    return pedido;
  }

  atualizarStatusPedido(pedidoId: string, status: PedidoStatus) {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    pedido.status = status;
    if (status === "pago") {
      pedido.fechadoEm = Date.now();
      const mesa = this.mesas.find((m) => m.id === pedido.mesaId);
      if (mesa) {
        mesa.status = "livre";
        mesa.pedidoId = null;
        mesa.aberturaEm = null;
      }
    }
    this.broadcast();
  }

  fecharConta(pedidoId: string, formaPagamento: FormaPagamento) {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    pedido.formaPagamento = formaPagamento;
    pedido.status = "pago";
    pedido.fechadoEm = Date.now();
    const mesa = this.mesas.find((m) => m.id === pedido.mesaId);
    if (mesa) {
      mesa.status = "livre";
      mesa.pedidoId = null;
      mesa.aberturaEm = null;
    }
    this.broadcast();
  }

  marcarImpresso(printJobId: string) {
    const job = this.print_jobs.find((j) => j.id === printJobId);
    if (job) {
      job.status = "impresso";
      job.impressoEm = Date.now();
      this.broadcast();
    }
  }

  reimprimir(pedidoId: string, tipo: PrintTipo) {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    const now = Date.now();
    const job: PrintJob = {
      id: `print-${now}-${tipo}-reprint-${Math.floor(Math.random() * 1000)}`,
      pedidoId,
      pedidoNumero: pedido.numero,
      tipo,
      status: "pendente",
      createdAt: now,
      impressoEm: null,
    };
    this.print_jobs.unshift(job);
    this.broadcast();
  }

  getPedidosByStatus(status: PedidoStatus): Pedido[] {
    return this.pedidos.filter((p) => p.status === status);
  }

  getPrintJobsPendentes(): PrintJob[] {
    return this.print_jobs.filter((j) => j.status === "pendente");
  }

  getPedidoById(id: string): Pedido | undefined {
    return this.pedidos.find((p) => p.id === id);
  }

  getPedidosAttivi(): Pedido[] {
    return this.pedidos.filter((p) => p.status !== "pago");
  }

  resetarDados() {
    this.mesas = defaultMesas.map((m) => ({ ...m }));
    this.produtos = defaultProdutos.map((p) => ({ ...p }));
    this.pedidos = [];
    this.itens = [];
    this.print_jobs = [];
    this.pedidoCounter = 0;
    this.broadcast();
  }
}

export const db = new Database();
