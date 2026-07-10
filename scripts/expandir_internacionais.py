"""
expandir_internacionais.py

Expande a base de internacionais SEM recriar do zero (preserva o que ja existe):
  1. Enriquece todos os filmes existentes com "titulo_original" (busca bilingue).
  2. Adiciona uma lista curada de titulos que faltavam (Star Wars, LOTR, Hobbit,
     Kubrick, A24 etc.).
  3. Varredura de populares recentes (2022 -> ago/2026) e da A24.
  4. Filtra producoes brasileiras (essas ficam em filmes.json).

Depois disso, rode gerar_similares_bert.py para recalcular as recomendacoes.

Uso:
    cd scripts/
    python expandir_internacionais.py
"""

import sys
import os
import json
import time

import gerar_filmes as g

sys.stdout.reconfigure(encoding="utf-8")

SAIDA = os.path.join(g.PROJECT_ROOT, "data", "internacionais.json")
TARGET_TOTAL = 1150          # teto do acervo internacional apos a expansao
A24_COMPANY_ID = 41077       # id da A24 no TMDB
DATA_INI = "2022-01-01"
DATA_FIM = "2026-08-31"

# Titulos especificos pedidos / que faltavam. (titulo, ano) — ano None = sem filtro
CURADOS_NOVOS = [
    ("Challengers", 2024),
    ("The Backrooms", 2026), ("The Backrooms", 2025),
    ("Obsession", 1976),
    ("Metropolis", 1927),
    # Star Wars (saga + spin-offs)
    ("Star Wars: Episode I - The Phantom Menace", 1999),
    ("Star Wars: Episode II - Attack of the Clones", 2002),
    ("Star Wars: Episode III - Revenge of the Sith", 2005),
    ("Star Wars", 1977),
    ("Star Wars: Episode V - The Empire Strikes Back", 1980),
    ("Star Wars: Episode VI - Return of the Jedi", 1983),
    ("Star Wars: The Force Awakens", 2015),
    ("Star Wars: The Last Jedi", 2017),
    ("Star Wars: The Rise of Skywalker", 2019),
    ("Rogue One: A Star Wars Story", 2016),
    ("Solo: A Star Wars Story", 2018),
    # O Senhor dos Aneis
    ("The Lord of the Rings: The Fellowship of the Ring", 2001),
    ("The Lord of the Rings: The Two Towers", 2002),
    ("The Lord of the Rings: The Return of the King", 2003),
    # O Hobbit
    ("The Hobbit: An Unexpected Journey", 2012),
    ("The Hobbit: The Desolation of Smaug", 2013),
    ("The Hobbit: The Battle of the Five Armies", 2014),
    # Kubrick
    ("Paths of Glory", 1957), ("A Clockwork Orange", 1971),
    ("Barry Lyndon", 1975), ("Dr. Strangelove", 1964),
    ("Eyes Wide Shut", 1999), ("Spartacus", 1960),
    ("The Killing", 1956), ("Lolita", 1962),
    ("2001: A Space Odyssey", 1968), ("Full Metal Jacket", 1987),
    # Outros pedidos
    ("Booksmart", 2019),
    ("Diary of a Wimpy Kid", 2010),
]


def buscar_id(titulo, ano):
    params = {"query": titulo, "language": "pt-BR"}
    if ano:
        params["primary_release_year"] = ano
    dados = g.requisicao(f"{g.BASE_URL}/search/movie", params=params)
    if dados and dados.get("results"):
        return dados["results"][0]["id"]
    if ano:
        params.pop("primary_release_year")
        dados = g.requisicao(f"{g.BASE_URL}/search/movie", params=params)
        if dados and dados.get("results"):
            return dados["results"][0]["id"]
    return None


