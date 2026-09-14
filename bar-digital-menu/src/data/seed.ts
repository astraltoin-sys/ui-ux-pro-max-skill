import type { Categoria, ConfiguracaoBar, Mesa, Produto } from '@/types';

export const CATEGORIAS: Categoria[] = [
  { id: 'cervejas', nome: 'Cervejas', icone: 'beer', descricao: 'Long neck, lata e gelada' },
  { id: 'drinks', nome: 'Drinks', icone: 'cocktail', descricao: 'Coquetelaria autoral e clássicos' },
  { id: 'destilados', nome: 'Destilados', icone: 'whisky', descricao: 'Doses e combos' },
  { id: 'refrigerantes', nome: 'Refrigerantes', icone: 'soda', descricao: 'Bebidas não alcoólicas' },
  { id: 'porcoes', nome: 'Porções', icone: 'plate', descricao: 'Para dividir na mesa' },
  { id: 'petiscos', nome: 'Petiscos', icone: 'peanut', descricao: 'Tira-gostos de bar' },
];

export const PRODUTOS: Produto[] = [
  // Cervejas
  { id: 'p-cerv-01', nome: 'Chopp Pilsen 400ml', descricao: 'Chopp claro, cremoso e bem gelado.', preco: 12.9, categoria: 'cervejas', tempo_preparo: 1, destaque: true, disponivel: true, rotulo: '400ml', observacoes_sugeridas: ['Bem gelado', 'Com colarinho', 'Sem colarinho'] },
  { id: 'p-cerv-02', nome: 'Chopp IPA 400ml', descricao: 'Amargor cítrico, 45 IBU.', preco: 15.9, categoria: 'cervejas', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: '400ml', observacoes_sugeridas: ['Bem gelado', 'Com colarinho'] },
  { id: 'p-cerv-03', nome: 'Brahma Long Neck 355ml', descricao: 'Clássica nacional, servida gelada.', preco: 9.5, categoria: 'cervejas', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: '355ml', observacoes_sugeridas: ['Bem gelada', 'Com limão'] },
  { id: 'p-cerv-04', nome: 'Heineken Long Neck 330ml', descricao: 'Puro malte importada.', preco: 13.9, categoria: 'cervejas', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: '330ml', observacoes_sugeridas: ['Bem gelada'] },
  { id: 'p-cerv-05', nome: 'Cerveja Artesanal Weizen 500ml', descricao: 'Trigo, notas de banana e cravo.', preco: 24.9, categoria: 'cervejas', tempo_preparo: 2, destaque: false, disponivel: true, rotulo: '500ml', observacoes_sugeridas: ['Com limão', 'Bem gelada'] },
  { id: 'p-cerv-06', nome: 'Bucket 5 Brahma', descricao: 'Balde com 5 long necks no gelo.', preco: 44.9, categoria: 'cervejas', tempo_preparo: 2, destaque: true, disponivel: true, rotulo: '5 un.', observacoes_sugeridas: ['Bem geladas', 'Com limão'] },

  // Drinks
  { id: 'p-drink-01', nome: 'Caipirinha de Limão', descricao: 'Cachaça artesanal, limão, açúcar e gelo.', preco: 19.9, categoria: 'drinks', tempo_preparo: 4, destaque: true, disponivel: true, rotulo: '300ml', observacoes_sugeridas: ['Sem gelo', 'Com pouco gelo', 'Sem açúcar', 'Com adoçante', 'Capricha na cachaça'] },
  { id: 'p-drink-02', nome: 'Caipirinha de Morango', descricao: 'Morango fresco, cachaça e limão.', preco: 24.9, categoria: 'drinks', tempo_preparo: 5, destaque: false, disponivel: true, rotulo: '300ml', observacoes_sugeridas: ['Sem açúcar', 'Sem gelo'] },
  { id: 'p-drink-03', nome: 'Gin Tônica', descricao: 'Gin, água tônica, zimbro e limão siciliano.', preco: 27.9, categoria: 'drinks', tempo_preparo: 4, destaque: true, disponivel: true, rotulo: '350ml', observacoes_sugeridas: ['Sem gelo', 'Com pepino', 'Com hortelã', 'Tônica à parte'] },
  { id: 'p-drink-04', nome: 'Negroni', descricao: 'Gin, Campari e vermute rosso.', preco: 32.9, categoria: 'drinks', tempo_preparo: 5, destaque: false, disponivel: true, rotulo: '200ml', observacoes_sugeridas: ['Com casca de laranja', 'Sem gelo'] },
  { id: 'p-drink-05', nome: 'Mojito', descricao: 'Rum branco, hortelã, limão, açúcar e soda.', preco: 25.9, categoria: 'drinks', tempo_preparo: 5, destaque: false, disponivel: true, rotulo: '300ml', observacoes_sugeridas: ['Capricha na hortelã', 'Sem açúcar'] },
  { id: 'p-drink-06', nome: 'Margarita', descricao: 'Tequila, Cointreau, limão e sal na borda.', preco: 29.9, categoria: 'drinks', tempo_preparo: 5, destaque: false, disponivel: true, rotulo: '250ml', observacoes_sugeridas: ['Sem sal na borda', 'Com sal na borda', 'Sem gelo'] },
  { id: 'p-drink-07', nome: 'Espresso Martini', descricao: 'Vodka, café espresso e licor de café.', preco: 31.9, categoria: 'drinks', tempo_preparo: 6, destaque: false, disponivel: true, rotulo: '180ml', observacoes_sugeridas: ['Sem açúcar'] },
  { id: 'p-drink-08', nome: 'Batida de Coco', descricao: 'Cachaça, leite condensado e coco.', preco: 18.9, categoria: 'drinks', tempo_preparo: 3, destaque: false, disponivel: true, rotulo: '300ml', observacoes_sugeridas: ['Sem gelo'] },

  // Destilados
  { id: 'p-dest-01', nome: 'Dose Cachaça Artesanal', descricao: 'Cachaça envelhecida em amburana.', preco: 12.0, categoria: 'destilados', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: 'Dose 50ml', observacoes_sugeridas: ['Com limão', 'Pura'] },
  { id: 'p-dest-02', nome: 'Dose Vodka Nacional', descricao: 'Servida gelada.', preco: 14.0, categoria: 'destilados', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: 'Dose 50ml', observacoes_sugeridas: ['Com energético', 'Com gelo'] },
  { id: 'p-dest-03', nome: 'Dose Whisky 12 Anos', descricao: 'Blended escocês 12 anos.', preco: 38.0, categoria: 'destilados', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: 'Dose 50ml', observacoes_sugeridas: ['Com gelo', 'Puro', 'Com água'] },
  { id: 'p-dest-04', nome: 'Dose Gin Nacional', descricao: 'Gin seco aromático.', preco: 18.0, categoria: 'destilados', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: 'Dose 50ml', observacoes_sugeridas: ['Com tônica', 'Com gelo'] },
  { id: 'p-dest-05', nome: 'Combo Vodka + Energético', descricao: 'Dose dupla de vodka + lata de energético.', preco: 32.0, categoria: 'destilados', tempo_preparo: 2, destaque: true, disponivel: true, rotulo: 'Combo', observacoes_sugeridas: ['Com limão', 'Bem gelado'] },

  // Refrigerantes
  { id: 'p-refr-01', nome: 'Coca-Cola Lata 350ml', descricao: 'Refrigerante gelado.', preco: 7.5, categoria: 'refrigerantes', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: '350ml', observacoes_sugeridas: ['Bem gelada', 'Com limão', 'Com gelo'] },
  { id: 'p-refr-02', nome: 'Guaraná Antarctica Lata', descricao: 'Refrigerante de guaraná.', preco: 7.0, categoria: 'refrigerantes', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: '350ml', observacoes_sugeridas: ['Bem gelado'] },
  { id: 'p-refr-03', nome: 'Água Mineral 500ml', descricao: 'Com ou sem gás.', preco: 5.0, categoria: 'refrigerantes', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: '500ml', observacoes_sugeridas: ['Com gás', 'Sem gás', 'Bem gelada'] },
  { id: 'p-refr-04', nome: 'Suco de Laranja Natural', descricao: '500ml de laranja espremida na hora.', preco: 14.9, categoria: 'refrigerantes', tempo_preparo: 4, destaque: false, disponivel: true, rotulo: '500ml', observacoes_sugeridas: ['Sem açúcar', 'Com gelo'] },
  { id: 'p-refr-05', nome: 'Red Bull Lata 250ml', descricao: 'Energético gelado.', preco: 15.0, categoria: 'refrigerantes', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: '250ml', observacoes_sugeridas: ['Bem gelado'] },
  { id: 'p-refr-06', nome: 'Limonada Suíça', descricao: 'Limão com casca, leite condensado e gelo.', preco: 16.9, categoria: 'refrigerantes', tempo_preparo: 5, destaque: false, disponivel: true, rotulo: '400ml', observacoes_sugeridas: ['Sem gelo', 'Menos doce'] },

  // Porções
  { id: 'p-porc-01', nome: 'Porção de Batata Frita', descricao: 'Batata rústica com alecrim e parmesão.', preco: 34.9, categoria: 'porcoes', tempo_preparo: 12, destaque: true, disponivel: true, rotulo: '600g', observacoes_sugeridas: ['Bem passada', 'Ao ponto', 'Sem parmesão', 'Com cheddar', 'Com bacon'] },
  { id: 'p-porc-02', nome: 'Isca de Filé com Fritas', descricao: 'Filé mignon em cubos, alho e fritas.', preco: 79.9, categoria: 'porcoes', tempo_preparo: 18, destaque: true, disponivel: true, rotulo: '800g', observacoes_sugeridas: ['Ao ponto', 'Bem passada', 'Mal passada', 'Sem cebola'] },
  { id: 'p-porc-03', nome: 'Porção de Calabresa Acebolada', descricao: 'Calabresa na chapa com cebola e limão.', preco: 42.9, categoria: 'porcoes', tempo_preparo: 14, destaque: false, disponivel: true, rotulo: '500g', observacoes_sugeridas: ['Sem cebola', 'Com limão', 'Bem dourada'] },
  { id: 'p-porc-04', nome: 'Filé de Tilápia à Milanesa', descricao: 'Tilápia empanada com fritas e molho tártaro.', preco: 69.9, categoria: 'porcoes', tempo_preparo: 20, destaque: false, disponivel: true, rotulo: '700g', observacoes_sugeridas: ['Sem molho', 'Molho à parte', 'Bem crocante'] },
  { id: 'p-porc-05', nome: 'Frango à Passarinho', descricao: 'Pedaços de frango fritos com alho.', preco: 46.9, categoria: 'porcoes', tempo_preparo: 16, destaque: false, disponivel: true, rotulo: '600g', observacoes_sugeridas: ['Bem passado', 'Com limão', 'Sem alho'] },
  { id: 'p-porc-06', nome: 'Porção de Polenta Frita', descricao: 'Polenta cremosa frita em cubos com parmesão.', preco: 32.9, categoria: 'porcoes', tempo_preparo: 12, destaque: false, disponivel: true, rotulo: '500g', observacoes_sugeridas: ['Bem crocante', 'Sem parmesão'] },

  // Petiscos
  { id: 'p-peti-01', nome: 'Amendoim Torrado', descricao: 'Porção individual de amendoim.', preco: 9.9, categoria: 'petiscos', tempo_preparo: 1, destaque: false, disponivel: true, rotulo: '150g', observacoes_sugeridas: ['Com sal', 'Sem sal'] },
  { id: 'p-peti-02', nome: 'Pastel de Carne (4 un.)', descricao: 'Pastéis de carne moída fritos na hora.', preco: 26.9, categoria: 'petiscos', tempo_preparo: 10, destaque: false, disponivel: true, rotulo: '4 un.', observacoes_sugeridas: ['Bem frito', 'Com molho de pimenta', 'Sem molho'] },
  { id: 'p-peti-03', nome: 'Bolinho de Bacalhau (6 un.)', descricao: 'Bolinho cremoso de bacalhau.', preco: 39.9, categoria: 'petiscos', tempo_preparo: 12, destaque: false, disponivel: true, rotulo: '6 un.', observacoes_sugeridas: ['Bem frito', 'Com limão'] },
  { id: 'p-peti-04', nome: 'Pão de Alho com Queijo', descricao: 'Pão de alho gratinado com muçarela.', preco: 24.9, categoria: 'petiscos', tempo_preparo: 10, destaque: true, disponivel: true, rotulo: '4 un.', observacoes_sugeridas: ['Bem gratinado', 'Sem queijo'] },
  { id: 'p-peti-05', nome: 'Torresmo de Barriga', descricao: 'Torresmo crocante com limão.', preco: 29.9, categoria: 'petiscos', tempo_preparo: 12, destaque: false, disponivel: true, rotulo: '400g', observacoes_sugeridas: ['Bem crocante', 'Com limão', 'Com mandioca'] },
  { id: 'p-peti-06', nome: 'Tábua de Frios', descricao: 'Queijos, embutidos, azeitonas e torradas.', preco: 59.9, categoria: 'petiscos', tempo_preparo: 8, destaque: false, disponivel: true, rotulo: 'Serve 3', observacoes_sugeridas: ['Sem azeitona', 'Sem embutidos'] },
];

export const MESAS: Mesa[] = Array.from({ length: 12 }, (_, i) => ({
  id: `mesa-${i + 1}`,
  numero: i + 1,
  status: 'livre',
  aberta_em: null,
  comanda_atual: null,
}));

export const CONFIG_PADRAO: ConfiguracaoBar = {
  nome: 'BAR DO ZÉ',
  subtitulo: 'Espetinho & Coquetelaria',
  endereco: 'Rua das Acácias, 128 — Centro, Scafati',
  telefone: '(11) 4002-8922',
  cnpj: '12.345.678/0001-90',
  taxa_servico: 10,
  largura_bobina: 80,
  bipe_impressora: false,
  abrir_gaveta: false,
  codepage: 'cp850',
  impressora_bar: 'EPSON TM-T20 (Bar)',
  impressora_caixa: 'ELGIN i9 (Caixa)',
};
