import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Home } from "./pages/Home";
import { Cardapio } from "./pages/Cardapio";
import { PrintStation } from "./pages/PrintStation";
import { POS } from "./pages/POS";
import { KDS } from "./pages/KDS";

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#1c1510",
            border: "1px solid #34271e",
            color: "#f5eee6",
            fontFamily: "Karla, sans-serif",
          },
        }}
      />
      <Routes>
        {/* Main Canonical Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/cardapio/:mesa" element={<Cardapio />} />
        <Route path="/cardapio" element={<Navigate to="/cardapio/1" replace />} />
        <Route path="/impressao" element={<PrintStation />} />
        <Route path="/caixa" element={<POS />} />
        <Route path="/bar" element={<KDS />} />

        {/* Aliases & Fallbacks */}
        <Route path="/menu" element={<Navigate to="/cardapio/1" replace />} />
        <Route path="/tavolo/:numero" element={<Navigate to="/cardapio/1" replace />} />
        <Route path="/cassa" element={<Navigate to="/caixa" replace />} />
        <Route path="/kds" element={<Navigate to="/bar" replace />} />
        <Route path="/pos" element={<Navigate to="/caixa" replace />} />
        <Route path="/stampa" element={<Navigate to="/impressao" replace />} />
        <Route path="/print" element={<Navigate to="/impressao" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
