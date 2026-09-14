import { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { StaffGuard } from "../components/StaffGuard";
import { useDb } from "../hooks/useDb";
import { ReceiptPreview } from "../components/ReceiptPreview";
import { toast } from "sonner";
import {
  buildCupomModel,
  executePrintReceipt,
  printReceiptViaPopup,
  formatMoney,
} from "../lib/receipt";
import {
  generateEscPosBytes,
  downloadEscPos,
  inspectEscPosBytes,
  type ByteInspectorRow,
} from "../lib/escpos";
import { playBeep, unlockAudio } from "../lib/audio";
import {
  Printer,
  Download,
  RefreshCw,
  CheckCircle2,
  Binary,
  Volume2,
  FileText,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { BobinaSize, PrintJob } from "../types";

export function PrintStation() {
  const db = useDb();
  const [autoPrint, setAutoPrint] = useState(false);
  const [bobinaSize, setBobinaSize] = useState<BobinaSize>("80mm");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showByteInspector, setShowByteInspector] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const prevPendentesRef = useRef<number>(0);
  const isAutoPrintingRef = useRef<boolean>(false);

  const pendentes = db.getPrintJobsPendentes();
  const allJobs = [...db.print_jobs].sort((a, b) => {
    if (a.status === "pendente" && b.status !== "pendente") return -1;
    if (a.status !== "pendente" && b.status === "pendente") return 1;
    return b.createdAt - a.createdAt;
  });

  // Sound alert on new incoming print job
  useEffect(() => {
    if (pendentes.length > prevPendentesRef.current) {
      playBeep("new_order");
    }
    prevPendentesRef.current = pendentes.length;
  }, [pendentes.length]);

  // Auto-print effect
  useEffect(() => {
    if (!autoPrint) return;

    if (pendentes.length > 0 && !isAutoPrintingRef.current) {
      const nextJob = [...pendentes].sort((a, b) => a.createdAt - b.createdAt)[0];
      if (nextJob) {
        const pedido = db.getPedidoById(nextJob.pedidoId);
        if (pedido) {
          isAutoPrintingRef.current = true;
          const cupom = buildCupomModel(pedido, nextJob.tipo, bobinaSize);

          playBeep(nextJob.tipo === "bar" ? "new_order" : "cashier");

          executePrintReceipt(cupom)
            .then(() => {
              db.marcarImpresso(nextJob.id);
              toast.success(
                `Comanda #${nextJob.pedidoNumero} (${nextJob.tipo.toUpperCase()}) enviada para impressão!`
              );
            })
            .finally(() => {
              isAutoPrintingRef.current = false;
            });
        }
      }
    }
  }, [db.version, autoPrint, bobinaSize, pendentes]);

  // Selected job for preview
  const currentJob: PrintJob | undefined =
    allJobs.find((j) => j.id === selectedJobId) || pendentes[0] || allJobs[0];
  const currentPedido = currentJob?.pedidoId ? db.getPedidoById(currentJob.pedidoId) : undefined;

  const currentCupom = currentPedido && currentJob
    ? buildCupomModel(currentPedido, currentJob.tipo, bobinaSize)
    : null;

  const currentEscPosBytes = currentCupom
    ? generateEscPosBytes(currentCupom, "CP850", {
        buzzer: currentCupom.tipo === "bar",
        openDrawer: currentCupom.tipo === "caixa",
      })
    : null;

  const byteDump: ByteInspectorRow[] = currentEscPosBytes
    ? inspectEscPosBytes(currentEscPosBytes)
    : [];

  const handlePrintCupom = async (cupomToPrint = currentCupom, jobToMark = currentJob) => {
    if (!cupomToPrint || !jobToMark) return;
    unlockAudio();
    setIsPrinting(true);

    try {
      toast.info(`Abrindo impressão para Comanda #${cupomToPrint.pedidoNumero}...`);
      await executePrintReceipt(cupomToPrint);
      db.marcarImpresso(jobToMark.id);
      playBeep("ready");
      toast.success(`Cupom #${cupomToPrint.pedidoNumero} impresso com sucesso!`);
    } catch (err) {
      console.warn("Print error, opening popup fallback:", err);
      await printReceiptViaPopup(cupomToPrint);
      db.marcarImpresso(jobToMark.id);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintAllPending = async () => {
    if (pendentes.length === 0) return;
    unlockAudio();
    toast.info(`Iniciando impressão de ${pendentes.length} comandas pendentes...`);

    for (const job of pendentes) {
      const pedido = db.getPedidoById(job.pedidoId);
      if (pedido) {
        const cupom = buildCupomModel(pedido, job.tipo, bobinaSize);
        await executePrintReceipt(cupom);
        db.marcarImpresso(job.id);
      }
    }
    toast.success("Todas as comandas pendentes foram processadas!");
  };

  const handleDownloadBin = () => {
    if (!currentEscPosBytes || !currentCupom) return;
    const filename = `cupom-${currentCupom.tipo}-mesa${currentCupom.mesaNumero}-ped${currentCupom.pedidoNumero}.bin`;
    downloadEscPos(currentEscPosBytes, filename);
    toast.success(`Arquivo binário ESC/POS exportado: ${filename}`);
  };

  const handleOpenPopup = () => {
    if (!currentCupom) return;
    printReceiptViaPopup(currentCupom);
  };

  const handleTestBuzzer = () => {
    unlockAudio();
    playBeep("new_order");
    toast.info("Comando de bipe sonoro disparado (ESC ( A 04 00 30 34 02 0A)");
  };

  return (
    <StaffGuard areaName="Estação de Impressão">
      <div className="min-h-screen bg-[#120e0b] text-stone-100 pb-16">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Pending Orders Notice Alert Banner */}
          {pendentes.length > 0 && (
            <div className="bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-600/30 border border-amber-500/50 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold flex-shrink-0 animate-pulse">
                  <Printer size={22} />
                </div>
                <div>
                  <div className="font-bold text-sm text-amber-200">
                    {pendentes.length} Comanda{pendentes.length > 1 ? "s" : ""} Aguardando Impressão
                  </div>
                  <div className="text-xs text-stone-300">
                    Clique no botão ao lado para imprimir todas em sequência na sua impressora térmica.
                  </div>
                </div>
              </div>

              <button
                onClick={handlePrintAllPending}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-95 transition min-h-[44px] whitespace-nowrap"
              >
                <Printer size={16} />
                <span>Imprimir Todas ({pendentes.length})</span>
              </button>
            </div>
          )}

          {/* Top Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#2d241e]">
            <div>
              <div className="flex items-center gap-2">
                <Printer className="text-amber-400" size={26} />
                <h1 className="font-display font-bold text-2xl text-white">Estação de Impressão Simultânea</h1>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Fila FIFO de bobinas térmicas • Cupom do Bar (preparo) e do Caixa (conferência) via mesmo modelo
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Paper Size selector */}
              <div className="bg-[#1c1611] border border-[#2d241e] rounded-xl p-1 flex items-center">
                {(["80mm", "58mm"] as BobinaSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setBobinaSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all min-h-[38px] ${
                      bobinaSize === s
                        ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Bobina {s}
                  </button>
                ))}
              </div>

              {/* Test Beep */}
              <button
                onClick={handleTestBuzzer}
                className="px-3 py-2 bg-[#231c16] hover:bg-[#2d241e] border border-[#3a2f27] text-stone-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition min-h-[44px]"
                title="Testar bipe de comanda"
              >
                <Volume2 size={16} className="text-amber-400" />
                <span>Testar Bipe</span>
              </button>

              {/* Auto-print toggle */}
              <button
                onClick={() => {
                  unlockAudio();
                  const nextState = !autoPrint;
                  setAutoPrint(nextState);
                  if (nextState) {
                    toast.success("Auto-Print ATIVADO: novas comandas acionam impressão automática.");
                  } else {
                    toast.info("Auto-Print DESATIVADO: use o botão 'Imprimir' quando desejar.");
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg min-h-[44px] ${
                  autoPrint
                    ? "bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400"
                    : "bg-[#231c16] border border-[#3a2f27] text-stone-300 hover:text-white"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${autoPrint ? "bg-emerald-200 animate-ping" : "bg-stone-500"}`} />
                <span>Auto-Print: {autoPrint ? "LIGADO" : "DESLIGADO"}</span>
              </button>
            </div>
          </div>

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: FIFO Print Queue (5 cols) */}
            <div className="lg:col-span-5 bg-[#1a1410] border border-[#2d241e] rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d241e]">
                <div className="flex items-center gap-2">
                  <Layers className="text-amber-400" size={18} />
                  <h2 className="font-display font-bold text-base text-white">Fila FIFO de Impressão</h2>
                </div>
                <div className="flex items-center gap-2">
                  {pendentes.length > 0 ? (
                    <span className="bg-amber-500 text-stone-950 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                      {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono px-2 py-0.5 rounded-full">
                      Fila vazia
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 max-h-[620px] overflow-y-auto scrollbar-thin pr-1">
                {allJobs.length === 0 ? (
                  <div className="text-center py-16 text-stone-500">
                    <Printer size={40} className="mx-auto mb-2 opacity-30 text-amber-500" />
                    <p className="text-sm font-medium">Nenhum cupom na fila de impressão.</p>
                    <p className="text-xs text-stone-600 mt-1">
                      Faça um pedido no Cardápio Mobile para gerar comandas simultâneas.
                    </p>
                  </div>
                ) : (
                  allJobs.map((job) => {
                    const pedido = db.getPedidoById(job.pedidoId);
                    const isSelected = currentJob?.id === job.id;
                    const isPendente = job.status === "pendente";

                    return (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-[#281f18] border-amber-500 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/50"
                            : isPendente
                            ? "bg-[#201812] border-amber-600/40 hover:border-amber-500/60"
                            : "bg-[#16110d] border-[#2d241e] hover:bg-[#1f1712] opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              job.tipo === "bar"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            }`}
                          >
                            {job.tipo === "bar" ? "BAR" : "CAIXA"}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-stone-100">
                                #{String(job.pedidoNumero).padStart(4, "0")}
                              </span>
                              {pedido && (
                                <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  Mesa {String(pedido.mesaNumero).padStart(2, "0")}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-400 truncate mt-0.5">
                              {pedido
                                ? `${pedido.itens.length} itens • ${formatMoney(pedido.total)}`
                                : "Pedido arquivado"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isPendente ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (pedido) {
                                  const cupom = buildCupomModel(pedido, job.tipo, bobinaSize);
                                  handlePrintCupom(cupom, job);
                                }
                              }}
                              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 transition min-h-[36px]"
                            >
                              <Printer size={14} />
                              <span>Imprimir</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                              <CheckCircle2 size={13} />
                              <span>Impresso</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Live Thermal Receipt Preview & Controls (7 cols) */}
            <div className="lg:col-span-7 bg-[#1a1410] border border-[#2d241e] rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2d241e] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="text-amber-400" size={18} />
                  <h2 className="font-display font-bold text-base text-white">Visualizador da Bobina Térmica</h2>
                </div>

                {currentJob && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowByteInspector(!showByteInspector)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition min-h-[38px] ${
                        showByteInspector
                          ? "bg-amber-500 text-stone-950 border-amber-400"
                          : "bg-[#231c16] text-amber-300 border-amber-500/30 hover:bg-[#2d241e]"
                      }`}
                    >
                      <Binary size={15} />
                      <span>{showByteInspector ? "Ocultar Bytes" : "Inspetor ESC/POS"}</span>
                    </button>
                  </div>
                )}
              </div>

            {currentCupom && currentJob ? (
              <div>
                {/* Thermal Preview Paper Canvas */}
                <div className="bg-[#0e0a08] border border-[#2d241e] rounded-2xl p-6 flex justify-center items-center overflow-x-auto min-h-[460px] relative">
                  <ReceiptPreview cupom={currentCupom} size={bobinaSize} />
                </div>

                {/* Operations Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mt-4">
                  {/* Primary Print Button */}
                  <button
                    onClick={() => handlePrintCupom(currentCupom, currentJob)}
                    disabled={isPrinting}
                    className="sm:col-span-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition min-h-[44px]"
                  >
                    <Printer size={16} />
                    <span>{isPrinting ? "Enviando..." : "Imprimir Cupom Térmico"}</span>
                  </button>

                  {/* Open in Separate Window Fallback */}
                  <button
                    onClick={handleOpenPopup}
                    className="bg-[#241c16] hover:bg-[#2f241d] border border-[#3a2f27] text-stone-200 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition min-h-[44px]"
                    title="Abre o cupom em janela avulsa para impressão"
                  >
                    <ExternalLink size={15} className="text-amber-400" />
                    <span>Nova Janela</span>
                  </button>

                  {/* Export .bin button */}
                  <button
                    onClick={handleDownloadBin}
                    className="bg-[#281c30] hover:bg-[#34243f] border border-purple-500/40 text-purple-200 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition min-h-[44px]"
                  >
                    <Download size={15} className="text-purple-300" />
                    <span>.BIN ESC/POS</span>
                  </button>
                </div>

                {/* Secondary Action: Reprint both Bar and Caixa */}
                <div className="mt-2.5">
                  <button
                    onClick={() => {
                      if (currentPedido) {
                        db.reimprimir(currentPedido.id, "bar");
                        db.reimprimir(currentPedido.id, "caixa");
                        playBeep("ready");
                        toast.success("Reimpressão dupla adicionada à fila (Bar + Caixa)");
                      }
                    }}
                    className="w-full bg-[#1c1510] hover:bg-[#261c16] border border-[#2d241e] text-stone-300 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition min-h-[38px]"
                  >
                    <RefreshCw size={13} className="text-amber-400" />
                    <span>Reimprimir Comandas Desta Mesa (Bar & Caixa)</span>
                  </button>
                </div>

                {/* Byte Inspector Panel */}
                {showByteInspector && (
                  <div className="mt-5 p-4 rounded-2xl bg-[#0c0806] border border-amber-500/30 text-stone-300 font-mono text-[11px] leading-tight">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#231b14]">
                      <div className="flex items-center gap-2">
                        <Binary size={16} className="text-amber-400" />
                        <span className="font-bold text-white uppercase tracking-wider">
                          Inspetor de Bytes ESC/POS (CP850 / CP860)
                        </span>
                      </div>
                      <span className="text-stone-400 text-[10px]">
                        {currentEscPosBytes?.length || 0} bytes gerados
                      </span>
                    </div>

                    <div className="text-[10px] text-stone-400 mb-2 font-mono flex items-center gap-4 bg-[#140e0a] p-2 rounded-lg">
                      <span>OFFSET</span>
                      <span className="flex-1">HEX (16 BYTES POR LINHA)</span>
                      <span>ASCII DECODED</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-0.5 select-all pr-1">
                      {byteDump.map((row, idx) => (
                        <div key={idx} className="flex font-mono text-[11px] hover:bg-stone-900/60 py-0.5 px-1 rounded">
                          <span className="text-amber-400 w-14 flex-shrink-0">{row.offset}:</span>
                          <span className="text-stone-200 flex-1 tracking-wider overflow-hidden truncate">
                            {row.hex}
                          </span>
                          <span className="text-amber-200/80 w-28 text-right flex-shrink-0 font-mono">
                            {row.ascii}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#231b14] flex flex-wrap gap-3 text-[10px] text-stone-400">
                      <div><span className="text-amber-400">1B 40</span> = ESC @ (Init)</div>
                      <div><span className="text-amber-400">1B 74 02</span> = ESC t CP850</div>
                      <div><span className="text-amber-400">1D 56 42 00</span> = Corte Total</div>
                      <div><span className="text-amber-400">1B 70 00 19 FA</span> = Gaveta</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-stone-500">
                <Printer size={48} className="mx-auto mb-3 opacity-30 text-amber-500" />
                <p className="text-sm font-medium">Selecione uma comanda da fila para visualizar</p>
              </div>
            )}
            </div>
          </div>
        </main>
      </div>
    </StaffGuard>
  );
}
