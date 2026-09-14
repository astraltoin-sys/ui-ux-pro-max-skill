import type { CupomModel, BobinaSize, PrintTipo, Pedido } from "../types";
import { encodeCodePage, type CodePage } from "./codepages";
import { buildCupomModel, formatMoneyPlain, padNum, getReceiptCols } from "./receipt";

// Standard ESC/POS Control Byte Constants
export const ESC = 0x1b;
export const FS = 0x1c;
export const GS = 0x1d;
export const DLE = 0x10;
export const EOT = 0x04;

export const COMMANDS = {
  // Initialize printer
  INIT: [ESC, 0x40],

  // Select code page: 2 for CP850 (Multilingual), 3 for CP860 (Portuguese)
  CODE_PAGE_CP850: [ESC, 0x74, 0x02],
  CODE_PAGE_CP860: [ESC, 0x74, 0x03],

  // Text Justification (ESC a n: 0=left, 1=center, 2=right)
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // Bold / Emphasized (ESC E n: 0=off, 1=on)
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],

  // Character Size (GS ! n: 0x00=normal, 0x11=double width+height, 0x30=large)
  SIZE_NORMAL: [GS, 0x21, 0x00],
  SIZE_DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  SIZE_DOUBLE_WIDTH: [GS, 0x21, 0x10],
  SIZE_DOUBLE: [GS, 0x21, 0x11],
  SIZE_LARGE: [GS, 0x21, 0x30],

  // Font Selection (ESC M n: 0=Font A 12x24, 1=Font B 9x17)
  FONT_A: [ESC, 0x4d, 0x00],
  FONT_B: [ESC, 0x4d, 0x01],

  // White/Black Reverse Mode (GS B n: 0=off, 1=on)
  INVERT_ON: [GS, 0x42, 0x01],
  INVERT_OFF: [GS, 0x42, 0x00],

  // Underline (ESC - n: 0=off, 1=1dot, 2=2dots)
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],

  // Feed lines (ESC d n)
  FEED: (lines: number) => [ESC, 0x64, Math.max(1, lines)],

  // ESC/POS Sound Buzzer: ESC ( A 04 00 30 34 02 0A
  BEEP: [ESC, 0x28, 0x41, 0x04, 0x00, 0x30, 0x34, 0x02, 0x0a],

  // Cash Drawer Pulse: ESC p 0 25 250 (pin 2, 50ms on, 500ms off)
  DRAWER_PULSE: [ESC, 0x70, 0x00, 0x19, 0xfa],

  // Paper Cut: GS V B 00 (partial/full cut with feed)
  CUT_FULL: [GS, 0x56, 0x42, 0x00],
};

/**
 * Text formatting helper for thermal columns
 */
function justifyRow(left: string, right: string, width: number): string {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) {
    return left.substring(0, width - right.length - 1) + " " + right;
  }
  return left + " ".repeat(spaceNeeded) + right;
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  const rightPad = width - text.length - leftPad;
  return " ".repeat(leftPad) + text + " ".repeat(rightPad);
}

/**
 * Generates the full ESC/POS byte buffer from a CupomModel.
 */
