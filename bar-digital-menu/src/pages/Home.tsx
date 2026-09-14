import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Smartphone, ChefHat, CreditCard, Printer } from "lucide-react";

export function Home() {
  const modules = [
    { to: "/menu", icon: Smartphone, title: "Cardápio Mobile", desc: "Cliente monta o pedido pelo celular", color: "orange" },
    { to: "/kds", icon: ChefHat, title: "KDS Bar", desc: "Painel de produção do barman", color: "blue" },
    { to: "/pos", icon: CreditCard, title: "Caixa (PDV)", desc: "Controle de pedidos e pagamentos", color: "green" },
    { to: "/print", icon: Printer, title: "Estação de Impressão", desc: "Fila de impressão e cupons térmicos", color: "purple" },
  ];

  const colorMap: Record<string, string> = {
    orange: "hover:border-orange-500",
    blue: "hover:border-blue-500",
    green: "hover:border-green-500",
    purple: "hover:border-purple-500",
  };
  const bgMap: Record<string, string> = {
    orange: "bg-orange-100 text-orange-600",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-stone-900 mb-2">🍕 Bar Napoletano</h1>
          <p className="text-stone-500">Sistema de Cardápio Digital com Impressão Dupla</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.to} to={m.to} className="group">
                <div className={`bg-white rounded-2xl p-6 shadow-lg border-2 border-transparent ${colorMap[m.color]} transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${bgMap[m.color]} transition-colors`}>
                      <Icon size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{m.title}</h2>
                      <p className="text-stone-500 text-sm">{m.desc}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 bg-stone-100 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-4">Como funciona o fluxo</h3>
          <div className="space-y-3">
            {[
              "Cliente escaneia o QR Code da mesa",
              "Monta o pedido no próprio celular (bebidas, drinks, porções)",
              "Comanda imprime automaticamente no Caixa e no Bar",
              "Bar prepara, caixa cobra, cliente recebe",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
