import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Home, ChefHat, Bell, Volume2, VolumeX, Clock, CheckCircle2 } from "lucide-react";
import { useDb } from "../hooks/useDb";
import { playBeep } from "../lib/audio";
import type { Pedido } from "../types";

export function Bar() {
  const db = useDb();
  const [soundOn, setSoundOn] = useState(true);
  const prevNovos = useRef(0);
  const novos = db.getPedidosByStatus("nuovo");
  const inPrep = db.getPedidosByStatus("in_preparazione");
  const pronti = db.getPedidosByStatus("pronto");

  useEffect(() => {
    if (soundOn && novos.length > prevNovos.current) playBeep();
    prevNovos.current = novos.length;
  }, [novos.length, soundOn]);

  const allOrders = [...novos, ...inPrep, ...pronti];

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="bg-stone-900 border-b border-stone-800 p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-stone-400 hover:text-amber-400"><Home size={20} /></Link>
            <ChefHat className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-lg font-display font-bold">Bar / Cucina</h1>
              <p className="text-xs text-stone-500">Pannello di Produzione</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => playBeep()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-700 text-stone-400 text-sm hover:bg-stone-800">
              <Bell size={16} /> Test
            </button>
            <button onClick={() => setSoundOn(!soundOn)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${soundOn ? "bg-amber-500 text-stone-950" : "border border-stone-700 text-stone-400"}`}>
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />} {soundOn ? "Suono attivo" : "Suono off"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {allOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <ChefHat className="w-16 h-16 text-stone-700 mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Nessun ordine in coda</h2>
            <p className="text-stone-500">Nuovi ordini appariranno qui con allarme sonoro</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KanbanCol title="Nuovi" icon={Bell} color="red" pedidos={novos}>
              {(p) => <button onClick={() => db.atualizarStatusPedido(p.id, "in_preparazione")} className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-500">Inizia Preparazione</button>}
            </KanbanCol>
            <KanbanCol title="In Preparazione" icon={Clock} color="blue" pedidos={inPrep}>
              {(p) => <button onClick={() => db.atualizarStatusPedido(p.id, "pronto")} className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-500">Pronto</button>}
            </KanbanCol>
            <KanbanCol title="Pronti" icon={CheckCircle2} color="green" pedidos={pronti}>
              {() => <div className="w-full mt-3 text-center text-green-400 text-sm font-bold py-2">✓ Pronto per il ritiro</div>}
            </KanbanCol>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCol({ title, icon: Icon, color, pedidos, children }: { title: string; icon: typeof Bell; color: string; pedidos: Pedido[]; children: (p: Pedido) => ReactNode }) {
  const borders: Record<string, string> = { red: "border-red-500/50", blue: "border-blue-500/50", green: "border-green-500/50" };
  const icons: Record<string, string> = { red: "text-red-400", blue: "text-blue-400", green: "text-green-400" };
  return (
    <div className={`rounded-xl border-2 ${borders[color]} p-4 min-h-[200px]`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`${icons[color]} w-5 h-5`} />
        <h2 className="font-display font-bold text-lg">{title}</h2>
        <span className="bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full text-sm">{pedidos.length}</span>
      </div>
      <div className="space-y-3">
        {pedidos.length === 0 ? (
          <p className="text-stone-600 text-sm text-center py-8">Nessun ordine</p>
        ) : (
          pedidos.map((p) => (
            <div key={p.id} className={`bg-stone-900 rounded-xl p-4 ${color === "red" ? "animate-flash border border-red-500/50" : ""}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-amber-400 font-bold">Tavolo {p.mesaNumero}</span>
                <span className="text-stone-500 text-sm">#{String(p.numero).padStart(5, "0")}</span>
              </div>
              <div className="space-y-1 mb-2">
                {p.itens.map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-bold">{item.quantidade}x</span> <span>{item.emoji} {item.nome}</span>
                    {item.observacao && <div className="text-yellow-400 text-xs italic ml-4">⚠ {item.observacao}</div>}
                  </div>
                ))}
              </div>
              {children(p)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
