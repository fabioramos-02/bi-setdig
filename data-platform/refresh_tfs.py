"""Refresh diário das fontes da rede interna no BI (tarefa agendada no PC do Fabio: "BI SETDIG - refresh TFS").

O GitHub Actions não alcança o TFS on-prem nem o Matomo (só respondem na rede da SETDIG), então esta parte roda aqui:
  1. extrai o TFS e o Matomo (run.py --domain tfs,matomo,...) e publica em datasets/;
  2. commita e dá push só se os dados mudaram (a Vercel republica sozinha);
  3. espera a Vercel servir os dados do dia e regrava os quadros do TFS (lancar-demandas-xvia: src.painel --apply),
     se BI_AUTH_USER e BI_AUTH_PASSWORD estiverem nas variáveis de usuário do Windows.

    python data-platform/refresh_tfs.py

Log: data-platform/logs-refresh-tfs.txt (fora do git).
"""
import base64
import json
import os
import subprocess
import sys
import time
from datetime import date, datetime
from pathlib import Path
from urllib.request import Request, urlopen

DP = Path(__file__).resolve().parent
BI = DP.parent
DEMANDAS = BI.parent / "lancar-demandas-xvia"
LOG = DP / "logs-refresh-tfs.txt"
FONTES = "tfs,matomo,matomo_perfil,matomo_perfil_filtro,matomo_eventos_perfil,matomo_jornada,sites"
JSON_BI = "https://bi-setdig.vercel.app/projeto-xvia/secretario.json"
ENV = {**os.environ, "PYTHONIOENCODING": "utf-8"}


def log(msg):
    with LOG.open("a", encoding="utf-8") as f:
        f.write(f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}\n")


def rodar(*cmd, cwd=BI, checar=True):
    r = subprocess.run(cmd, cwd=cwd, env=ENV, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if checar and r.returncode:
        raise RuntimeError(f"{' '.join(cmd)} falhou: {(r.stdout + r.stderr).strip()[-800:]}")
    return r


def json_do_bi(user, senha):
    req = Request(JSON_BI, headers={"Authorization": "Basic " + base64.b64encode(f"{user}:{senha}".encode()).decode()})
    with urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    log("início")
    rodar("git", "pull", "--rebase", "--autostash", "-q", "origin", "master")
    r = rodar(sys.executable, "run.py", "--domain", FONTES, cwd=DP, checar=False)
    log(" | ".join(l[:200] for l in r.stdout.splitlines() if l.startswith("[")))
    if "[tfs] FALHOU" in r.stdout:
        raise RuntimeError("extração do TFS falhou (ver acima)")
    # Matomo que falhar não impede publicar o TFS: o log registra e o resto segue.

    rodar("git", "add", "datasets", ":!datasets/logs")
    if rodar("git", "diff", "--cached", "--quiet", checar=False).returncode == 0:
        log("sem mudança nos dados")
        return
    rodar("git", "commit", "-q", "-m", f"chore(data): refresh do TFS e do Matomo ({date.today():%d/%m/%Y})")
    rodar("git", "push", "-q", "origin", "master")
    log("dados publicados")

    user, senha = os.environ.get("BI_AUTH_USER"), os.environ.get("BI_AUTH_PASSWORD", "")
    if not user:
        log("BI_AUTH_USER não definido: quadros do TFS não regravados")
        return
    for _ in range(30):  # até 15 min pelo deploy da Vercel
        time.sleep(30)
        try:
            if json_do_bi(user, senha)["atualizadoEm"] == date.today().isoformat():
                break
        except Exception:
            pass
    else:
        raise RuntimeError("a Vercel não publicou os dados de hoje em 15 min")
    r = rodar(sys.executable, "-m", "src.painel", "--apply", cwd=DEMANDAS)
    log(" | ".join(l for l in r.stdout.splitlines() if "GRAVADO" in l))
    log("fim")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"ERRO: {e}")
        sys.exit(1)
