# 🍺 Bar Digital Menu

**Sistema completo de pedidos para bares e restaurantes com cardápio mobile, impressão simultânea no bar e no caixa, painel PDV e KDS de produção.**

Construído com React 18 + TypeScript + Vite + Tailwind CSS. Roda 100% no navegador, com camada de dados simulada (pronta para Supabase) e geração real de código ESC/POS para impressoras térmicas.

---

## Como funciona o fluxo

```
1. QR CODE   → Cliente escaneia o QR code da mesa
2. CARDÁPIO  → Monta o pedido no próprio celular (bebidas/drinks/porções)
3. IMPRESSÃO → Comanda imprime automaticamente no CAIXA e NO BAR
4. PRONTO!   → Bar prepara, caixa cobra, cliente recebe
```

```
┌──────────────┐   pedido    ┌──────────────────┐   print_job    ┌────────────────┐
│  Celular do  │ ──────────► │  Database (mock) │ ─────────────► │ Estação de     │
│  cliente     │             │  + Realtime      │                │ impressão      │
└──────────────┘             └────────┬─────────┘                └───────┬────────┘
                                      │                                  │
                    ┌─────────────────┼─────────────────┐                ▼
                    ▼                 ▼                 ▼        ┌────────────────┐
               ┌─────────┐      ┌──────────┐      ┌─────────┐   │ Cupom BAR +    │
               │   KDS   │      │   PDV    │      │ Mapa de │   │ Cupom CAIXA    │
               │  (bar)  │      │ (caixa)  │      │  mesas  │   │ ESC/POS 80/58mm│
               └─────────┘      └──────────┘      └─────────┘   └────────────────┘
```

---

## Instalação e execução

```bash
cd bar-digital-menu
npm install
npm run dev
```

Acesse no navegador: **http://localhost:5173**

```bash
npm run build      # typecheck + build de produção
npm run typecheck  # somente verificação de tipos
npm run preview    # serve o build de produção
```

---

## Demo guiada (2 minutos)

1. **Tela inicial (`/`)** — clique em uma mesa (isso simula a leitura do QR Code) ou em **“Ver QR Code da mesa”** para gerar um QR real apontando para `/cardapio/{mesa}`.
2. **Cardápio mobile (`/cardapio/7`)** — navegue pelas categorias, adicione itens, marque observações (“sem gelo”, “bem passado”) e escreva um recado livre.
3. **Enviar pedido** — a comanda é criada e um `print_job` do tipo **duplo** entra na fila.
4. **KDS do bar (`/bar`)** — o pedido chega com **bipe** (Web Audio API) e **alerta visual piscante**. Clique em **Iniciar preparo** → **Marcar como pronto** → **Despachar**.
5. **Estação de impressão (`/impressao`)** — os cupons são impressos automaticamente via `window.print()` em **iframe oculto** (a interface não trava). A bobina é exibida com serrilha realista e o arquivo ESC/POS pode ser exportado.
6. **Caixa (`/caixa`)** — feche a conta escolhendo Dinheiro/Cartão/Pix (com desconto opcional). O recibo de pagamento entra na fila de impressão e a mesa é liberada.

> **Dica:** abra `/cardapio/7`, `/bar`, `/caixa` e `/impressao` em **abas diferentes** — a sincronização entre elas é em tempo real (localStorage + `BroadcastChannel`).

---

## Módulos

### 1. Cardápio Digital Mobile (cliente) — `src/pages/Cardapio.tsx`

- Interface otimizada para smartphone (layout de até 448px, alvos de toque ≥ 44px)
- Simulador de QR Code (seletor de mesa na entrada)
- 6 categorias: **Cervejas, Drinks, Destilados, Refrigerantes, Porções, Petiscos** (36 produtos)
- **Observações personalizadas** por produto (chips de um toque) + **campo de nota livre**
- Carrinho com quantidade ajustável, agrupamento automático de itens idênticos
- Envio instantâneo + **tela de acompanhamento** do status (Recebido → Em preparo → Pronto)
- Feedback háptico (`navigator.vibrate`) ao adicionar itens

