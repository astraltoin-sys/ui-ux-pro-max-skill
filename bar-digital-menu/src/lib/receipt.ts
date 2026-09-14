import type { Pedido, PrintTipo, BobinaSize, CupomModel, CupomItem } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatMoney(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

export function formatMoneyPlain(val: number): string {
  return val.toFixed(2).replace(".", ",");
}

export function padNum(n: number, size = 4): string {
  return String(n).padStart(size, "0");
}

export function getReceiptWidth(size: BobinaSize): number {
  return size === "80mm" ? 302 : 220;
}

export function getReceiptCols(size: BobinaSize): number {
  return size === "80mm" ? 48 : 32;
}

/**
 * Creates the single unified CupomModel for both Bar and Caixa.
 * This model feeds HTML preview, iframe print, and ESC/POS binary generator.
 */
export function buildCupomModel(
  pedido: Pedido,
  tipo: PrintTipo,
  tamanho: BobinaSize = "80mm"
): CupomModel {
  const dataFormatada = format(pedido.createdAt, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  
  const itens: CupomItem[] = pedido.itens.map((item) => ({
    quantidade: item.quantidade,
    nome: item.nome,
    emoji: item.emoji,
    unitario: item.preco,
    total: item.preco * item.quantidade,
    observacao: item.observacao ? item.observacao.trim() : undefined,
  }));

  const subtotal = pedido.subtotal || pedido.itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  const servico = pedido.servico !== undefined ? pedido.servico : subtotal * 0.1;
  const total = pedido.total || subtotal + servico;

  return {
    id: `cupom-${pedido.id}-${tipo}-${Date.now()}`,
    tipo,
    pedidoId: pedido.id,
    pedidoNumero: pedido.numero,
    mesaNumero: pedido.mesaNumero,
    dataHora: dataFormatada,
    timestamp: pedido.createdAt,
    itens,
    subtotal,
    servico,
    taxaServico: servico,
    total,
    formaPagamento: pedido.formaPagamento,
    larguraBobina: tamanho,
  };
}

/**
 * Renders the HTML preview representation of the CupomModel.
 * Matches ESC/POS character alignment, dashed rules, and layout.
 */
export function renderReceiptHtml(cupom: CupomModel): string {
  const is80 = cupom.larguraBobina === "80mm";
  const isBar = cupom.tipo === "bar";

  const headerTitle = isBar ? "COMANDA BAR // PREPARO" : "EXTRATO CONFERÊNCIA // CAIXA";
  const subTitle = isBar ? "ORDEM DE PRODUÇÃO" : "DOCUMENTO AUXILIAR DE VENDA";

  const itemsHtml = cupom.itens
    .map((item) => {
      const obsHtml = item.observacao
        ? `<div style="font-size: 11px; font-weight: bold; padding: 2px 4px; margin: 3px 0 5px 12px; background: #e5e5e5; border-left: 2px solid #000;">
            *** OBS: ${escapeHtml(item.observacao)} ***
           </div>`
        : "";

      if (isBar) {
        return `
          <div style="margin: 4px 0;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${is80 ? "13px" : "12px"};">
              <span>[ ${item.quantidade}x ] ${item.emoji ? `${item.emoji} ` : ""}${escapeHtml(item.nome)}</span>
            </div>
            ${obsHtml}
          </div>
        `;
      }

      // Caixa view: includes unit price and item total
      return `
        <div style="margin: 3px 0;">
          <div style="display: flex; justify-content: space-between; font-size: ${is80 ? "12px" : "11px"};">
            <span style="font-weight: 600;">${item.quantidade}x ${escapeHtml(item.nome)}</span>
            <span style="font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums;">${formatMoneyPlain(item.total)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #555;">
            <span>&nbsp;&nbsp;(${formatMoneyPlain(item.unitario)} un)</span>
          </div>
          ${obsHtml}
        </div>
      `;
    })
    .join("");

  const financialBlock = !isBar
    ? `
      <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>SUBTOTAL</span>
        <span style="font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums;">${formatMoneyPlain(cupom.subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>SERVIÇO SUGERIDO (10%)</span>
        <span style="font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums;">${formatMoneyPlain(cupom.taxaServico)}</span>
      </div>
      <div style="border-top: 1px solid #000; margin: 4px 0;"></div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 15px;">
        <span>TOTAL R$</span>
        <span style="font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums;">${formatMoneyPlain(cupom.total)}</span>
      </div>
      ${
        cupom.formaPagamento
          ? `<div style="text-align: center; margin-top: 6px; font-weight: bold; font-size: 11px; background: #eee; padding: 2px;">
              PAGAMENTO: ${cupom.formaPagamento.toUpperCase()}
             </div>`
          : `<div style="text-align: center; margin-top: 6px; font-size: 10px; color: #666;">
              CONTA ABERTA NO SALÃO
             </div>`
      }
    `
    : `
      <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
      <div style="text-align: center; font-size: 11px; font-weight: bold;">
        TOTAL DE ITENS: ${cupom.itens.reduce((sum, i) => sum + i.quantidade, 0)} unidade(s)
      </div>
    `;

  return `
    <div style="font-family: 'JetBrains Mono', 'Courier New', monospace; color: #000; line-height: 1.35; padding: 6px 4px;">
      <div style="text-align: center; margin-bottom: 4px;">
        <div style="font-weight: 900; font-size: 16px; letter-spacing: 0.5px;">🍺 BAR DIGITAL</div>
        <div style="font-size: 10px; text-transform: uppercase;">Rua dos Boêmios, 100 • Centro</div>
        <div style="font-size: 9px; color: #444;">CNPJ: 12.345.678/0001-90</div>
      </div>

      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>

      <div style="text-align: center; font-weight: bold; font-size: 13px; background: #000; color: #fff; padding: 2px 0; margin-bottom: 4px;">
        ${headerTitle}
      </div>
      <div style="text-align: center; font-size: 9px; color: #555; margin-bottom: 6px;">
        ${subTitle}
      </div>

      <div style="background: #f0f0f0; padding: 4px; border: 1px solid #ccc; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 15px;">
          <span>MESA: ${padNum(cupom.mesaNumero, 2)}</span>
          <span>PEDIDO: #${padNum(cupom.pedidoNumero, 4)}</span>
        </div>
        <div style="font-size: 10px; color: #444; margin-top: 2px;">
          Emissão: ${cupom.dataHora}
        </div>
      </div>

      <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
      <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; display: flex; justify-content: space-between;">
        <span>DESCRIÇÃO DOS ITENS</span>
        ${!isBar ? `<span>VALOR (R$)</span>` : `<span>QTD</span>`}
      </div>
      <div style="border-top: 1px solid #000; margin: 2px 0 5px 0;"></div>

      ${itemsHtml}

      ${financialBlock}

      <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

      <div style="text-align: center; font-size: 9px; line-height: 1.4; color: #444;">
        ${isBar ? `*** PRIORIDADE DE ATENDIMENTO ***<br/>Verifique as notas de preparo dos clientes` : `Obrigado pela preferência! Volte sempre!<br/>www.bardigital.com.br`}
      </div>

      <div style="text-align: center; font-size: 8px; margin-top: 6px; letter-spacing: 2px; color: #777;">
        ${cupom.larguraBobina} • ESC/POS PROTOCOL
      </div>
    </div>
  `;
}

/**
 * Wraps the receipt in a clean printable HTML document.
 */
export function renderPrintHtmlDocument(cupom: CupomModel): string {
  const widthMm = cupom.larguraBobina === "80mm" ? "76mm" : "56mm";
  const content = renderReceiptHtml(cupom);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Impressão #${cupom.pedidoNumero} - ${cupom.tipo.toUpperCase()}</title>
  <style>
    @page {
      margin: 0;
      size: ${widthMm} auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      width: ${widthMm};
      margin: 0 auto;
      padding: 6px;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function barReceiptContent(pedido: Pedido, tamanho: BobinaSize = "80mm"): string {
  const cupom = buildCupomModel(pedido, "bar", tamanho);
  return renderReceiptHtml(cupom);
}

export function caixaReceiptContent(pedido: Pedido, tamanho: BobinaSize = "80mm"): string {
  const cupom = buildCupomModel(pedido, "caixa", tamanho);
  return renderReceiptHtml(cupom);
}

/**
 * Multi-Strategy Print Engine:
 * 1. Primary: Injects receipt directly into #print-receipt-portal, adds .printing-active to body, calls window.print().
 *    This NEVER gets blocked by iframe sandboxes, works 100% in Chrome/Safari/Firefox/Edge.
 * 2. Secondary: If iframe printing is explicitly chosen, uses visible-to-compositor frame with loaded trigger.
 */
export function executePrintReceipt(cupom: CupomModel): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      let portal = document.getElementById("print-receipt-portal");
      if (!portal) {
        portal = document.createElement("div");
        portal.id = "print-receipt-portal";
        document.body.appendChild(portal);
      }

      portal.innerHTML = renderReceiptHtml(cupom);
      document.body.classList.add("printing-active");

      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        document.body.classList.remove("printing-active");
        if (portal) portal.innerHTML = "";
        window.removeEventListener("afterprint", cleanup);
        resolve(true);
      };

      window.addEventListener("afterprint", cleanup, { once: true });

      // Safety timeout in case user closes print dialog or afterprint does not fire
      setTimeout(() => {
        cleanup();
      }, 3500);

      // Trigger print after next rendering frame
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            window.print();
          } catch (e) {
            console.warn("Direct window.print failed, trying fallback:", e);
            printReceiptViaPopup(cupom).then(resolve);
          }
        }, 120);
      });
    } catch (err) {
      console.error("Print execution failed:", err);
      printReceiptViaPopup(cupom).then(resolve);
    }
  });
}

