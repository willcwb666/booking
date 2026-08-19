/**
 * Política de disparo da campanha de resgate.
 *
 * Vive fora do arquivo de actions porque módulo `"use server"` só exporta
 * função async — todo export ali vira endpoint HTTP.
 */

/**
 * Carência entre duas campanhas de resgate para o mesmo cliente.
 *
 * Sessenta dias porque a campanha existe para quem já está fora do ritmo: se
 * a primeira não trouxe o cliente de volta, mandar de novo em duas semanas não
 * muda a resposta — só aumenta a chance de ele marcar como spam. E marcação de
 * spam não custa aquele e-mail: custa a reputação do domínio, que carrega
 * também as confirmações de agendamento.
 */
export const WIN_BACK_COOLDOWN_DAYS = 60;
