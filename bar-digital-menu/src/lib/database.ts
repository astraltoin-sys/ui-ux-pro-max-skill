import { MESAS, PRODUTOS, CONFIG_PADRAO } from '@/data/seed';
import type {
  ConfiguracaoBar,
  ItemPedido,
  Mesa,
  Pedido,
  PrintJob,
  Produto,
} from '@/types';

/**
 * ---------------------------------------------------------------------------
 * Camada de dados (mock)
 * ---------------------------------------------------------------------------
 * Esta classe imita a superficie publica do client JS do Supabase que as telas
 * consomem:
 *
 *   await db.from('pedidos').select().eq('status', 'novo').order('criado_em')
 *   await db.from('pedidos').insert({ ... })
 *   await db.from('pedidos').update({ status: 'pronto' }).eq('id', id)
 *   db.on('pedidos', (event) => ...)   // realtime
 *
 * Para usar o Supabase de verdade, substitua o corpo destes metodos por
 * chamadas ao client (`supabase.from(...)`, `supabase.channel(...)`) — nenhuma
 * tela precisa mudar. Ver README.md, secao "Integracao com Supabase".
 *
 * Persistencia: localStorage + BroadcastChannel, entao abrir o cardapio em uma
 * aba e o KDS/PDV em outra sincroniza de verdade (mesma maquina). Em producao
 * isso e substituido pelo Realtime do Supabase, que tambem funciona entre
 * dispositivos diferentes.
 */

export type TableName = 'mesas' | 'produtos' | 'pedidos' | 'itens' | 'print_jobs' | 'config';

export interface Schema {
  mesas: Mesa;
  produtos: Produto;
  pedidos: Pedido;
  itens: ItemPedido;
  print_jobs: PrintJob;
  config: ConfiguracaoBar & { id: string };
}

export type ChangeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | 'RESET';

export interface ChangeEvent<T = unknown> {
  table: TableName;
  eventType: ChangeEventType;
  new: T | null;
  old: T | null;
  /** Timestamp do evento (ISO). */
  at: string;
}

const STORAGE_KEY = 'bar-digital-menu:db:v1';
const CHANNEL_NAME = 'bar-digital-menu:realtime';

type Row = Record<string, unknown> & { id?: string };

