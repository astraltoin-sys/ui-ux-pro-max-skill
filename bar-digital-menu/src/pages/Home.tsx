import { useState } from "react";
import { Link } from "react-router-dom";
import { Martini, QrCode, Minus, Plus, ArrowRight, CreditCard, ChefHat, Printer, Settings } from "lucide-react";
import { QRCodeSVG } from "../components/QRCode";

export function Home() {
  const [tableNumber, setTableNumber] = useState(1);
  const qrUrl = `${window.location.origin}/tavolo/${tableNumber}`;

  const stations = [
    { to: "/cassa", icon: CreditCard, title: "Cassa / PDV", desc: "Visualizza ordini, controlla pagamenti, chiudi tavoli e stampa comande." },
    { to: "/bar", icon: ChefHat, title: "Bar / Cucina", desc: "Pannello di produzione con allarme sonoro. Segna gli articoli come in preparazione e pronti." },
    { to: "/stampa", icon: Printer, title: "Stampa", desc: "Stazione di stampa automatica. Comande termiche per cassa e bar." },
    { to: "/gestione", icon: Settings, title: "Gestione Menu", desc: "Aggiungi o rimuovi prodotti dal menu. Gestisci bevande e aperitivi." },
  ];

  const steps = [
    { icon: QrCode, title: "Codice QR", desc: "Il cliente scansiona il QR del tavolo" },
    { icon: Martini, title: "Menu", desc: "Crea l'ordine dal proprio telefono" },
    { icon: Printer, title: "Stampa", desc: "La comanda si stampa alla cassa e al bar" },
    { icon: ChefHat, title: "Pronto!", desc: "Il bar prepara, la cassa incassa" },
  ];

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://9h9o7j-pwge33g5a-arcadawebapps3.vercel.app/images/hero-bar.jpg" alt="" className="w-full h-full object-cover opacity-30" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-950/80 to-stone-950" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-32 md:pt-32 md:pb-48">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Martini className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="text-amber-400 font-display text-sm tracking-[0.3em]">SISTEMA BAR</div>
              <div className="text-stone-500 text-xs">Ordini dal Tavolo</div>
            </div>
          </div>
          <h1 className="font-display text-5xl md:text-8xl font-bold leading-tight mb-6">
            L'ordine parte dal<br />
            <span className="text-amber-400">tavolo del cliente</span><br />
            e arriva alle <span className="text-amber-400">stampanti</span>
          </h1>
          <p className="text-stone-400 text-lg md:text-xl max-w-2xl leading-relaxed">
            Il cliente scansiona il codice QR del tavolo, crea l'ordine dal proprio telefono e la comanda viene stampata automaticamente alla cassa e al bar — simultaneamente e senza complicazioni.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-10">
        <div className="bg-stone-900 rounded-3xl border border-stone-800 p-6 md:p-10 shadow-2xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl mb-2 flex items-center gap-3">
                <QrCode className="w-7 h-7 text-amber-400" />
                Codice QR del Tavolo
              </h2>
              <p className="text-stone-400 mb-6">Stampa e attacca sul tavolo. Il cliente scansiona e apre il menu direttamente sul telefono.</p>
              <label className="block text-sm text-stone-400 mb-2">Numero del tavolo</label>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setTableNumber(Math.max(1, tableNumber - 1))} className="w-12 h-12 bg-stone-800 rounded-xl flex items-center justify-center hover:bg-stone-700 transition">
                  <Minus className="w-5 h-5" />
                </button>
                <input className="flex-1 bg-stone-800 rounded-xl px-4 py-3 text-center text-2xl font-display font-bold outline-none focus:ring-2 ring-amber-500" type="number" value={tableNumber} onChange={(e) => setTableNumber(Math.max(1, parseInt(e.target.value) || 1))} />
                <button onClick={() => setTableNumber(Math.min(99, tableNumber + 1))} className="w-12 h-12 bg-stone-800 rounded-xl flex items-center justify-center hover:bg-stone-700 transition">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <Link to={`/tavolo/${tableNumber}`} className="inline-flex items-center gap-2 bg-amber-500 text-stone-950 font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition">
                Apri menu
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-2xl">
                <QRCodeSVG value={qrUrl} size={200} />
                <div className="text-center text-stone-900 font-bold mt-2">TAVOLO {String(tableNumber).padStart(2, "0")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stations.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.to} to={s.to}>
                <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6 hover:border-amber-500/50 transition h-full">
                  <div className="text-amber-400 mb-4"><Icon className="w-8 h-8" /></div>
                  <h3 className="font-display font-bold text-lg mb-1">{s.title}</h3>
                  <p className="text-stone-400 text-sm mb-4">{s.desc}</p>
                  <span className="text-amber-400 text-sm font-bold">Accedi →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-stone-500 text-sm mb-1">{i + 1}</div>
                <div className="font-display font-bold">{step.title}</div>
                <div className="text-stone-400 text-sm">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
