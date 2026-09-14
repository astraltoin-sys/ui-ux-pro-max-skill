import type { CupomModel } from './receipt';
import { CODEPAGES, type Codepage } from './codepages';

/**
 * Gerador de codigo ESC/POS (Epson, Bematech, Elgin, Daruma, Sweda...).
 *
 * O mesmo `CupomModel` usado para desenhar a bobina na tela e convertido aqui
 * em bytes, entao o arquivo .bin exportado pela estacao de impressao imprime
 * exatamente o que foi visualizado.
 *
 * Referencias dos comandos (ESC/POS Command Reference for TM Printers):
 *   ESC @            -> inicializa impressora
 *   ESC t n          -> codepage (2 = PC850, 3 = PC860)
 *   ESC a n          -> alinhamento (0 esquerda, 1 centro, 2 direita)
 *   ESC E n          -> negrito
 *   GS  ! n          -> tamanho (0x00 normal, 0x11 largura+altura dupla)
 *   ESC M n          -> fonte (0 = A, 1 = B condensada)
 *   GS  B n          -> texto invertido
 *   ESC d n          -> avanca n linhas
 *   ESC ( A 04 00 30 n c t -> bipe (n = tipo de som, c = qtd, t = ciclo x100ms)
 *   ESC p 0 25 250   -> pulso na gaveta (pino 2)
 *   GS  V B n        -> corte parcial
 */

const ESC = 0x1b;
const GS = 0x1d;

export interface OpcoesEscPos {
  codepage: Codepage;
  /** Emite o comando de bipe (nem toda impressora tem buzzer). */
  bipe: boolean;
  /** Dispara a gaveta (usado no fechamento de conta). */
  abrirGaveta: boolean;
  /** Guilhotina parcial no final. */
  cortar: boolean;
  /** Linhas em branco antes do corte. */
  avancoFinal: number;
}

export const OPCOES_PADRAO: OpcoesEscPos = {
  codepage: 'cp850',
  bipe: false,
  abrirGaveta: false,
  cortar: true,
  avancoFinal: 4,
};

class ByteBuilder {
  private bytes: number[] = [];

  push(...values: number[]): this {
    values.forEach((v) => this.bytes.push(v & 0xff));
    return this;
  }

  texto(str: string, codepage: Codepage): this {
    for (const char of str) this.push(...codificarChar(char, codepage));
    return this;
  }

