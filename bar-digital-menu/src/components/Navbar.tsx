import { Link, useLocation } from "react-router-dom";
import { Home, Smartphone, ChefHat, CreditCard, Printer } from "lucide-react";

export function Navbar() {
  const location = useLocation();
  const links = [
    { to: "/", label: "Início", icon: Home },
    { to: "/menu", label: "Cardápio", icon: Smartphone },
    { to: "/kds", label: "KDS Bar", icon: ChefHat },
    { to: "/pos", label: "Caixa", icon: CreditCard },
    { to: "/print", label: "Impressão", icon: Printer },
  ];

  return (
    <nav className="bg-stone-900 text-stone-100 px-4 py-3 flex items-center gap-1 sticky top-0 z-50 no-print">
      <span className="font-bold text-orange-500 mr-4 text-lg whitespace-nowrap">🍕 Napoli Bar</span>
      <div className="flex gap-1 overflow-x-auto scrollbar-thin">
        {links.map((link) => {
          const active = location.pathname === link.to;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                active ? "bg-orange-600 text-white" : "hover:bg-stone-800"
              }`}
            >
              <Icon size={16} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
