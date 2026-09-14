import { useMemo } from 'react';
import type { CupomModel, LinhaCupom } from '@/lib/receipt';

/* ==========================================================================
   Renderizador de cupom.
   O mesmo `CupomModel` alimenta tres saidas:
     1. <CupomBobina />  -> visualizador de bobina na tela (com serrilha)
     2. gerarHtmlImpressao() -> HTML enviado ao iframe oculto (window.print)
     3. gerarEscPos()    -> bytes para a impressora termica (lib/escpos.ts)
   ========================================================================== */

/** 1mm = 3.7795px a 96dpi. */
const MM_PX = 3.7795;

export function larguraEmPx(largura: 80 | 58): number {
  return Math.round(largura * MM_PX);
}

/* -------------------------------------------------------------------------- */
/* Serrilha (borda serrilhada do papel termico)                               */
/* -------------------------------------------------------------------------- */

function caminhoSerrilha(largura: number, altura: number, dentes: number, invertida: boolean): string {
  const passo = largura / dentes;
  let d = invertida ? `M0,${altura} L0,0` : `M0,0 L0,${altura}`;
  for (let i = 0; i < dentes; i += 1) {
    const x = i * passo;
    const meio = x + passo / 2;
    const fim = x + passo;
    d += invertida
      ? ` L${meio.toFixed(2)},${altura.toFixed(2)} L${fim.toFixed(2)},0`
      : ` L${meio.toFixed(2)},0 L${fim.toFixed(2)},${altura.toFixed(2)}`;
  }
  d += ` L${largura},${invertida ? 0 : altura} L${largura},${invertida ? altura : 0} Z`;
  return d;
}

function Serrilha({
  larguraPx,
  cor,
  posicao,
}: {
  larguraPx: number;
  cor: string;
  posicao: 'topo' | 'base';
}) {
  const altura = 8;
  const dentes = Math.max(8, Math.round(larguraPx / 9));
  const invertida = posicao === 'base';
  const d = useMemo(() => caminhoSerrilha(larguraPx, altura, dentes, invertida), [larguraPx, altura, dentes, invertida]);

  return (
    <svg
      width={larguraPx}
      height={altura}
      viewBox={`0 0 ${larguraPx} ${altura}`}
      className={posicao === 'topo' ? 'block' : 'block'}
      aria-hidden="true"
      style={{ display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.4))' }}
    >
      <path d={d} fill={cor} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Linha do cupom                                                             */
/* -------------------------------------------------------------------------- */

function classesDaLinha(linha: LinhaCupom): string {
  return [
    'receipt-line',
    linha.duplo ? 'receipt-line--duplo' : '',
    linha.condensado && !linha.duplo ? 'receipt-line--condensado' : '',
    linha.negrito ? 'font-bold' : '',
    linha.separador ? 'text-black/35' : '',
    linha.invertido ? 'receipt-line--invertido px-1' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function estiloDaLinha(linha: LinhaCupom): React.CSSProperties {
  return {
    textAlign: linha.alinhar === 'centro' ? 'center' : linha.alinhar === 'direita' ? 'right' : 'left',
    marginBottom: linha.espacoDepois ? `${linha.espacoDepois * 0.24}em` : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Visualizador de bobina                                                     */
/* -------------------------------------------------------------------------- */

export function CupomBobina({
  cupom,
  escala = 1,
}: {
  cupom: CupomModel;
  escala?: number;
}) {
  const larguraPx = larguraEmPx(cupom.largura);
  const papel = '#fdfbf7';

  return (
    <div
      className="inline-block"
      style={{ transform: `scale(${escala})`, transformOrigin: 'top center' }}
    >
      <div style={{ width: larguraPx }} className="drop-shadow-2xl">
        <Serrilha larguraPx={larguraPx} cor={papel} posicao="topo" />
        <div
          className="receipt-paper overflow-hidden"
          style={{ width: larguraPx, padding: '10px 12px 14px', fontSize: 12 }}
        >
          {cupom.linhas.map((linha, i) => (
            <div key={i} className={classesDaLinha(linha)} style={estiloDaLinha(linha)}>
              {linha.texto || '\u00a0'}
            </div>
          ))}
        </div>
        <Serrilha larguraPx={larguraPx} cor={papel} posicao="base" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HTML de impressao (iframe oculto)                                          */
/* -------------------------------------------------------------------------- */

function linhaParaHtml(linha: LinhaCupom): string {
  const estilos: string[] = [];
  if (linha.duplo) estilos.push('font-size:1.55em');
  else if (linha.condensado) estilos.push('font-size:.82em');
  if (linha.negrito) estilos.push('font-weight:700');
  if (linha.alinhar === 'centro') estilos.push('text-align:center');
  if (linha.alinhar === 'direita') estilos.push('text-align:right');
  if (linha.separador) estilos.push('color:#666');
  if (linha.invertido) estilos.push('background:#000;color:#fff');
  if (linha.espacoDepois) estilos.push(`margin-bottom:${linha.espacoDepois * 3}px`);
  estilos.push('white-space:pre-wrap');
  estilos.push('line-height:1.32');

  const texto = (linha.texto || ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div style="${estilos.join(';')}">${texto}</div>`;
}

/** Monta o documento completo enviado ao iframe de impressao. */
export function gerarHtmlImpressao(cupons: CupomModel[]): string {
  const largura = cupons[0]?.largura ?? 80;
  const paginas = cupons
    .map(
      (cupom) => `<section class="print-page" style="width:${largura}mm">
${cupom.linhas.map(linhaParaHtml).join('\n')}
<div style="margin-top:6px;border-top:1px dashed #999;height:8px"></div>
</section>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${cupons.map((c) => c.destino.toUpperCase()).join(' + ')} · Comanda ${String(cupons[0]?.comanda ?? 0).padStart(4, '0')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: ${largura}mm auto; margin: 2mm 0 4mm; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#fff; }
  body {
    font-family: 'JetBrains Mono', 'Courier New', ui-monospace, monospace;
    font-size: 12px;
    color: #000;
    width: ${largura}mm;
  }
  .print-page {
    width: ${largura}mm;
    padding: 1mm 2.5mm 3mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .print-page + .print-page {
    break-before: page;
    page-break-before: always;
    border-top: 1px dashed #999;
    padding-top: 4mm;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${paginas}
</body>
</html>`;
}