### 2. Impressão Dupla Simultânea — `src/lib/receipt.ts`, `src/lib/escpos.ts`

Um único **modelo de cupom** (`CupomModel`) alimenta as três saídas, garantindo que o que você vê é o que a impressora imprime:

| Saída | Arquivo | Uso |
|---|---|---|
| HTML na tela | `components/Receipt.tsx` | visualizador de bobina com serrilha |
| HTML de impressão | `gerarHtmlImpressao()` | iframe oculto + `window.print()` |
| Bytes ESC/POS | `gerarEscPos()` | exportação `.bin` para a térmica |

- **Cupom do Bar**: comanda operacional — mesa, comanda, itens, observações destacadas, tempo estimado e aviso final para marcar como pronto.
- **Cupom do Caixa**: conferência financeira — subtotal, desconto, taxa de serviço (10%), **TOTAL** em fonte dupla, forma de pagamento e selo **CUPOM PAGO** no fechamento.
- Bobinas de **80mm (48 colunas)** e **58mm (32 colunas)**
- Code pages **CP850** (padrão Brasil) e **CP860** (Português), com fallback ASCII — tabelas geradas dos codecs nativos do Python (`src/lib/codepages.ts`), então “ç”, “ã”, “º” e “°” saem corretos.

**Comandos ESC/POS emitidos:**

| Comando | Bytes | Função |
|---|---|---|
| `ESC @` | `1B 40` | inicializa impressora |
| `ESC t n` | `1B 74 02/03` | code page (CP850/CP860) |
| `ESC a n` | `1B 61 n` | alinhamento |
| `ESC E n` | `1B 45 n` | negrito |
| `GS ! n` | `1D 21 11` | largura + altura dupla |
| `ESC M n` | `1B 4D 01` | fonte B condensada |
| `GS B n` | `1D 42 01` | texto invertido |
| `ESC d n` | `1B 64 n` | avanço de papel |
| `ESC ( A 04 00 30 34 02 0A` | — | **bipe** (2 beeps, 200 ms) |
| `ESC p 0 25 250` | `1B 70 00 19 FA` | **pulso na gaveta** (pino 2) |
| `GS V B 00` | `1D 56 42 00` | corte parcial |

### 3. Estação de Impressão e Auto-Print Web — `src/pages/PrintStation.tsx`

- Acionamento automático via `window.print()` em **iframes ocultos** (`document.write` síncrono + `afterprint` + timeout de segurança) — a interface nunca trava
- **Visualizador realista de bobina** com serrilha (SVG gerado), textura de papel térmico e largura real em mm
- **Fila de impressão em tempo real** (FIFO), com modo silencioso para demonstrações
- Reimpressão **individual** (Bar / Caixa) ou **dupla**
- **Exportação de arquivo binário ESC/POS** (`.bin`) e do HTML do cupom
- **Inspetor de bytes** com dump hexadecimal
- Controle de bobina **80mm / 58mm**, code page, bipe e gaveta

### 4. Painel do Caixa (PDV) — `src/pages/PDV.tsx`

- Pedidos recebidos em tempo real com itens e observações
- **Mapa de mesas** (ocupadas/livres) com tempo de abertura e consumo atual — clicar filtra as comandas
- **Fechamento de conta** com seleção de forma de pagamento (Dinheiro/Cartão/Pix) e desconto
- **Histórico de impressões** (destino, origem, status, tentativas)
- Botões para reimprimir: **Apenas Caixa / Apenas Bar / Ambos**
- Resumo do turno: faturado, em aberto, ticket médio e faturamento por forma de pagamento

### 5. KDS — Tela de Produção do Barman — `src/pages/KDS.tsx`

