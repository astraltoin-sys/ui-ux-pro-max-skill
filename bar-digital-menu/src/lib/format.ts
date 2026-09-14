import { differenceInMinutes, format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function moeda(valor: number): string {
  return BRL.format(valor || 0);
}

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return '--';
  return format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR });
}

export function hora(iso: string | null | undefined): string {
  if (!iso) return '--';
  return format(parseISO(iso), 'HH:mm', { locale: ptBR });
}

export function dataCompleta(iso: string | null | undefined): string {
  if (!iso) return '--';
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
}

/** "há 12 minutos" — usado no mapa de mesas e no KDS. */
export function tempoDecorrido(iso: string | null | undefined): string {
  if (!iso) return '--';
  return formatDistanceToNowStrict(parseISO(iso), { locale: ptBR, addSuffix: true });
}

export function minutosDesde(iso: string | null | undefined): number {
  if (!iso) return 0;
  return differenceInMinutes(new Date(), parseISO(iso));
}

/** Formata 12.9 -> "12,90" (usado nos cupons ESC/POS). */
export function numeroCupom(valor: number): string {
  return (valor || 0).toFixed(2).replace('.', ',');
}

export function pluralizar(qtd: number, singular: string, plural: string): string {
  return qtd === 1 ? singular : plural;
}

export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
