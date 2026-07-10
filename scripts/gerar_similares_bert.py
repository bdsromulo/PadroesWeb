"""
gerar_similares_bert.py

Para cada filme internacional (ancora), escolhe os filmes brasileiros mais
parecidos e grava em internacionais.json (campo "similares_nacionais").

Melhoria (v2): o ranking combina DUAS evidencias, nao so o BERT:
    score_final = cosseno(sinopses)  +  W_GENERO * Jaccard(generos)
                                     +  W_POP    * popularidade_norm (desempate)

Motivo: a similaridade so por sinopse (BERT) as vezes aproxima filmes de
generos diferentes. Somar a afinidade de genero puxa animacao->animacao,
infantil->infantil/animacao, acao->acao, faroeste->faroeste/cangaco etc.,
mantendo o BERT como sinal semantico principal.

O Jaccard de generos e vetorizado (multiplicacao de matrizes binarias),
entao roda rapido mesmo com ~800 x 26k pares.

Uso:
    cd scripts/    (ou raiz do projeto)
    python gerar_similares_bert.py
"""

import json
import os
import sys
import hashlib

import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError as e:
    print(f"Erro: instale sentence-transformers e scikit-learn. Detalhe: {e}")
    sys.exit(1)

# --- Pesos do ranking (ajustaveis; override por env para calibrar) --------
W_GENERO = float(os.environ.get("W_GENERO", 0.85))  # afinidade de genero somada ao cosseno
W_POP    = float(os.environ.get("W_POP", 0.02))     # leve desempate por popularidade
TOP_N    = int(os.environ.get("TOP_N", 25))         # quantos similares guardar (folga p/ filtro de longas)

MODELO = "paraphrase-multilingual-MiniLM-L12-v2"

# Caminhos (funciona rodando da raiz ou de scripts/)
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH_INT = os.path.join(RAIZ, "data", "internacionais.json")
PATH_NAC = os.path.join(RAIZ, "data", "filmes.json")
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache")


def texto_do_filme(f):
    sinopse = f.get("sinopse", "") or f.get("overview", "")
    titulo = f.get("titulo", "")
    return f"{titulo}. {sinopse}".strip()


def matriz_generos(filmes, generos_idx):
    """Matriz binaria (n_filmes x n_generos)."""
    M = np.zeros((len(filmes), len(generos_idx)), dtype=np.float32)
    for i, f in enumerate(filmes):
        for gnome in (f.get("genero") or []):
            j = generos_idx.get(gnome)
            if j is not None:
                M[i, j] = 1.0
    return M


def jaccard_generos(Gint, Gnac):
    """Jaccard vetorizado entre cada internacional e cada nacional -> (n_int x n_nac)."""
    inter = Gint @ Gnac.T                      # tamanho da intersecao
    tam_int = Gint.sum(axis=1)[:, None]        # |G_i|
    tam_nac = Gnac.sum(axis=1)[None, :]        # |G_j|
    union = tam_int + tam_nac - inter
    return np.divide(inter, np.maximum(union, 1.0)).astype(np.float32)


def embeddings_nacionais(model, nacionais):
    """Gera (ou reusa do cache) os embeddings dos filmes nacionais."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    # chave de cache: modelo + nº de filmes + hash dos ids (detecta mudanca da base)
    ids = [f.get("id") for f in nacionais]
    h = hashlib.md5((MODELO + "|" + "|".join(map(str, ids))).encode("utf-8")).hexdigest()[:12]
    cache = os.path.join(CACHE_DIR, f"emb_nac_{len(nacionais)}_{h}.npy")

    if os.path.exists(cache):
        print(f"  (cache) reusando embeddings nacionais: {os.path.basename(cache)}")
        return np.load(cache)

    print("  gerando embeddings nacionais (demora na 1a vez)...")
    textos = [texto_do_filme(f) for f in nacionais]
    emb = model.encode(textos, show_progress_bar=True, batch_size=128,
                       convert_to_numpy=True)
    np.save(cache, emb)
    print(f"  cache salvo: {os.path.basename(cache)}")
    return emb


def gerar_similares():
    print("Carregando bases...")
    with open(PATH_INT, "r", encoding="utf-8") as f:
        internacionais = json.load(f)
    with open(PATH_NAC, "r", encoding="utf-8") as f:
        nacionais = json.load(f)
    print(f"  {len(internacionais)} internacionais | {len(nacionais)} nacionais")

    print(f"Carregando modelo NLP ({MODELO})...")
    model = SentenceTransformer(MODELO)

    # --- Embeddings + cosseno ---
    emb_nac = embeddings_nacionais(model, nacionais)
    print("Gerando embeddings dos internacionais...")
    emb_int = model.encode([texto_do_filme(f) for f in internacionais],
                           show_progress_bar=True, batch_size=128,
                           convert_to_numpy=True)

    print("Calculando cosseno (semantica)...")
    cos = cosine_similarity(emb_int, emb_nac).astype(np.float32)   # (n_int x n_nac)

    # --- Afinidade de genero (Jaccard vetorizado) ---
    print("Calculando afinidade de genero...")
    todos_generos = sorted({g for f in (internacionais + nacionais)
                            for g in (f.get("genero") or [])})
    generos_idx = {g: i for i, g in enumerate(todos_generos)}
    Gint = matriz_generos(internacionais, generos_idx)
    Gnac = matriz_generos(nacionais, generos_idx)
    jac = jaccard_generos(Gint, Gnac)                              # (n_int x n_nac)

    # --- Popularidade nacional (desempate leve) ---
    votos = np.array([max(f.get("vote_count", 0) or 0, 0) for f in nacionais],
                     dtype=np.float32)
    pop = np.log1p(votos)
    pop = pop / (pop.max() or 1.0)                                 # 0..1

    # --- Score combinado ---
    final = cos + W_GENERO * jac + W_POP * pop[None, :]

    print(f"Selecionando top {TOP_N} nacionais por internacional "
          f"(W_genero={W_GENERO}, W_pop={W_POP})...")
    ids_nac = [f.get("id") for f in nacionais]
    tmdb_nac = [f.get("tmdb_id") for f in nacionais]
    for i, filme_int in enumerate(internacionais):
        linha = final[i]
        top = np.argpartition(linha, -TOP_N)[-TOP_N:]
        top = top[np.argsort(linha[top])[::-1]]                   # ordena desc
        # tmdb_id e a chave estavel (o slug "id" nao e unico -> 998 colisoes)
        filme_int["similares_nacionais"] = [
            {
                "tmdb_id": tmdb_nac[idx],
                "id": ids_nac[idx],
                "score": float(linha[idx]),
                "cos": float(cos[i, idx]),
                "gen": float(jac[i, idx]),
            }
            for idx in top
        ]

    print("Salvando internacionais.json...")
    with open(PATH_INT, "w", encoding="utf-8") as f:
        json.dump(internacionais, f, ensure_ascii=False, indent=2)
    print("Concluido.")


if __name__ == "__main__":
    gerar_similares()
