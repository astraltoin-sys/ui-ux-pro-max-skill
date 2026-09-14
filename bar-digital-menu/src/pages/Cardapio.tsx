import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  QrCode,
  Bell,
  Receipt,
  Clock,
  Sparkles,
  ChefHat,
  Lock,
  CheckCircle2,
  UtensilsCrossed,
} from "lucide-react";
import { useDb } from "../hooks/useDb";
import { CATEGORIAS } from "../data/produtos";
import type { Produto, ItemPedido, Pedido } from "../types";
import { formatMoney } from "../lib/receipt";
import { unlockAudio, playBeep } from "../lib/audio";

interface CartItem {
  produtoId: string;
  nome: string;
  emoji: string;
  preco: number;
  quantidade: number;
  observacao: string;
}

// Contextual quick observations for food and beverages
const OBS_PRESETS: Record<string, string[]> = {
  "Cervejas & Chopes": ["Estalando de gelada", "Copo tulipa", "Copo descartável", "Com limão e sal"],
  "Drinks & Coquetéis": ["Sem gelo", "Com limão extra", "Pouco açúcar", "Sem açúcar", "Gelo e limão"],
  "Doses & Destilados": ["Puro sem gelo", "Com gelo de coco", "Dose com limão", "Copo com sal na borda"],
  "Petiscos & Porções": ["Molho à parte", "Bem crocante", "Sem cebola", "Sem pimenta", "Mais guardanapos"],
  "Burgers & Sanduíches": ["Ponto da carne: Ao ponto", "Ponto da carne: Bem passado", "Sem cebola", "Sem maionese", "Cortar ao meio"],
  "Não Alcoólicos & Sobremesas": ["Com gelo e limão", "Sem gelo", "Copo descartável", "Bem gelado", "Talheres extras"],
};

