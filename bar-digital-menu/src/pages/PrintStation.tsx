import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  Loader2,
  Pause,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  Settings2,
  Wifi,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBar } from '@/lib/bar-context';
import { Badge, Button, Card, Toggle, Vazio } from '@/components/ui';
import { CupomBobina, gerarHtmlImpressao } from '@/components/Receipt';
import { construirCupom, type CupomModel } from '@/lib/receipt';
import { bytesParaHex, gerarEscPos, nomeArquivoBin } from '@/lib/escpos';
import { baixarArquivo, imprimirHtml } from '@/lib/printer';
import { dataHora } from '@/lib/format';
import type { Codepage } from '@/lib/codepages';
import type { DestinoImpressao, PrintJob } from '@/types';

const DESTINO_ROTULO: Record<DestinoImpressao, string> = {
  bar: 'Bar (preparo)',
  caixa: 'Caixa (conferência)',
  duplo: 'Caixa + Bar',
};

export function PrintStation() {
  const {
    config,
    printJobs,
    filaImpressao,
    historicoImpressao,
    pedidoPorId,
    marcarImpressao,
    atualizarConfig,
    solicitarImpressao,
  } = useBar();

  const [autoPrint, setAutoPrint] = useState(true);
  /** "silencioso" marca o job como impresso sem abrir o diálogo do navegador. */
  const [modoSilencioso, setModoSilencioso] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [jobSelecionadoId, setJobSelecionadoId] = useState<string | null>(null);
  const [erroPrint, setErroPrint] = useState<string | null>(null);
  const [mostrarBytes, setMostrarBytes] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const filaLock = useRef(false);

  /* ------------------------------ derivados ------------------------------ */

  const fila = useMemo(
    () => [...filaImpressao].sort((a, b) => a.criado_em.localeCompare(b.criado_em)),
    [filaImpressao],
  );

  const jobAtual = useMemo(() => {
    if (jobSelecionadoId) {
      const encontrado = printJobs.find((j) => j.id === jobSelecionadoId);
      if (encontrado) return encontrado;
    }
    return fila[0] ?? historicoImpressao[0] ?? null;
  }, [jobSelecionadoId, printJobs, fila, historicoImpressao]);

  const cupons = useMemo<CupomModel[]>(() => {
    if (!jobAtual) return [];
    const pedido = pedidoPorId(jobAtual.pedido_id);
    if (!pedido) return [];
    const destinos: Array<'bar' | 'caixa'> =
      jobAtual.destino === 'duplo' ? ['bar', 'caixa'] : [jobAtual.destino];
    return destinos.map((destino) =>
      construirCupom(pedido, {
        largura: jobAtual.largura,
        destino,
        config,
        fechamento: jobAtual.fechamento,
      }),
    );
  }, [jobAtual, pedidoPorId, config]);

  const bytesAtual = useMemo(() => {
    if (!cupons.length || !jobAtual) return new Uint8Array();
    const partes = cupons.map((cupom) =>
      gerarEscPos(cupom, {
        codepage: config.codepage,
        bipe: config.bipe_impressora,
        abrirGaveta: config.abrir_gaveta && cupom.destino === 'caixa',
        cortar: true,
        avancoFinal: 4,
      }),
    );
    const total = partes.reduce((acc, p) => acc + p.length, 0);
    const unificado = new Uint8Array(total);
    let offset = 0;
    partes.forEach((p) => {
      unificado.set(p, offset);
      offset += p.length;
    });
    return unificado;
  }, [cupons, jobAtual, config.codepage, config.bipe_impressora, config.abrir_gaveta]);

  /* ------------------------------ impressao ------------------------------ */

  const processarJob = useCallback(
    async (job: PrintJob) => {
      const pedido = pedidoPorId(job.pedido_id);
      if (!pedido) {
        await marcarImpressao(job.id, 'erro', 'Pedido não encontrado.');
        return;
      }
      const destinos: Array<'bar' | 'caixa'> =
        job.destino === 'duplo' ? ['bar', 'caixa'] : [job.destino];
      const modelos = destinos.map((destino) =>
        construirCupom(pedido, {
          largura: job.largura,
          destino,
          config,
          fechamento: job.fechamento,
        }),
      );

      setProcessandoId(job.id);
      setJobSelecionadoId(job.id);

      try {
        if (modoSilencioso) {
          await marcarImpressao(job.id, 'simulado');
          return;
        }
        await marcarImpressao(job.id, 'imprimindo');
        const html = gerarHtmlImpressao(modelos);
        const resultado = await imprimirHtml(
          html,
          `Comanda ${job.comanda} · ${DESTINO_ROTULO[job.destino]}`,
        );
        if (resultado.ok) {
          await marcarImpressao(job.id, 'impresso');
          setErroPrint(null);
          toast.success(`Comanda #${job.comanda} enviada para a impressora`, {
            description: `${DESTINO_ROTULO[job.destino]} · bobina ${job.largura}mm`,
          });
        } else {
          await marcarImpressao(job.id, 'erro', resultado.erro ?? 'Falha desconhecida.');
          setErroPrint(
            resultado.erro ??
              'O navegador bloqueou a impressão automática. Toque em "Imprimir agora".',
          );
        }
      } finally {
        setProcessandoId(null);
      }
    },
    [config, marcarImpressao, modoSilencioso, pedidoPorId],
  );

  /* --------------------------- auto-print (fila) -------------------------- */
  useEffect(() => {
    if (!autoPrint || processandoId || filaLock.current) return;
    // Somente jobs "pendente": o job em impressao ja foi marcado como
    // "imprimindo" e nao deve ser pego de novo nesta rodada.
    const proximo = fila.find((j) => j.status === 'pendente');
    if (!proximo) return;
    filaLock.current = true;
    void processarJob(proximo).finally(() => {
      filaLock.current = false;
    });
  }, [autoPrint, fila, processandoId, processarJob]);

  /* -------------------------------- acoes -------------------------------- */

  async function imprimirFila() {
    if (!fila.length) return;
    for (const job of fila) {
      await processarJob(job);
    }
  }

  function exportarBinario() {
    if (!jobAtual || !bytesAtual.length) return;
    const nome = cupons.length > 1
      ? `comanda-${String(jobAtual.comanda).padStart(4, '0')}-duplo-${jobAtual.largura}mm.bin`
      : nomeArquivoBin(cupons[0]);
    baixarArquivo(bytesAtual, nome);
    toast.success('Arquivo ESC/POS exportado', {
      description: `${nome} · ${bytesAtual.length} bytes`,
    });
  }

  function exportarHtml() {
    if (!cupons.length || !jobAtual) return;
    const html = gerarHtmlImpressao(cupons);
    baixarArquivo(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `comanda-${String(jobAtual.comanda).padStart(4, '0')}.html`,
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      {/* ------------------------------ topo ------------------------------ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-xs">Estação de impressão</p>
          <h1 className="font-display text-3xl text-ink-50">Auto-print · Bobina térmica</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={autoPrint ? 'primary' : 'outline'}
            size="sm"
            icone={autoPrint ? <Pause size={15} /> : <Play size={15} />}
            onClick={() => {
              setAutoPrint((v) => !v);
              setErroPrint(null);
            }}
          >
            {autoPrint ? 'Auto-print ativo' : 'Auto-print pausado'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icone={<Settings2 size={15} />}
            onClick={() => setMostrarConfig((v) => !v)}
          >
            Configurações
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icone={<ExternalLink size={15} />}
            onClick={() => window.open('/impressao', '_blank', 'noopener,noreferrer')}
          >
            Abrir em nova aba
          </Button>
        </div>
      </div>

      {/* ------------------------ aviso de bloqueio ------------------------ */}
      {erroPrint && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[.08] px-4 py-3">
          <AlertTriangle size={17} className="shrink-0 text-amber-300" />
          <p className="flex-1 text-sm text-amber-100">
            {erroPrint} — navegadores costumam exigir um clique antes de imprimir.
          </p>
          <div className="flex gap-2">
            <Button size="sm" icone={<Printer size={15} />} onClick={() => void imprimirFila()}>
              Imprimir agora
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icone={<XCircle size={15} />}
              onClick={() => setErroPrint(null)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* --------------------------- configuracoes -------------------------- */}
      {mostrarConfig && (
        <Card className="mt-4 animate-slide-up p-5">
          <h2 className="font-display text-lg text-ink-50">Configuração da impressão</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="label-xs">Largura da bobina</p>
              <div className="mt-2 flex gap-2">
                {([80, 58] as const).map((largura) => (
                  <button
                    key={largura}
                    onClick={() => void atualizarConfig({ largura_bobina: largura })}
                    className={[
                      'flex-1 cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[.97]',
                      config.largura_bobina === largura
                        ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                        : 'border-white/[.08] bg-ink-800 text-ink-100/65 hover:border-amber-400/40',
                    ].join(' ')}
                  >
                    {largura}mm
                    <span className="mt-0.5 block text-[10px] font-normal opacity-60">
                      {largura === 80 ? '48 colunas' : '32 colunas'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label-xs">Code page (acentuação)</p>
              <select
                value={config.codepage}
                onChange={(e) => void atualizarConfig({ codepage: e.target.value as Codepage })}
                className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-white/[.08] bg-ink-800 px-3 text-sm text-ink-50"
              >
                <option value="cp850">CP850 — padrão Brasil (Epson, Elgin, Bematech)</option>
                <option value="cp860">CP860 — Português (Epson antigos)</option>
                <option value="ascii">ASCII — sem acentos (fallback)</option>
              </select>
              <p className="mt-1.5 text-[11px] text-ink-100/40">
                Se os acentos saírem errados na sua impressora, troque a code page.
              </p>
            </div>

            <div className="lg:col-span-2 grid gap-2 sm:grid-cols-2">
              <Toggle
                ligado={modoSilencioso}
                onChange={setModoSilencioso}
                rotulo="Modo silencioso"
                descricao="Marca os cupons como impressos sem abrir o diálogo do navegador (útil em demonstrações)."
              />
              <Toggle
                ligado={config.bipe_impressora}
                onChange={(v) => void atualizarConfig({ bipe_impressora: v })}
                rotulo="Bipe na impressora"
                descricao="Envia ESC (A 04 00 30 34 02 0A — requer buzzer na impressora."
              />
              <Toggle
                ligado={config.abrir_gaveta}
                onChange={(v) => void atualizarConfig({ abrir_gaveta: v })}
                rotulo="Abrir gaveta no fechamento"
                descricao="Envia o pulso ESC p 0 25 250 no cupom do caixa."
              />
              <Toggle
                ligado={mostrarBytes}
                onChange={setMostrarBytes}
                rotulo="Inspetor de bytes ESC/POS"
                descricao="Mostra o dump hexadecimal gerado para o cupom selecionado."
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[.07] bg-ink-800/50 px-4 py-3">
              <p className="label-xs">Impressora do bar</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-50">
                <Wifi size={14} className="text-emerald-400" />
                {config.impressora_bar}
              </p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-ink-800/50 px-4 py-3">
              <p className="label-xs">Impressora do caixa</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-50">
                <Wifi size={14} className="text-emerald-400" />
                {config.impressora_caixa}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* -------------------------- fila + cupom -------------------------- */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[340px_1fr]">
        {/* Fila */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg text-ink-50">Fila de impressão</h2>
              <Badge tom={fila.length ? 'alerta' : 'pronto'}>{fila.length}</Badge>
            </div>

            {fila.length === 0 ? (
              <p className="mt-3 text-center text-sm text-ink-100/40">
                Nenhum cupom na fila. Os pedidos entram aqui automaticamente.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {fila.map((job) => (
                  <li
                    key={job.id}
                    className={[
                      'rounded-xl border px-3 py-2.5 transition-colors',
                      jobAtual?.id === job.id
                        ? 'border-amber-400/50 bg-amber-400/[.08]'
                        : 'border-white/[.07] bg-ink-800/50',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setJobSelecionadoId(job.id)}
                        className="min-w-0 cursor-pointer text-left"
                      >
                        <span className="block text-sm font-semibold text-ink-50">
                          #{job.comanda} · Mesa {String(job.mesa_numero).padStart(2, '0')}
                        </span>
                        <span className="block text-[11px] text-ink-100/45">
                          {DESTINO_ROTULO[job.destino]} · {job.largura}mm · {job.origem === 'auto' ? 'auto' : 'manual'}
                        </span>
                      </button>
                      {processandoId === job.id ? (
                        <Loader2 size={16} className="shrink-0 animate-spin text-amber-300" />
                      ) : (
                        <button
                          onClick={() => void processarJob(job)}
                          aria-label="Imprimir agora"
                          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-300 transition-colors hover:bg-amber-400/20"
                        >
                          <Printer size={14} />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 flex-1 px-2 text-[11px]"
                        icone={<Eye size={12} />}
                        onClick={() => setJobSelecionadoId(job.id)}
                      >
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 flex-1 px-2 text-[11px]"
                        icone={<CheckCircle2 size={12} />}
                        onClick={async () => {
                          await marcarImpressao(job.id, 'simulado');
                          toast('Cupom marcado como impresso (simulado)');
                        }}
                      >
                        Dispensar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                bloco
                icone={<Printer size={15} />}
                disabled={!fila.length || Boolean(processandoId)}
                onClick={() => void imprimirFila()}
              >
                {processandoId ? 'Imprimindo…' : `Imprimir fila (${fila.length})`}
              </Button>
            </div>
          </Card>

          {/* Histórico */}
          <Card className="p-4">
            <h2 className="font-display text-lg text-ink-50">Histórico</h2>
            {historicoImpressao.length === 0 ? (
              <p className="mt-3 text-center text-sm text-ink-100/40">Sem impressões registradas.</p>
            ) : (
              <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {historicoImpressao.slice(0, 25).map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center gap-2 rounded-xl border border-white/[.06] bg-ink-800/40 px-3 py-2"
                  >
                    <button
                      onClick={() => setJobSelecionadoId(job.id)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <span className="block text-sm text-ink-50">
                        #{job.comanda}
                        <span className="ml-1.5 text-[11px] text-ink-100/45">
                          {DESTINO_ROTULO[job.destino]}
                        </span>
                      </span>
                      <span className="block text-[10px] text-ink-100/40">
                        {dataHora(job.impresso_em ?? job.criado_em)} · {job.status}
                        {job.tentativas > 1 ? ` · ${job.tentativas}x` : ''}
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        const novo = await solicitarImpressao(
                          job.pedido_id,
                          job.destino,
                          'Reimpressão pela estação',
                        );
                        if (novo) {
                          setJobSelecionadoId(novo.id);
                          toast.success(`Comanda #${job.comanda} reenviada para a fila`);
                        }
                      }}
                      aria-label="Reimprimir"
                      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-100/45 transition-colors hover:bg-white/[.07] hover:text-amber-300"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Visualizador */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-ink-50">
                  {jobAtual ? `Comanda #${jobAtual.comanda}` : 'Visualizador de bobina'}
                </h2>
                <p className="mt-0.5 text-xs text-ink-100/45">
                  {jobAtual
                    ? `${DESTINO_ROTULO[jobAtual.destino]} · bobina ${jobAtual.largura}mm · ${jobAtual.fechamento ? 'recibo de pagamento' : 'comanda'}`
                    : 'Envie um pedido para gerar os cupons'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icone={<Printer size={15} />} onClick={() => jobAtual && void processarJob(jobAtual)}>
                  Imprimir
                </Button>
                <Button size="sm" variant="secondary" icone={<FileDown size={15} />} onClick={exportarHtml}>
                  HTML
                </Button>
                <Button size="sm" icone={<Download size={15} />} onClick={exportarBinario}>
                  Exportar .bin
                </Button>
              </div>
            </div>

            {cupons.length === 0 ? (
              <Vazio
                icone={<Printer size={22} />}
                titulo="Nenhum cupom para exibir"
                descricao="Os cupons do bar e do caixa aparecem aqui assim que um pedido é enviado."
              />
            ) : (
              <div className="mt-5 flex flex-wrap items-start justify-center gap-6 overflow-x-auto pb-2">
                {cupons.map((cupom) => (
                  <div key={cupom.destino} className="flex flex-col items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-ink-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-100/60">
                      {cupom.destino === 'bar' ? 'Cupom do bar' : 'Cupom do caixa'}
                    </span>
                    <div className="overflow-x-auto">
                      <CupomBobina cupom={cupom} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Inspetor de bytes */}
          {mostrarBytes && bytesAtual.length > 0 && (
            <Card className="animate-slide-up p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg text-ink-50">Bytes ESC/POS</h2>
                <span className="text-xs text-ink-100/45">
                  {bytesAtual.length} bytes · {config.codepage.toUpperCase()}
                </span>
              </div>
              <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/[.07] bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/80">
                {bytesParaHex(bytesAtual).slice(0, 4000)}
              </pre>
              <p className="mt-2 text-[11px] text-ink-100/40">
                Envie este arquivo direto para a porta USB/serial da impressora (cat comanda.bin &gt;
                /dev/usb/lp0) ou use o modo de impressora genérica/texto.
              </p>
            </Card>
          )}

          {/* Dicas */}
          <Card className="p-4">
            <h2 className="font-display text-lg text-ink-50">Como imprimir de verdade</h2>
            <ol className="mt-3 space-y-2 text-sm text-ink-100/60">
              <li className="flex gap-2">
                <span className="text-amber-300">1.</span>
                Abra esta estação em uma aba própria (botão “Abrir em nova aba”) — navegadores
                bloqueiam impressão dentro de iframes.
              </li>
              <li className="flex gap-2">
                <span className="text-amber-300">2.</span>
                No diálogo de impressão escolha a impressora térmica e o papel{' '}
                {config.largura_bobina}mm, margens “nenhuma”.
              </li>
              <li className="flex gap-2">
                <span className="text-amber-300">3.</span>
                Para duas impressoras simultâneas, rode uma estação por impressora e filtre o
                destino (bar ou caixa) — ou exporte o .bin e envie por socket/USB.
              </li>
              <li className="flex gap-2">
                <span className="text-amber-300">4.</span>
                Chrome/Edge mantêm a escolha de impressora por origem, então a seleção fica salva.
              </li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                icone={<RefreshCw size={15} />}
                onClick={() => void atualizarConfig({ bipe_impressora: !config.bipe_impressora })}
              >
                Bipe: {config.bipe_impressora ? 'ligado' : 'desligado'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icone={<Printer size={15} />}
                onClick={() => void atualizarConfig({ abrir_gaveta: !config.abrir_gaveta })}
              >
                Gaveta: {config.abrir_gaveta ? 'automática' : 'manual'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
