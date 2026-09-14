import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navbar } from "../components/Navbar";
import { StaffGuard } from "../components/StaffGuard";
import { useDb } from "../hooks/useDb";
import { playBeep, unlockAudio, isAudioReady } from "../lib/audio";
import {
  Bell,
  ChefHat,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Flame,
  Check,
  RotateCcw,
} from "lucide-react";
import type { Pedido } from "../types";
import { formatMoney } from "../lib/receipt";
import { toast } from "sonner";

export function KDS() {
  const db = useDb();
  const prevNovosCount = useRef<number>(0);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioUnlockedState, setAudioUnlockedState] = useState(isAudioReady());

  const novos = db.getPedidosByStatus("novo");
  const preparando = db.getPedidosByStatus("preparando");
  const prontos = db.getPedidosByStatus("pronto");

  // Web Audio trigger on new incoming order
  useEffect(() => {
    if (novos.length > prevNovosCount.current) {
      if (!audioMuted) {
        playBeep("new_order");
      }
      toast.info(`Novo pedido recebido no Bar! Mesa ${novos[0]?.mesaNumero || ""}`);
    }
    prevNovosCount.current = novos.length;
  }, [novos.length, audioMuted]);

  const handleUnlockAudio = () => {
    const success = unlockAudio();
    setAudioUnlockedState(success);
    playBeep("new_order");
    toast.success("Áudio destravado para alertas do Barman!");
  };

  const handleStartPrep = (pedidoId: string) => {
    unlockAudio();
    db.atualizarStatusPedido(pedidoId, "preparando");
    toast.success("Pedido em preparo!");
  };

  const handleMarkReady = (pedidoId: string) => {
    unlockAudio();
    db.atualizarStatusPedido(pedidoId, "pronto");
    if (!audioMuted) {
      playBeep("ready");
    }
    toast.success("Pedido pronto para servir!");
  };

  const handleDeliver = (pedidoId: string) => {
    unlockAudio();
    db.atualizarStatusPedido(pedidoId, "pago");
    toast.info("Pedido finalizado/entregue!");
  };

  return (
    <StaffGuard areaName="KDS do Barman">
      <div className="min-h-screen bg-[#0e0a08] text-stone-100 pb-16">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Audio unlock notification banner if not yet triggered */}
          {!audioUnlockedState && (
            <div className="bg-gradient-to-r from-amber-600/30 to-amber-700/20 border border-amber-500/50 rounded-2xl p-3.5 mb-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                  <Volume2 size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-amber-200">Ativar Som do Barman</div>
                  <div className="text-xs text-stone-300">
                    Clique para autorizar o bipe automático da Web Audio API quando chegarem novos pedidos.
                  </div>
                </div>
              </div>

              <button
                onClick={handleUnlockAudio}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-amber-500/20 active:scale-95 transition min-h-[44px]"
              >
                Destravar Áudio
              </button>
            </div>
          )}

          {/* Top Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#241a14]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ChefHat size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-bold text-2xl text-white">KDS — Produção do Barman</h1>
                  {novos.length > 0 && (
                    <span className="flex items-center gap-1 bg-red-600 text-white font-mono text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-600/40">
                      <Bell size={12} /> {novos.length} NOVO{novos.length > 1 ? "S" : ""}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Kanban em tempo real com alerta sonoro e destaque especial de observações
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  unlockAudio();
                  playBeep("new_order");
                }}
                className="px-3 py-2 rounded-xl bg-[#1c1510] hover:bg-[#281e17] border border-[#32251c] text-stone-300 text-xs font-medium flex items-center gap-1.5 transition min-h-[44px]"
              >
                <Volume2 size={15} className="text-amber-400" />
                <span>Testar Bipe</span>
              </button>

              <button
                onClick={() => setAudioMuted(!audioMuted)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition min-h-[44px] ${
                  audioMuted
                    ? "bg-red-500/10 border-red-500/40 text-red-300"
                    : "bg-[#1c1510] border-[#32251c] text-stone-300 hover:text-white"
                }`}
              >
                {audioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{audioMuted ? "Mutado" : "Som Ativo"}</span>
              </button>
            </div>
          </div>

          {/* 3-Column Production Kanban Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {/* Column 1: Novos Pedidos */}
            <KanbanColumn
              title="Novos Pedidos"
              subtitle="Aguardando início do preparo"
              badgeCount={novos.length}
              icon={Bell}
              columnType="novos"
            >
              {novos.length === 0 ? (
                <EmptyColumnMessage text="Nenhum pedido novo no momento." />
              ) : (
                novos.map((pedido) => (
                  <OrderProductionCard
                    key={pedido.id}
                    pedido={pedido}
                    isFlashing={true}
                    actionButton={
                      <button
                        onClick={() => handleStartPrep(pedido.id)}
                        className="w-full mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition min-h-[44px]"
                      >
                        <Flame size={15} />
                        <span>Iniciar Preparo</span>
                      </button>
                    }
                  />
                ))
              )}
            </KanbanColumn>

            {/* Column 2: Preparando */}
            <KanbanColumn
              title="Em Preparo"
              subtitle="Na coqueteleira / chapa"
              badgeCount={preparando.length}
              icon={Flame}
              columnType="preparando"
            >
              {preparando.length === 0 ? (
                <EmptyColumnMessage text="Nenhum item em produção." />
              ) : (
                preparando.map((pedido) => (
                  <OrderProductionCard
                    key={pedido.id}
                    pedido={pedido}
                    actionButton={
                      <button
                        onClick={() => handleMarkReady(pedido.id)}
                        className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition min-h-[44px]"
                      >
                        <CheckCircle2 size={16} />
                        <span>Marcar como Pronto</span>
                      </button>
                    }
                  />
                ))
              )}
            </KanbanColumn>

            {/* Column 3: Prontos */}
            <KanbanColumn
              title="Prontos para Servir"
              subtitle="Aguardando retirada pelo garçom"
              badgeCount={prontos.length}
              icon={CheckCircle2}
              columnType="prontos"
            >
              {prontos.length === 0 ? (
                <EmptyColumnMessage text="Nenhum pedido aguardando entrega." />
              ) : (
                prontos.map((pedido) => (
                  <OrderProductionCard
                    key={pedido.id}
                    pedido={pedido}
                    actionButton={
                      <button
                        onClick={() => handleDeliver(pedido.id)}
                        className="w-full mt-3 bg-[#241c16] hover:bg-[#32271f] border border-[#3d2e23] text-stone-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition min-h-[44px]"
                      >
                        <Check size={15} className="text-emerald-400" />
                        <span>Concluir Entrega</span>
                      </button>
                    }
                  />
                ))
              )}
            </KanbanColumn>
          </div>
        </main>
      </div>
    </StaffGuard>
  );
}