def discover(sort_by, extra=None, paginas=5, vote_min=None):
    ids = []
    for p in range(1, paginas + 1):
        params = {"sort_by": sort_by, "include_adult": "false",
                  "page": p, "language": "pt-BR"}
        if vote_min is not None:
            params["vote_count.gte"] = vote_min
        if extra:
            params.update(extra)
        dados = g.requisicao(f"{g.BASE_URL}/discover/movie", params=params)
        if not dados:
            break
        ids.extend(r["id"] for r in dados.get("results", []))
        if p >= min(dados.get("total_pages", 1), 500):
            break
        time.sleep(g.RATE_DELAY)
    return ids


def eh_brasileiro(dados):
    origem = set(dados.get("origin_country", []) or [])
    paises = {c.get("iso_3166_1") for c in dados.get("production_countries", []) or []}
    return "BR" in origem or "BR" in paises


def main():
    with open(SAIDA, encoding="utf-8") as f:
        pool = json.load(f)
    ids_exist = {fm.get("tmdb_id") for fm in pool}
    slugs = {fm.get("id") for fm in pool}
    print(f"Pool atual: {len(pool)} filmes")

    # --- 1) Enriquece existentes com titulo_original ---
    faltando_orig = [fm for fm in pool if not fm.get("titulo_original")]
    print(f"Enriquecendo titulo_original em {len(faltando_orig)} filmes...")
    for i, fm in enumerate(faltando_orig, 1):
        d = g.buscar_detalhes(fm["tmdb_id"])
        time.sleep(g.RATE_DELAY)
        if d:
            fm["titulo_original"] = d.get("original_title", "") or fm.get("titulo", "")
        if i % 100 == 0:
            print(f"  enriquecidos {i}/{len(faltando_orig)}")

    # --- 2) Coleta candidatos novos (prioridade: curados > recentes > A24) ---
    ordem, vistos = [], set()

    def add(idlist):
        for x in idlist:
            if x and x not in vistos and x not in ids_exist:
                vistos.add(x)
                ordem.append(x)

    print("Resolvendo titulos curados novos...")
    for titulo, ano in CURADOS_NOVOS:
        tid = buscar_id(titulo, ano)
        time.sleep(g.RATE_DELAY)
        if tid:
            add([tid])

    print("Varredura de populares recentes (2022 -> ago/2026)...")
    recentes = {"primary_release_date.gte": DATA_INI, "primary_release_date.lte": DATA_FIM}
    add(discover("vote_count.desc", extra=recentes, paginas=10, vote_min=40))
    add(discover("popularity.desc", extra=recentes, paginas=6))

    print("Varredura A24...")
    add(discover("popularity.desc", extra={"with_companies": str(A24_COMPANY_ID)}, paginas=5))

    print(f"Candidatos novos unicos: {len(ordem)}")

    # --- 3) Busca detalhes e adiciona ---
    novos, br_pulados = 0, 0
    for i, tid in enumerate(ordem, 1):
        if len(pool) >= TARGET_TOTAL:
            break
        d = g.buscar_detalhes(tid)
        time.sleep(g.RATE_DELAY)
        if not d or eh_brasileiro(d):
            br_pulados += 1 if d else 0
            continue
        if not d.get("poster_path") or not (d.get("overview") or "").strip():
            continue

        fm = g.montar_entrada(d)
        fm["origem"] = "internacional"
        fm["titulo_original"] = d.get("original_title", "")
        fm.pop("regiao", None)
        fm.pop("estado", None)
        base = fm["id"] or f"filme-{tid}"
        slug = base if base not in slugs else f"{base}-{tid}"
        slugs.add(slug)
        fm["id"] = slug

        pool.append(fm)
        ids_exist.add(tid)
        novos += 1
        if novos % 50 == 0:
            print(f"  +{novos} novos (total {len(pool)})")

    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(pool, f, ensure_ascii=False, indent=2)

    print(f"\nAdicionados: {novos} | Brasileiros pulados: {br_pulados}")
    print(f"TOTAL agora: {len(pool)} filmes internacionais")
    print(f"Com titulo_original: {sum(1 for fm in pool if fm.get('titulo_original'))}")


if __name__ == "__main__":
    main()
