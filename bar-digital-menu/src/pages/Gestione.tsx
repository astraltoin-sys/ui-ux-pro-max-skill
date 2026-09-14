import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Home, Settings, Plus, Trash2 } from "lucide-react";
import { useDb } from "../hooks/useDb";
import type { Produto } from "../types";

export function Gestione() {
  const db = useDb();
  const [form, setForm] = useState({ nome: "", preco: "", descricao: "", emoji: "🍹", categoria: "Bevande" });

  const categories = [...new Set(db.produtos.map((p) => p.categoria))];
  const catEmoji: Record<string, string> = { Bevande: "🍷", Aperitivi: "🍽️" };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.preco) {
      toast.error("Nome e prezzo sono obbligatori");
      return;
    }
    db.addProduto({
      nome: form.nome.trim(),
      preco: parseFloat(form.preco),
      descricao: form.descricao.trim(),
      emoji: form.emoji || "🍽️",
      categoria: form.categoria,
    });
    toast.success("Prodotto aggiunto!");
    setForm({ nome: "", preco: "", descricao: "", emoji: "🍹", categoria: "Bevande" });
  };

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="bg-stone-900 border-b border-stone-800 p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link to="/" className="text-stone-400 hover:text-amber-400"><Home size={20} /></Link>
          <Settings className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="text-lg font-display font-bold">Gestione Menu</h1>
            <p className="text-xs text-stone-500">Aggiungi o rimuovi prodotti</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-amber-400" /> Aggiungi Prodotto</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Categoria</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full bg-stone-800 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-amber-500">
                {categories.map((c) => <option key={c} value={c}>{catEmoji[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Nome *</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es: Negroni" className="w-full bg-stone-800 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-amber-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">Prezzo (EUR) *</label>
                <input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} placeholder="0.00" className="w-full bg-stone-800 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">Emoji</label>
                <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={2} className="w-full bg-stone-800 rounded-xl px-4 py-3 text-center text-2xl outline-none focus:ring-2 ring-amber-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Descrizione</label>
              <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Es: Gin, Campari e vermut" className="w-full bg-stone-800 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-amber-500 resize-none" rows={2} />
            </div>
            <button type="submit" className="w-full bg-amber-500 text-stone-950 py-3 rounded-xl font-bold hover:bg-amber-400 flex items-center justify-center gap-2"><Plus size={20} /> Aggiungi Prodotto</button>
          </form>
        </div>

        {categories.map((cat) => {
          const prods = db.produtos.filter((p) => p.categoria === cat);
          return (
            <div key={cat}>
              <h2 className="font-display font-bold text-lg mb-3">{catEmoji[cat]} {cat} ({prods.length})</h2>
              <div className="space-y-2">
                {prods.map((p) => (
                  <div key={p.id} className="bg-stone-900 rounded-xl border border-stone-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-2xl">{p.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{p.nome}</div>
                        <div className="text-sm text-stone-500 truncate">{p.descricao}</div>
                      </div>
                      <div className="text-amber-400 font-bold whitespace-nowrap ml-2">{p.preco.toFixed(2).replace(".", ",")} €</div>
                    </div>
                    <button onClick={() => { db.removeProduto(p.id); toast.success("Prodotto rimosso"); }} className="ml-3 w-9 h-9 rounded-lg border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/10">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
