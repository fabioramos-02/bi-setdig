/**
 * Exporta um <svg> da página como arquivo SVG ou PNG, sem biblioteca. As cores do Design System
 * vêm de variáveis CSS (var(--ds-…)), que não existem fora da página: antes de salvar, cada
 * fill/stroke com var() é trocado pela cor calculada, e o texto ganha a fonte calculada. O fundo
 * é o da página, para o tema (claro ou escuro) continuar legível no arquivo.
 * Só roda no navegador (usa DOM).
 */

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Cópia do SVG com as cores resolvidas, um fundo e o título no topo. */
export function svgAutonomo(svg: SVGSVGElement, titulo?: string): { texto: string; largura: number; altura: number } {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const originais = [svg, ...svg.querySelectorAll("*")];
  const copias = [clone, ...clone.querySelectorAll("*")];
  originais.forEach((el, i) => {
    const css = getComputedStyle(el);
    const alvo = copias[i] as Element;
    for (const prop of ["fill", "stroke"]) {
      if (el.getAttribute(prop)?.includes("var(")) alvo.setAttribute(prop, css.getPropertyValue(prop));
    }
    if (el.tagName === "text" || el.tagName === "tspan") {
      alvo.setAttribute("font-family", css.fontFamily);
      alvo.setAttribute("font-size", css.fontSize);
      (alvo as SVGElement).style.fontSize = css.fontSize;
      (alvo as SVGElement).style.fontWeight = css.fontWeight;
    }
  });
  const largura = Number(svg.getAttribute("width")) || svg.getBoundingClientRect().width;
  const alturaGrafico = Number(svg.getAttribute("height")) || svg.getBoundingClientRect().height;
  const topo = titulo ? 36 : 0;
  const ns = "http://www.w3.org/2000/svg";
  const raiz = document.createElementNS(ns, "svg");
  raiz.setAttribute("xmlns", ns);
  raiz.setAttribute("width", String(largura));
  raiz.setAttribute("height", String(alturaGrafico + topo));
  const fundo = document.createElementNS(ns, "rect");
  fundo.setAttribute("width", "100%");
  fundo.setAttribute("height", "100%");
  fundo.setAttribute("fill", getComputedStyle(document.body).backgroundColor || "#ffffff");
  raiz.appendChild(fundo);
  if (titulo) {
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", "8");
    t.setAttribute("y", "24");
    t.setAttribute("font-size", "16");
    t.setAttribute("font-weight", "600");
    t.setAttribute("font-family", getComputedStyle(document.body).fontFamily);
    t.setAttribute("fill", getComputedStyle(document.body).color);
    t.textContent = titulo;
    raiz.appendChild(t);
  }
  clone.setAttribute("y", String(topo));
  raiz.appendChild(clone);
  return { texto: new XMLSerializer().serializeToString(raiz), largura, altura: alturaGrafico + topo };
}

export function exportarSvg(svg: SVGSVGElement, nome: string, titulo?: string) {
  baixar(new Blob([svgAutonomo(svg, titulo).texto], { type: "image/svg+xml;charset=utf-8" }), `${nome}.svg`);
}

/** PNG em 2x, para ficar nítido em documento e apresentação. */
export function exportarPng(svg: SVGSVGElement, nome: string, titulo?: string): Promise<void> {
  const { texto, largura, altura } = svgAutonomo(svg, titulo);
  const url = URL.createObjectURL(new Blob([texto], { type: "image/svg+xml;charset=utf-8" }));
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const escala = 2;
      const canvas = Object.assign(document.createElement("canvas"), { width: largura * escala, height: altura * escala });
      const ctx = canvas.getContext("2d");
      if (!ctx) return falha(new Error("Canvas indisponível"));
      ctx.scale(escala, escala);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? (baixar(b, `${nome}.png`), ok()) : falha(new Error("Falha ao gerar PNG"))), "image/png");
    };
    img.onerror = () => falha(new Error("Falha ao ler o SVG"));
    img.src = url;
  });
}