function KanbanColumn({
  title,
  subtitle,
  badgeCount,
  icon: Icon,
  columnType,
  children,
}: {
  title: string;
  subtitle: string;
  badgeCount: number;
  icon: typeof Bell;
  columnType: "novos" | "preparando" | "prontos";
  children: ReactNode;
}) {
  const styles = {
    novos: {
      border: "border-red-500/40",
      bg: "bg-[#170e0a]",
      headerBg: "bg-red-500/10",
      iconColor: "text-red-400",
      badgeBg: "bg-red-500 text-white font-mono font-bold",
    },
    preparando: {
      border: "border-amber-500/40",
      bg: "bg-[#18110b]",
      headerBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      badgeBg: "bg-amber-500 text-stone-950 font-mono font-bold",
    },
    prontos: {
      border: "border-emerald-500/40",
      bg: "bg-[#0f1711]",
      headerBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      badgeBg: "bg-emerald-500 text-stone-950 font-mono font-bold",
    },
  }[columnType];

  return (
    <div className={`rounded-3xl border-2 ${styles.border} ${styles.bg} p-4 shadow-xl min-h-[550px] flex flex-col`}>
      <div className={`rounded-2xl p-3 mb-4 ${styles.headerBg} border border-white/5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={18} className={styles.iconColor} />
            <h2 className="font-display font-bold text-base text-white">{title}</h2>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs ${styles.badgeBg}`}>{badgeCount}</span>
        </div>
        <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="space-y-3.5 flex-1">{children}</div>
    </div>
  );
}

function OrderProductionCard({
  pedido,
  isFlashing = false,
  actionButton,
}: {
  pedido: Pedido;
  isFlashing?: boolean;
  actionButton?: ReactNode;
}) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - pedido.createdAt) / 60000));

  return (
    <div
      className={`rounded-2xl p-4 transition-all shadow-lg border relative ${
        isFlashing
          ? "bg-[#25150f] border-red-500 shadow-red-950/40 animate-flash"
          : "bg-[#1f1712] border-[#34271e] hover:border-amber-500/50"
      }`}
    >
      {/* Header: Mesa & Order number & Elapsed time */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-lg text-amber-200">
            Mesa {String(pedido.mesaNumero).padStart(2, "0")}
          </span>
          <span className="font-mono text-xs text-stone-400 bg-stone-900/60 px-1.5 py-0.5 rounded">
            #{String(pedido.numero).padStart(4, "0")}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
          <Clock size={12} />
          <span>{elapsedMinutes} min</span>
        </div>
      </div>

      {/* Items list with prominent observations */}
      <div className="space-y-2.5 my-2">
        {pedido.itens.map((item, idx) => {
          const hasObs = !!item.observacao;

          return (
            <div key={idx} className="text-xs">
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-sm bg-stone-900 px-2 py-0.5 rounded text-amber-300">
                  {item.quantidade}x
                </span>
                <span className="font-bold text-stone-100 text-sm">
                  {item.emoji} {item.nome}
                </span>
              </div>

              {/* Destaque especial de observações (Warning Badge) */}
              {hasObs && (
                <div className="mt-1.5 ml-8 bg-amber-500/20 border-l-4 border-amber-400 px-2.5 py-1 rounded text-amber-200 text-xs font-semibold flex items-start gap-1.5 shadow-sm">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="italic">{item.observacao}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {actionButton}
    </div>
  );
}

function EmptyColumnMessage({ text }: { text: string }) {
  return (
    <div className="text-center py-16 text-stone-600 text-xs">
      <div className="w-10 h-10 rounded-xl bg-stone-900/50 flex items-center justify-center mx-auto mb-2 opacity-50">
        ☕
      </div>
      <p>{text}</p>
    </div>
  );
}
