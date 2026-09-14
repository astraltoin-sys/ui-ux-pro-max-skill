import type { ConfiguracaoBar, DestinoImpressao, ItemPedido, PedidoCompleto } from '@/types';
import { dataCompleta, hora, moeda, numeroCupom } from './format';

/**
 * Modelo unico de cupom usado por TODOS os renderizadores (HTML na tela,
 * HTML de impressao e bytes ESC/POS). Assim o que aparece na bobina da
 * estacao de impressao e exatamente o que a impressora termica imprime.
 */

export type Alinhamento = 'esquerda' | 'centro' | 'direita';

export interface LinhaCupom {
  texto: string;
  alinhar?: Alinhamento;
  negrito?: boolean;
  /** Largura/altura dupla (titulos, total). */
  duplo?: boolean;
  /** Linha pontilhada de separacao. */
  separador?: boolean;
  /** Espacos em branco extras depois da linha. */
  espacoDepois?: number;
  /** Fonte condensada (cabecalhos secundarios). */
  condensado?: boolean;
  /** Inverte o texto (fundo preto) — usado no destaque de observacoes. */
  invertido?: boolean;
}

export interface CupomModel {
  destino: Exclude<DestinoImpressao, 'duplo'>;
  titulo: string;
  linhas: LinhaCupom[];
  /** Comanda usada no nome do arquivo exportado. */
  comanda: number;
  pedidoId: string;
  largura: 80 | 58;
}

export interface OpcoesCupom {
  largura: 80 | 58;
  destino: Exclude<DestinoImpressao, 'duplo'>;
  config: ConfiguracaoBar;
  /** Recibo de fechamento de conta (inclui forma de pagamento e selo PAGO). */
  fechamento?: boolean;
}

const SEPARADOR_80 = '-'.repeat(48);
const SEPARADOR_58 = '-'.repeat(32);

function separadorPara(largura: 80 | 58): string {
  return largura === 80 ? SEPARADOR_80 : SEPARADOR_58;
}

/** Monta "3x  Caipirinha de Limao" quebrando em duas linhas quando needed. */
function linhaItem(item: ItemPedido, largura: 80 | 58): LinhaCupom[] {
  const cols = largura === 80 ? 48 : 32;
  const nomeLimite = cols - 12;
  const nome = item.nome.length > nomeLimite ? `${item.nome.slice(0, nomeLimite - 1)}…` : item.nome;
  const qtd = `${item.quantidade}x`.padStart(3);
  const valor = numeroCupom(item.subtotal).padStart(cols - nome.length - 5);
  const linhas: LinhaCupom[] = [{ texto: `${qtd} ${nome}${valor}`, negrito: true }];

  const obs = [...(item.observacoes ?? [])];
  if (item.nota) obs.push(`"${item.nota}"`);
  obs.forEach((o) => {
    linhas.push({ texto: `    >> ${o}`, condensado: true, invertido: false });
  });

  if (item.preco_unitario && item.quantidade > 1) {
    linhas.push({
      texto: `    (${numeroCupom(item.preco_unitario)} cada)`,
      condensado: true,
    });
  }
  return linhas;
}

