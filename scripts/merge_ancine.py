"""
merge_ancine.py
Enriquece data/filmes.json com os campos 'estado' (UF) e 'regiao' usando os
dados abertos da OCA/ANCINE (obras nao publicitarias brasileiras).

O vinculo e feito por titulo normalizado + ano de producao, em cascata:
  1. (titulo, ano) exato
  2. (titulo, ano +/- 1)
  3. titulo sozinho, apenas quando a UF e unica na OCA

Normalizacao: sem acento, minusculas, sem simbolos, sem artigo inicial.
NAO remove subtitulo (evita conflagrar franquias/episodios).

Uso:
    cd scripts/
    python merge_ancine.py
"""

import os
import csv
import json
import re
import glob
import sys
from unidecode import unidecode

sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
JSON_PATH    = os.path.join(PROJECT_ROOT, "data", "filmes.json")
CSV_DIR      = os.path.join(PROJECT_ROOT, "data", "obras-nao-pub-brasileiras-csv")

ARTIGOS = ("o ", "a ", "os ", "as ", "um ", "uma ")

# UF -> regiao do IBGE
UF_REGIAO = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte",
    "RO": "Norte", "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
    "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste", "RN": "Nordeste",
    "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste",
    "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "RS": "Sul", "SC": "Sul",
}


def normalizar(titulo):
    """Minusculas, sem acento, sem simbolos, sem artigo inicial."""
    t = unidecode(str(titulo)).lower()
    t = re.sub(r"[^a-z0-9]+", " ", t).strip()
    for art in ARTIGOS:
        if t.startswith(art):
            t = t[len(art):]
            break
    return t


def formatar_produtora(nome):
    """Converte CAIXA ALTA da OCA em title case, preservando siglas legais."""
    titulo = nome.strip().title()
    # Restaura siglas comuns que o title() quebra
    for sigla in ("Ltda", "Me", "Epp", "S/A", "S.A", "Eireli"):
        titulo = re.sub(rf"\b{sigla}\b", sigla.upper(), titulo, flags=re.IGNORECASE)
    return titulo


def carregar_oca():
    """
    Le todos os CSVs da OCA e monta indices para UF e produtora:
      uf_por_titulo_ano: (titulo_norm, ano) -> UF
      uf_por_titulo:     titulo_norm -> set de UFs (unicidade)
      prod_por_titulo_ano: (titulo_norm, ano) -> requerente formatado
      prod_por_titulo:   titulo_norm -> set de requerentes (unicidade)
    """
    uf_por_titulo_ano, uf_por_titulo = {}, {}
    prod_por_titulo_ano, prod_por_titulo = {}, {}
    arquivos = glob.glob(os.path.join(CSV_DIR, "*.csv"))

    for arq in arquivos:
        with open(arq, encoding="utf-8") as f:
            for row in csv.DictReader(f, delimiter=";"):
                titulo = normalizar(row.get("TITULO_ORIGINAL", ""))
                ano    = row.get("ANO_PRODUCAO_INICIAL", "").strip()
                uf     = row.get("UF_REQUERENTE", "").strip().upper()
                req    = row.get("REQUERENTE", "").strip()

                if not titulo:
                    continue

                if uf in UF_REGIAO:
                    if ano:
                        uf_por_titulo_ano[(titulo, ano)] = uf
                    uf_por_titulo.setdefault(titulo, set()).add(uf)

                if req:
                    prod = formatar_produtora(req)
                    if ano:
                        prod_por_titulo_ano[(titulo, ano)] = prod
                    prod_por_titulo.setdefault(titulo, set()).add(prod)

    print(f"OCA carregada: {len(arquivos)} arquivos, "
          f"{len(uf_por_titulo_ano)} chaves UF (titulo+ano), "
          f"{len(prod_por_titulo_ano)} chaves produtora (titulo+ano).")
    return uf_por_titulo_ano, uf_por_titulo, prod_por_titulo_ano, prod_por_titulo


def buscar_valor(filme, por_titulo_ano, por_titulo):
    """
    Aplica a cascata de match e retorna o valor (UF ou produtora) ou None.
      1. (titulo, ano) exato
      2. (titulo, ano +/- 1)
      3. titulo sozinho, se o valor for unico na OCA
    """
    titulo = normalizar(filme.get("titulo", ""))
    ano    = filme.get("ano")
    if not titulo or not ano:
        return None

    if (titulo, str(ano)) in por_titulo_ano:
        return por_titulo_ano[(titulo, str(ano))]
    if (titulo, str(ano - 1)) in por_titulo_ano:
        return por_titulo_ano[(titulo, str(ano - 1))]
    if (titulo, str(ano + 1)) in por_titulo_ano:
        return por_titulo_ano[(titulo, str(ano + 1))]
    if titulo in por_titulo and len(por_titulo[titulo]) == 1:
        return next(iter(por_titulo[titulo]))
    return None


def main():
    uf_ta, uf_t, prod_ta, prod_t = carregar_oca()

    with open(JSON_PATH, encoding="utf-8") as f:
        filmes = json.load(f)

    vinculados = 0
    produtoras_preenchidas = 0
    por_regiao = {}

    for filme in filmes:
        # --- Estado / regiao ---
        uf = buscar_valor(filme, uf_ta, uf_t)
        if uf:
            filme["estado"] = uf
            filme["regiao"] = UF_REGIAO[uf]
            vinculados += 1
            por_regiao[filme["regiao"]] = por_regiao.get(filme["regiao"], 0) + 1
        else:
            filme.setdefault("estado", "")
            filme.setdefault("regiao", "")

        # --- Produtora (apenas se estiver em branco) ---
        if not filme.get("produtora"):
            prod = buscar_valor(filme, prod_ta, prod_t)
            if prod:
                filme["produtora"] = prod
                produtoras_preenchidas += 1

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(filmes, f, ensure_ascii=False, indent=2)

    pct = 100 * vinculados / len(filmes) if filmes else 0
    print(f"\nLocalizacao vinculada: {vinculados}/{len(filmes)} ({pct:.1f}%)")
    print(f"Produtoras preenchidas: {produtoras_preenchidas}")
    print("Distribuicao por regiao:")
    for regiao, qtd in sorted(por_regiao.items(), key=lambda x: -x[1]):
        print(f"  {regiao:14} {qtd}")
    print(f"\nJSON atualizado: {JSON_PATH}")


if __name__ == "__main__":
    main()
