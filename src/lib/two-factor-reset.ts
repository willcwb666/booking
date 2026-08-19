/**
 * Política do reset da verificação em duas etapas.
 *
 * Vive fora do arquivo de actions porque um módulo `"use server"` só pode
 * exportar função async — todo export ali é um endpoint HTTP, e uma constante
 * não tem como ser um.
 */

/**
 * Carência entre pedir o reset e poder executá-lo.
 *
 * Vinte e quatro horas é o intervalo que garante que o dono passe por pelo
 * menos um ciclo normal de leitura de e-mail e de uso do sistema. Encurtar
 * devolve ao super admin o poder de tomar um tenant antes de qualquer reação;
 * alongar transforma uma emergência real (dono trancado fora do próprio
 * negócio) em prejuízo de dias.
 */
export const RESET_DELAY_HOURS = 24;