  bytes0(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/** Remove acentos para o modo `ascii` (impressoras sem codepage configurado). */
const FOLD_MAP: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'ê': 'e', 'è': 'e', 'ë': 'e',
  'í': 'i', 'î': 'i', 'ì': 'i', 'ï': 'i', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ò': 'o', 'ö': 'o',
  'ú': 'u', 'û': 'u', 'ù': 'u', 'ü': 'u', 'ç': 'c', 'ñ': 'n', 'ý': 'y', 'ÿ': 'y',
  'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A', 'É': 'E', 'Ê': 'E', 'È': 'E', 'Ë': 'E',
  'Í': 'I', 'Î': 'I', 'Ì': 'I', 'Ï': 'I', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ò': 'O', 'Ö': 'O',
  'Ú': 'U', 'Û': 'U', 'Ù': 'U', 'Ü': 'U', 'Ç': 'C', 'Ñ': 'N',
  'º': 'o', 'ª': 'a', '°': ' graus', '→': '->', '–': '-', '—': '-', '…': '...', '·': '-',
  '‘': "'", '’': "'", '“': '"', '”': '"',
};

function codificarChar(char: string, codepage: Codepage): number[] {
  const code = char.codePointAt(0) ?? 63;
  if (code < 0x20) return [0x20];
  if (code < 0x80) return [code];

  if (codepage !== 'ascii') {
    const mapa = CODEPAGES[codepage];
    const byte = mapa?.[char];
    if (byte != null) return [byte];
  }

  const dobrado = FOLD_MAP[char];
  if (dobrado) return [...dobrado].map((c) => c.charCodeAt(0));
  // Ultimo recurso: vira '?' para nao enviar byte invalido.
  return [0x3f];
}

function codepageByte(codepage: Codepage): number {
  if (codepage === 'cp860') return 3;
  if (codepage === 'cp850') return 2;
  return 0; // PC437 (modo ascii)
}

/** Aplica o alinhamento preenchendo com espacos (a impressora nao centraliza texto). */
function aplicarAlinhamento(texto: string, alinhar: string | undefined, colunas: number): string {
  if (texto.length >= colunas) return texto.slice(0, colunas);
  const falta = colunas - texto.length;
  if (alinhar === 'centro') {
    const esquerda = Math.floor(falta / 2);
    return ' '.repeat(esquerda) + texto + ' '.repeat(falta - esquerda);
  }
  if (alinhar === 'direita') return ' '.repeat(falta) + texto;
  return texto + ' '.repeat(falta);
}

export function gerarEscPos(cupom: CupomModel, opcoes: Partial<OpcoesEscPos> = {}): Uint8Array {
  const opt = { ...OPCOES_PADRAO, ...opcoes };
  const b = new ByteBuilder();
  const colunasBase = cupom.largura === 80 ? 48 : 32;

  b.push(ESC, 0x40); // init
  b.push(ESC, 0x74, codepageByte(opt.codepage)); // codepage
  b.push(ESC, 0x4d, 0x00); // fonte A
  b.push(ESC, 0x61, 0x00); // alinhamento esquerda

  cupom.linhas.forEach((linha) => {
    const colunas = linha.duplo ? Math.floor(colunasBase / 2) : colunasBase;

    // Estilos
    b.push(GS, 0x21, linha.duplo ? 0x11 : 0x00);
    b.push(ESC, 0x45, linha.negrito ? 0x01 : 0x00);
    b.push(ESC, 0x4d, linha.condensado ? 0x01 : 0x00);
    if (linha.invertido) b.push(GS, 0x42, 0x01);

    if (linha.separador) {
      b.push(ESC, 0x61, 0x00);
      b.texto(linha.texto || '-'.repeat(colunasBase), opt.codepage);
      b.push(0x0a);
    } else {
      const alinharByte = linha.alinhar === 'centro' ? 0x01 : linha.alinhar === 'direita' ? 0x02 : 0x00;
      b.push(ESC, 0x61, alinharByte);
      b.texto(aplicarAlinhamento(linha.texto, linha.alinhar, colunas), opt.codepage);
      b.push(0x0a);
    }

    // Reset dos estilos
    if (linha.invertido) b.push(GS, 0x42, 0x00);
    b.push(ESC, 0x45, 0x00);
    b.push(GS, 0x21, 0x00);
    b.push(ESC, 0x4d, 0x00);
    b.push(ESC, 0x61, 0x00);

    if (linha.espacoDepois) b.push(ESC, 0x64, Math.min(255, linha.espacoDepois));
  });

  if (opt.abrirGaveta) {
    // Pulso na gaveta: pino 2, 25x2ms ligado, 250x2ms desligado.
    b.push(ESC, 0x70, 0x00, 0x19, 0xfa);
  }

  if (opt.bipe) {
    // ESC ( A pL=04 pH=00 fn=48 n=52 (4100Hz/200ms) c=2 t=10 (ciclo 1s)
    b.push(ESC, 0x28, 0x41, 0x04, 0x00, 0x30, 0x34, 0x02, 0x0a);
  }

  b.push(ESC, 0x64, Math.max(1, Math.min(255, opt.avancoFinal)));

  if (opt.cortar) {
    b.push(GS, 0x56, 0x42, 0x00); // corte parcial
  }

  return b.bytes0();
}

/** Representacao hexadecimal (usada no inspetor de bytes da estacao). */
export function bytesParaHex(bytes: Uint8Array, porLinha = 16): string {
  const linhas: string[] = [];
  for (let i = 0; i < bytes.length; i += porLinha) {
    const fatia = Array.from(bytes.slice(i, i + porLinha));
    const hex = fatia.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const ascii = fatia.map((v) => (v >= 0x20 && v < 0x7f ? String.fromCharCode(v) : '.')).join('');
    linhas.push(`${i.toString(16).padStart(4, '0').toUpperCase()}  ${hex.padEnd(porLinha * 3)}  ${ascii}`);
  }
  return linhas.join('\n');
}

export function nomeArquivoBin(cupom: CupomModel): string {
  const comanda = String(cupom.comanda).padStart(4, '0');
  return `comanda-${comanda}-${cupom.destino}-${cupom.largura}mm.bin`;
}
