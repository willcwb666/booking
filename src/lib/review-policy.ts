/**
 * Política do pedido de avaliação.
 *
 * Fora do arquivo de actions porque módulo `"use server"` só exporta função
 * async — todo export ali vira endpoint HTTP.
 */

/**
 * Nota a partir da qual o gerente é alertado na hora.
 *
 * Três estrelas entram no alerta: em avaliação de serviço, 3 não é "mediano",
 * é insatisfação educada. Quem ficou realmente satisfeito dá 5, e a diferença
 * entre 4 e 3 costuma ser um problema concreto que o cliente não quis
 * detalhar — que é exatamente o que vale a pena o gerente descobrir enquanto
 * ainda dá para resolver.
 *
 * O alerta NÃO substitui o convite ao Google, que vai para todas as notas.
 */
export const LOW_RATING_THRESHOLD = 3;

/**
 * Espera entre o fim do atendimento e o pedido de avaliação.
 *
 * Tempo suficiente para o cliente sair e formar opinião, curto o bastante para
 * a experiência ainda estar fresca. Pedir na hora, com o cliente ainda na
 * cadeira, produz nota inflada por constrangimento — e nota inflada não avisa
 * o dono de nada.
 */
export const REVIEW_REQUEST_DELAY_MINUTES = 20;

/** Validade do link assinado enviado por e-mail. */
export const REVIEW_LINK_TTL_DAYS = 14;
