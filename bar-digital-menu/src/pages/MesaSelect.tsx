import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  ArrowRight,
  ClipboardList,
  LayoutGrid,
  Printer,
  QrCode as QrIcon,
  ScanLine,
  Sparkles,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBar } from '@/lib/bar-context';
import { Button, Card, Modal, Stat } from '@/components/ui';
import { consumoDaMesa } from '@/lib/bar-context';
import { moeda, tempoDecorrido } from '@/lib/format';
import type { Mesa } from '@/types';

/**
 * Tela inicial: simula a leitura do QR Code da mesa.
 * Em producao o cliente abre a URL gravada no QR (ex.: /cardapio/7) e cai
 * direto no cardapio; aqui o seletor de mesa faz o papel da leitura.
 */
export function MesaSelect() {
  const { mesas, pedidosAbertos, config, gerarPedidoDemo, pronto } = useBar();
  const navigate = useNavigate();
  const [mesaQr, setMesaQr] = useState<Mesa | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [mesaSelecionada, setMesaSelecionada] = useState<number | null>(null);

  const urlBase = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}`;
  }, []);

  useEffect(() => {
    if (!mesaQr) return;
    let cancelado = false;
    QRCode.toDataURL(`${urlBase}/cardapio/${mesaQr.numero}`, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0B0A0C', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelado) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(''));
    return () => {
      cancelado = true;
    };
  }, [mesaQr, urlBase]);

  const mesasLivres = mesas.filter((m) => m.status === 'livre').length;
  const faturamentoAberto = pedidosAbertos.reduce((acc, p) => acc + p.total, 0);

  const abrirMesa = (mesa: Mesa) => {
    setMesaSelecionada(mesa.numero);
    // Pequeno atraso para o feedback visual da selecao antes de navegar.
    window.setTimeout(() => navigate(`/cardapio/${mesa.numero}`), 180);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <div className="animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-amber-300">
            <Sparkles size={13} />
            Cardápio digital · Impressão dupla
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.05] text-ink-50 sm:text-5xl lg:text-6xl">
            Escaneie, peça e a
            <span className="block text-amber-400">comanda imprime</span>
            no bar e no caixa.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-100/65">
            O cliente monta o pedido no próprio celular. A comanda sai automaticamente na impressora
            do bar (preparo) e do caixa (conferência financeira) — sem retrabalho e sem erro de
            anotação.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              icone={<ScanLine size={18} />}
              onClick={() => {
                const livre = mesas.find((m) => m.status === 'livre') ?? mesas[0];
                if (livre) abrirMesa(livre);
              }}
              disabled={!pronto || !mesas.length}
            >
              Simular leitura do QR Code
            </Button>
            <Button
              size="lg"
              variant="secondary"
              icone={<QrIcon size={18} />}
              onClick={() => {
                const alvo = mesas[0];
                if (alvo) setMesaQr(alvo);
              }}
              disabled={!mesas.length}
            >
              Ver QR Code da mesa
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat
              rotulo="Mesas livres"
              valor={`${mesasLivres}/${mesas.length}`}
              icone={<UtensilsCrossed size={17} />}
              tom="pronto"
            />
            <Stat
              rotulo="Comandas abertas"
              valor={pedidosAbertos.length}
              icone={<ClipboardList size={17} />}
              tom="novo"
            />
            <Stat
              rotulo="Em aberto"
              valor={moeda(faturamentoAberto)}
              icone={<Wine size={17} />}
              tom="alerta"
            />
          </div>
        </div>

        {/* Mapa de mesas */}
        <Card className="animate-pop-in p-5 lg:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="label-xs">Simulador de QR Code</p>
              <h2 className="mt-1 font-display text-2xl text-ink-50">Escolha a mesa</h2>
            </div>
            <span className="text-xs text-ink-100/45">12 mesas</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {mesas.map((mesa) => {
              const ocupada = mesa.status !== 'livre';
              const consumo = consumoDaMesa(pedidosAbertos, mesa.id);
              const selecionada = mesaSelecionada === mesa.numero;
              return (
                <button
                  key={mesa.id}
                  onClick={() => abrirMesa(mesa)}
                  className={[
                    'group relative cursor-pointer overflow-hidden rounded-xl border p-3 text-left',
                    'transition-all duration-200 hover:-translate-y-0.5 active:scale-[.97]',
                    selecionada
                      ? 'border-amber-400 bg-amber-400/15'
                      : ocupada
                        ? 'border-orange-500/30 bg-orange-500/[.08] hover:border-orange-400/60'
                        : 'border-white/[.08] bg-ink-800/60 hover:border-amber-400/50 hover:bg-amber-400/[.07]',
                  ].join(' ')}
                >
                  <span className="block font-display text-xl leading-none text-ink-50">
                    {String(mesa.numero).padStart(2, '0')}
                  </span>
                  <span
                    className={[
                      'mt-1.5 block text-[10px] font-semibold uppercase tracking-wider',
                      ocupada ? 'text-orange-300/90' : 'text-emerald-300/80',
                    ].join(' ')}
                  >
                    {ocupada ? 'Ocupada' : 'Livre'}
                  </span>
                  {ocupada && (
                    <span className="mt-0.5 block truncate text-[10px] text-ink-100/45">
                      {consumo > 0 ? moeda(consumo) : tempoDecorrido(mesa.aberta_em)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[11px] text-ink-100/40">
            Toque em uma mesa para abrir o cardápio (equivale a ler o QR Code impresso na mesa).
          </p>
        </Card>
      </section>

      {/* -------------------------- Fluxo + paineis ------------------------- */}
      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink-50">Como funciona o fluxo</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              passo: '01',
              titulo: 'QR Code',
              texto: 'O cliente escaneia o QR Code impresso na mesa e abre o cardápio no celular.',
              icone: <QrIcon size={18} />,
            },
            {
              passo: '02',
              titulo: 'Cardápio',
              texto: 'Escolhe bebidas, drinks e porções, define observações e monta o pedido.',
              icone: <UtensilsCrossed size={18} />,
            },
            {
              passo: '03',
              titulo: 'Impressão dupla',
              texto: 'A comanda imprime no caixa (valores) e no bar (preparo), ao mesmo tempo.',
              icone: <Printer size={18} />,
            },
            {
              passo: '04',
              titulo: 'Preparo e conta',
              texto: 'O bar acompanha no KDS, o garçom entrega e o caixa fecha a conta.',
              icone: <ClipboardList size={18} />,
            },
          ].map((item) => (
            <Card key={item.passo} className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                  {item.icone}
                </span>
                <span className="font-display text-sm text-amber-300/80">{item.passo}</span>
              </div>
              <h3 className="mt-4 text-base text-ink-50">{item.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-100/55">{item.texto}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------------------- Paineis ------------------------------ */}
      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink-50">Painéis da operação</h2>
            <p className="mt-1 text-sm text-ink-100/55">
              Abra em abas diferentes para ver a sincronização em tempo real.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icone={<Sparkles size={15} />}
            onClick={async () => {
              await gerarPedidoDemo();
              toast.success('Pedido de demonstração criado!', {
                description: 'Confira no painel do bar e na fila de impressão.',
              });
            }}
          >
            Gerar pedido de demonstração
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              to: '/bar',
              titulo: 'KDS · Bar',
              texto: 'Kanban de produção com aviso sonoro, alerta visual e destaque para observações.',
              icone: <UtensilsCrossed size={18} />,
              destaque: true,
            },
            {
              to: '/caixa',
              titulo: 'PDV · Caixa',
              texto: 'Mapa de mesas, fechamento de conta, formas de pagamento e histórico de impressões.',
              icone: <LayoutGrid size={18} />,
              destaque: false,
            },
            {
              to: '/impressao',
              titulo: 'Estação de impressão',
              texto: 'Auto-print em iframe oculto, bobina 80/58mm, fila em tempo real e exportação ESC/POS.',
              icone: <Printer size={18} />,
              destaque: false,
            },
          ].map((painel) => (
            <Link
              key={painel.to}
              to={painel.to}
              className={[
                'group cursor-pointer rounded-2xl border p-5 transition-all duration-200',
                'hover:-translate-y-0.5',
                painel.destaque
                  ? 'border-amber-400/30 bg-gradient-to-br from-amber-400/[.10] to-transparent hover:border-amber-400/60'
                  : 'border-white/[.07] bg-ink-850/70 hover:border-white/20',
              ].join(' ')}
            >
              <span
                className={[
                  'grid h-11 w-11 place-items-center rounded-xl border',
                  painel.destaque
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                    : 'border-white/[.08] bg-ink-800 text-ink-100/70',
                ].join(' ')}
              >
                {painel.icone}
              </span>
              <h3 className="mt-4 flex items-center gap-1.5 text-base text-ink-50">
                {painel.titulo}
                <ArrowRight
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-100/55">{painel.texto}</p>
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-12 text-center text-xs text-ink-100/35">
        {config.nome} · {config.endereco} · {config.telefone}
      </p>

      {/* ------------------------- Modal do QR Code ------------------------- */}
      <Modal
        aberto={Boolean(mesaQr)}
        onFechar={() => setMesaQr(null)}
        titulo={`QR Code — Mesa ${String(mesaQr?.numero ?? 0).padStart(2, '0')}`}
        subtitulo="Imprima e fixe na mesa. Ao escanear, o cliente abre o cardápio já com a mesa definida."
        largura="sm"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code da mesa ${mesaQr?.numero}`} className="h-52 w-52" />
            ) : (
              <div className="grid h-52 w-52 place-items-center text-ink-950/40">Gerando…</div>
            )}
          </div>
          <div className="w-full rounded-xl border border-white/[.07] bg-ink-800/60 px-4 py-3 text-center">
            <p className="label-xs">Mesa</p>
            <p className="font-display text-3xl text-amber-300">
              {String(mesaQr?.numero ?? 0).padStart(2, '0')}
            </p>
            <p className="mt-2 break-all font-mono text-[11px] text-ink-100/45">
              {urlBase}/cardapio/{mesaQr?.numero}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2">
            <select
              value={mesaQr?.numero ?? 1}
              onChange={(e) => {
                const mesa = mesas.find((m) => m.numero === Number(e.target.value));
                if (mesa) setMesaQr(mesa);
              }}
              className="h-11 flex-1 cursor-pointer rounded-xl border border-white/10 bg-ink-800 px-3 text-sm text-ink-50"
            >
              {mesas.map((m) => (
                <option key={m.id} value={m.numero}>
                  Mesa {String(m.numero).padStart(2, '0')} — {m.status === 'livre' ? 'livre' : 'ocupada'}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={() => mesaQr && abrirMesa(mesaQr)}
              icone={<ArrowRight size={16} />}
            >
              Abrir cardápio
            </Button>
          </div>
          <p className="text-center text-[11px] text-ink-100/40">
            Dica: abra o endereço acima no celular (mesma rede) para viver a experiência completa.
          </p>
        </div>
      </Modal>
    </div>
  );
}