function uid(prefix = 'id'): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return `${prefix}_${c.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function seedState(): Record<TableName, Row[]> {
  return {
    mesas: MESAS.map((m) => ({ ...m })) as unknown as Row[],
    produtos: PRODUTOS.map((p) => ({ ...p })) as unknown as Row[],
    pedidos: [],
    itens: [],
    print_jobs: [],
    config: [{ id: 'config-1', ...CONFIG_PADRAO }] as unknown as Row[],
  };
}

type Listener = (event: ChangeEvent) => void;

class Query<T> implements PromiseLike<{ data: T[] | T | null; error: Error | null }> {
  private filters: Array<[string, unknown]> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private singleResult = false;
  private maybeSingleResult = false;

  constructor(
    private db: Database,
    private table: TableName,
    private op: 'select' | 'insert' | 'update' | 'delete',
    private payload?: Partial<T> | Partial<T>[],
  ) {}

  eq(column: string, value: unknown): this {
    this.filters.push([column, value]);
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: opts?.ascending ?? true };
    return this;
  }

  limit(n: number): this {
    this.limitCount = n;
    return this;
  }

  single(): this {
    this.singleResult = true;
    return this;
  }

  maybeSingle(): this {
    this.maybeSingleResult = true;
    return this;
  }

  then<R1 = { data: T[] | T | null; error: Error | null }, R2 = never>(
    onfulfilled?: ((value: { data: T[] | T | null; error: Error | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: T[] | T | null; error: Error | null }> {
    const rows = this.db._read<T>(this.table);
    let result: T[];

    if (this.op === 'select') {
      result = rows.filter((row) => this.filters.every(([c, v]) => (row as unknown as Row)[c] === v));
      if (this.orderBy) {
        const { column, ascending } = this.orderBy;
        result = [...result].sort((a, b) => {
          const av = (a as unknown as Row)[column];
          const bv = (b as unknown as Row)[column];
          if (av === bv) return 0;
          const cmp = (av ?? '') > (bv ?? '') ? 1 : -1;
          return ascending ? cmp : -cmp;
        });
      }
      if (this.limitCount != null) result = result.slice(0, this.limitCount);
    } else if (this.op === 'insert') {
      const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload ?? {}]) as Partial<T>[];
      const inserted = incoming.map((partial) => {
        const parcial = partial as unknown as Row;
        const row = { ...parcial, id: parcial.id ?? uid(this.table.slice(0, 3)) } as unknown as T;
        rows.push(row);
        this.db._emit(this.table, 'INSERT', row, null);
        return row;
      });
      result = inserted;
    } else if (this.op === 'update') {
      const target = rows.filter((row) => this.filters.every(([c, v]) => (row as unknown as Row)[c] === v));
      const patch = (this.payload ?? {}) as Row;
      const updated: T[] = [];
      target.forEach((row) => {
        const before = { ...row } as T;
        Object.assign(row as unknown as Row, patch);
        updated.push({ ...row } as T);
        this.db._emit(this.table, 'UPDATE', { ...row } as T, before);
      });
      result = updated;
    } else {
      const keep: T[] = [];
      rows.forEach((row) => {
        const match = this.filters.every(([c, v]) => (row as unknown as Row)[c] === v);
        if (match) this.db._emit(this.table, 'DELETE', null, { ...row } as T);
        else keep.push(row);
      });
      this.db._write(this.table, keep as Row[]);
      result = keep;
    }

    if (this.op !== 'select' && this.op !== 'delete') this.db._write(this.table, rows as Row[]);
    if (this.op === 'delete') this.db._persist();
    else this.db._persist();

    if (this.maybeSingleResult) return { data: result[0] ?? null, error: null };
    if (this.singleResult) {
      if (!result[0]) return { data: null, error: new Error(`Nenhum registro encontrado em "${this.table}"`) };
      return { data: result[0], error: null };
    }
    return { data: result, error: null };
  }
}

export class Database {
  private state: Record<TableName, Row[]> = seedState();
  private listeners = new Set<Listener>();
  private channel: BroadcastChannel | null = null;
  /** Desliga a propagacao para outras abas (usado ao aplicar eventos remotos). */
  private applyingRemote = false;

  constructor() {
    this.load();
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev: MessageEvent) => {
        const data = ev.data as { type: 'invalidate'; event?: ChangeEvent } | null;
        if (!data || data.type !== 'invalidate') return;
        this.applyingRemote = true;
        this.load();
        this.applyingRemote = false;
        if (data.event) this.listeners.forEach((cb) => cb(data.event as ChangeEvent));
        else this.listeners.forEach((cb) => cb({ table: 'pedidos', eventType: 'RESET', new: null, old: null, at: new Date().toISOString() }));
      };
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (ev) => {
        if (ev.key !== STORAGE_KEY) return;
        this.load();
        this.listeners.forEach((cb) =>
          cb({ table: 'pedidos', eventType: 'RESET', new: null, old: null, at: new Date().toISOString() }),
        );
      });
    }
  }

  // -------------------------------------------------------------------------
  // API publica (espelha o client do Supabase)
  // -------------------------------------------------------------------------

  from<T = Row>(table: TableName) {
    return {
      select: () => new Query<T>(this, table, 'select'),
      insert: (payload: Partial<T> | Partial<T>[]) => new Query<T>(this, table, 'insert', payload),
      update: (payload: Partial<T>) => new Query<T>(this, table, 'update', payload),
      delete: () => new Query<T>(this, table, 'delete'),
    };
  }

  /** Inscreve-se em mudancas de uma tabela (equivalente ao Realtime). */
  on(table: TableName | '*', cb: Listener): () => void {
    const wrapped: Listener = (event) => {
      if (table === '*' || event.table === table) cb(event);
    };
    this.listeners.add(wrapped);
    return () => this.listeners.delete(wrapped);
  }

  /** Limpa os dados de operacao (pedidos, itens e fila) e volta ao estado inicial. */
  async reset(): Promise<void> {
    const config = this.state.config;
    this.state = { ...seedState(), config };
    this._persist();
    this.listeners.forEach((cb) =>
      cb({ table: 'pedidos', eventType: 'RESET', new: null, old: null, at: new Date().toISOString() }),
    );
  }

  /** Remove pedidos antigos/encerrados e a fila de impressao (demo). */
  async limparEncerrados(): Promise<void> {
    const encerrados = this.state.pedidos.filter((p) => p.status === 'pago' || p.status === 'cancelado');
    const ids = new Set(encerrados.map((p) => p.id as string));
    this.state.pedidos = this.state.pedidos.filter((p) => !ids.has(p.id as string));
    this.state.itens = this.state.itens.filter((i) => !ids.has(i.pedido_id as string));
    this.state.print_jobs = this.state.print_jobs.filter((j) => !ids.has(j.pedido_id as string));
    this.state.mesas = this.state.mesas.map((m) => ({ ...m, status: 'livre', aberta_em: null, comanda_atual: null }));
    this._persist();
    this.listeners.forEach((cb) =>
      cb({ table: 'pedidos', eventType: 'RESET', new: null, old: null, at: new Date().toISOString() }),
    );
  }

  // -------------------------------------------------------------------------
  // Interno
  // -------------------------------------------------------------------------

  _read<T>(table: TableName): T[] {
    return (this.state[table] ?? []) as unknown as T[];
  }

  _write(table: TableName, rows: Row[]): void {
    this.state[table] = rows;
  }

  _emit(table: TableName, eventType: ChangeEventType, newRow: unknown, oldRow: unknown): void {
    const event: ChangeEvent = { table, eventType, new: newRow, old: oldRow, at: new Date().toISOString() };
    this.listeners.forEach((cb) => cb(event));
    if (!this.applyingRemote && this.channel) {
      this.channel.postMessage({ type: 'invalidate', event });
    }
  }

  _persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* modo privado / cota cheia: segue apenas em memoria */
    }
  }

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<TableName, Row[]>>;
      this.state = { ...seedState(), ...parsed };
    } catch {
      this.state = seedState();
    }
  }
}

export const db = new Database();
