import { useState } from "react";
import { Navbar } from "../components/Navbar";
import { useDb } from "../hooks/useDb";
import { toast } from "sonner";
import { CreditCard, Banknote, Smartphone, X, Printer } from "lucide-react";
import type { FormaPagamento } from "../types";

export function POS() {
  const db = useDb();
  const [selectedMesaId, setSelectedMesaId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);

  const selectedMesa = db.mesas.find((m) => m.id === selectedMesaId);
  const selectedPedido = selectedMesa?.pedidoId ? db.getPedidoById(selectedMesa.pedidoId) : null;
  const printHistory = db.printJobs.slice(0, 20);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="p-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Caixa (PDV)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="font-bold text-lg mb-3">Mapa de Mesas</h2>
            <div className="grid grid-cols-4 gap-3">
              {db.mesas.map((mesa) => {
                const elapsed = mesa.aberturaEm ? Math.floor((Date.now() - mesa.aberturaEm) / 60000) : 0;
                return (
                  <button
                    key={mesa.id}
                    onClick={() => setSelectedMesaId(mesa.id)}
                    className={`rounded-xl p-3 text-center transition-all ${
                      selectedMesaId === mesa.id ? "ring-2 ring-orange-500" : ""
                    } ${
                      mesa.status === "ocupada"
                        ? "bg-orange-100 border-2 border-orange-300"
                        : "bg-green-50 border-2 border-green-200"
                    }`}
                  >
                    <div className="font-bold text-lg">Mesa {mesa.numero}</div>
                    {mesa.status === "ocupada" ? (
                      <>
                        <div className="text-orange-600 text-sm font-bold">Ocupada</div>
                        <div className="text-xs text-stone-500">{elapsed}min</div>
                      </>
                    ) : (
                      <div className="text-green-600 text-sm font-bold">Livre</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-3">Detalhes do Pedido</h2>
            {selectedPedido ? (
              <div className="bg-white rounded-xl p-4 shadow">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="font-bold text-lg">Mesa {selectedPedido.mesaNumero}</span>
                    <span className="text-stone-500 ml-2">#{selectedPedido.numero}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    selectedPedido.status === "novo" ? "bg-red-100 text-red-700" :
                    selectedPedido.status === "preparando" ? "bg-blue-100 text-blue-700" :
                    selectedPedido.status === "pronto" ? "bg-green-100 text-green-700" :
                    "bg-stone-100 text-stone-700"
                  }`}>
                    {selectedPedido.status}
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {selectedPedido.itens.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantidade}x {item.nome}</span>
                      <span>R$ {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>R$ {selectedPedido.subtotal.toFixed(2).replace(".", ",")}</span></div>
                  <div className="flex justify-between"><span>Serviço (10%)</span><span>R$ {selectedPedido.servico.toFixed(2).replace(".", ",")}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span>R$ {selectedPedido.total.toFixed(2).replace(".", ",")}</span></div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => { db.reimprimir(selectedPedido.id, "caixa"); toast.success("Reimpressão caixa solicitada"); }} className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                    <Printer size={16} /> Caixa
                  </button>
                  <button onClick={() => { db.reimprimir(selectedPedido.id, "bar"); toast.success("Reimpressão bar solicitada"); }} className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                    <Printer size={16} /> Bar
                  </button>
                  <button onClick={() => { db.reimprimir(selectedPedido.id, "caixa"); db.reimprimir(selectedPedido.id, "bar"); toast.success("Reimpressão dupla solicitada"); }} className="flex-1 bg-stone-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                    <Printer size={16} /> Ambos
                  </button>
                </div>

                {selectedPedido.status !== "fechado" && (
                  <button
                    onClick={() => setPaymentModal(true)}
                    className="w-full mt-3 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-500"
                  >
                    Fechar Conta
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 shadow text-center text-stone-500">
                Selecione uma mesa para ver o pedido
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-bold text-lg mb-3">Histórico de Impressões</h2>
          <div className="bg-white rounded-xl shadow divide-y max-h-64 overflow-y-auto scrollbar-thin">
            {printHistory.length === 0 ? (
              <p className="text-center text-stone-500 py-6">Nenhuma impressão</p>
            ) : (
              printHistory.map((job) => {
                const pedido = db.getPedidoById(job.pedidoId);
                return (
                  <div key={job.id} className="flex items-center justify-between p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Printer size={16} className={job.tipo === "bar" ? "text-blue-500" : "text-purple-500"} />
                      <span>Comanda #{job.pedidoNumero}</span>
                      {pedido && <span className="text-stone-500">Mesa {pedido.mesaNumero}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${job.tipo === "bar" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {job.tipo}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${job.status === "pendente" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {paymentModal && selectedPedido && (
        <PaymentModal
          total={selectedPedido.total}
          onClose={() => setPaymentModal(false)}
          onConfirm={(forma) => {
            db.fecharConta(selectedPedido.id, forma);
            setPaymentModal(false);
            setSelectedMesaId(null);
            toast.success("Conta fechada com sucesso!");
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({ total, onClose, onConfirm }: { total: number; onClose: () => void; onConfirm: (forma: FormaPagamento) => void }) {
  const [forma, setForma] = useState<FormaPagamento>(null);
  const options = [
    { value: "dinheiro" as const, label: "Dinheiro", icon: Banknote },
    { value: "cartao" as const, label: "Cartão", icon: CreditCard },
    { value: "pix" as const, label: "Pix", icon: Smartphone },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Fechar Conta</h2>
          <button onClick={onClose}><X size={24} className="text-stone-400" /></button>
        </div>
        <div className="text-center mb-6">
          <p className="text-stone-500">Total a pagar</p>
          <p className="text-3xl font-bold text-green-600">R$ {total.toFixed(2).replace(".", ",")}</p>
        </div>
        <p className="font-bold mb-2">Forma de pagamento</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setForma(opt.value)}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${
                  forma === opt.value ? "border-green-500 bg-green-50" : "border-gray-200"
                }`}
              >
                <Icon size={24} />
                <span className="text-sm font-bold">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => forma && onConfirm(forma)}
          disabled={!forma}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirmar Pagamento
        </button>
      </div>
    </div>
  );
}
