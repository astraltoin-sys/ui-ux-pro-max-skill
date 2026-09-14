/**
 * Estacao de impressao web.
 *
 * Imprime em um iframe oculto: a janela de impressao do navegador abre sem
 * travar a interface e sem recarregar a aplicacao (o DOM da pagina continua
 * intacto). O iframe e removido logo apos o `afterprint`.
 */

export interface ResultadoImpressao {
  ok: boolean;
  erro?: string;
}

const TIMEOUT_MS = 45_000;

/**
 * Abre o dialogo de impressao do navegador com o HTML informado.
 * Deve ser chamado (de preferencia) dentro de um handler de clique, porque
 * alguns navegadores exigem ativacao do usuario para `window.print()`.
 */
export function imprimirHtml(html: string, titulo = 'cupom'): Promise<ResultadoImpressao> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = titulo;
    // Fica fora da area visivel mas dentro do layout (alguns navegadores
    // ignoram print() em iframes com display:none).
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    let finalizado = false;
    const finalizar = (resultado: ResultadoImpressao) => {
      if (finalizado) return;
      finalizado = true;
      window.clearTimeout(timeout);
      setTimeout(() => iframe.remove(), 250);
      resolve(resultado);
    };

    const timeout = window.setTimeout(
      () => finalizar({ ok: true, erro: undefined }),
      TIMEOUT_MS,
    );

    iframe.onload = () => {
      // Caminho alternativo: se o navegador nao liberou o document.write
      // sincrono, imprime assim que o iframe carregar.
      if (finalizado) return;
      imprimir();
    };

    const imprimir = () => {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      if (!win || !doc) {
        finalizar({ ok: false, erro: 'Nao foi possivel acessar o iframe de impressao.' });
        return;
      }
      try {
        const onAfter = () => finalizar({ ok: true });
        win.addEventListener('afterprint', onAfter, { once: true });
        win.focus();
        win.print();
      } catch (err) {
        finalizar({
          ok: false,
          erro: err instanceof Error ? err.message : 'Falha ao abrir a janela de impressao.',
        });
      }
    };

    iframe.onerror = () =>
      finalizar({ ok: false, erro: 'Falha ao carregar o documento de impressao.' });

    document.body.appendChild(iframe);

    // document.write e sincrono: mantem a "ativacao do usuario" quando a
    // impressao e disparada por um clique ( alguns navegadores bloqueiam
    // window.print() sem ela ).
    try {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        doc.title = titulo;
        imprimir();
        return;
      }
    } catch {
      /* cai para o caminho via onload */
    }
    if (!iframe.getAttribute('srcdoc')) iframe.srcdoc = html;
  });
}

/** Dispara o download de um arquivo no navegador. */
export function baixarArquivo(conteudo: BlobPart, nomeArquivo: string, mime = 'application/octet-stream'): void {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