export function Cardapio() {
  const { mesa: mesaParam } = useParams<{ mesa?: string }>();
  const navigate = useNavigate();
  const db = useDb();

  const mesaNumero = parseInt(mesaParam || "1", 10) || 1;
  const currentMesa = db.mesas.find((m) => m.numero === mesaNumero) || db.mesas[0];

  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIAS[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastSentPedidoId, setLastSentPedidoId] = useState<string | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  // Track active order for this table
  const activePedido: Pedido | undefined = currentMesa?.pedidoId
    ? db.getPedidoById(currentMesa.pedidoId)
    : lastSentPedidoId
    ? db.getPedidoById(lastSentPedidoId)
    : undefined;

  const categories = CATEGORIAS;
  const filteredProducts = useMemo(() => {
    return db.produtos.filter((p) => p.categoria === selectedCategory && p.disponivel);
  }, [db.produtos, selectedCategory]);

  const cartCount = cart.reduce((sum, i) => sum + i.quantidade, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.preco * i.quantidade, 0);
  const cartServico = Math.round(cartSubtotal * 0.1 * 100) / 100;
  const cartTotal = cartSubtotal + cartServico;

  const addToCart = (produto: Produto, quantidade: number, observacao: string) => {
    unlockAudio();
    setCart((prev) => {
      const existing = prev.find((i) => i.produtoId === produto.id && i.observacao === observacao);
      if (existing) {
        return prev.map((i) =>
          i.produtoId === produto.id && i.observacao === observacao
            ? { ...i, quantidade: i.quantidade + quantidade }
            : i
        );
      }
      return [
        ...prev,
        {
          produtoId: produto.id,
          nome: produto.nome,
          emoji: produto.emoji,
          preco: produto.preco,
          quantidade,
          observacao,
        },
      ];
    });
    setSelectedProduct(null);
    toast.success(`${quantidade}x ${produto.nome} adicionado ao pedido!`);
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
    if (!currentMesa || cart.length === 0) return;
    unlockAudio();

    const itens: ItemPedido[] = cart.map((c, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      produtoId: c.produtoId,
      nome: c.nome,
      emoji: c.emoji,
      preco: c.preco,
      quantidade: c.quantidade,
      observacao: c.observacao,
    }));

    const novoPedido = db.criarPedido(currentMesa.id, itens);
    setLastSentPedidoId(novoPedido.id);
    setCart([]);
    setCartOpen(false);

    toast.success("Pedido enviado! O Barman já começou a preparar.", {
      description: `Comanda #${novoPedido.numero} para a Mesa ${currentMesa.numero}.`,
      duration: 5000,
    });
  };

  const handleCallWaiter = () => {
    unlockAudio();
    playBeep("ready");
    toast.success(`Garçom chamado para a Mesa ${mesaNumero}!`, {
      description: "Um de nossos atendentes irá até sua mesa em instantes.",
      duration: 4000,
    });
  };

  const handleRequestCheck = () => {
    unlockAudio();
    setShowBillModal(true);
  };

  return (
    <div className="min-h-screen bg-[#120e0b] text-stone-100 pb-28">
      {/* Customer Mobile Top Header — NO access to management/POS/KDS */}
      <header className="bg-[#1a1410] border-b border-[#2d241e] sticky top-0 z-30 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-lg shadow-md shadow-amber-900/30">
              🍺
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-bold text-base text-amber-200 leading-tight">BAR DIGITAL</h1>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">
                  CARDÁPIO
                </span>
              </div>
              <button
                onClick={() => setShowTablePicker(true)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono tracking-wide"
              >
                <span>Mesa {String(mesaNumero).padStart(2, "0")}</span>
                <span className="text-stone-500">• Mudar mesa ▾</span>
              </button>
            </div>
          </div>

          {/* Customer Quick Actions: Chamar Garçom, Pedir Conta, Carrinho */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCallWaiter}
              className="px-2.5 py-2 rounded-xl bg-[#231b14] hover:bg-[#2d231a] border border-[#382b21] text-amber-300 text-xs font-semibold flex items-center gap-1 active:scale-95 transition min-h-[44px]"
              title="Chamar Garçom"
              aria-label="Chamar Garçom"
            >
              <Bell size={14} className="text-amber-400" />
              <span className="hidden sm:inline">Garçom</span>
            </button>

            {activePedido && (
              <button
                onClick={handleRequestCheck}
                className="px-2.5 py-2 rounded-xl bg-[#231b14] hover:bg-[#2d231a] border border-[#382b21] text-stone-200 text-xs font-semibold flex items-center gap-1 active:scale-95 transition min-h-[44px]"
                title="Ver Conta da Mesa"
                aria-label="Ver Conta da Mesa"
              >
                <Receipt size={14} className="text-emerald-400" />
                <span className="hidden sm:inline">Conta</span>
              </button>
            )}

            <button
              onClick={() => setCartOpen(true)}
              className="relative bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition min-h-[44px]"
              aria-label="Ver Carrinho"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 ? (
                <span className="bg-stone-950 text-amber-300 text-xs font-mono font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Category Horizontal Scroll */}
        <div className="border-t border-[#2d241e]/70 bg-[#16110d]">
          <div className="max-w-md mx-auto flex gap-1.5 overflow-x-auto px-4 py-2.5 scrollbar-thin scroll-smooth">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 font-bold"
                      : "bg-[#231c16] text-stone-300 hover:text-white hover:bg-[#2d241e]"
                  }`}
                >
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Product Feed */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Banner with Table Welcome */}
        <div className="bg-gradient-to-r from-[#231c16] to-[#1a1410] border border-[#3a2f27] rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-mono font-semibold tracking-wider uppercase">
              Bem-vindo ao Bar
            </div>
            <div className="font-display font-bold text-lg text-white">Mesa {String(mesaNumero).padStart(2, "0")}</div>
            <div className="text-xs text-stone-400">Selecione os itens e envie direto para o bar</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <QrCode size={24} />
          </div>
        </div>

        {/* Active Order Tracker Banner (if any) */}
        {activePedido && (
          <div className="bg-[#1c1611] border border-amber-500/40 rounded-2xl p-4 mb-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                <ChefHat size={14} /> Pedido #{padNum(activePedido.numero)}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activePedido.status === "novo"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse"
                    : activePedido.status === "preparando"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : activePedido.status === "pronto"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-stone-700 text-stone-300"
                }`}
              >
                {activePedido.status === "novo"
                  ? "Na fila do Bar"
                  : activePedido.status === "preparando"
                  ? "Em Preparo"
                  : activePedido.status === "pronto"
                  ? "Pronto para Servir"
                  : "Finalizado"}
              </span>
            </div>

            {/* Stepper visual */}
            <div className="grid grid-cols-3 gap-2 my-3 text-center text-[10px]">
              <div
                className={`p-2 rounded-lg border ${
                  activePedido.status === "novo" || activePedido.status === "preparando" || activePedido.status === "pronto"
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-stone-800 text-stone-500"
                }`}
              >
                <div className="font-bold">1. Recebido</div>
                <div>Caixa & Bar</div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  activePedido.status === "preparando" || activePedido.status === "pronto"
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-stone-800 text-stone-500"
                }`}
              >
                <div className="font-bold">2. Preparando</div>
                <div>Barman</div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  activePedido.status === "pronto"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                    : "border-stone-800 text-stone-500"
                }`}
              >
                <div className="font-bold">3. Pronto</div>
                <div>A caminho</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>{activePedido.itens.length} ite{activePedido.itens.length > 1 ? "ns" : "m"}</span>
              <span className="font-mono font-bold text-amber-300">{formatMoney(activePedido.total)}</span>
            </div>
          </div>
        )}

        {/* Category Heading */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display font-bold text-xl text-stone-100 flex items-center gap-2">
            <span>{selectedCategory}</span>
          </h2>
          <span className="text-xs text-stone-400 font-mono">{filteredProducts.length} opções</span>
        </div>

        {/* Product Cards */}
        <div className="space-y-3">
          {filteredProducts.map((produto) => (
            <button
              key={produto.id}
              onClick={() => setSelectedProduct(produto)}
              className="w-full bg-[#1c1611] border border-[#2d241e] hover:border-amber-500/40 rounded-2xl p-4 text-left shadow-sm hover:shadow-amber-950/20 transition-all flex items-center justify-between gap-3 group active:scale-[0.99] min-h-[72px]"
            >
              <div className="w-12 h-12 rounded-xl bg-[#281f18] flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform">
                {produto.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-stone-100 text-sm group-hover:text-amber-200 transition-colors">
                  {produto.nome}
                </h3>
                <p className="text-xs text-stone-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {produto.descricao}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="font-mono font-bold text-amber-400 tabular-nums text-sm">
                  {formatMoney(produto.preco)}
                </div>
                <div className="mt-1 text-[11px] text-stone-400 bg-[#281f18] group-hover:bg-amber-500 group-hover:text-stone-950 px-2 py-0.5 rounded-lg font-medium transition-colors inline-block">
                  Pedir +
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Customer Footer — NO admin links exposed */}
        <footer className="mt-12 text-center text-stone-500 text-xs py-6 border-t border-[#231b14]">
          <p className="font-medium text-stone-400">🍺 Bar Digital — Atendimento à Mesa</p>
          <p className="text-[11px] mt-1 text-stone-600">Rua dos Boêmios, 100 • Wi-Fi: BarDigital_Guest</p>
          
          {/* Very discreet staff PIN entry for bar employees only */}
          <div className="mt-6">
            <button
              onClick={() => navigate("/caixa")}
              className="text-[10px] text-stone-700 hover:text-stone-500 flex items-center gap-1 mx-auto transition"
              title="Acesso dos Funcionários (Exige Senha)"
            >
              <Lock size={10} />
              <span>Acesso da Equipe</span>
            </button>
          </div>
        </footer>
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <aside
          aria-label="Resumo do Carrinho Flutuante"
          className="fixed bottom-3 inset-x-0 z-40 px-4 max-w-md mx-auto pointer-events-none"
        >
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 p-3.5 rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center justify-between pointer-events-auto hover:brightness-105 active:scale-95 transition min-h-[48px]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-stone-950 text-amber-400 flex items-center justify-center font-bold text-xs font-mono">
                {cartCount}
              </div>
              <div className="text-left leading-tight">
                <div className="font-bold text-xs uppercase tracking-wider">Ver Carrinho</div>
                <div className="text-[11px] text-stone-800">
                  {cartCount} ite{cartCount > 1 ? "ns" : "m"} selecionado{cartCount > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base tabular-nums">
                {formatMoney(cartTotal)}
              </span>
              <span className="text-stone-950 font-bold">→</span>
            </div>
          </button>
        </aside>
      )}

      {/* Product Customization Modal */}
      {selectedProduct && (
        <ProductDetailModal
          produto={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      )}

      {/* Cart Bottom Sheet / Drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          mesaNumero={mesaNumero}
          subtotal={cartSubtotal}
          servico={cartServico}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onSendOrder={sendOrder}
        />
      )}

      {/* Table Switcher Modal */}
      {showTablePicker && (
        <TablePickerModal
          currentMesa={mesaNumero}
          mesas={db.mesas}
          onSelect={(num) => {
            setShowTablePicker(false);
            navigate(`/cardapio/${num}`);
          }}
          onClose={() => setShowTablePicker(false)}
        />
      )}

      {/* Customer Bill Modal ("Pedir a Conta") */}
      {showBillModal && activePedido && (
        <CustomerBillModal
          pedido={activePedido}
          onClose={() => setShowBillModal(false)}
          onRequestCheckPayment={() => {
            setShowBillModal(false);
            toast.success("Solicitação de fechamento enviada!", {
              description: `O garçom levará a conta e a maquininha até a Mesa ${mesaNumero}.`,
              duration: 5000,
            });
          }}
        />
      )}
    </div>
  );
}

function ProductDetailModal({
  produto,
  onClose,
  onAdd,
}: {
  produto: Produto;
  onClose: () => void;
  onAdd: (p: Produto, qty: number, obs: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [notaLivre, setNotaLivre] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);

  const presets = OBS_PRESETS[produto.categoria] || [
    "Sem gelo",
    "Com limão",
    "Bem gelado",
    "Sem açúcar",
    "Caprichado",
  ];

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleConfirm = () => {
    const parts = [...selectedChips];
    if (notaLivre.trim()) {
      parts.push(notaLivre.trim());
    }
    const fullObs = parts.join(", ");
    onAdd(produto, qty, fullObs);
  };

  const subtotal = produto.preco * qty;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1410] border border-[#2d241e] text-stone-100 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto scrollbar-thin shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl p-2 rounded-2xl bg-[#261e18]">{produto.emoji}</span>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400">
                {produto.categoria}
              </span>
              <h2 className="font-display font-bold text-lg text-white leading-tight">
                {produto.nome}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed mb-4 bg-[#231c16] p-3 rounded-xl border border-[#30261e]">
          {produto.descricao}
        </p>

        {/* Observações em Chips */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-amber-200 mb-2 uppercase tracking-wide">
            Observações Rápidas
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const active = selectedChips.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => toggleChip(preset)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex items-center gap-1.5 ${
                    active
                      ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                      : "bg-[#261e18] text-stone-300 hover:bg-[#322720] border border-[#3a2f27]"
                  }`}
                >
                  <span>{active ? "✓ " : "+ "}</span>
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nota Livre */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-amber-200 mb-1.5 uppercase tracking-wide">
            Nota Livre para o Barman / Cozinha
          </label>
          <textarea
            value={notaLivre}
            onChange={(e) => setNotaLivre(e.target.value)}
            placeholder="Ex: sem pimenta, dividir em 2 copos, ponto ao ponto..."
            rows={2}
            className="w-full bg-[#120e0b] border border-[#30261e] rounded-xl p-3 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-sans"
          />
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mb-6 bg-[#231c16] p-3 rounded-2xl border border-[#30261e]">
          <span className="text-xs font-bold text-stone-200">Quantidade</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="w-10 h-10 rounded-xl bg-[#2e231b] hover:bg-amber-500 hover:text-stone-950 disabled:opacity-40 disabled:hover:bg-[#2e231b] disabled:hover:text-stone-400 flex items-center justify-center font-bold transition min-h-[44px] min-w-[44px]"
              aria-label="Diminuir"
            >
              <Minus size={16} />
            </button>
            <span className="font-mono font-bold text-lg text-amber-300 w-8 text-center tabular-nums">
              {qty}
            </span>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-10 h-10 rounded-xl bg-[#2e231b] hover:bg-amber-500 hover:text-stone-950 flex items-center justify-center font-bold transition min-h-[44px] min-w-[44px]"
              aria-label="Aumentar"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleConfirm}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-between shadow-xl shadow-amber-500/20 active:scale-95 transition min-h-[48px]"
        >
          <span>Adicionar ao Pedido</span>
          <span className="font-mono text-base tabular-nums font-extrabold">
            {formatMoney(subtotal)}
          </span>
        </button>
      </div>
    </div>
  );
}

function CartDrawer({
  cart,
  mesaNumero,
  subtotal,
  servico,
  total,
  onClose,
  onUpdateQty,
  onSendOrder,
}: {
  cart: CartItem[];
  mesaNumero: number;
  subtotal: number;
  servico: number;
  total: number;
  onClose: () => void;
  onUpdateQty: (produtoId: string, obs: string, delta: number) => void;
  onSendOrder: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1410] border border-[#2d241e] text-stone-100 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto scrollbar-thin shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-[#2d241e] mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-amber-400" size={20} />
            <h2 className="font-display font-bold text-lg text-white">Seu Pedido</h2>
            <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              Mesa {String(mesaNumero).padStart(2, "0")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-40 text-amber-500" />
            <p className="font-medium text-sm">Seu carrinho está vazio.</p>
            <p className="text-xs text-stone-600 mt-1">Adicione bebidas, drinks ou petiscos do cardápio.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4 flex-1">
              {cart.map((item, idx) => (
                <div
                  key={`${item.produtoId}-${item.observacao}-${idx}`}
                  className="bg-[#231c16] border border-[#30261e] p-3 rounded-2xl flex items-start justify-between gap-3"
                >
                  <span className="text-2xl mt-0.5">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-stone-100 leading-tight">{item.nome}</div>
                    <div className="text-xs font-mono text-amber-400 mt-0.5 tabular-nums">
                      {formatMoney(item.preco * item.quantidade)}
                      <span className="text-stone-500 ml-1">({formatMoney(item.preco)} un)</span>
                    </div>
                    {item.observacao && (
                      <div className="text-[11px] text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-md mt-1.5 border border-amber-500/20 italic">
                        {item.observacao}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQty(item.produtoId, item.observacao, -1)}
                      className="w-8 h-8 rounded-lg bg-[#2e231b] hover:bg-red-500 hover:text-white text-stone-300 flex items-center justify-center transition min-h-[36px] min-w-[36px]"
                      aria-label="Diminuir"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-mono font-bold text-sm w-5 text-center tabular-nums">
                      {item.quantidade}
                    </span>
                    <button
                      onClick={() => onUpdateQty(item.produtoId, item.observacao, 1)}
                      className="w-8 h-8 rounded-lg bg-[#2e231b] hover:bg-amber-500 hover:text-stone-950 text-stone-300 flex items-center justify-center transition min-h-[36px] min-w-[36px]"
                      aria-label="Aumentar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial summary with tabular numbers */}
            <div className="bg-[#140f0c] p-3.5 rounded-2xl border border-[#2d241e] space-y-1.5 text-xs mb-4">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal dos itens</span>
                <span className="font-mono tabular-nums text-stone-200">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Serviço sugerido (10%)</span>
                <span className="font-mono tabular-nums text-stone-200">{formatMoney(servico)}</span>
              </div>
              <div className="border-t border-[#2d241e] pt-2 flex justify-between items-baseline font-bold text-sm">
                <span className="text-amber-200">Total Previsto</span>
                <span className="font-mono font-extrabold text-base text-amber-400 tabular-nums">
                  {formatMoney(total)}
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={onSendOrder}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition min-h-[48px]"
            >
              <span>🍺 Confirmar e Enviar Pedido</span>
            </button>

            <p className="text-[10px] text-center text-stone-500 mt-2">
              A comanda é enviada diretamente para a produção do bar.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function TablePickerModal({
  currentMesa,
  mesas,
  onSelect,
  onClose,
}: {
  currentMesa: number;
  mesas: { id: string; numero: number; status: string }[];
  onSelect: (num: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1410] border border-[#2d241e] rounded-3xl w-full max-w-sm p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-bold text-lg text-white">Escolha sua Mesa</h2>
          <button onClick={onClose} className="text-stone-400 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          Selecione o número da mesa em que você está acomodado:
        </p>

        <div className="grid grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
          {mesas.map((m) => {
            const isCurrent = m.numero === currentMesa;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.numero)}
                className={`aspect-square rounded-xl font-mono font-bold text-base flex flex-col items-center justify-center transition-all min-h-[44px] ${
                  isCurrent
                    ? "bg-amber-500 text-stone-950 ring-2 ring-amber-400 font-extrabold"
                    : m.status === "ocupada"
                    ? "bg-[#2d241e] text-amber-200 border border-amber-600/40"
                    : "bg-[#231c16] text-stone-300 hover:bg-[#30261e] border border-[#30261e]"
                }`}
              >
                <span>{String(m.numero).padStart(2, "0")}</span>
                <span className="text-[9px] font-sans font-normal opacity-70">
                  {m.status === "ocupada" ? "Ativa" : "Livre"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CustomerBillModal({
  pedido,
  onClose,
  onRequestCheckPayment,
}: {
  pedido: Pedido;
  onClose: () => void;
  onRequestCheckPayment: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1410] border border-[#2d241e] text-stone-100 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto scrollbar-thin shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#2d241e]">
          <div className="flex items-center gap-2">
            <Receipt className="text-amber-400" size={20} />
            <h2 className="font-display font-bold text-lg text-white">Extrato da Mesa {pedido.mesaNumero}</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-stone-400 mb-3">
          Confira o consumo atual registrado na sua comanda:
        </p>

        <div className="space-y-2 mb-4 max-h-56 overflow-y-auto scrollbar-thin pr-1">
          {pedido.itens.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#231c16] border border-[#30261e] p-2.5 rounded-xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-amber-300">{item.quantidade}x</span>
                <span className="text-stone-200 truncate">{item.nome}</span>
              </div>
              <span className="font-mono font-bold text-amber-400 tabular-nums whitespace-nowrap">
                {formatMoney(item.preco * item.quantidade)}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-[#140f0c] p-3.5 rounded-2xl border border-[#2d241e] space-y-1.5 text-xs mb-5">
          <div className="flex justify-between text-stone-400">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums text-stone-200">{formatMoney(pedido.subtotal)}</span>
          </div>
          <div className="flex justify-between text-stone-400">
            <span>Taxa de Serviço (10%)</span>
            <span className="font-mono tabular-nums text-stone-200">{formatMoney(pedido.servico)}</span>
          </div>
          <div className="border-t border-[#2d241e] pt-2 flex justify-between items-baseline font-bold text-sm">
            <span className="text-amber-200">Total a Pagar</span>
            <span className="font-mono font-extrabold text-xl text-amber-400 tabular-nums">
              {formatMoney(pedido.total)}
            </span>
          </div>
        </div>

        <button
          onClick={onRequestCheckPayment}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition min-h-[48px]"
        >
          <Receipt size={18} />
          <span>Solicitar Conta ao Garçom (Maquininha / Pix)</span>
        </button>
      </div>
    </div>
  );
}

function padNum(n: number, size = 4): string {
  return String(n).padStart(size, "0");
}