- Kanban com 3 colunas: **Novos Pedidos / Preparando / Prontos**
- **Aviso sonoro (bipe)** automático para novos pedidos (Web Audio API, sem arquivos de áudio) + reforço após 1,2 s
- **Alerta visual piscante** na tela inteira + faixa “Ciente” para confirmar
- Botões **Iniciar preparo** / **Marcar como pronto** / **Despachar**
- Destaque para **observações especiais** dos clientes e cartão em vermelho após 8 min de espera
- Faixa de “Despachados” aguardando fechamento (com reabertura em 1 toque)

### 6. Banco de Dados — `src/lib/database.ts`

Arquitetura pronta para Supabase, simulada em memória para a demo.

| Tabela | Campos principais |
|---|---|
| `mesas` | `id`, `numero`, `status`, `aberta_em`, `comanda_atual` |
| `produtos` | `id`, `nome`, `descricao`, `preco`, `categoria`, `tempo_preparo`, `destaque`, `disponivel`, `observacoes_sugeridas` |
| `pedidos` | `id`, `comanda`, `mesa_id`, `mesa_numero`, `status`, `subtotal`, `taxa_servico`, `desconto`, `total`, `criado_em`, `pronto_em`, `pago_em`, `forma_pagamento`, `cliente` |
| `itens` | `id`, `pedido_id`, `produto_id`, `nome`, `preco_unitario`, `quantidade`, `observacoes`, `nota`, `subtotal`, `status` |
| `print_jobs` | `id`, `pedido_id`, `comanda`, `destino`, `largura`, `status`, `origem`, `tentativas`, `fechamento` |

Atualizações em tempo real em todos os painéis via sistema de eventos + `BroadcastChannel` (sincroniza entre abas do mesmo navegador) e persistência em `localStorage`.

---

## Tecnologias

- **React 18** + **TypeScript** (strict)
- **Vite 5**
- **Tailwind CSS 3**
- **React Router 6**
- **Sonner** (toasts)
- **Lucide React** (ícones)
- **date-fns** (datas em pt-BR)
- **Web Audio API** (bipe de novos pedidos)
- **BroadcastChannel / localStorage** (tempo real entre abas)
- **qrcode** (QR Code real da mesa)

### Decisões de design

O visual segue as recomendações do [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) para produtos de food service:

- **Paleta “Espresso & Amber”** — fundo quase preto com âmbar quente, ótima para ambientes com pouca luz (bar/cozinha)
- **Tipografia**: *Playfair Display SC* (títulos, clima de cardápio) + *Karla* (UI) + *JetBrains Mono* (cupons e valores)
- **Números tabulares** em todo valor monetário (essencial em PDV)
- Contraste mínimo de 4,5:1, foco visível em todos os elementos, `prefers-reduced-motion` respeitado e alvos de toque ≥ 44px

---

## Integração com Supabase (produção)

A classe `Database` em `src/lib/database.ts` imita a superfície do client JS do Supabase:

```ts
// Uso atual (mock)
await db.from('pedidos').select().eq('status', 'novo').order('criado_em');
await db.from('pedidos').insert({ ... });
await db.from('pedidos').update({ status: 'pronto' }).eq('id', id);
const off = db.on('pedidos', (event) => { /* novo pedido */ });
```

Para usar banco real:

1. `npm i @supabase/supabase-js`
2. Crie as tabelas (SQL em `docs/schema.sql` — veja abaixo)
3. Substitua o corpo dos métodos de `Database` por chamadas ao client:

```ts
// src/lib/database.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

from<T>(table: TableName) {
  return supabase.from(table); // mesma API: select/insert/update/delete/eq/order/limit/single
}

on(table: TableName | '*', cb: Listener) {
  const channel = supabase
    .channel('alteracoes')
    .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
```

4. Habilite **Realtime** nas tabelas `pedidos`, `itens`, `print_jobs` e `mesas`. Nenhuma tela precisa mudar — elas só consomem `useBar()`.

### Esquema SQL sugerido

