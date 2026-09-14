import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Home, CreditCard, Banknote, X, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { useDb } from "../hooks/useDb";
import type { FormaPagamento } from "../types";

export function Cassa() {
  const db = useDb();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const activePedidos = db.getPedidosAttivi();
  const incassato = db.pedidos.filter((p) => p.status === "pagato").reduce((s, p) => s + p.total, 0);
  const inSospeso = activePedidos.length;

  const fmtTime = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const statusBadge = (status: string) => {
    if (status === "pronto") return <span className="px-2 py-0.5 rounded-full text-xs border border-green-500 text-green-400">Pronto</span>;
    if (status === "in_preparazione") return <span className="px-2 py-0.5 rounded-full text-xs border border-blue-500 text-blue-400">In prep.</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs border border-red-500 text-red-400">In sospeso</span>;
  };

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="bg-stone-900 border-b border-stone-800 p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-stone-400 hover:text-amber-400"><Home size={20} /></Link>
            <CreditCard className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-lg font-display font-bold">Cassa</h1>
              <p className="text-xs text-stone-500">Stazione di Pagamento</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center"><div className="font-display font-bold text-lg">{db.pedidos.length}</div><div className="text-xs text-stone-500">ORDINI</div></div>
            <div className="text-center"><div className="font-display font-bold text-lg">{inSospeso}</div><div className="text-xs text-stone-500">IN SOSPESO</div></div>
            <div className="text-center"><div className="font-display font-bold text-lg text-green-400">{incassato.toFixed(2).replace(".", ",")} €</div><div className="text-xs text-stone-500">INCASSATO</div></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {activePedidos.length === 0 ? (
          <div className="text-center text-stone-500 py-32"><CreditCard className="w-16 h-16 text-stone-700 mx-auto mb-4" /><p>Nessun ordine attivo</p></div>
        ) : (
          activePedidos.map((p) => (
            <div key={p.id} className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center font-bold">{p.mesaNumero}</div>
                  <div>
                    <div className="font-bold">#{String(p.numero).padStart(5, "0")}</div>
                    <div className="text-xs text-stone-500">{fmtTime(p.createdAt)}</div>
                  </div>
                  <div className="flex gap-1 ml-2">{statusBadge(p.status)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 font-bold">{p.total.toFixed(2).replace(".", ",")} €</span>
                  {expandedId === p.id ? <ChevronUp size={20} className="text-stone-500" /> : <ChevronDown size={20} className="text-stone-500" />}
                </div>
              </div>
              {expandedId === p.id && (
                <div className="border-t border-stone-800 p-4 space-y-3">
                  <div className="space-y-1">
                    {p.itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.quantidade}x {item.emoji} {item.nome}</span>
                        <span>{(item.preco * item.quantidade).toFixed(2).replace(".", ",")} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-stone-800"><span>Totale</span><span className="text-amber-400">{p.total.toFixed(2).replace(".", ",")} €</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => { db.reimprimir(p.id, "cassa"); toast.success("Ristampa cassa"); }} className="flex-1 bg-stone-800 text-stone-300 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1"><Printer size={16} /> Cassa</button>
                    <button onClick={() => { db.reimprimir(p.id, "bar"); toast.success("Ristampa bar"); }} className="flex-1 bg-stone-800 text-stone-300 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1"><Printer size={16} /> Bar</button>
                    <button onClick={() => setPaymentModal(p.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-bold">Chiudi Conto</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {paymentModal && (
        <PaymentModal total={db.getPedidoById(paymentModal)?.total || 0} onClose={() => setPaymentModal(null)} onConfirm={(forma) => { db.fecharConta(paymentModal, forma); setPaymentModal(null); setExpandedId(null); toast.success("Conto chiuso!"); }} />
      )}
    </div>
  );
}

function PaymentModal({ total, onClose, onConfirm }: { total: number; onClose: () => void; onConfirm: (f: FormaPagamento) => void }) {
  const [forma, setForma] = useState<FormaPagamento>(null);
  const opts = [
    { value: "contanti" as const, label: "Contanti", icon: Banknote },
    { value: "carta" as const, label: "Carta", icon: CreditCard },
  ];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-stone-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display font-bold">Chiudi Conto</h2>
          <button onClick={onClose}><X size={24} className="text-stone-400" /></button>
        </div>
        <div className="text-center mb-6">
          <p className="text-stone-500">Totale da pagare</p>
          <p className="text-3xl font-display font-bold text-amber-400">{total.toFixed(2).replace(".", ",")} €</p>
        </div>
        <p className="font-bold mb-2">Metodo di pagamento</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {opts.map((o) => {
            const Icon = o.icon;
            return <button key={o.value} onClick={() => setForma(o.value)} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${forma === o.value ? "border-amber-500 bg-amber-500/10" : "border-stone-700"}`}><Icon size={24} /><span className="text-sm font-bold">{o.label}</span></button>;
          })}
        </div>
        <button onClick={() => forma && onConfirm(forma)} disabled={!forma} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed">Conferma Pagamento</button>
      </div>
    </div>
  );
}
