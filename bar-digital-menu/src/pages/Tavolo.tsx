import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, X, Home, CheckCircle2 } from "lucide-react";
import { useDb } from "../hooks/useDb";
import type { Produto, ItemPedido } from "../types";

interface CartItem {
  produtoId: string;
  nome: string;
  emoji: string;
  preco: number;
  quantidade: number;
  observacao: string;
}

const QUICK_NOTES = ["Senza ghiaccio", "Con limone", "Poco ghiaccio", "Doppia dose"];

export function Tavolo() {
  const { numero } = useParams();
  const db = useDb();
  const tableNumber = parseInt(numero || "1");
  const [selectedCategory, setSelectedCategory] = useState("Bevande");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  const categories = [...new Set(db.produtos.map((p) => p.categoria))];
  const catEmoji: Record<string, string> = { Bevande: "🍷", Aperitivi: "🍽️" };
  const filteredProducts = db.produtos.filter((p) => p.categoria === selectedCategory);
  const cartCount = cart.reduce((s, i) => s + i.quantidade, 0);
  const cartTotal = cart.reduce((s, i) => s + i.preco * i.quantidade, 0);

  if (orderSent) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6">
        <CheckCircle2 size={80} className="text-green-500 mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">Ordine Inviato! 🎉</h1>
        <p className="text-stone-400 mb-6">Tavolo {tableNumber} • Il bar ha ricevuto il tuo ordine</p>
        <button onClick={() => { setCart([]); setOrderSent(false); }} className="bg-amber-500 text-stone-950 px-6 py-3 rounded-xl font-bold hover:bg-amber-400">Nuovo Ordine</button>
      </div>
    );
  }

  const addToCart = (produto: Produto, quantidade: number, observacao: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.produtoId === produto.id && i.observacao === observacao);
      if (existing) return prev.map((i) => i.produtoId === produto.id && i.observacao === observacao ? { ...i, quantidade: i.quantidade + quantidade } : i);
      return [...prev, { produtoId: produto.id, nome: produto.nome, emoji: produto.emoji, preco: produto.preco, quantidade, observacao }];
    });
    setSelectedProduct(null);
    toast.success(`${quantidade}x ${produto.emoji} ${produto.nome} aggiunto!`);
  };

  const updateQty = (produtoId: string, observacao: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.produtoId === produtoId && i.observacao === observacao ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i).filter((i) => i.quantidade > 0));
  };

  const sendOrder = () => {
    const mesa = db.mesas.find((m) => m.numero === tableNumber);
    if (!mesa || cart.length === 0) return;
    const itens: ItemPedido[] = cart.map((c, idx) => ({ id: `item-${Date.now()}-${idx}`, produtoId: c.produtoId, nome: c.nome, emoji: c.emoji, preco: c.preco, quantidade: c.quantidade, observacao: c.observacao }));
    db.criarPedido(mesa.id, itens);
    setOrderSent(true);
    toast.success("Ordine inviato al bar! 🍕");
  };

  return (
    <div className="min-h-screen bg-stone-950 pb-20">
      <div className="bg-stone-900 border-b border-stone-800 p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-stone-400 hover:text-amber-400"><Home size={20} /></Link>
            <h1 className="text-lg font-display font-bold">Bar & Ristorante</h1>
          </div>
          <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg text-sm font-bold">Tavolo {tableNumber}</span>
        </div>
      </div>

      <div className="bg-stone-900 border-b border-stone-800 sticky top-[57px] z-30">
        <div className="flex gap-1 p-2 max-w-md mx-auto">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap ${selectedCategory === cat ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400"}`}>
              <span>{catEmoji[cat]}</span>{cat}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 grid grid-cols-1 gap-3">
        {filteredProducts.map((produto) => (
          <div key={produto.id} className="bg-stone-900 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="text-3xl">{produto.emoji}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{produto.nome}</h3>
                <p className="text-sm text-stone-500 truncate">{produto.descricao}</p>
                <p className="text-amber-400 font-bold">{produto.preco.toFixed(2).replace(".", ",")} €</p>
              </div>
            </div>
            <button onClick={() => setSelectedProduct(produto)} className="w-10 h-10 bg-amber-500 text-stone-950 rounded-full flex items-center justify-center shrink-0 ml-3 hover:bg-amber-400">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {selectedProduct && <ProductModal produto={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />}
      {cartOpen && <CartPanel cart={cart} onClose={() => setCartOpen(false)} onUpdateQty={updateQty} onSend={sendOrder} total={cartTotal} />}

      {cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-30 font-bold">
          <ShoppingCart size={20} /> {cartCount} articoli • {cartTotal.toFixed(2).replace(".", ",")} €
        </button>
      )}
    </div>
  );
}

function ProductModal({ produto, onClose, onAdd }: { produto: Produto; onClose: () => void; onAdd: (p: Produto, qty: number, obs: string) => void }) {
  const [qty, setQty] = useState(1);
  const [obs, setObs] = useState("");
  const [quickObs, setQuickObs] = useState<string[]>([]);

  const toggle = (t: string) => setQuickObs((p) => p.includes(t) ? p.filter((o) => o !== t) : [...p, t]);
  const handleAdd = () => onAdd(produto, qty, [...quickObs, obs].filter(Boolean).join(", "));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-stone-900 rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto border border-stone-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-3xl mb-2">{produto.emoji}</div>
            <h2 className="text-xl font-display font-bold">{produto.nome}</h2>
            <p className="text-stone-400 text-sm">{produto.descricao}</p>
            <p className="text-amber-400 font-bold text-lg mt-1">{produto.preco.toFixed(2).replace(".", ",")} €</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="mb-4">
          <p className="text-sm font-bold mb-2">Note rapide</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_NOTES.map((o) => (
              <button key={o} onClick={() => toggle(o)} className={`px-3 py-1.5 rounded-lg text-sm ${quickObs.includes(o) ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-300"}`}>{o}</button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <p className="text-sm font-bold mb-2">Nota personalizzata</p>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Es: senza ghiaccio, con limone..." className="w-full bg-stone-800 rounded-lg p-3 text-sm resize-none border border-stone-700 outline-none focus:ring-2 ring-amber-500" rows={2} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold">Quantità</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center"><Minus size={20} /></button>
            <span className="text-xl font-bold w-8 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center"><Plus size={20} /></button>
          </div>
        </div>
        <button onClick={handleAdd} className="w-full bg-amber-500 text-stone-950 py-3 rounded-xl font-bold hover:bg-amber-400">Aggiungi • {(produto.preco * qty).toFixed(2).replace(".", ",")} €</button>
      </div>
    </div>
  );
}

function CartPanel({ cart, onClose, onUpdateQty, onSend, total }: { cart: CartItem[]; onClose: () => void; onUpdateQty: (id: string, obs: string, d: number) => void; onSend: () => void; total: number }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-stone-900 rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto border border-stone-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display font-bold">Carrello</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={24} /></button>
        </div>
        {cart.length === 0 ? (
          <p className="text-center text-stone-500 py-8">Carrello vuoto</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between border-b border-stone-800 pb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{item.emoji} {item.quantidade}x {item.nome}</p>
                    {item.observacao && <p className="text-sm text-stone-500 italic">{item.observacao}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => onUpdateQty(item.produtoId, item.observacao, -1)} className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center"><Minus size={16} /></button>
                    <span className="font-bold w-6 text-center">{item.quantidade}</span>
                    <button onClick={() => onUpdateQty(item.produtoId, item.observacao, 1)} className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center"><Plus size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-stone-800 mb-4"><span>Totale</span><span className="text-amber-400">{total.toFixed(2).replace(".", ",")} €</span></div>
            <button onClick={onSend} className="w-full bg-amber-500 text-stone-950 py-3 rounded-xl font-bold hover:bg-amber-400">🍕 Invia Ordine al Bar</button>
          </>
        )}
      </div>
    </div>
  );
}
