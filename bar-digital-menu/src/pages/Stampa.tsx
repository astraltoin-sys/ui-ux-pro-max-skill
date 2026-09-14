import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Home, Printer, Download, RefreshCw, CheckCircle2, Volume2, VolumeX } from "lucide-react";
import { useDb } from "../hooks/useDb";
import { barReceiptContent, cassaReceiptContent, printReceipt, generateBarEscPos, generateCassaEscPos, downloadEscPos } from "../lib/print";
import type { BobinaSize } from "../types";

export function Stampa() {
  const db = useDb();
  const [autoPrint, setAutoPrint] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const prevPendentes = useRef(0);
  const pendentes = db.getPrintJobsPendentes();
  const allJobs = db.printJobs.slice(0, 30);
  const stampate = allJobs.filter((j) => j.status === "stampato").length;

  useEffect(() => {
    if (!autoPrint) return;
    if (pendentes.length > prevPendentes.current) {
      pendentes.forEach((job) => {
        const pedido = db.getPedidoById(job.pedidoId);
        if (pedido) {
          const content = job.tipo === "bar" ? barReceiptContent(pedido) : cassaReceiptContent(pedido);
          printReceipt(content).then(() => db.marcarImpresso(job.id));
        }
      });
    }
    prevPendentes.current = pendentes.length;
  }, [db.version, autoPrint]);

  const currentJob = selectedJobId ? db.printJobs.find((j) => j.id === selectedJobId) : null;
  const currentPedido = currentJob?.pedidoId ? db.getPedidoById(currentJob.pedidoId) : null;

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="bg-stone-900 border-b border-stone-800 p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-stone-400 hover:text-amber-400"><Home size={20} /></Link>
            <Printer className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-lg font-display font-bold">Stampa</h1>
              <p className="text-xs text-stone-500">Stazione di Stampa Automatica</p>
            </div>
          </div>
          <button onClick={() => setAutoPrint(!autoPrint)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${autoPrint ? "bg-green-600 text-white" : "border border-stone-700 text-stone-400"}`}>
            {autoPrint ? <Volume2 size={16} /> : <VolumeX size={16} />} Auto-Stampa {autoPrint ? "Attiva" : "Inattiva"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4 text-center">
            <div className="font-display font-bold text-2xl text-blue-400">{pendentes.length}</div>
            <div className="text-xs text-stone-500 mt-1">IN CODA</div>
          </div>
          <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4 text-center">
            <div className="font-display font-bold text-2xl text-green-400">{stampate}</div>
            <div className="text-xs text-stone-500 mt-1">STAMPATE</div>
          </div>
          <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4 text-center">
            <div className="font-display font-bold text-2xl text-blue-400">{allJobs.length}</div>
            <div className="text-xs text-stone-500 mt-1">TOTALE</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><Printer className="w-5 h-5 text-amber-400" /> Coda di Stampa</h2>
            <div className="space-y-2">
              {allJobs.length === 0 ? (
                <p className="text-center text-stone-500 py-8 bg-stone-900 rounded-xl border border-stone-800">Nessuna stampa in coda</p>
              ) : (
                allJobs.map((job) => {
                  const pedido = db.getPedidoById(job.pedidoId);
                  return (
                    <div key={job.id} onClick={() => setSelectedJobId(job.id)} className={`bg-stone-900 rounded-xl border p-3 cursor-pointer flex items-center justify-between ${selectedJobId === job.id ? "border-amber-500" : "border-stone-800"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${job.status === "pendente" ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
                        <div>
                          <div className="text-sm font-bold">#{String(job.pedidoNumero).padStart(5, "0")} • {job.tipo === "bar" ? "Comanda Bar" : "Scontrino Cassa"}</div>
                          {pedido && <div className="text-xs text-stone-500">Tavolo {pedido.mesaNumero}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === "pendente" && pedido && (
                          <button onClick={(e) => { e.stopPropagation(); const c = job.tipo === "bar" ? barReceiptContent(pedido) : cassaReceiptContent(pedido); printReceipt(c).then(() => { db.marcarImpresso(job.id); toast.success("Stampato!"); }); }} className="bg-amber-500 text-stone-950 px-3 py-1 rounded-lg text-sm font-bold">Stampa</button>
                        )}
                        {job.status === "stampato" && <CheckCircle2 size={16} className="text-green-500" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-400" /> Anteprima Scontrino</h2>
            {currentPedido && currentJob ? (
              <div>
                <div className="bg-stone-800 rounded-xl p-4 flex justify-center mb-4">
                  <div className="thermal-receipt text-black p-4" style={{ width: 280 }} dangerouslySetInnerHTML={{ __html: currentJob.tipo === "bar" ? barReceiptContent(currentPedido) : cassaReceiptContent(currentPedido) }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { const c = currentJob.tipo === "bar" ? barReceiptContent(currentPedido) : cassaReceiptContent(currentPedido); printReceipt(c).then(() => { if (currentJob.status === "pendente") db.marcarImpresso(currentJob.id); toast.success("Stampato!"); }); }} className="flex-1 bg-amber-500 text-stone-950 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"><Printer size={16} /> Stampa</button>
                  <button onClick={() => { db.reimprimir(currentPedido.id, "bar"); db.reimprimir(currentPedido.id, "cassa"); toast.success("Ristampa duplice"); }} className="flex-1 bg-stone-800 text-stone-300 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"><RefreshCw size={16} /> Ristampa</button>
                  <button onClick={() => { const d = currentJob.tipo === "bar" ? generateBarEscPos(currentPedido) : generateCassaEscPos(currentPedido); downloadEscPos(d, `comanda-${currentPedido.numero}-${currentJob.tipo}.bin`); toast.success("ESC/POS esportato"); }} className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"><Download size={16} /> ESC/POS</button>
                </div>
              </div>
            ) : (
              <div className="bg-stone-900 rounded-xl border border-stone-800 p-8 text-center text-stone-500">Seleziona una stampa dalla coda</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
