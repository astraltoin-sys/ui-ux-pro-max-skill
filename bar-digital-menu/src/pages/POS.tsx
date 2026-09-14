import { useState, useMemo } from "react";
import { Navbar } from "../components/Navbar";
import { StaffGuard } from "../components/StaffGuard";
import { useDb } from "../hooks/useDb";
import { toast } from "sonner";
import {
  CreditCard,
  Banknote,
  QrCode,
  X,
  Printer,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Receipt,
  Search,
  ChevronRight,
  TrendingUp,
  Layers,
} from "lucide-react";
import type { FormaPagamento, Pedido, Produto, ItemPedido } from "../types";
import { formatMoney, buildCupomModel, executePrintReceipt } from "../lib/receipt";
import { playBeep, unlockAudio } from "../lib/audio";
import { QRCodeSVG } from "../components/QRCode";

export function POS() {
  const db = useDb();
  const [selectedMesaId, setSelectedMesaId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);

  const selectedMesa = db.mesas.find((m) => m.id === selectedMesaId);
  const selectedPedido: Pedido | undefined = selectedMesa?.pedidoId
    ? db.getPedidoById(selectedMesa.pedidoId)
    : undefined;

  const printHistory = db.print_jobs.slice(0, 20);

  // Financial statistics
  const pedidosHoje = db.pedidos;
  const pedidosPagos = pedidosHoje.filter((p) => p.status === "pago");
  const totalFaturado = pedidosPagos.reduce((acc, p) => acc + p.total, 0);
  const totalEmAberto = db.mesas
    .filter((m) => m.status === "ocupada" && m.pedidoId)
    .reduce((acc, m) => {
      const p = db.getPedidoById(m.pedidoId!);
      return acc + (p?.total || 0);
    }, 0);

  const mesasOcupadas = db.mesas.filter((m) => m.status === "ocupada").length;

  const handleReprint = async (tipo: "bar" | "caixa" | "ambos") => {
    if (!selectedPedido) return;
    unlockAudio();

    if (tipo === "bar" || tipo === "ambos") {
      db.reimprimir(selectedPedido.id, "bar");
    }
    if (tipo === "caixa" || tipo === "ambos") {
      db.reimprimir(selectedPedido.id, "caixa");
      // Direct print execution for instant feedback at the POS
      const cupom = buildCupomModel(selectedPedido, "caixa");
      executePrintReceipt(cupom);
    }

    playBeep("ready");
    toast.success(
      tipo === "ambos"
        ? `Reimpressão dupla enviada (Bar e Caixa)!`
        : `Reimpressão da comanda ${tipo.toUpperCase()} enviada!`
    );
  };

  return (
    <StaffGuard areaName="Painel do Caixa (PDV)">
      <div className="min-h-screen bg-[#120e0b] text-stone-100 pb-16">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
            <div className="bg-[#1a1410] border border-[#2d241e] rounded-2xl p-4 shadow-lg">
              <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                Mesas Ativas
              </div>
              <div className="font-display font-bold text-2xl text-amber-300 mt-1">
                {mesasOcupadas} <span className="text-sm font-sans text-stone-500">/ {db.mesas.length}</span>
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                {mesasOcupadas > 0 ? `${mesasOcupadas} em atendimento` : "Nenhuma mesa ocupada"}
              </div>
            </div>

            <div className="bg-[#1a1410] border border-[#2d241e] rounded-2xl p-4 shadow-lg">
              <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                Faturado (Hoje)
              </div>
              <div className="font-mono font-bold text-2xl text-emerald-400 mt-1 tabular-nums">
                {formatMoney(totalFaturado)}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">{pedidosPagos.length} contas fechadas</div>
            </div>

            <div className="bg-[#1a1410] border border-[#2d241e] rounded-2xl p-4 shadow-lg">
              <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                Contas no Salão
              </div>
              <div className="font-mono font-bold text-2xl text-amber-400 mt-1 tabular-nums">
                {formatMoney(totalEmAberto)}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">Consumo ativo a receber</div>
            </div>

            <div className="bg-[#1a1410] border border-[#2d241e] rounded-2xl p-4 shadow-lg">
              <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                Fila de Impressão
              </div>
              <div className="font-display font-bold text-2xl text-stone-200 mt-1">
                {db.getPrintJobsPendentes().length}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">Comandas pendentes</div>
            </div>
          </div>

          {/* 2-Column Main Layout: Mesas Map (Left) & Order Details (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Mapa de Mesas (7 cols) */}
            <div className="lg:col-span-7 bg-[#1a1410] border border-[#2d241e] rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d241e]">
                <div>
                  <h2 className="font-display font-bold text-lg text-white">Mapa de Mesas do Salão</h2>
                  <p className="text-xs text-stone-400">Clique para inspecionar, adicionar itens ou fechar conta</p>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Livre
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> Ocupada
                  </span>
                </div>
              </div>

              {/* Mesas Grid: 1 to 12 */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {db.mesas.map((mesa) => {
                  const isSelected = selectedMesaId === mesa.id;
                  const isOcupada = mesa.status === "ocupada";
                  const pedido = mesa.pedidoId ? db.getPedidoById(mesa.pedidoId) : null;
                  const elapsedMin = mesa.aberturaEm
                    ? Math.max(1, Math.floor((Date.now() - mesa.aberturaEm) / 60000))
                    : 0;

                  return (
                    <button
                      key={mesa.id}
                      onClick={() => {
                        unlockAudio();
                        setSelectedMesaId(mesa.id);
                      }}
                      className={`rounded-2xl p-3.5 text-left transition-all min-h-[96px] flex flex-col justify-between relative group ${
                        isSelected
                          ? "ring-2 ring-amber-400 bg-[#281f18] shadow-lg shadow-amber-950/40"
                          : isOcupada
                          ? "bg-[#231b14] border-2 border-amber-500/50 hover:border-amber-400"
                          : "bg-[#16120e] border border-[#2d241e] hover:bg-[#1d1712] hover:border-stone-700"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-display font-bold text-lg text-stone-100">
                          {String(mesa.numero).padStart(2, "0")}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isOcupada ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
                          }`}
                        />
                      </div>

                      <div className="mt-2">
                        {isOcupada && pedido ? (
                          <div>
                            <div className="font-mono font-bold text-amber-300 text-xs tabular-nums">
                              {formatMoney(pedido.total)}
                            </div>
                            <div className="text-[10px] text-stone-400 font-mono mt-0.5 flex items-center gap-1">
                              <Clock size={10} /> {elapsedMin}m • #{pedido.numero}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs font-semibold text-emerald-400">Livre</div>
                            <div className="text-[10px] text-stone-500">Mesa disponível</div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Details & Actions (5 cols) */}
            <div className="lg:col-span-5 bg-[#1a1410] border border-[#2d241e] rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d241e]">
                <div className="flex items-center gap-2">
                  <Receipt className="text-amber-400" size={18} />
                  <h2 className="font-display font-bold text-base text-white">Comanda da Mesa</h2>
                </div>
                {selectedMesa && (
                  <span className="font-mono text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Mesa {String(selectedMesa.numero).padStart(2, "0")}
                  </span>
                )}
              </div>

              {selectedMesa && selectedPedido ? (
                <div>
                  {/* Order Header */}
                  <div className="bg-[#231b14] border border-[#30261e] rounded-2xl p-3.5 mb-4 flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-sm text-stone-100">
                        Pedido #{String(selectedPedido.numero).padStart(4, "0")}
                      </div>
                      <div className="text-xs text-stone-400 font-mono">
                        Aberto há{" "}
                        {selectedMesa.aberturaEm
                          ? Math.max(1, Math.floor((Date.now() - selectedMesa.aberturaEm) / 60000))
                          : 0}{" "}
                        minutos
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        selectedPedido.status === "novo"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : selectedPedido.status === "preparando"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : selectedPedido.status === "pronto"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-stone-700 text-stone-300"
                      }`}
                    >
                      {selectedPedido.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 mb-4 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                    {selectedPedido.itens.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#17120e] border border-[#2d241e] p-2.5 rounded-xl flex items-start justify-between text-xs"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-stone-200">
                            {item.quantidade}x {item.emoji} {item.nome}
                          </div>
                          {item.observacao && (
                            <div className="text-[11px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded mt-1 border border-amber-500/20 italic">
                              {item.observacao}
                            </div>
                          )}
                        </div>
                        <div className="font-mono tabular-nums text-amber-400 font-bold whitespace-nowrap">
                          {formatMoney(item.preco * item.quantidade)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-[#140e0a] border border-[#2d241e] rounded-2xl p-3.5 space-y-1.5 text-xs mb-4">
                    <div className="flex justify-between text-stone-400">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums text-stone-200">
                        {formatMoney(selectedPedido.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                      <span>Serviço Sugerido (10%)</span>
                      <span className="font-mono tabular-nums text-stone-200">
                        {formatMoney(selectedPedido.servico)}
                      </span>
                    </div>
                    <div className="border-t border-[#2d241e] pt-2 flex justify-between items-baseline font-bold text-sm">
                      <span className="text-amber-200">Total a Pagar</span>
                      <span className="font-mono text-xl font-extrabold text-amber-400 tabular-nums">
                        {formatMoney(selectedPedido.total)}
                      </span>
                    </div>
                  </div>

                  {/* Reprint & Print Actions */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => handleReprint("caixa")}
                      className="bg-[#231c16] hover:bg-[#2d241e] border border-[#3a2f27] text-stone-200 font-bold py-2.5 px-2 rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95 transition min-h-[44px]"
                    >
                      <Printer size={14} className="text-purple-400" />
                      <span>Impr. Caixa</span>
                    </button>

                    <button
                      onClick={() => handleReprint("bar")}
                      className="bg-[#231c16] hover:bg-[#2d241e] border border-[#3a2f27] text-stone-200 font-bold py-2.5 px-2 rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95 transition min-h-[44px]"
                    >
                      <Printer size={14} className="text-blue-400" />
                      <span>Impr. Bar</span>
                    </button>

                    <button
                      onClick={() => handleReprint("ambos")}
                      className="bg-[#231c16] hover:bg-[#2d241e] border border-[#3a2f27] text-stone-200 font-bold py-2.5 px-2 rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95 transition min-h-[44px]"
                    >
                      <RefreshCw size={14} className="text-amber-400" />
                      <span>Ambos</span>
                    </button>
                  </div>

                  {/* Checkout & Close Bill Button */}
                  {selectedPedido.status !== "pago" && (
                    <button
                      onClick={() => {
                        unlockAudio();
                        setPaymentModalOpen(true);
                      }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-between shadow-xl shadow-emerald-500/20 active:scale-95 transition min-h-[48px]"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard size={18} />
                        <span>Fechar Conta da Mesa</span>
                      </div>
                      <span className="font-mono text-base tabular-nums font-extrabold">
                        {formatMoney(selectedPedido.total)}
                      </span>
                    </button>
                  )}
                </div>
              ) : selectedMesa ? (
                <div className="text-center py-12 text-stone-500">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400 font-bold font-display text-xl">
                    {selectedMesa.numero}
                  </div>
                  <h3 className="font-bold text-white mb-1">Mesa {selectedMesa.numero} está livre</h3>
                  <p className="text-xs text-stone-400 max-w-xs mx-auto mb-4">
                    Nenhum consumo aberto no momento. O cliente pode pedir pelo QR Code ou você pode lançar itens.
                  </p>
                  <button
                    onClick={() => {
                      unlockAudio();
                      setAddItemModalOpen(true);
                    }}
                    className="bg-amber-500 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-1.5 hover:bg-amber-400 transition min-h-[44px]"
                  >
                    <Plus size={16} />
                    <span>Abrir Pedido no Caixa</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-16 text-stone-500">
                  <Receipt size={40} className="mx-auto mb-2 opacity-30 text-amber-500" />
                  <p className="text-sm font-medium">Selecione uma mesa no mapa para ver a comanda</p>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de Impressões */}
          <div className="mt-8 bg-[#1a1410] border border-[#2d241e] rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d241e]">
              <div className="flex items-center gap-2">
                <Printer className="text-amber-400" size={18} />
                <h2 className="font-display font-bold text-base text-white">Histórico de Comandas e Impressões</h2>
              </div>
              <span className="text-xs text-stone-400 font-mono">Últimos 20 registros</span>
            </div>

            <div className="divide-y divide-[#281f18] max-h-64 overflow-y-auto scrollbar-thin">
              {printHistory.length === 0 ? (
                <p className="text-center text-stone-500 py-6 text-xs">Nenhum cupom emitido até o momento.</p>
              ) : (
                printHistory.map((job) => {
                  const pedido = db.getPedidoById(job.pedidoId);
                  return (
                    <div key={job.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                            job.tipo === "bar"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {job.tipo.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-stone-200">
                            #{String(job.pedidoNumero).padStart(4, "0")}
                          </span>
                          {pedido && (
                            <span className="text-stone-400 ml-2">
                              Mesa {String(pedido.mesaNumero).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            job.status === "pendente"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {job.status.toUpperCase()}
                        </span>
                        <button
                          onClick={() => {
                            if (pedido) {
                              const cupom = buildCupomModel(pedido, job.tipo);
                              executePrintReceipt(cupom);
                              db.marcarImpresso(job.id);
                              toast.success(`Cupom impresso novamente!`);
                            }
                          }}
                          className="text-stone-400 hover:text-amber-400 p-1 flex items-center gap-1"
                          title="Imprimir este trabalho"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>

        {/* Payment Settlement Modal */}
        {paymentModalOpen && selectedPedido && (
          <PaymentModal
            pedido={selectedPedido}
            onClose={() => setPaymentModalOpen(false)}
            onConfirm={(forma) => {
              unlockAudio();
              db.fecharConta(selectedPedido.id, forma);

              // Auto-print closing receipt on payment
              const cupom = buildCupomModel(selectedPedido, "caixa");
              executePrintReceipt(cupom);

              playBeep("cashier");
              setPaymentModalOpen(false);
              setSelectedMesaId(null);
              toast.success(
                `Conta da Mesa ${selectedPedido.mesaNumero} fechada com sucesso (${forma ? forma.toUpperCase() : "PAGO"})!`
              );
            }}
          />
        )}

        {/* Quick Add Order from POS Modal */}
        {addItemModalOpen && selectedMesa && (
          <POSAddItemModal
            mesaNumero={selectedMesa.numero}
            produtos={db.produtos}
            onClose={() => setAddItemModalOpen(false)}
            onAddOrder={(itens) => {
              unlockAudio();
              const formattedItens: ItemPedido[] = itens.map((it, idx) => ({
                ...it,
                id: `item-pos-${Date.now()}-${idx}`,
              }));
              db.criarPedido(selectedMesa.id, formattedItens);
              setAddItemModalOpen(false);
              toast.success(`Pedido aberto na Mesa ${selectedMesa.numero}!`);
            }}
          />
        )}
      </div>
    </StaffGuard>
  );
}

function PaymentModal({
  pedido,
  onClose,
  onConfirm,
}: {
  pedido: Pedido;
  onClose: () => void;
  onConfirm: (forma: FormaPagamento) => void;
}) {
  const [selectedForma, setSelectedForma] = useState<"dinheiro" | "cartao" | "pix">("pix");

  const pixMockPayload = `00020126580014BR.GOV.BCB.PIX0136bardigital@pix.com.br520400005303986540${pedido.total.toFixed(2)}5802BR5915BAR DIGITAL PRO6009SAO PAULO62070503***6304`;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1410] border border-[#2d241e] text-stone-100 rounded-3xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#2d241e]">
          <div>
            <h2 className="font-display font-bold text-xl text-white">Fechar Conta</h2>
            <div className="text-xs text-stone-400 font-mono">
              Mesa {String(pedido.mesaNumero).padStart(2, "0")} • Pedido #{pedido.numero}
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X size={22} />
          </button>
        </div>

        {/* Total to Pay Highlight */}
        <div className="bg-[#140e0a] border border-[#2d241e] rounded-2xl p-4 text-center mb-5">
          <div className="text-xs text-stone-400 uppercase tracking-wider">Total a Cobrar</div>
          <div className="font-mono font-extrabold text-3xl text-amber-400 mt-1 tabular-nums">
            {formatMoney(pedido.total)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Subtotal: {formatMoney(pedido.subtotal)} + Serviço: {formatMoney(pedido.servico)}
          </div>
        </div>

        {/* Payment Methods */}
        <label className="block text-xs font-bold text-amber-200 mb-2 uppercase tracking-wide">
          Selecione a Forma de Pagamento
        </label>
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <button
            type="button"
            onClick={() => setSelectedForma("dinheiro")}
            className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition min-h-[76px] ${
              selectedForma === "dinheiro"
                ? "bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-[#231b14] border-[#32271e] text-stone-300 hover:bg-[#2d231a]"
            }`}
          >
            <Banknote size={22} />
            <span className="text-xs">Dinheiro</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedForma("cartao")}
            className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition min-h-[76px] ${
              selectedForma === "cartao"
                ? "bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-[#231b14] border-[#32271e] text-stone-300 hover:bg-[#2d231a]"
            }`}
          >
            <CreditCard size={22} />
            <span className="text-xs">Cartão</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedForma("pix")}
            className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition min-h-[76px] ${
              selectedForma === "pix"
                ? "bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-[#231b14] border-[#32271e] text-stone-300 hover:bg-[#2d231a]"
            }`}
          >
            <QrCode size={22} />
            <span className="text-xs">Pix QR</span>
          </button>
        </div>

        {/* Dynamic Payment Help / QR display */}
        {selectedForma === "pix" && (
          <div className="bg-[#140e0a] border border-[#2d241e] rounded-2xl p-4 mb-5 flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl flex-shrink-0 shadow">
              <QRCodeSVG value={pixMockPayload} size={90} />
            </div>
            <div className="text-xs">
              <div className="font-bold text-white mb-1">Pix Instantâneo</div>
              <div className="text-stone-400 leading-relaxed text-[11px]">
                Aponte a câmera do aplicativo do banco para liquidar a conta da Mesa {pedido.mesaNumero}.
              </div>
            </div>
          </div>
        )}

        {selectedForma === "dinheiro" && (
          <div className="bg-[#140e0a] border border-[#2d241e] rounded-2xl p-3 text-xs text-stone-400 mb-5 flex items-center gap-2">
            <span className="text-amber-400 text-base">💵</span>
            <span>Ao confirmar, a comanda do Caixa é impressa e a gaveta de dinheiro pulsa.</span>
          </div>
        )}

        {selectedForma === "cartao" && (
          <div className="bg-[#140e0a] border border-[#2d241e] rounded-2xl p-3 text-xs text-stone-400 mb-5 flex items-center gap-2">
            <span className="text-amber-400 text-base">💳</span>
            <span>Aproxime ou insira o cartão do cliente na maquininha POS e imprima o comprovante.</span>
          </div>
        )}

        <button
          onClick={() => onConfirm(selectedForma)}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition min-h-[48px]"
        >
          <CheckCircle2 size={18} />
          <span>Confirmar e Imprimir Extrato Final</span>
        </button>
      </div>
    </div>
  );
}

function POSAddItemModal({
  mesaNumero,
  produtos,
  onClose,
  onAddOrder,
}: {
  mesaNumero: number;
  produtos: Produto[];
  onClose: () => void;
  onAddOrder: (itens: Array<{ produtoId: string; nome: string; emoji: string; preco: number; quantidade: number; observacao: string }>) => void;
}) {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.categoria.toLowerCase().includes(search.toLowerCase())
    );
  }, [produtos, search]);

  const handleQtyChange = (produtoId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[produtoId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[produtoId];
        return copy;
      }
      return { ...prev, [produtoId]: next };
    });
  };

  const handleConfirm = () => {
    const itens = Object.entries(selectedItems).map(([id, qty]) => {
      const p = produtos.find((x) => x.id === id)!;
      return {
        produtoId: p.id,
        nome: p.nome,
        emoji: p.emoji,
        preco: p.preco,
        quantidade: qty,
        observacao: "Pedido aberto via Caixa",
      };
    });
    if (itens.length > 0) {
      onAddOrder(itens);
    }
  };

  const total = Object.entries(selectedItems).reduce((sum, [id, qty]) => {
    const p = produtos.find((x) => x.id === id);
    return sum + (p ? p.preco * qty : 0);
  }, 0);

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1410] border border-[#2d241e] text-stone-100 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#2d241e]">
          <div>
            <h2 className="font-display font-bold text-lg text-white">Abrir Pedido - Mesa {mesaNumero}</h2>
            <p className="text-xs text-stone-400">Selecione os itens para abrir a conta</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-3 text-stone-500" />
          <input
            type="text"
            placeholder="Buscar por produto ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#120e0b] border border-[#30261e] rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 pr-1 scrollbar-thin">
          {filtered.map((produto) => {
            const qty = selectedItems[produto.id] || 0;
            return (
              <div
                key={produto.id}
                className="bg-[#231b14] border border-[#30261e] p-2.5 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl">{produto.emoji}</span>
                  <div>
                    <div className="font-bold text-stone-100 truncate">{produto.nome}</div>
                    <div className="font-mono text-amber-400 text-[11px] tabular-nums">
                      {formatMoney(produto.preco)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQtyChange(produto.id, -1)}
                    className="w-7 h-7 rounded-lg bg-[#2e231b] hover:bg-amber-500 hover:text-stone-950 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold w-5 text-center">{qty}</span>
                  <button
                    onClick={() => handleQtyChange(produto.id, 1)}
                    className="w-7 h-7 rounded-lg bg-[#2e231b] hover:bg-amber-500 hover:text-stone-950 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-3 border-t border-[#2d241e] flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400">Total Selecionado:</span>
            <div className="font-mono font-bold text-base text-amber-400 tabular-nums">
              {formatMoney(total)}
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={total === 0}
            className="bg-amber-500 disabled:opacity-40 text-stone-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 hover:bg-amber-400 transition"
          >
            <span>Confirmar Pedido</span>
          </button>
        </div>
      </div>
    </div>
  );
}
