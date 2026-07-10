"""
gerar_internacionais.py
(c) Monta uma base APARTADA de filmes internacionais famosos (data/internacionais.json),
    usada apenas como ancoras de preferencia na pagina de Indicacoes.
    NAO entra no catalogo (que le somente filmes.json).

Estrategia (>= 750 filmes com boa diversidade de genero):
  1. Semente curada (classicos garantidos), buscados por titulo+ano.
  2. Varredura no /discover/movie por genero, ordenando por vote_count.desc
     (ou seja, os mais "famosos"), cobrindo todos os generos e reforcando os
     que interessam aos testes de indicacao: Animacao, Familia, Acao, Drama e
     Faroeste (western).
  3. Filtra fora qualquer producao brasileira (essas vivem em filmes.json).

Uso:
    cd scripts/
    python gerar_internacionais.py
"""

import sys
import os
import json
import time

import gerar_filmes as g

sys.stdout.reconfigure(encoding="utf-8")

SAIDA = os.path.join(g.PROJECT_ROOT, "data", "internacionais.json")

ALVO_MINIMO = 780          # meta de filmes internacionais no arquivo final
VOTE_MIN    = 150          # so filmes com votos suficientes (= "famosos")

# Semente curada: classicos garantidos, generos diversos. (titulo em ingles, ano)
CURADOS = [
    ("The Godfather", 1972), ("The Shawshank Redemption", 1994), ("Forrest Gump", 1994),
    ("Schindler's List", 1993), ("Fight Club", 1999), ("Moonlight", 2016),
    ("The Pursuit of Happyness", 2006), ("A Beautiful Mind", 2001), ("The Green Mile", 1999),
    ("Good Will Hunting", 1997), ("Dead Poets Society", 1989), ("Whiplash", 2014),
    ("12 Years a Slave", 2013), ("The Social Network", 2010), ("Marriage Story", 2019),
    ("Manchester by the Sea", 2016),
    ("Pulp Fiction", 1994), ("Goodfellas", 1990), ("Se7en", 1995),
    ("The Silence of the Lambs", 1991), ("No Country for Old Men", 2007), ("Parasite", 2019),
    ("Oldboy", 2003), ("Scarface", 1983), ("The Departed", 2006), ("Gone Girl", 2014),
    ("Prisoners", 2013), ("Heat", 1995), ("Joker", 2019),
    ("Die Hard", 1988), ("Mad Max: Fury Road", 2015), ("Gladiator", 2000),
    ("John Wick", 2014), ("The Dark Knight", 2008), ("Mission: Impossible", 1996),
    ("Terminator 2: Judgment Day", 1991), ("Top Gun: Maverick", 2022),
    ("Casino Royale", 2006), ("Kill Bill: Vol. 1", 2003),
    ("Inception", 2010), ("The Matrix", 1999), ("Interstellar", 2014),
    ("Blade Runner", 1982), ("Star Wars", 1977), ("Arrival", 2016),
    ("E.T. the Extra-Terrestrial", 1982), ("Back to the Future", 1985), ("Avatar", 2009),
    ("Dune", 2021), ("Alien", 1979), ("2001: A Space Odyssey", 1968),
    ("The Terminator", 1984), ("Ex Machina", 2014),
    ("Iron Man", 2008), ("The Avengers", 2012), ("Spider-Man", 2002),
    ("Black Panther", 2018), ("Logan", 2017), ("Guardians of the Galaxy", 2014),
    ("Avengers: Endgame", 2019), ("Spider-Man: Into the Spider-Verse", 2018),
    ("Bridget Jones's Diary", 2001), ("Titanic", 1997), ("La La Land", 2016),
    ("The Notebook", 2004), ("Pride & Prejudice", 2005), ("Notting Hill", 1999),
    ("Eternal Sunshine of the Spotless Mind", 2004), ("Before Sunrise", 1995),
    ("Call Me by Your Name", 2017), ("The Fault in Our Stars", 2014),
    ("The Grand Budapest Hotel", 2014), ("Superbad", 2007), ("The Hangover", 2009),
    ("Groundhog Day", 1993), ("The Secret Life of Walter Mitty", 2013),
    ("Little Miss Sunshine", 2006), ("Jojo Rabbit", 2019), ("The Truman Show", 1998),
    ("Mrs. Doubtfire", 1993),
    ("The Shining", 1980), ("Get Out", 2017), ("Hereditary", 2018),
    ("The Exorcist", 1973), ("A Quiet Place", 2018), ("It", 2017), ("Psycho", 1960),
    ("Spirited Away", 2001), ("Toy Story", 1995), ("The Lion King", 1994),
    ("Up", 2009), ("Coco", 2017), ("Your Name.", 2016), ("WALL·E", 2008),
    ("Shrek", 2001), ("Finding Nemo", 2003), ("How to Train Your Dragon", 2010),
    ("Inside Out", 2015), ("Ratatouille", 2007),
    ("The Lord of the Rings: The Fellowship of the Ring", 2001),
    ("Harry Potter and the Philosopher's Stone", 2001),
    ("Pirates of the Caribbean: The Curse of the Black Pearl", 2003),
    ("Jurassic Park", 1993), ("Raiders of the Lost Ark", 1981),
    ("The Hobbit: An Unexpected Journey", 2012), ("Life of Pi", 2012),
    ("The Lord of the Rings: The Return of the King", 2003),
    ("Saving Private Ryan", 1998), ("1917", 2019), ("Apocalypse Now", 1979),
    ("Full Metal Jacket", 1987), ("Dunkirk", 2017),
    ("The Greatest Showman", 2017), ("Bohemian Rhapsody", 2018), ("Rocketman", 2019),
    ("Django Unchained", 2012), ("The Good, the Bad and the Ugly", 1966),
    ("Once Upon a Time in the West", 1968),
    ("Casablanca", 1942), ("The Wizard of Oz", 1939),
    # Reforco de westerns classicos (para o teste de cangaco/faroeste)
    ("Unforgiven", 1992), ("True Grit", 2010), ("The Magnificent Seven", 1960),
    ("Butch Cassidy and the Sundance Kid", 1969), ("A Fistful of Dollars", 1964),
    ("The Hateful Eight", 2015), ("3:10 to Yuma", 2007), ("Tombstone", 1993),
    # Reforco de animacao/infantil
    ("Spider-Man: Across the Spider-Verse", 2023), ("Frozen", 2013),
    ("Zootopia", 2016), ("Moana", 2016), ("Kung Fu Panda", 2008),
    ("Despicable Me", 2010), ("Monsters, Inc.", 2001), ("Aladdin", 1992),
    ("Beauty and the Beast", 1991), ("Klaus", 2019), ("Soul", 2020),
    ("Princess Mononoke", 1997), ("My Neighbor Totoro", 1988),
]

