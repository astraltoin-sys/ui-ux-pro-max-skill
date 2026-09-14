import type { Pedido, BobinaSize } from "../types";

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

export function barReceiptContent(pedido: Pedido): string {
  const itensHtml = pedido.itens
    .map(
      (item) => `
    <div style="display:flex; font-weight:bold; margin-bottom:2px;">
      <span>${item.quantidade}x</span>
      <span style="flex:1; margin-left:6px;">${item.nome}</span>
    </div>
    ${item.observacao ? `<div style="margin-left:20px; font-style:italic; font-size:11px; color:#444;">OBS: ${item.observacao}</div>` : ""}
  `
    )
    .join("");

  return `
    <div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:4px;">COMANDA BAR</div>
    <div style="text-align:center;">Mesa: ${pedido.mesaNumero}</div>
    <div style="text-align:center;">Comanda: #${pedido.numero}</div>
    <div style="text-align:center; font-size:10px;">${fmtDate(pedido.createdAt)}</div>
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    ${itensHtml}
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    <div style="text-align:center; font-size:10px;">*** COMANDA BAR ***</div>
  `;
}

export function caixaReceiptContent(pedido: Pedido): string {
  const itensHtml = pedido.itens
    .map(
      (item) => `
    <div style="display:flex;">
      <span style="font-weight:bold;">${item.quantidade}x</span>
      <span style="flex:1; margin-left:6px;">${item.nome}</span>
      <span>R$ ${fmtMoney(item.preco * item.quantidade)}</span>
    </div>
    ${item.observacao ? `<div style="margin-left:20px; font-style:italic; font-size:11px; color:#444;">OBS: ${item.observacao}</div>` : ""}
  `
    )
    .join("");

  return `
    <div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:4px;">CUPOM CAIXA</div>
    <div style="text-align:center;">Mesa: ${pedido.mesaNumero}</div>
    <div style="text-align:center;">Comanda: #${pedido.numero}</div>
    <div style="text-align:center; font-size:10px;">${fmtDate(pedido.createdAt)}</div>
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    ${itensHtml}
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    <div style="display:flex;"><span style="flex:1;">Subtotal</span><span>R$ ${fmtMoney(pedido.subtotal)}</span></div>
    <div style="display:flex;"><span style="flex:1;">Serviço (10%)</span><span>R$ ${fmtMoney(pedido.servico)}</span></div>
    <div style="display:flex; font-weight:bold; font-size:14px; margin-top:4px;"><span style="flex:1;">TOTAL</span><span>R$ ${fmtMoney(pedido.total)}</span></div>
    ${pedido.formaPagamento ? `<div style="text-align:center; margin-top:6px;">Pagamento: ${pedido.formaPagamento.toUpperCase()}</div>` : ""}
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    <div style="text-align:center; font-size:10px;">*** CUPOM CAIXA ***</div>
  `;
}

export function printReceipt(content: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      if (iframe.parentNode) document.body.removeChild(iframe);
      resolve();
      return;
    }

    const html = `<html><head><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;}</style></head><body>${content}</body></html>`;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn("Print blocked:", e);
      }
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
        resolve();
      }, 1000);
    };
  });
}

// ESC/POS binary generation
const ESC = 0x1b;
const GS = 0x1d;

function encode(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

function init(): number[] {
  return [ESC, 0x40];
}
function center(): number[] {
  return [ESC, 0x61, 0x01];
}
function left(): number[] {
  return [ESC, 0x61, 0x00];
}
function boldOn(): number[] {
  return [ESC, 0x45, 0x01];
}
function boldOff(): number[] {
  return [ESC, 0x45, 0x00];
}
function doubleSize(): number[] {
  return [GS, 0x21, 0x30];
}
function normalSize(): number[] {
  return [GS, 0x21, 0x00];
}
function feed(n: number): number[] {
  return [ESC, 0x64, n];
}
function cut(): number[] {
  return [GS, 0x56, 0x00];
}
function line(str: string = ""): number[] {
  return [...encode(str), 0x0a];
}
function dashed(): number[] {
  return [...encode("-".repeat(32)), 0x0a];
}

export function generateBarEscPos(pedido: Pedido): Uint8Array {
  const c: number[] = [];
  c.push(...init());
  c.push(...center(), ...boldOn(), ...doubleSize());
  c.push(...encode("COMANDA BAR"));
  c.push(...normalSize(), ...boldOff(), 0x0a);
  c.push(...center());
  c.push(...line(`Mesa: ${pedido.mesaNumero}`));
  c.push(...line(`Comanda: #${pedido.numero}`));
  c.push(...line(fmtDate(pedido.createdAt)), 0x0a);
  c.push(...left(), ...dashed());
  pedido.itens.forEach((item) => {
    c.push(...boldOn(), ...line(`${item.quantidade}x ${item.nome}`), ...boldOff());
    if (item.observacao) c.push(...line(`  OBS: ${item.observacao}`));
  });
  c.push(...dashed(), 0x0a);
  c.push(...center(), ...line("*** COMANDA BAR ***"), 0x0a, 0x0a);
  c.push(...feed(3), ...cut());
  return new Uint8Array(c);
}

export function generateCaixaEscPos(pedido: Pedido): Uint8Array {
  const c: number[] = [];
  c.push(...init());
  c.push(...center(), ...boldOn(), ...doubleSize());
  c.push(...encode("CUPOM CAIXA"));
  c.push(...normalSize(), ...boldOff(), 0x0a);
  c.push(...center());
  c.push(...line(`Mesa: ${pedido.mesaNumero}`));
  c.push(...line(`Comanda: #${pedido.numero}`));
  c.push(...line(fmtDate(pedido.createdAt)), 0x0a);
  c.push(...left(), ...dashed());
  pedido.itens.forEach((item) => {
    const price = fmtMoney(item.preco * item.quantidade).padStart(8);
    const name = item.nome.padEnd(20).substring(0, 20);
    c.push(...line(`${item.quantidade}x ${name} R$ ${price}`));
    if (item.observacao) c.push(...line(`  OBS: ${item.observacao}`));
  });
  c.push(...dashed());
  c.push(...line(`Subtotal:           R$ ${fmtMoney(pedido.subtotal)}`));
  c.push(...line(`Servico (10%):      R$ ${fmtMoney(pedido.servico)}`));
  c.push(...boldOn(), ...doubleSize());
  c.push(...line(`TOTAL:  R$ ${fmtMoney(pedido.total)}`));
  c.push(...normalSize(), ...boldOff());
  if (pedido.formaPagamento) {
    c.push(...line(`Pagamento: ${pedido.formaPagamento.toUpperCase()}`));
  }
  c.push(0x0a, 0x0a);
  c.push(...center(), ...line("*** CUPOM CAIXA ***"), 0x0a, 0x0a);
  c.push(...feed(3), ...cut());
  return new Uint8Array(c);
}

export function downloadEscPos(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getReceiptWidth(size: BobinaSize): number {
  return size === "80mm" ? 302 : 220;
}
