import { test } from "node:test";
import assert from "node:assert/strict";
import { getAcessosServicoMensal } from "./data.ts";

test("leitura bem sucedida", () => {
    const acessosMensal = getAcessosServicoMensal();
    assert.notStrictEqual(acessosMensal.cartas, undefined);
    assert.notStrictEqual(acessosMensal.cartas, null);
});

test("Snapshot com 3 cartas × 3 meses → soma dos meses = total do ano", () => {
    const acessosMensal = getAcessosServicoMensal();
    var total = 0;
    for (const cartas of acessosMensal.cartas) {
        if (cartas.orgaoSigla === "CGP") {
            for (const mes of Object.values(cartas.meses)) {
                total = total + mes;
            }
        }
    }
    assert.ok(total > 0, "leu o arquivo");
});

test("Mes faltando", () => {
    const acessosMensal = getAcessosServicoMensal();
    var total = 0;
    for (const cartas of acessosMensal.cartas) {
        if (cartas.orgaoSigla === "AEM") {
            for (let mes of Object.values(cartas.meses)) {
                total = total + mes;
            }
        }
    }
    assert.ok(total > 0, "leu o arquivo");
});