# IDs de genero do TMDB -> quantas paginas varrer (20 filmes/pagina, vote_count.desc).
# Reforco onde os testes precisam de cobertura (Animacao, Familia, Acao, Drama, Faroeste).
GENRE_PAGES = {
    28:   6,   # Acao
    12:   5,   # Aventura
    16:   9,   # Animacao  (reforcado)
    35:   6,   # Comedia
    80:   4,   # Crime
    18:   9,   # Drama     (reforcado)
    10751: 7,  # Familia   (reforcado - infantil)
    14:   4,   # Fantasia
    27:   4,   # Terror
    36:   3,   # Historia
    9648: 3,   # Misterio
    10749: 5,  # Romance
    878:  6,   # Ficcao cientifica
    53:   5,   # Suspense
    10752: 3,  # Guerra
    37:   12,  # Faroeste  (reforcado - poucos filmes, varre o maximo)
}


def buscar_id(titulo, ano):
    params = {"query": titulo, "primary_release_year": ano, "language": "pt-BR"}
    dados = g.requisicao(f"{g.BASE_URL}/search/movie", params=params)
    if dados and dados.get("results"):
        return dados["results"][0]["id"]
    params.pop("primary_release_year")
    dados = g.requisicao(f"{g.BASE_URL}/search/movie", params=params)
    if dados and dados.get("results"):
        return dados["results"][0]["id"]
    return None


