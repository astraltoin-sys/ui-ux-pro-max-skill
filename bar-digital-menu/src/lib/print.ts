import type { Pedido, BobinaSize } from "../types";

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
function fmtMoney(v: number): string { return v.toFixed(2).replace(".", ","); }
function padNum(n: number): string { return String(n).padStart(5, "0"); }

export function barReceiptContent(pedido: Pedido): string {
  const itensHtml = pedido.itens.map((item) => `
    <div style="display:flex; font-weight:bold; margin-bottom:2px;">
      <span>${item.quantidade}x</span>
      <span style="flex:1; margin-left:6px;">${item.emoji} ${item.nome}</span>
    </div>
    ${item.observacao ? `<div style="margin-left:20px; font-style:italic; font-size:11px; color:#444;">NOTE: ${item.observacao}</div>` : ""}
  `).join("");
  return `
    <div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:4px;">COMANDA BAR</div>
    <div style="text-align:center;">Tavolo: ${pedido.mesaNumero}</div>
    <div style="text-align:center;">Comanda: #${padNum(pedido.numero)}</div>
    <div style="text-align:center; font-size:10px;">${fmtDate(pedido.createdAt)}</div>
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    ${itensHtml}
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    <div style="text-align:center; font-size:10px;">*** COMANDA BAR ***</div>
  `;
}

export function cassaReceiptContent(pedido: Pedido): string {
  const itensHtml = pedido.itens.map((item) => `
    <div style="display:flex;">
      <span style="font-weight:bold;">${item.quantidade}x</span>
      <span style="flex:1; margin-left:6px;">${item.emoji} ${item.nome}</span>
      <span>EUR ${fmtMoney(item.preco * item.quantidade)}</span>
    </div>
    ${item.observacao ? `<div style="margin-left:20px; font-style:italic; font-size:11px; color:#444;">NOTE: ${item.observacao}</div>` : ""}
  `).join("");
  return `
    <div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:4px;">SCONTRINO CASSA</div>
    <div style="text-align:center;">Tavolo: ${pedido.mesaNumero}</div>
    <div style="text-align:center;">Comanda: #${padNum(pedido.numero)}</div>
    <div style="text-align:center; font-size:10px;">${fmtDate(pedido.createdAt)}</div>
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    ${itensHtml}
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    <div style="display:flex; font-weight:bold; font-size:14px; margin-top:4px;"><span style="flex:1;">TOTALE</span><span>EUR ${fmtMoney(pedido.total)}</span></div>
    ${pedido.formaPagamento ? `<div style="text-align:center; margin-top:6px;">Pagamento: ${pedido.formaPagamento === "contanti" ? "CONTANTI" : "CARTA"}</div>` : ""}
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    <div style="text-align:center; font-size:10px;">*** SCONTRINO CASSA ***</div>
  `;
}

export function printReceipt(content: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { if (iframe.parentNode) document.body.removeChild(iframe); resolve(); return; }
    doc.open(); doc.write(`<html><head><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;}</style></head><body>${content}</body></html>`); doc.close();
    iframe.onload = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch (e) { console.warn("Print blocked:", e); }
      setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); resolve(); }, 1000);
    };
  });
}

const ESC = 0x1b, GS = 0x1d;
const enc = (s: string) => Array.from(new TextEncoder().encode(s));
const init = () => [ESC, 0x40];
const center = () => [ESC, 0x61, 0x01];
const left = () => [ESC, 0x61, 0x00];
const boldOn = () => [ESC, 0x45, 0x01];
const boldOff = () => [ESC, 0x45, 0x00];
const dbl = () => [GS, 0x21, 0x30];
const nrm = () => [GS, 0x21, 0x00];
const feed = (n: number) => [ESC, 0x64, n];
const cut = () => [GS, 0x56, 0x00];
const ln = (s = "") => [...enc(s), 0x0a];
const dash = () => [...enc("-".repeat(32)), 0x0a];

export function generateBarEscPos(p: Pedido): Uint8Array {
  const c: number[] = [];
  c.push(...init(), ...center(), ...boldOn(), ...dbl(), ...enc("COMANDA BAR"), ...nrm(), ...boldOff(), 0x0a);
  c.push(...center(), ...ln(`Tavolo: ${p.mesaNumero}`), ...ln(`Comanda: #${padNum(p.numero)}`), ...ln(fmtDate(p.createdAt)), 0x0a);
  c.push(...left(), ...dash());
  p.itens.forEach((i) => { c.push(...boldOn(), ...ln(`${i.quantidade}x ${i.emoji} ${i.nome}`), ...boldOff()); if (i.observacao) c.push(...ln(`  NOTE: ${i.observacao}`)); });
  c.push(...dash(), 0x0a, ...center(), ...ln("*** COMANDA BAR ***"), 0x0a, 0x0a, ...feed(3), ...cut());
  return new Uint8Array(c);
}

export function generateCassaEscPos(p: Pedido): Uint8Array {
  const c: number[] = [];
  c.push(...init(), ...center(), ...boldOn(), ...dbl(), ...enc("SCONTRINO CASSA"), ...nrm(), ...boldOff(), 0x0a);
  c.push(...center(), ...ln(`Tavolo: ${p.mesaNumero}`), ...ln(`Comanda: #${padNum(p.numero)}`), ...ln(fmtDate(p.createdAt)), 0x0a);
  c.push(...left(), ...dash());
  p.itens.forEach((i) => { const pr = fmtMoney(i.preco * i.quantidade).padStart(8); const nm = i.nome.padEnd(20).substring(0, 20); c.push(...ln(`${i.quantidade}x ${nm} EUR ${pr}`)); if (i.observacao) c.push(...ln(`  NOTE: ${i.observacao}`)); });
  c.push(...dash(), ...boldOn(), ...dbl(), ...ln(`TOTALE:  EUR ${fmtMoney(p.total)}`), ...nrm(), ...boldOff());
  if (p.formaPagamento) c.push(...ln(`Pagamento: ${p.formaPagamento === "contanti" ? "CONTANTI" : "CARTA"}`));
  c.push(0x0a, 0x0a, ...center(), ...ln("*** SCONTRINO CASSA ***"), 0x0a, 0x0a, ...feed(3), ...cut());
  return new Uint8Array(c);
}

export function downloadEscPos(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export function getReceiptWidth(size: BobinaSize): number { return size === "80mm" ? 302 : 220; }