export function generateEscPosBytes(
  cupom: CupomModel,
  codePage: CodePage = "CP850",
  options: { openDrawer?: boolean; buzzer?: boolean } = {}
): Uint8Array {
  const cols = getReceiptCols(cupom.larguraBobina);
  const bytes: number[] = [];

  const writeText = (str: string) => {
    const encoded = encodeCodePage(str, codePage);
    for (let i = 0; i < encoded.length; i++) {
      bytes.push(encoded[i]);
    }
  };

  const writeLine = (str = "") => {
    writeText(str);
    bytes.push(0x0a);
  };

  // 1. Initialize printer: ESC @
  bytes.push(...COMMANDS.INIT);

  // 2. Select code page: ESC t 2 (CP850) or ESC t 3 (CP860)
  if (codePage === "CP860") {
    bytes.push(...COMMANDS.CODE_PAGE_CP860);
  } else {
    bytes.push(...COMMANDS.CODE_PAGE_CP850);
  }

  // 3. Sound buzzer if requested or on bar receipt arrival
  if (options.buzzer || cupom.tipo === "bar") {
    bytes.push(...COMMANDS.BEEP);
  }

  // 4. Header: Centered
  bytes.push(...COMMANDS.ALIGN_CENTER);
  bytes.push(...COMMANDS.BOLD_ON);
  bytes.push(...COMMANDS.SIZE_DOUBLE_HEIGHT);
  writeLine("BAR DIGITAL");
  bytes.push(...COMMANDS.SIZE_NORMAL);
  bytes.push(...COMMANDS.BOLD_OFF);
  writeLine("Rua dos Boemios, 100 - Centro");
  writeLine("CNPJ: 12.345.678/0001-90");
  writeLine("-".repeat(cols));

  // 5. Title Banner (Reverse Mode GS B 1 or Bold)
  const isBar = cupom.tipo === "bar";
  const title = isBar ? "  COMANDA BAR // PREPARO  " : "  EXTRATO CONFERENCIA // CAIXA  ";

  bytes.push(...COMMANDS.INVERT_ON);
  bytes.push(...COMMANDS.BOLD_ON);
  writeLine(centerText(title, cols));
  bytes.push(...COMMANDS.INVERT_OFF);
  bytes.push(...COMMANDS.BOLD_OFF);

  // 6. Table & Order block
  bytes.push(...COMMANDS.ALIGN_LEFT);
  bytes.push(...COMMANDS.BOLD_ON);
  bytes.push(...COMMANDS.SIZE_DOUBLE);
  writeLine(centerText(`MESA ${padNum(cupom.mesaNumero, 2)}`, Math.floor(cols / 2)));
  bytes.push(...COMMANDS.SIZE_NORMAL);
  bytes.push(...COMMANDS.BOLD_OFF);

  writeLine(centerText(`PEDIDO #${padNum(cupom.pedidoNumero, 4)}`, cols));
  writeLine(centerText(`Emissao: ${cupom.dataHora}`, cols));
  writeLine("-".repeat(cols));

  // 7. Column Header
  bytes.push(...COMMANDS.BOLD_ON);
  if (isBar) {
    writeLine(justifyRow("QTD  ITEM / DESCRICAO", "STATUS", cols));
  } else {
    writeLine(justifyRow("QTD  ITEM", "VALOR (R$)", cols));
  }
  bytes.push(...COMMANDS.BOLD_OFF);
  writeLine("=".repeat(cols));

  // 8. Items
  for (const item of cupom.itens) {
    if (isBar) {
      // Bar formatting: High visibility quantity and item name
      bytes.push(...COMMANDS.BOLD_ON);
      bytes.push(...COMMANDS.SIZE_DOUBLE_HEIGHT);
      writeLine(`[${item.quantidade}x] ${item.nome}`);
      bytes.push(...COMMANDS.SIZE_NORMAL);
      bytes.push(...COMMANDS.BOLD_OFF);

      // Observation highlight
      if (item.observacao) {
        bytes.push(...COMMANDS.BOLD_ON);
        bytes.push(...COMMANDS.INVERT_ON);
        writeLine(`  >>> OBS: ${item.observacao}  `);
        bytes.push(...COMMANDS.INVERT_OFF);
        bytes.push(...COMMANDS.BOLD_OFF);
      }
      bytes.push(0x0a);
    } else {
      // Caixa formatting: Quantity, item name, unit price, total
      const qtdName = `${item.quantidade}x ${item.nome}`;
      const totalStr = formatMoneyPlain(item.total);
      writeLine(justifyRow(qtdName, totalStr, cols));

      // Secondary info: unit price
      writeLine(`    (${formatMoneyPlain(item.unitario)} un)`);

      if (item.observacao) {
        writeLine(`    OBS: ${item.observacao}`);
      }
    }
  }

  writeLine("-".repeat(cols));

  // 9. Financial or Summary Footer
  if (!isBar) {
    writeLine(justifyRow("SUBTOTAL", formatMoneyPlain(cupom.subtotal), cols));
    writeLine(justifyRow("SERVICO SUGERIDO (10%)", formatMoneyPlain(cupom.taxaServico), cols));
    writeLine("=".repeat(cols));

    bytes.push(...COMMANDS.BOLD_ON);
    bytes.push(...COMMANDS.SIZE_DOUBLE);
    writeLine(justifyRow("TOTAL", `R$ ${formatMoneyPlain(cupom.total)}`, Math.floor(cols / 2)));
    bytes.push(...COMMANDS.SIZE_NORMAL);
    bytes.push(...COMMANDS.BOLD_OFF);

    if (cupom.formaPagamento) {
      bytes.push(...COMMANDS.ALIGN_CENTER);
      writeLine(`FORMA DE PAGAMENTO: ${cupom.formaPagamento.toUpperCase()}`);
    } else {
      bytes.push(...COMMANDS.ALIGN_CENTER);
      writeLine("CONTA EM ABERTO NO SALAO");
    }
  } else {
    bytes.push(...COMMANDS.ALIGN_CENTER);
    const totalItens = cupom.itens.reduce((acc, i) => acc + i.quantidade, 0);
    bytes.push(...COMMANDS.BOLD_ON);
    writeLine(`TOTAL DE ITENS A PREPARAR: ${totalItens}`);
    bytes.push(...COMMANDS.BOLD_OFF);
    writeLine("*** AGILIDADE NO PREPARO ***");
  }

  writeLine("-".repeat(cols));
  bytes.push(...COMMANDS.ALIGN_CENTER);
  writeLine("Obrigado pela preferencia!");
  writeLine("www.bardigital.com.br");

  // 10. Feed lines: ESC d 4
  bytes.push(...COMMANDS.FEED(4));

  // 11. Open drawer if cash payment on caixa receipt or option passed: ESC p 0 25 250
  if (options.openDrawer || (!isBar && cupom.formaPagamento === "dinheiro")) {
    bytes.push(...COMMANDS.DRAWER_PULSE);
  }

  // 12. Paper Cut: GS V B 00
  bytes.push(...COMMANDS.CUT_FULL);

  return new Uint8Array(bytes);
}