def discover_ids(genre_id=None, paginas=5):
    """IDs dos filmes mais votados (famosos), opcionalmente de um genero."""
    ids = []
    for p in range(1, paginas + 1):
        params = {
            "sort_by": "vote_count.desc",
            "vote_count.gte": VOTE_MIN,
            "include_adult": "false",
            "page": p,
            "language": "pt-BR",
        }
        if genre_id:
            params["with_genres"] = str(genre_id)
        dados = g.requisicao(f"{g.BASE_URL}/discover/movie", params=params)
        if not dados:
            break
        ids.extend(r["id"] for r in dados.get("results", []))
        if p >= min(dados.get("total_pages", 1), 500):
            break
        time.sleep(g.RATE_DELAY)
    return ids


def eh_brasileiro(dados):
    """True se a producao for brasileira (pertence a filmes.json, nao ao pool)."""
    origem = set(dados.get("origin_country", []) or [])
    paises = {c.get("iso_3166_1") for c in dados.get("production_countries", []) or []}
    return "BR" in origem or "BR" in paises


def coletar_candidatos():
    """Junta IDs da semente curada + varredura por genero (dedup, preserva ordem)."""
    ordem = []
    vistos = set()

    def add(idlist):
        for i in idlist:
            if i and i not in vistos:
                vistos.add(i)
                ordem.append(i)

    # 1) Semente curada primeiro (prioridade)
    print(f"Resolvendo {len(CURADOS)} filmes da semente curada...")
    seed_ids = []
    for j, (titulo, ano) in enumerate(CURADOS, 1):
        tid = buscar_id(titulo, ano)
        time.sleep(g.RATE_DELAY)
        if tid:
            seed_ids.append(tid)
        if j % 25 == 0:
            print(f"  semente {j}/{len(CURADOS)}")
    add(seed_ids)
    print(f"  semente -> {len(ordem)} ids unicos")

    # 2) Varredura geral (mais votados no geral)
    print("Varredura geral (mais votados)...")
    add(discover_ids(genre_id=None, paginas=6))

    # 3) Varredura por genero (diversidade + reforco)
    for gid, pags in GENRE_PAGES.items():
        antes = len(ordem)
        add(discover_ids(genre_id=gid, paginas=pags))
        print(f"  genero {gid}: +{len(ordem) - antes} (total {len(ordem)})")

    return ordem


def main():
    candidatos = coletar_candidatos()
    print(f"\nTotal de candidatos unicos: {len(candidatos)}")
    print("Buscando detalhes e filtrando producoes brasileiras...\n")

    internacionais = []
    vistos_slug = {}
    brasileiros_pulados = 0

    for i, tmdb_id in enumerate(candidatos, 1):
        if len(internacionais) >= ALVO_MINIMO:
            break

        dados = g.buscar_detalhes(tmdb_id)
        time.sleep(g.RATE_DELAY)
        if not dados:
            continue
        if eh_brasileiro(dados):
            brasileiros_pulados += 1
            continue
        # descarta sem poster ou sem sinopse (nao servem de ancora util)
        if not dados.get("poster_path") or not (dados.get("overview") or "").strip():
            continue

        filme = g.montar_entrada(dados)
        filme["origem"] = "internacional"
        filme["titulo_original"] = dados.get("original_title", "")  # p/ busca bilingue
        filme.pop("regiao", None)
        filme.pop("estado", None)

        # garante id (slug) unico dentro do pool
        base_slug = filme["id"] or f"filme-{tmdb_id}"
        slug = base_slug
        if slug in vistos_slug:
            slug = f"{base_slug}-{tmdb_id}"
        vistos_slug[slug] = True
        filme["id"] = slug

        internacionais.append(filme)
        if len(internacionais) % 50 == 0:
            print(f"  [{len(internacionais)}] ok (percorridos {i}/{len(candidatos)})")

    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(internacionais, f, ensure_ascii=False, indent=2)

    print(f"\nSalvos: {len(internacionais)} filmes internacionais")
    print(f"Brasileiros pulados: {brasileiros_pulados}")
    print(f"Arquivo: {SAIDA}")


if __name__ == "__main__":
    main()
