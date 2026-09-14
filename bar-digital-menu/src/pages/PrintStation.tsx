import { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { useDb } from "../hooks/useDb";
import { ReceiptPreview } from "../components/ReceiptPreview";
import { toast } from "sonner";
import {
  barReceiptContent,
  caixaReceiptContent,
  printReceipt,
  generateBarEscPos,
  generateCaixaEscPos,
  downloadEscPos,
} from "../lib/print";
import { Printer, Download, RefreshCw, CheckCircle2 } from "lucide-react";
import type { BobinaSize } from "../types";

export function PrintStation() {
  const db = useDb();
  const [autoPrint, setAutoPrint] = useState(false);
  const [bobinaSize, setBobinaSize] = useState<BobinaSize>("80mm");
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const prevPendentesCount = useRef(0);

  const pendentes = db.getPrintJobsPendentes();
  const allJobs = db.printJobs.slice(0, 30);

  useEffect(() => {
    if (!autoPrint) return;
    if (pendentes.length > prevPendentesCount.current) {
      pendentes.forEach((job) => {
        const pedido = db.getPedidoById(job.pedidoId);
        if (pedido) {
          const content = job.tipo === "bar" ? barReceiptContent(pedido) : caixaReceiptContent(pedido);
          printReceipt(content).then(() => {
            db.marcarImpresso(job.id);
          });
        }
      });
    }
    prevPendentesCount.current = pendentes.length;
  }, [db.version, autoPrint]);

  const previewJob = previewJobId ? db.printJobs.find((j) => j.id === previewJobId) : null;
  const currentJob = previewJob || pendentes[0] || allJobs[0];
  const currentPedido = currentJob?.pedidoId ? db.getPedidoById(currentJob.pedidoId) : null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Estação de Impressão</h1>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-lg border">
              {(["80mm", "58mm"] as BobinaSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setBobinaSize(s)}
                  className={`px-3 py-1.5 text-sm font-bold ${bobinaSize === s ? "bg-orange-600 text-white" : "text-stone-600"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAutoPrint(!autoPrint)}
              className={`px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 ${
                autoPrint ? "bg-green-600 text-white" : "bg-white border text-stone-600"
              }`}
            >
              <Printer size={16} />
              Auto-print {autoPrint ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="font-bold text-lg mb-3">
              Fila de Impressão
              {pendentes.length > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-sm">
                  {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
                </span>
              )}
            </h2>
            <div className="bg-white rounded-xl shadow divide-y max-h-[500px] overflow-y-auto scrollbar-thin">
              {allJobs.length === 0 ? (
                <p className="text-center text-stone-500 py-8">Nenhuma impressão na fila</p>
              ) : (
                allJobs.map((job) => {
                  const pedido = db.getPedidoById(job.pedidoId);
                  return (
                    <div
                      key={job.id}
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                        currentJob?.id === job.id ? "bg-orange-50" : ""
                      }`}
                      onClick={() => setPreviewJobId(job.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${job.status === "pendente" ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
                        <div>
                          <div className="text-sm font-bold">#{job.pedidoNumero} • {job.tipo === "bar" ? "Comanda Bar" : "Cupom Caixa"}</div>
                          {pedido && <div className="text-xs text-stone-500">Mesa {pedido.mesaNumero}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === "pendente" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (pedido) {
                                const content = job.tipo === "bar" ? barReceiptContent(pedido) : caixaReceiptContent(pedido);
                                printReceipt(content).then(() => {
                                  db.marcarImpresso(job.id);
                                  toast.success("Impresso!");
                                });
                              }
                            }}
                            className="bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-bold"
                          >
                            Imprimir
                          </button>
                        )}
                        {job.status === "impresso" && <CheckCircle2 size={16} className="text-green-500" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-3">Pré-visualização</h2>
            {currentPedido && currentJob ? (
              <div>
                <div className="bg-stone-200 rounded-xl p-4 flex justify-center" style={{ minHeight: "400px" }}>
                  <ReceiptPreview pedido={currentPedido} tipo={currentJob.tipo} size={bobinaSize} />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      const content = currentJob.tipo === "bar" ? barReceiptContent(currentPedido) : caixaReceiptContent(currentPedido);
                      printReceipt(content).then(() => {
                        if (currentJob.status === "pendente") db.marcarImpresso(currentJob.id);
                        toast.success("Impresso!");
                      });
                    }}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                  >
                    <Printer size={16} /> Imprimir
                  </button>
                  <button
                    onClick={() => {
                      db.reimprimir(currentPedido.id, "bar");
                      db.reimprimir(currentPedido.id, "caixa");
                      toast.success("Reimpressão dupla solicitada");
                    }}
                    className="flex-1 bg-stone-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={16} /> Reimprimir Ambos
                  </button>
                  <button
                    onClick={() => {
                      const data = currentJob.tipo === "bar" ? generateBarEscPos(currentPedido) : generateCaixaEscPos(currentPedido);
                      downloadEscPos(data, `comanda-${currentPedido.numero}-${currentJob.tipo}.bin`);
                      toast.success("Arquivo ESC/POS exportado");
                    }}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                  >
                    <Download size={16} /> ESC/POS
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-stone-100 rounded-xl p-8 text-center text-stone-500">
                Selecione um item da fila para visualizar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