/**
 * Wrapper to generate ESC/POS from raw Pedido
 */
export function generateBarEscPos(pedido: Pedido, tamanho: BobinaSize = "80mm"): Uint8Array {
  const cupom = buildCupomModel(pedido, "bar", tamanho);
  return generateEscPosBytes(cupom, "CP850", { buzzer: true });
}

export function generateCaixaEscPos(pedido: Pedido, tamanho: BobinaSize = "80mm"): Uint8Array {
  const cupom = buildCupomModel(pedido, "caixa", tamanho);
  return generateEscPosBytes(cupom, "CP850", { openDrawer: pedido.formaPagamento === "dinheiro" });
}

/**
 * Downloads the binary file for hardware printer raw testing
 */
export function downloadEscPos(data: Uint8Array, filename: string) {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ByteInspectorRow {
  offset: string;
  hex: string;
  ascii: string;
}

/**
 * Generates structured hexadecimal and ASCII dump for the Byte Inspector UI.
 */
export function inspectEscPosBytes(bytes: Uint8Array, bytesPerRow = 16): ByteInspectorRow[] {
  const rows: ByteInspectorRow[] = [];

  for (let i = 0; i < bytes.length; i += bytesPerRow) {
    const chunk = bytes.subarray(i, i + bytesPerRow);
    const offset = i.toString(16).padStart(4, "0").toUpperCase();

    const hexParts: string[] = [];
    let asciiPart = "";

    for (let j = 0; j < bytesPerRow; j++) {
      if (j < chunk.length) {
        const b = chunk[j];
        hexParts.push(b.toString(16).padStart(2, "0").toUpperCase());
        // Printable ASCII range (32 to 126)
        if (b >= 32 && b <= 126) {
          asciiPart += String.fromCharCode(b);
        } else {
          asciiPart += ".";
        }
      } else {
        hexParts.push("  ");
        asciiPart += " ";
      }
    }

    rows.push({
      offset,
      hex: hexParts.join(" "),
      ascii: asciiPart,
    });
  }

  return rows;
}
