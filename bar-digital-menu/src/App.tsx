import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Menu } from "./pages/Menu";
import { KDS } from "./pages/KDS";
import { POS } from "./pages/POS";
import { PrintStation } from "./pages/PrintStation";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/kds" element={<KDS />} />
      <Route path="/pos" element={<POS />} />
      <Route path="/print" element={<PrintStation />} />
    </Routes>
  );
}
