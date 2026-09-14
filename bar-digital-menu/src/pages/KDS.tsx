import { useEffect, useRef, type ReactNode } from "react";
import { Navbar } from "../components/Navbar";
import { useDb } from "../hooks/useDb";
import { playBeep } from "../lib/audio";
import { Bell, ChefHat, CheckCircle2, Clock } from "lucide-react";
import type { Pedido } from "../types";

export function KDS() {
  const db = useDb();
  const prevNovosCount = useRef(0);
  const novos = db.getPedidosByStatus("novo");
  const preparando = db.getPedidosByStatus("preparando");
  const prontos = db.getPedidosByStatus("pronto");

  useEffect(() => {
    if (novos.length > prevNovosCount.current) {
      playBeep();
    }
    prevNovosCount.current = novos.length;
  }, [novos.length]);

  return (
    <div className="min-h-screen bg-stone-900">
      <Navbar />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <ChefHat className="text-orange-500" size={28} />
          <h1 className="text-2xl font-bold text-white">KDS — Produção do Bar</h1>
          {novos.length > 0 && (
            <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm animate-flash">
              <Bell size={16} />
              {novos.length} novo{novos.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KanbanColumn title="Novos Pedidos" icon={Bell} color="red" pedidos={novos}>
            {(pedido) => (
              <button
                onClick={() => db.atualizarStatusPedido(pedido.id, "preparando")}
                className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-500"
              >
                Iniciar Preparo
              </button>
            )}
          </KanbanColumn>

          <KanbanColumn title="Preparando" icon={Clock} color="blue" pedidos={preparando}>
            {(pedido) => (
              <button
                onClick={() => db.atualizarStatusPedido(pedido.id, "pronto")}
                className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-500"
              >
                Marcar como Pronto
              </button>
            )}
          </KanbanColumn>

          <KanbanColumn title="Prontos" icon={CheckCircle2} color="green" pedidos={prontos}>
            {() => (
              <div className="w-full mt-3 text-center text-green-400 text-sm font-bold py-2">
                ✓ Aguardando retirada
              </div>
            )}
          </KanbanColumn>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  icon: Icon,
  color,
  pedidos,
  children,
}: {
  title: string;
  icon: typeof Bell;
  color: string;
  pedidos: Pedido[];
  children: (pedido: Pedido) => ReactNode;
}) {
  const colorClasses: Record<string, string> = {
    red: "border-red-500 bg-red-500/10",
    blue: "border-blue-500 bg-blue-500/10",
    green: "border-green-500 bg-green-500/10",
  };
  const iconColors: Record<string, string> = {
    red: "text-red-400",
    blue: "text-blue-400",
    green: "text-green-400",
  };

  return (
    <div className={`rounded-xl border-2 ${colorClasses[color]} p-4 min-h-[200px]`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={iconColors[color]} size={20} />
        <h2 className="font-bold text-white text-lg">{title}</h2>
        <span className="bg-stone-700 text-stone-300 px-2 py-0.5 rounded-full text-sm">{pedidos.length}</span>
      </div>
      <div className="space-y-3">
        {pedidos.length === 0 ? (
          <p className="text-stone-500 text-sm text-center py-8">Nenhum pedido</p>
        ) : (
          pedidos.map((pedido) => (
            <OrderCard key={pedido.id} pedido={pedido} isNew={color === "red"}>
              {children(pedido)}
            </OrderCard>
          ))
        )}
      </div>
    </div>
  );
}

function OrderCard({ pedido, isNew, children }: { pedido: Pedido; isNew?: boolean; children?: ReactNode }) {
  const elapsed = Math.floor((Date.now() - pedido.createdAt) / 60000);
  return (
    <div className={`bg-stone-800 rounded-xl p-4 ${isNew ? "animate-flash border-2 border-red-500" : ""}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-orange-400 font-bold">Mesa {pedido.mesaNumero}</span>
          <span className="text-stone-500 text-sm ml-2">#{pedido.numero}</span>
        </div>
        <span className="text-stone-400 text-sm">{elapsed}min</span>
      </div>
      <div className="space-y-1 mb-2">
        {pedido.itens.map((item, idx) => (
          <div key={idx} className="text-sm">
            <span className="text-white font-bold">{item.quantidade}x</span>{" "}
            <span className="text-stone-200">{item.nome}</span>
            {item.observacao && (
              <div className="text-yellow-400 text-xs italic ml-4">⚠ {item.observacao}</div>
            )}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
