import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { isStaffAuthenticated, authenticateStaff } from "../lib/auth";
import { toast } from "sonner";
import { unlockAudio } from "../lib/audio";

export function StaffGuard({ children, areaName = "Gestão do Estabelecimento" }: { children: ReactNode; areaName?: string }) {
  const [authenticated, setAuthenticated] = useState<boolean>(isStaffAuthenticated());
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const navigate = useNavigate();

  if (authenticated) {
    return <>{children}</>;
  }

  const handleKeyPress = (num: string) => {
    unlockAudio();
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPin("");
    setError(false);
  };

  const verifyPin = (code: string) => {
    if (authenticateStaff(code)) {
      setAuthenticated(true);
      toast.success("Acesso autorizado à equipe!");
    } else {
      setError(true);
      toast.error("Senha incorreta. Tente novamente.");
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 700);
    }
  };

  return (
    <div className="min-h-screen bg-[#120e0b] text-stone-100 flex items-center justify-center p-4">
      <div className="bg-[#1a1410] border border-[#2d241e] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Lock size={28} />
        </div>

        <h1 className="font-display font-bold text-2xl text-white mb-1">Acesso Restrito</h1>
        <p className="text-xs text-stone-400 mb-6">
          Área restrita à equipe de salão e bar ({areaName}). Digite a senha de 4 dígitos.
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => {
            const hasValue = pin.length > i;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  error
                    ? "bg-red-500 ring-2 ring-red-400 animate-bounce"
                    : hasValue
                    ? "bg-amber-400 ring-2 ring-amber-300 scale-110"
                    : "bg-[#281f18] border border-[#3d2e24]"
                }`}
              />
            );
          })}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto mb-6">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              onClick={() => handleKeyPress(n)}
              className="h-14 rounded-2xl bg-[#231b14] hover:bg-[#2f241d] active:scale-95 border border-[#362920] font-mono font-bold text-xl text-stone-200 flex items-center justify-center transition shadow-sm"
            >
              {n}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-[#231b14] hover:bg-red-500/20 text-stone-400 hover:text-red-300 border border-[#362920] text-xs font-bold flex items-center justify-center transition active:scale-95"
          >
            Limpar
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-14 rounded-2xl bg-[#231b14] hover:bg-[#2f241d] active:scale-95 border border-[#362920] font-mono font-bold text-xl text-stone-200 flex items-center justify-center transition shadow-sm"
          >
            0
          </button>
          <button
            onClick={() => {
              if (pin.length > 0) verifyPin(pin);
            }}
            className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center transition active:scale-95 shadow-md shadow-amber-500/20"
          >
            Entrar
          </button>
        </div>

        <div className="pt-4 border-t border-[#2d241e] flex flex-col gap-3">
          <p className="text-[11px] text-stone-500 font-mono">
            Senha padrão de fábrica: <span className="text-amber-400 font-bold">1234</span>
          </p>

          <button
            onClick={() => navigate("/cardapio/1")}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition py-2"
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Cardápio do Cliente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
