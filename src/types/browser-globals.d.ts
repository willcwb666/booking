/**
 * APIs de navegador que não estão na biblioteca padrão do TypeScript.
 *
 * Estas duas eram alcançadas com `(window as any)`, que cala o compilador sobre
 * TUDO que se faz com o objeto depois — inclusive erros de digitação no nome do
 * método. Declarar o formato aqui devolve a verificação, e documenta num lugar
 * só o que o código espera encontrar no navegador.
 */

/** Reconhecimento de fala. Padronizado como `SpeechRecognition`, entregue pelo
 *  Chrome como `webkitSpeechRecognition`, e ausente no Firefox — daí os dois
 *  nomes serem opcionais. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface Window {
  /** Injetado pelo script do Google Analytics; ausente até ele carregar. */
  gtag?: (...args: unknown[]) => void;
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
