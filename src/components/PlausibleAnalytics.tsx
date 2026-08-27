"use client";

import { useEffect } from "react";

const PLAUSIBLE_SRC = "https://plausible.io/js/pa-YFgILOkHZ2-PDKZGoeFpU.js";

/**
 * Analytics do painel BI (Plausible). Injeta o script direto no `<head>` via
 * useEffect — sem renderizar tag `<script>` na árvore React.
 *
 * React 19 emite warning quando encontra `<script>` como filho de qualquer
 * componente (mesmo dentro de `<head>` do RootLayout), pedindo `<template>`
 * ou hoisting nativo. `next/script` no `<body>` cai no mesmo warning.
 * Solução robusta: script injetado imperativamente no client — funciona
 * igual `strategy="afterInteractive"` mas sem gerar node React.
 */
export function PlausibleAnalytics() {
  useEffect(() => {
    // Init inline (mesmo snippet oficial do Plausible).
    const w = window as unknown as {
      plausible?: {
        (...args: unknown[]): void;
        q?: unknown[];
        init?: (opts?: unknown) => void;
        o?: unknown;
      };
    };
    w.plausible =
      w.plausible ||
      function (...args) {
        (w.plausible!.q = w.plausible!.q || []).push(args);
      };
    w.plausible.init =
      w.plausible.init ||
      function (opts) {
        w.plausible!.o = opts || {};
      };
    w.plausible.init();

    // Idempotente — evita duplicar em StrictMode ou hot-reload.
    if (document.querySelector(`script[src="${PLAUSIBLE_SRC}"]`)) return;
    const s = document.createElement("script");
    s.defer = true;
    s.src = PLAUSIBLE_SRC;
    document.head.appendChild(s);
  }, []);

  return null;
}
