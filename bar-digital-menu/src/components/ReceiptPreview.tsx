import type { Pedido, PrintTipo, BobinaSize, CupomModel } from "../types";
import { buildCupomModel, renderReceiptHtml, getReceiptWidth } from "../lib/receipt";

export function ReceiptPreview({
  pedido,
  tipo = "bar",
  size = "80mm",
  cupom,
}: {
  pedido?: Pedido;
  tipo?: PrintTipo;
  size?: BobinaSize;
  cupom?: CupomModel;
}) {
  const model: CupomModel = cupom
    ? cupom
    : pedido
    ? buildCupomModel(pedido, tipo, size)
    : {
        id: "preview-empty",
        tipo,
        pedidoId: "0",
        pedidoNumero: 1,
        mesaNumero: 1,
        dataHora: new Date().toLocaleDateString("pt-BR"),
        timestamp: Date.now(),
        itens: [],
        subtotal: 0,
        servico: 0,
        taxaServico: 0,
        total: 0,
        larguraBobina: size,
      };

  const html = renderReceiptHtml(model);
  const width = getReceiptWidth(model.larguraBobina || size);

  return (
    <div className="flex flex-col items-center">
      <div
        className="thermal-receipt shadow-2xl relative transition-all duration-300"
        style={{
          width,
          backgroundColor: "#faf8f5",
          padding: "16px 12px",
          borderRadius: "2px",
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <div className="mt-3 text-xs text-stone-400 font-mono flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span>Bobina {model.larguraBobina || size} • {tipo === "bar" ? "Bar (Preparo)" : "Caixa (Conferência)"}</span>
      </div>
    </div>
  );
}