```sql
create table mesas (
  id text primary key,
  numero int not null unique,
  status text not null default 'livre',
  aberta_em timestamptz,
  comanda_atual int
);

create table produtos (
  id text primary key,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null,
  categoria text not null,
  tempo_preparo int default 1,
  destaque boolean default false,
  disponivel boolean default true,
  rotulo text,
  observacoes_sugeridas text[]
);

create table pedidos (
  id text primary key,
  comanda int not null,
  mesa_id text references mesas(id),
  mesa_numero int not null,
  status text not null default 'novo',
  subtotal numeric(10,2) not null,
  taxa_servico numeric(10,2) not null default 0,
  desconto numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  pronto_em timestamptz,
  entregue_em timestamptz,
  pago_em timestamptz,
  forma_pagamento text,
  origem text default 'cliente',
  cliente text
);

create table itens (
  id text primary key,
  pedido_id text references pedidos(id) on delete cascade,
  produto_id text references produtos(id),
  nome text not null,
  preco_unitario numeric(10,2) not null,
  quantidade int not null,
  observacoes text[] default '{}',
  nota text,
  subtotal numeric(10,2) not null,
  status text default 'pendente'
);

create table print_jobs (
  id text primary key,
  pedido_id text references pedidos(id) on delete cascade,
  comanda int not null,
  mesa_numero int not null,
  destino text not null,            -- bar | caixa | duplo
  largura int not null default 80,  -- 80 | 58
  status text not null default 'pendente',
  origem text default 'auto',
  criado_em timestamptz default now(),
  impresso_em timestamptz,
  tentativas int default 0,
  erro text,
  motivo text,
  fechamento boolean default false
);
```

---

## Impressão em produção

O navegador não acessa a porta USB/serial diretamente. Em produção use um dos caminhos:

1. **WebUSB / Web Serial** (`navigator.serial`) — abra a porta da impressora e escreva os bytes de `gerarEscPos()` direto. Funciona em Chrome/Edge.
2. **Agente local** — um pequeno serviço (Node/Python) que recebe o `.bin` e envia para `/dev/usb/lp0` (Linux) ou `\\.\COM3` (Windows).
3. **QZ Tray / PrintNode** — soluções prontas de ponte térmica.

O `.bin` exportado pela estação já está pronto para qualquer um desses caminhos:

```bash
cat comanda-1001-duplo-80mm.bin > /dev/usb/lp0
```

---

## Estrutura do projeto

```
bar-digital-menu/
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── src/
    ├── main.tsx                    # bootstrap (Router + BarProvider + Sonner)
    ├── App.tsx                     # rotas
    ├── index.css                   # design tokens + estilos de impressão
    ├── types.ts                    # modelo de dados
    ├── data/seed.ts                # 36 produtos, 12 mesas, configuração
    ├── lib/
    │   ├── database.ts             # Database (mock Supabase) + realtime
    │   ├── bar-context.tsx         # estado + ações (useBar)
    │   ├── receipt.ts              # CupomModel (fonte única do cupom)
    │   ├── escpos.ts               # bytes ESC/POS
    │   ├── codepages.ts            # CP850/CP860 (gerado)
    │   ├── printer.ts              # iframe oculto + download
    │   ├── audio.ts                # bipe (Web Audio API)
    │   └── format.ts               # moeda/datas pt-BR
    ├── components/
    │   ├── ui.tsx                  # Button, Card, Badge, Modal, Toggle, Stat
    │   ├── Receipt.tsx             # bobina (serrilha) + HTML de impressão
    │   └── AppHeader.tsx           # navegação
    └── pages/
        ├── MesaSelect.tsx          # QR Code + mapa de mesas
        ├── Cardapio.tsx            # cardápio mobile do cliente
        ├── KDS.tsx                 # produção do bar
        ├── PDV.tsx                 # caixa
        └── PrintStation.tsx        # estação de impressão
```

---

## Licença

MIT — parte do ecossistema [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
