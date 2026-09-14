import { useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, X, QrCode, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useDb } from "../hooks/useDb";
import type { Produto, ItemPedido } from "../types";

interface CartItem {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao: string;
}

const QUICK_OBS = ["Sem gelo", "Com limão", "Bem gelado", "Capricha na dose", "Sem açúcar"];

export function Menu() {
  const db = useDb();
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Cervejas");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  if (!tableNumber) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="bg-white p-6 rounded-2xl inline-block mb-4">
            <QrCode size={80} className="text-stone-900" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">🍕 Bar Napoletano</h1>
          <p className="text-stone-400">Selecione sua mesa para começar</p>
        </div>
        <div className="grid grid-cols-4 gap-3 max-w-sm">
          {db.mesas.map((mesa) => (
            <button
              key={mesa.id}
              onClick={() => setTableNumber(mesa.numero)}
              className={`aspect-square rounded-xl font-bold text-lg transition-all ${
                mesa.status === "ocupada"
                  ? "bg-stone-700 text-stone-500 cursor-not-allowed"
                  : "bg-orange-600 text-white hover:bg-orange-500 active:scale-95"
              }`}
              disabled={mesa.status === "ocupada"}
            >
              {mesa.numero}
            </button>
          ))}
        </div>
        <p className="text-stone-500 text-sm mt-6">Mesas em laranja estão disponíveis</p>
      </div>
    );
  }

  if (orderSent) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <CheckCircle2 size={80} className="text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Pedido Enviado! 🎉</h1>
        <p className="text-stone-500 mb-6">Mesa {tableNumber} • O bar já recebeu seu pedido</p>
        <button
          onClick={() => {
            setCart([]);
            setOrderSent(false);
          }}
          className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-500"
        >
          Fazer Novo Pedido
        </button>
      </div>
    );
  }

  const categories = [...new Set(db.produtos.map((p) => p.categoria))];
  const filteredProducts = db.produtos.filter((p) => p.categoria === selectedCategory);
  const cartCount = cart.reduce((sum, i) => sum + i.quantidade, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.preco * i.quantidade, 0);

  const addToCart = (produto: Produto, quantidade: number, observacao: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.produtoId === produto.id && i.observacao === observacao);
      if (existing) {
        return prev.map((i) =>
          i.produtoId === produto.id && i.observacao === observacao
            ? { ...i, quantidade: i.quantidade + quantidade }
            : i
        );
      }
      return [...prev, { produtoId: produto.id, nome: produto.nome, preco: produto.preco, quantidade, observacao }];
    });
    setSelectedProduct(null);
    toast.success(`${quantidade}x ${produto.nome} adicionado!`);
  };

  const updateQty = (produtoId: string, observacao: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.produtoId === produtoId && i.observacao === observacao
            ? { ...i, quantidade: Math.max(0, i.quantidade + delta) }
            : i
        )
        .filter((i) => i.quantidade > 0)
    );
  };

  const sendOrder = () => {
    const mesa = db.mesas.find((m) => m.numero === tableNumber);
    if (!mesa || cart.length === 0) return;
    const itens: ItemPedido[] = cart.map((c, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      produtoId: c.produtoId,
      nome: c.nome,
      preco: c.preco,
      quantidade: c.quantidade,
      observacao: c.observacao,
    }));
    db.criarPedido(mesa.id, itens);
    setOrderSent(true);
    toast.success("Pedido enviado ao bar! 🍕");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-stone-900 text-white p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setTableNumber(null)} className="text-stone-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold">🍕 Bar Napoletano</h1>
              <p className="text-xs text-stone-400">Mesa {tableNumber}</p>
            </div>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative bg-orange-600 px-4 py-2 rounded-lg flex items-center gap-2">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white border-b sticky top-[60px] z-30">
        <div className="flex gap-1 overflow-x-auto p-2 max-w-md mx-auto scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                selectedCategory === cat ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-3">
        {filteredProducts.map((produto) => (
          <button
            key={produto.id}
            onClick={() => setSelectedProduct(produto)}
            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between text-left hover:shadow-md transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-bold">{produto.nome}</h3>
              <p className="text-sm text-gray-500 truncate">{produto.descricao}</p>
            </div>
            <div className="text-orange-600 font-bold text-lg whitespace-nowrap ml-4">
              R$ {produto.preco.toFixed(2).replace(".", ",")}
            </div>
          </button>
        ))}
      </div>

      {selectedProduct && (
        <ProductModal produto={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
      )}

      {cartOpen && (
        <CartPanel cart={cart} onClose={() => setCartOpen(false)} onUpdateQty={updateQty} onSend={sendOrder} total={cartTotal} />
      )}

      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-30"
        >
          <ShoppingCart size={20} />
          <span className="font-bold">{cartCount} itens</span>
          <span className="text-sm">• R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
        </button>
      )}
    </div>
  );
}

function ProductModal({
  produto,
  onClose,
  onAdd,
}: {
  produto: Produto;
  onClose: () => void;
  onAdd: (p: Produto, qty: number, obs: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [obs, setObs] = useState("");
  const [quickObs, setQuickObs] = useState<string[]>([]);

  const toggleQuickObs = (text: string) => {
    setQuickObs((prev) => (prev.includes(text) ? prev.filter((o) => o !== text) : [...prev, text]));
  };

  const handleAdd = () => {
    const fullObs = [...quickObs, obs].filter(Boolean).join(", ");
    onAdd(produto, qty, fullObs);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">{produto.nome}</h2>
            <p className="text-stone-500 text-sm">{produto.descricao}</p>
            <p className="text-orange-600 font-bold text-lg mt-1">R$ {produto.preco.toFixed(2).replace(".", ",")}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm font-bold mb-2">Observações rápidas</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_OBS.map((o) => (
              <button
                key={o}
                onClick={() => toggleQuickObs(o)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  quickObs.includes(o) ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-bold mb-2">Observação personalizada</p>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex: sem gelo, com limão, bem passado..."
            className="w-full border rounded-lg p-3 text-sm resize-none"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className="font-bold">Quantidade</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Minus size={20} />
            </button>
            <span className="text-xl font-bold w-8 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Plus size={20} />
            </button>
          </div>
        </div>

        <button onClick={handleAdd} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-500">
          Adicionar • R$ {(produto.preco * qty).toFixed(2).replace(".", ",")}
        </button>
      </div>
    </div>
  );
}

function CartPanel({
  cart,
  onClose,
  onUpdateQty,
  onSend,
  total,
}: {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQty: (produtoId: string, obs: string, delta: number) => void;
  onSend: () => void;
  total: number;
}) {
  const servico = total * 0.1;
  const totalFinal = total + servico;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Carrinho</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">
            <X size={24} />
          </button>
        </div>

        {cart.length === 0 ? (
          <p className="text-center text-stone-500 py-8">Carrinho vazio</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between border-b pb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{item.quantidade}x {item.nome}</p>
                    {item.observacao && <p className="text-sm text-stone-500 italic">{item.observacao}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => onUpdateQty(item.produtoId, item.observacao, -1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Minus size={16} />
                    </button>
                    <span className="font-bold w-6 text-center">{item.quantidade}</span>
                    <button onClick={() => onUpdateQty(item.produtoId, item.observacao, 1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 mb-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>R$ {total.toFixed(2).replace(".", ",")}</span></div>
              <div className="flex justify-between"><span>Serviço (10%)</span><span>R$ {servico.toFixed(2).replace(".", ",")}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span><span>R$ {totalFinal.toFixed(2).replace(".", ",")}</span></div>
            </div>

            <button onClick={onSend} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-500">
              🍕 Enviar Pedido ao Bar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
