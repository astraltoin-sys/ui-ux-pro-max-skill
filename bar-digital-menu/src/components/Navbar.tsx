import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, ChefHat, CreditCard, Printer, Lock, ExternalLink } from "lucide-react";
import { useDb } from "../hooks/useDb";
import { logoutStaff } from "../lib/auth";
import { toast } from "sonner";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const db = useDb();

  const pendentesImpressao = db.getPrintJobsPendentes().length;
  const novosBar = db.getPedidosByStatus("novo").length;
  const mesasOcupadas = db.mesas.filter((m) => m.status === "ocupada").length;

  const links = [
    { to: "/", label: "Visão Geral", icon: Home },
    {
      to: "/bar",
      label: "KDS Bar",
      icon: ChefHat,
      badge: novosBar > 0 ? `${novosBar}` : null,
      badgeColor: "bg-red-500 text-white animate-pulse",
    },
    {
      to: "/caixa",
      label: "Caixa PDV",
      icon: CreditCard,
      badge: mesasOcupadas > 0 ? `${mesasOcupadas}` : null,
      badgeColor: "bg-amber-600/80 text-amber-100",
    },
    {
      to: "/impressao",
      label: "Estação Impressão",
      icon: Printer,
      badge: pendentesImpressao > 0 ? `${pendentesImpressao}` : null,
      badgeColor: "bg-amber-500 text-stone-950 font-bold animate-pulse",
    },
  ];

  const handleLock = () => {
    logoutStaff();
    toast.info("Sessão da equipe encerrada com sucesso!");
    navigate("/cardapio/1");
  };

  return (
    <nav className="bg-[#120e0b]/95 backdrop-blur border-b border-[#2d241e] text-stone-100 px-4 py-2.5 sticky top-0 z-50 no-print transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand with Staff Area Badge */}
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30 group-hover:scale-105 transition-transform">
            <span className="text-lg">🍺</span>
          </div>
          <div>
            <div className="font-display font-bold text-base tracking-wide text-amber-100 flex items-center gap-1.5 leading-none">
              BAR DIGITAL
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-sans border border-red-500/30 font-bold">
                ÁREA DA EQUIPE
              </span>
            </div>
            <div className="text-[11px] text-stone-400 font-sans leading-none mt-1">
              Painel de Gestão Operacional
            </div>
          </div>
        </Link>

        {/* Staff Links */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            const Icon = link.icon;

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
                  isActive
                    ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                    : "text-stone-300 hover:text-white hover:bg-[#231c16]"
                }`}
              >
                <Icon size={16} className={isActive ? "text-[#120e0b]" : "text-amber-400"} />
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      link.badgeColor || "bg-stone-800 text-stone-200"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Quick link to client view in new tab or switcher */}
          <Link
            to="/cardapio/1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-amber-300 hover:bg-[#231c16] transition whitespace-nowrap min-h-[44px]"
            title="Abrir cardápio do cliente em nova aba"
          >
            <span>Ver Cardápio</span>
            <ExternalLink size={13} />
          </Link>

          {/* Lock / Exit Staff Area */}
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#231c16] hover:bg-red-500/20 text-stone-300 hover:text-red-300 border border-[#3a2f27] transition whitespace-nowrap min-h-[44px]"
            title="Bloquear painel de gestão"
          >
            <Lock size={14} className="text-amber-400" />
            <span>Bloquear</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
