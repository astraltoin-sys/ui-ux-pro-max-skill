import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Smartphone,
  Printer,
  CreditCard,
  ChefHat,
  QrCode,
  Minus,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
  Volume2,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "../components/QRCode";
import { useDb } from "../hooks/useDb";
import { formatMoney } from "../lib/receipt";
import { toast } from "sonner";
import { unlockAudio } from "../lib/audio";
import { isStaffAuthenticated } from "../lib/auth";

export function Home() {
  const [tableNumber, setTableNumber] = useState(1);
  const db = useDb();
  const navigate = useNavigate();

  const qrUrl = `${window.location.origin}/cardapio/${tableNumber}`;

  const staffModules = [
    {
      to: "/caixa",
      title: "Painel do Caixa (PDV)",
      badge: "RESTREITO • SENHA 1234",
      icon: CreditCard,
      accent: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-400",
      desc: "Mapa de 12 mesas com timer, fechamento de conta (Dinheiro, Cartão, Pix), histórico e reimpressão térmica.",
      actionText: "Acessar Caixa",
    },
    {
      to: "/bar",
      title: "KDS do Barman",
      badge: "RESTREITO • SENHA 1234",
      icon: ChefHat,
      accent: "from-red-500/20 to-red-600/10 border-red-500/40 text-red-400",
      desc: "Kanban Novos/Preparando/Prontos, bipe sonoro Web Audio, alerta visual piscante e observações em destaque.",
      actionText: "Acessar KDS",
    },
    {
      to: "/impressao",
      title: "Estação de Impressão",
      badge: "RESTREITO • SENHA 1234",
      icon: Printer,
      accent: "from-purple-500/20 to-purple-600/10 border-purple-500/40 text-purple-400",
      desc: "Fila FIFO, bobina 80/58mm com serrilha, auto-print direto, exportação .bin e inspetor de bytes ESC/POS.",
      actionText: "Acessar Impressoras",
    },
  ];

  const steps = [
    {
      num: "01",
      icon: QrCode,
      title: "1. QR Code na Mesa",
      desc: "O cliente escaneia o código colado na mesa através do próprio celular.",
    },
    {
      num: "02",
      icon: Smartphone,
      title: "2. Cardápio do Cliente",
      desc: "Cardápio 100% isolado, sem acesso à gestão, com pedidos, chips de observações e carrinho.",
    },
    {
      num: "03",
      icon: Printer,
      title: "3. Impressão Dupla",
      desc: "A comanda imprime no Bar para preparo e no Caixa para conferência de salão.",
    },
    {
      num: "04",
      icon: ChefHat,
      title: "4. Barman & Entrega",
      desc: "O barman recebe com alerta sonoro, o garçom entrega e o caixa liquida a conta.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#120e0b] text-stone-100 selection:bg-amber-500 selection:text-stone-950">
      {/* Top Bar Banner */}
      <div className="border-b border-[#2d241e] bg-[#1a1410] px-4 py-2 text-xs font-mono text-stone-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-stone-300 font-semibold">SISTEMA BAR DIGITAL PRO</span>
          <span className="hidden sm:inline text-stone-500">• Impressão ESC/POS Real CP850/CP860</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>{db.mesas.filter((m) => m.status === "ocupada").length} mesas ativas</span>
          <span>{db.getPrintJobsPendentes().length} impressões na fila</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-[#2d241e]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/15 via-[#18120e]/60 to-[#120e0b] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold mb-6">
            <Sparkles size={14} className="text-amber-400" />
            <span>Cardápio Mobile + Impressão Dupla + PDV + KDS</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl text-white leading-[1.1] tracking-tight mb-6 max-w-4xl">
            O pedido parte da <span className="text-amber-400">mesa do cliente</span> e imprime no{" "}
            <span className="text-amber-400">Bar & Caixa</span>
          </h1>

          <p className="text-stone-300 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed mb-8">
            Sistema completo para bares e restaurantes gastronômicos. Cardápio digital exclusivo para o cliente,
            impressão simultânea térmica com ESC/POS real, KDS com bipe sonoro Web Audio e mapa de mesas no Caixa.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/cardapio/${tableNumber}`}
              onClick={unlockAudio}
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold px-6 py-3.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition min-h-[48px]"
            >
              <Smartphone size={18} />
              <span>Abrir Cardápio do Cliente (Mesa {tableNumber})</span>
            </Link>

            <Link
              to="/caixa"
              onClick={unlockAudio}
              className="bg-[#241c16] hover:bg-[#30261e] border border-[#3d2e24] text-stone-200 font-bold px-6 py-3.5 rounded-2xl flex items-center gap-2 active:scale-95 transition min-h-[48px]"
            >
              <Lock size={16} className="text-amber-400" />
              <span>Painel de Gestão (Equipe)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* QR Code Interactive Studio */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 relative z-20 mb-16">
        <div className="bg-[#1a1410] border border-[#2d241e] rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left selector */}
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">
                <QrCode size={16} />
                <span>Simulador de QR Code de Mesa</span>
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mb-3">
                QR Code para a Mesa do Cliente
              </h2>
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed mb-6">
                Ao apontar a câmera, o cliente cai estritamente no cardápio de sua mesa
                (<span className="font-mono text-amber-300">/cardapio/{tableNumber}</span>). O cliente tem acesso
                somente a pedidos e acompanhamento, <strong>sem nenhum acesso à gestão ou caixa</strong>.
              </p>

              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wide mb-2">
                Selecione o Número da Mesa
              </label>

              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setTableNumber(Math.max(1, tableNumber - 1))}
                  className="w-12 h-12 bg-[#231b14] hover:bg-[#2f241c] border border-[#3a2f26] rounded-xl flex items-center justify-center font-bold text-stone-200 transition min-h-[44px] min-w-[44px]"
                  aria-label="Diminuir Mesa"
                >
                  <Minus size={18} />
                </button>

                <div className="flex-1 bg-[#120e0b] border border-[#30251e] rounded-xl py-2 px-4 text-center">
                  <div className="font-mono font-extrabold text-2xl text-amber-300 tabular-nums">
                    MESA {String(tableNumber).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono">
                    {db.mesas.find((m) => m.numero === tableNumber)?.status === "ocupada"
                      ? "● Mesa com conta aberta"
                      : "○ Mesa disponível"}
                  </div>
                </div>

                <button
                  onClick={() => setTableNumber(Math.min(12, tableNumber + 1))}
                  className="w-12 h-12 bg-[#231b14] hover:bg-[#2f241c] border border-[#3a2f26] rounded-xl flex items-center justify-center font-bold text-stone-200 transition min-h-[44px] min-w-[44px]"
                  aria-label="Aumentar Mesa"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  to={`/cardapio/${tableNumber}`}
                  onClick={unlockAudio}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-3 rounded-xl text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition min-h-[44px]"
                >
                  <span>Abrir Cardápio da Mesa {tableNumber}</span>
                  <ArrowRight size={16} />
                </Link>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrUrl);
                    toast.success("Link do QR Code copiado para a área de transferência!");
                  }}
                  className="inline-flex items-center gap-2 bg-[#231b14] hover:bg-[#2f241c] border border-[#3a2f26] text-stone-300 font-bold px-4 py-3 rounded-xl text-xs transition min-h-[44px]"
                >
                  <span>Copiar Link do QR</span>
                </button>
              </div>
            </div>

            {/* Right QR Visual */}
            <div className="flex flex-col items-center justify-center bg-[#140e0a] border border-[#2d241e] rounded-2xl p-6 sm:p-8">
              <div className="bg-white p-5 rounded-2xl shadow-2xl flex flex-col items-center">
                <QRCodeSVG value={qrUrl} size={190} />
                <div className="text-center mt-3 pt-2 border-t border-stone-200 w-full">
                  <div className="font-display font-extrabold text-base text-stone-950 tracking-wider">
                    BAR DIGITAL
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-700">
                    MESA {String(tableNumber).padStart(2, "0")}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-stone-500 mt-4 text-center">
                Aponte a câmera para simular a visão do cliente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Restricted Management / Staff Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase tracking-wider mb-1 font-bold">
              <ShieldCheck size={16} />
              <span>Acesso Restrito à Equipe (PIN: 1234)</span>
            </div>
            <h2 className="font-display font-bold text-2xl text-white">Módulos de Gestão do Bar</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Telas protegidas por senha para que o cliente não acerte acidentalmente o caixa ou produção
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {staffModules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.to}
                to={m.to}
                onClick={unlockAudio}
                className="bg-[#1a1410] border border-[#2d241e] hover:border-amber-500/50 rounded-3xl p-6 transition-all group flex flex-col justify-between shadow-lg hover:shadow-amber-950/20 active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#231b14] border border-[#34271e] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon size={24} className="text-amber-400" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30 uppercase tracking-wider">
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-white group-hover:text-amber-300 transition-colors mb-2">
                    {m.title}
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed mb-6">{m.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#2d241e] text-xs font-bold text-amber-400 group-hover:text-amber-300">
                  <span>{m.actionText}</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4-Step Operational Flow */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="bg-[#17110d] border border-[#2d241e] rounded-3xl p-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
              Fluxo Operacional
            </span>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mt-1">
              Como funciona na prática
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.num} className="bg-[#1e1611] border border-[#2f231a] rounded-2xl p-5 relative">
                  <div className="font-mono font-black text-2xl text-amber-500/30 mb-3">{st.num}</div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3 text-amber-400">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-display font-bold text-base text-white mb-1.5">{st.title}</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technical Highlights / Architecture Details */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-[#1a1410] border border-[#2d241e] rounded-3xl p-6 sm:p-8">
          <h2 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-2">
            <Database size={20} className="text-amber-400" />
            <span>Diferenciais Técnicos e de Segurança</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-300">
            <div className="bg-[#140e0a] border border-[#261c14] p-4 rounded-2xl">
              <div className="font-bold text-white mb-1">Isolamento do Cliente</div>
              <p className="text-stone-400 leading-relaxed">
                O cardápio mobile (<span className="font-mono text-amber-300">/cardapio/:mesa</span>) é isolado, sem links para Caixa, KDS ou Impressora. A gestão requer PIN de segurança (1234).
              </p>
            </div>

            <div className="bg-[#140e0a] border border-[#261c14] p-4 rounded-2xl">
              <div className="font-bold text-white mb-1">Impressão Multi-Estratégia</div>
              <p className="text-stone-400 leading-relaxed">
                Portal de impressão injetado diretamente no DOM via <span className="font-mono text-amber-300">@media print</span>, com fallback de popup e geração de binário ESC/POS para hardware físico.
              </p>
            </div>

            <div className="bg-[#140e0a] border border-[#261c14] p-4 rounded-2xl">
              <div className="font-bold text-white mb-1">Tempo Real & Web Audio</div>
              <p className="text-stone-400 leading-relaxed">
                BroadcastChannel entre abas de navegador e síntese de bipe nativo via Web Audio API para KDS de coquetelaria sem depender de arquivos de áudio externos.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2d241e] flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
            <div className="font-mono">
              React 18 • TypeScript Strict • Tailwind CSS 3 • Date-fns • Web Audio API
            </div>
            <button
              onClick={() => {
                db.resetarDados();
                toast.success("Dados demonstrativos restaurados!");
              }}
              className="text-stone-400 hover:text-amber-400 flex items-center gap-1 transition"
            >
              <RotateCcw size={13} />
              <span>Restaurar dados de demonstração</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