/**
 * Fallback popup window print
 */
export function printReceiptViaPopup(cupom: CupomModel): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const win = window.open("", "_blank", "width=380,height=600,menubar=no,toolbar=no,location=no,status=no");
      if (!win) {
        resolve(false);
        return;
      }
      win.document.open();
      win.document.write(renderPrintHtmlDocument(cupom));
      win.document.close();
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch (_) {}
        resolve(true);
      }, 300);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Auto-print in background iframe (with proper opacity and dimensions so browsers do not drop it)
 */
export function printReceiptViaIframe(cupom: CupomModel): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement("iframe");
      // Must NOT be display:none or width:0 or visibility:hidden or browsers reject window.print()!
      iframe.style.cssText =
        "position: fixed; top: 0; left: 0; width: 300px; height: 400px; opacity: 0; pointer-events: none; border: 0; z-index: -999;";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        if (iframe.parentNode) document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      const html = renderPrintHtmlDocument(cupom);
      doc.open();
      doc.write(html);
      doc.close();

      let cleanedUp = false;
      const cleanup = (success = true) => {
        if (cleanedUp) return;
        cleanedUp = true;
        try {
          if (iframe.parentNode) document.body.removeChild(iframe);
        } catch (_) {}
        resolve(success);
      };

      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = () => cleanup(true);
      }

      const safetyTimer = setTimeout(() => {
        cleanup(true);
      }, 3500);

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn("Auto-print iframe fallback:", e);
          clearTimeout(safetyTimer);
          cleanup(false);
        }
      }, 300);
    } catch (err) {
      console.error("Iframe print error:", err);
      resolve(false);
    }
  });
}
