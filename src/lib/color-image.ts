import type { Product } from '@/data/products';

/*
 * Ligação entre cor e foto do produto (usada no card, na página do produto e no modal):
 * 1. Se a cor tem foto própria cadastrada (color.image), usa ela.
 * 2. Se não, e o produto tem uma foto por cor (fotos >= cores), a foto na mesma posição da cor
 *    é a daquela cor (ex.: "Arvore natal": foto 1 = Branco, foto 2 = Verde).
 * 3. Senão, não há ligação (as fotos são só galeria).
 */
export const colorsLinkedToImages = (product: Product) =>
  product.colors.length > 1 && !product.colors.some(c => c.image) && product.images.length >= product.colors.length;

/** Índice da foto que corresponde à cor (ou -1 se não houver ligação). */
export const imageIndexForColor = (product: Product, colorName?: string) => {
  if (!colorsLinkedToImages(product)) return -1;
  return product.colors.findIndex(c => c.name === colorName);
};
