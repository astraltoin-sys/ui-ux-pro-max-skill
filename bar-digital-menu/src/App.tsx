import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Tavolo } from "./pages/Tavolo";
import { Bar } from "./pages/Bar";
import { Cassa } from "./pages/Cassa";
import { Stampa } from "./pages/Stampa";
import { Gestione } from "./pages/Gestione";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tavolo/:numero" element={<Tavolo />} />
      <Route path="/cassa" element={<Cassa />} />
      <Route path="/bar" element={<Bar />} />
      <Route path="/stampa" element={<Stampa />} />
      <Route path="/gestione" element={<Gestione />} />
    </Routes>
  );
}