export function construirCupom(pedido: PedidoCompleto, opcoes: OpcoesCupom): CupomModel {
  const { largura, destino, config, fechamento = false } = opcoes;
  const cols = largura === 80 ? 48 : 32;
  const sep = separadorPara(largura);
  const linhas: LinhaCupom[] = [];
  const isBar = destino === 'bar';

  // ---- Cabecalho -----------------------------------------------------------
  linhas.push({ texto: config.nome, alinhar: 'centro', negrito: true, duplo: true });
  linhas.push({ texto: config.subtitulo, alinhar: 'centro', condensado: true });
  if (largura === 80) {
    linhas.push({ texto: config.endereco, alinhar: 'centro', condensado: true });
    linhas.push({ texto: `Tel: ${config.telefone} · CNPJ ${config.cnpj}`, alinhar: 'centro', condensado: true });
  } else {
    linhas.push({ texto: `Tel: ${config.telefone}`, alinhar: 'centro', condensado: true });
  }
  linhas.push({ texto: sep, separador: true });

  // ---- Identificacao -------------------------------------------------------
  if (isBar) {
    linhas.push({ texto: 'C O M A N D A   D E   P R E P A R O', alinhar: 'centro', negrito: true });
  } else {
    linhas.push({ texto: 'C O N F E R E N C I A   D E   C A I X A', alinhar: 'centro', negrito: true });
  }
  linhas.push({ texto: sep, separador: true });

  const mesaLabel = `MESA ${String(pedido.mesa_numero).padStart(2, '0')}`;
  const comandaLabel = `COMANDA #${String(pedido.comanda).padStart(4, '0')}`;
  linhas.push({ texto: `${mesaLabel}${' '.repeat(Math.max(1, cols - mesaLabel.length - comandaLabel.length))}${comandaLabel}`, negrito: true, duplo: true });
  linhas.push({ texto: `Data: ${dataCompleta(pedido.criado_em)}`, condensado: true });
  if (pedido.cliente) linhas.push({ texto: `Cliente: ${pedido.cliente}`, condensado: true });
  linhas.push({ texto: `Pedido: ${pedido.id.slice(-8).toUpperCase()}`, condensado: true });
  if (fechamento) {
    const forma = (pedido.forma_pagamento ?? '').toUpperCase();
    linhas.push({ texto: `PAGAMENTO: ${forma}`, negrito: true });
    linhas.push({ texto: `Fechado em: ${dataCompleta(pedido.pago_em ?? new Date().toISOString())}`, condensado: true });
  }
  linhas.push({ texto: sep, separador: true });

  // ---- Itens ---------------------------------------------------------------
  linhas.push({ texto: 'QTD ITEM', negrito: true });
  pedido.itens.forEach((item) => {
    linhas.push(...linhaItem(item, largura));
  });
  linhas.push({ texto: sep, separador: true });

  // ---- Totais --------------------------------------------------------------
  if (isBar) {
    const qtdTotal = pedido.itens.reduce((acc, i) => acc + i.quantidade, 0);
    linhas.push({ texto: `${String(qtdTotal).padStart(2, '0')} ${qtdTotal === 1 ? 'ITEM' : 'ITENS'} PARA PREPARAR`, alinhar: 'centro', negrito: true });
    const tempoMax = Math.max(...pedido.itens.map((i) => i.quantidade * 2), 5);
    linhas.push({ texto: `Preparo estimado: ~${tempoMax} min`, alinhar: 'centro', condensado: true });
    linhas.push({ texto: sep, separador: true });
    linhas.push({ texto: 'ATENCAO AS OBSERVACOES', alinhar: 'centro', negrito: true, duplo: true });
    linhas.push({ texto: 'Marcar como PRONTO no KDS ao finalizar', alinhar: 'centro', condensado: true });
  } else {
    const linhaTotal = (rotulo: string, valor: number, destaque = false) => {
      const v = numeroCupom(valor);
      const espacos = Math.max(1, cols - rotulo.length - v.length);
      linhas.push({ texto: `${rotulo}${' '.repeat(espacos)}${v}`, negrito: destaque, duplo: destaque });
    };
    linhaTotal('Subtotal', pedido.subtotal);
    if (pedido.desconto > 0) linhaTotal(`Desconto`, -pedido.desconto);
    linhaTotal(`Servico (${config.taxa_servico}%)`, pedido.taxa_servico);
    linhas.push({ texto: sep, separador: true });
    linhaTotal('TOTAL', pedido.total, true);
    if (fechamento && pedido.forma_pagamento === 'dinheiro') {
      linhas.push({ texto: sep, separador: true });
      linhas.push({ texto: 'DINHEIRO — conferir troco', alinhar: 'centro', negrito: true });
    }
  }

  // ---- Rodape --------------------------------------------------------------
  linhas.push({ texto: sep, separador: true });
  if (fechamento) {
    linhas.push({ texto: 'C U P O M   P A G O', alinhar: 'centro', negrito: true, duplo: true });
    linhas.push({ texto: 'Obrigado! Volte sempre.', alinhar: 'centro', condensado: true });
  } else if (isBar) {
    linhas.push({ texto: 'VIA DO BAR - NAO E DOCUMENTO FISCAL', alinhar: 'centro', condensado: true });
  } else {
    linhas.push({ texto: 'VIA DO CAIXA - NAO E DOCUMENTO FISCAL', alinhar: 'centro', condensado: true });
    linhas.push({ texto: 'Aguarde o fechamento da conta', alinhar: 'centro', condensado: true });
  }
  linhas.push({ texto: `Emitido as ${hora(new Date().toISOString())}`, alinhar: 'centro', condensado: true, espacoDepois: 2 });

  if (pedido.total) {
    linhas.push({ texto: moeda(pedido.total), alinhar: 'centro' });
  }

  return {
    destino,
    titulo: isBar ? 'Comanda de Preparo' : 'Conferência de Caixa',
    linhas,
    comanda: pedido.comanda,
    pedidoId: pedido.id,
    largura,
  };
}

/** Quantidade de caracteres por linha na bobina (fonte A). */
export function colunasPara(largura: 80 | 58): number {
  return largura === 80 ? 48 : 32;
}
