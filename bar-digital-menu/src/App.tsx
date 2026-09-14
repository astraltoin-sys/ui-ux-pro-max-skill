import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { MesaSelect } from './pages/MesaSelect';
import { Cardapio } from './pages/Cardapio';
import { KDS } from './pages/KDS';
import { PDV } from './pages/PDV';
import { PrintStation } from './pages/PrintStation';

export default function App() {
  const location = useLocation();
  const ehCardapio = location.pathname.startsWith('/cardapio');

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader variante={ehCardapio ? 'cliente' : 'operacional'} />
      <main className={ehCardapio ? 'flex-1' : 'flex-1'}>
        <Routes>
          <Route path="/" element={<MesaSelect />} />
          <Route path="/cardapio/:mesaNumero" element={<Cardapio />} />
          <Route path="/bar" element={<KDS />} />
          <Route path="/caixa" element={<PDV />} />
          <Route path="/impressao" element={<PrintStation />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
