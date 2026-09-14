import type { Pedido, PrintTipo, BobinaSize } from "../types";
import { barReceiptContent, caixaReceiptContent, getReceiptWidth } from "../lib/print";

export function ReceiptPreview({
  pedido,
  tipo,
  size = "80mm",
}: {
  pedido: Pedido;
  tipo: PrintTipo;
  size?: BobinaSize;
}) {
  const content = tipo === "bar" ? barReceiptContent(pedido) : caixaReceiptContent(pedido);
  const width = getReceiptWidth(size);

  return (
    <div className="thermal-receipt mx-auto text-black p-3" style={{ width }}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
