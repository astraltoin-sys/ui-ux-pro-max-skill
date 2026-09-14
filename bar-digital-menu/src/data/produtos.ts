import type { Produto } from "../types";

export const produtos: Produto[] = [
  // Cervejas
  { id: "p1", nome: "Peroni Nastro Azzurro", categoria: "Cervejas", preco: 12.0, descricao: "Cerveja italiana 330ml", disponivel: true },
  { id: "p2", nome: "Birra Moretti", categoria: "Cervejas", preco: 11.0, descricao: "Cerveja italiana 330ml", disponivel: true },
  { id: "p3", nome: "Heineken Long Neck", categoria: "Cervejas", preco: 10.0, descricao: "Cerveja 330ml", disponivel: true },
  { id: "p4", nome: "Ichnusa Cruda", categoria: "Cervejas", preco: 13.0, descricao: "Cerveja sarda 330ml", disponivel: true },

  // Drinks
  { id: "p5", nome: "Aperol Spritz", categoria: "Drinks", preco: 22.0, descricao: "Aperol, Prosecco, Soda", disponivel: true },
  { id: "p6", nome: "Negroni", categoria: "Drinks", preco: 25.0, descricao: "Gin, Campari, Vermouth", disponivel: true },
  { id: "p7", nome: "Campari Spritz", categoria: "Drinks", preco: 20.0, descricao: "Campari, Prosecco, Soda", disponivel: true },
  { id: "p8", nome: "Bellini", categoria: "Drinks", preco: 23.0, descricao: "Prosecco e purê de pêssego", disponivel: true },
  { id: "p9", nome: "Hugo Spritz", categoria: "Drinks", preco: 20.0, descricao: "Prosecco, elderflower, menta", disponivel: true },
  { id: "p10", nome: "Limoncello Spritz", categoria: "Drinks", preco: 22.0, descricao: "Limoncello, Prosecco, Soda", disponivel: true },

  // Destilados
  { id: "p11", nome: "Limoncello", categoria: "Destilados", preco: 10.0, descricao: "Licor de limão siciliano 30ml", disponivel: true },
  { id: "p12", nome: "Grappa Bianca", categoria: "Destilados", preco: 15.0, descricao: "Grappa 30ml", disponivel: true },
  { id: "p13", nome: "Sambuca", categoria: "Destilados", preco: 12.0, descricao: "Licor de anis 30ml", disponivel: true },
  { id: "p14", nome: "Amaretto", categoria: "Destilados", preco: 13.0, descricao: "Licor de amêndoa 30ml", disponivel: true },
  { id: "p15", nome: "Amaro Averna", categoria: "Destilados", preco: 14.0, descricao: "Amaro siciliano 30ml", disponivel: true },

  // Refrigerantes
  { id: "p16", nome: "Coca-Cola", categoria: "Refrigerantes", preco: 7.0, descricao: "Lata 350ml", disponivel: true },
  { id: "p17", nome: "Fanta Laranja", categoria: "Refrigerantes", preco: 7.0, descricao: "Lata 350ml", disponivel: true },
  { id: "p18", nome: "Água Panna", categoria: "Refrigerantes", preco: 6.0, descricao: "Água mineral 500ml", disponivel: true },
  { id: "p19", nome: "San Pellegrino", categoria: "Refrigerantes", preco: 8.0, descricao: "Água com gás 500ml", disponivel: true },
  { id: "p20", nome: "Aranciata San Pellegrino", categoria: "Refrigerantes", preco: 9.0, descricao: "Refrigerante de laranja 330ml", disponivel: true },

  // Porções
  { id: "p21", nome: "Bruschetta Napoletana", categoria: "Porções", preco: 22.0, descricao: "Pão, tomate, alho, manjericão, azeite", disponivel: true },
  { id: "p22", nome: "Tagliere Napoletano", categoria: "Porções", preco: 38.0, descricao: "Queijos, salames, azeitonas, mel, geleia", disponivel: true },
  { id: "p23", nome: "Arancini (6 pezzi)", categoria: "Porções", preco: 18.0, descricao: "Bolinhos de arroz recheados", disponivel: true },
  { id: "p24", nome: "Pizza Fritta", categoria: "Porções", preco: 16.0, descricao: "Pizza frita napolitana recheada", disponivel: true },
  { id: "p25", nome: "Crocchè di Patate", categoria: "Porções", preco: 17.0, descricao: "Croquetes de batata (6 pezzi)", disponivel: true },

  // Petiscos
  { id: "p26", nome: "Olive Ascolane", categoria: "Petiscos", preco: 14.0, descricao: "Azeitonas fritas recheadas (10 pezzi)", disponivel: true },
  { id: "p27", nome: "Taralli", categoria: "Petiscos", preco: 10.0, descricao: "Biscoitos italianos crocantes", disponivel: true },
  { id: "p28", nome: "Noci e Formaggio", categoria: "Petiscos", preco: 16.0, descricao: "Nozes e queijo pecorino", disponivel: true },
  { id: "p29", nome: "Pomodorini Secchi", categoria: "Petiscos", preco: 15.0, descricao: "Tomates secos no azeite", disponivel: true },
];
