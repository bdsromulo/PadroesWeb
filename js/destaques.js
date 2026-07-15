"use strict";

// Destaques com curadoria: mistura listas fixas (títulos escolhidos a dedo)
// com filtros por gênero/elenco/ano. Regra geral: só entram filmes COM pôster.

let TODOS_FILMES = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarDestaques();
});

// --- utilidades -----------------------------------------------------------

function normalizar(txt) {
    return (txt || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
}

const temPoster = (f) => !!f.poster_url;

// Acha um filme pelo título exato (com pôster). Em caso de homônimos, pega o
// mais votado (evita making-of / versões obscuras).
function acharPorTitulo(titulo) {
    const alvo = normalizar(titulo);
    const cands = TODOS_FILMES.filter(f => temPoster(f) && normalizar(f.titulo) === alvo);
    if (!cands.length) return null;
    cands.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    return cands[0];
}

// Resolve uma lista curada de títulos (mantém a ordem, ignora não encontrados).
function porTitulos(titulos) {
    const out = [];
    const vistos = new Set();
    titulos.forEach(t => {
        const f = acharPorTitulo(t);
        if (f && !vistos.has(f.tmdb_id)) { vistos.add(f.tmdb_id); out.push(f); }
    });
    return out;
}

// Completa uma base com filmes que passam num predicado, ordenados, sem repetir.
function completar(base, predicado, ordenar, limite) {
    const vistos = new Set(base.map(f => f.tmdb_id));
    const extras = TODOS_FILMES
        .filter(f => temPoster(f) && !vistos.has(f.tmdb_id) && predicado(f))
        .sort(ordenar);
    const out = base.slice();
    for (const f of extras) {
        if (out.length >= limite) break;
        out.push(f);
    }
    return out.slice(0, limite);
}

const porVotos = (a, b) => (b.vote_count || 0) - (a.vote_count || 0);
const temGenero = (f, g) => (f.genero || []).includes(g);
const temNoElenco = (f, nome) => (f.elenco || []).some(e => normalizar(e).includes(normalizar(nome)));

const LIMITE = 18;

// --- categorias -----------------------------------------------------------

function montarCategorias() {
    const cats = [];

    // 1) Clichês Famosos — mainstream brasileiro de grande destaque
    const clichesFixos = porTitulos([
        "Tropa de Elite", "Tropa de Elite 2: O Inimigo Agora é Outro",
        "Cidade de Deus", "Central do Brasil", "Ainda Estou Aqui",
        "O Agente Secreto", "O Auto da Compadecida",
    ]);
    cats.push(["Clichês Famosos", completar(
        clichesFixos,
        f => (f.avaliacao || 0) > 0 && (f.vote_count || 0) >= 300,
        porVotos, LIMITE)]);

    // 2) Aclamados pela Crítica — bem avaliados COM votos suficientes
    const aclamados = TODOS_FILMES
        .filter(f => temPoster(f) && (f.avaliacao || 0) >= 7.5 && (f.vote_count || 0) >= 300)
        .sort((a, b) => (b.avaliacao - a.avaliacao) || porVotos(a, b))
        .slice(0, LIMITE);
    cats.push(["Aclamados pela Crítica", aclamados]);

    // 3) Lançamentos Recentes — o mais atual possível (2026 > 2025)
    const recentes = TODOS_FILMES
        .filter(f => temPoster(f) && (f.ano === 2026 || f.ano === 2025))
        .sort((a, b) => (b.ano - a.ano) || porVotos(a, b))
        .slice(0, LIMITE);
    cats.push(["Lançamentos Recentes", recentes]);

    // 4) Para Não Dormir a Noite — terror
    const terror = TODOS_FILMES
        .filter(f => temPoster(f) && temGenero(f, "Terror") && (f.avaliacao || 0) > 0)
        .sort(porVotos)
        .slice(0, LIMITE);
    cats.push(["Para Não Dormir a Noite", terror]);

    // 5) Brasil Animado — animações nacionais
    const animadosFixos = porTitulos([
        "O Menino e o Mundo", "Boi Aruá", "As Aventuras do Avião Vermelho",
        "Até a China", "Uma História de Amor e Fúria",
        "Até que a Sbórnia nos Separe", "Turma da Mônica: O Filme",
    ]);
    cats.push(["Brasil Animado", completar(
        animadosFixos,
        f => temGenero(f, "Animação"),
        porVotos, LIMITE)]);

    // 6) (Muito) Trapalhões — franquia dos Trapalhões
    const trapalhoes = TODOS_FILMES
        .filter(f => temPoster(f) &&
            (normalizar(f.titulo).includes("trapalh") || temNoElenco(f, "Renato Aragão")))
        .sort(porVotos)
        .slice(0, LIMITE);
    cats.push(["(Muito) Trapalhões", trapalhoes]);

    // 7) Cristãos Cinéfilos — obras de temática cristã/religiosa (exclui sátiras)
    const cristaosFixos = porTitulos([
        "Os Dez Mandamentos: O Filme", "Nada a Perder",
        "Nada a Perder 2: Segundos Depois do Início", "O Pagador de Promessas",
    ]);
    // Cunho exclusivamente católico/evangélico (exclui espiritismo e não-cristãos)
    const marcCristaos = ["jesus", "cristo", "crist", "biblia", "evangel", "mandament",
                          "catolic", "igreja", "padre", "santa dulce"];
    const marcExcluir  = ["espirit", "kardec", "chico xavier", "umbanda", "candomble",
                          "reencarna", "psicograf", "medium"];
    const titulosExcluir = new Set([
        "kardec", "faroeste caboclo", "nosso lar", "nosso lar 2: os mensageiros",
        "chico xavier", "as maes de chico xavier", "as cartas de chico xavier",
        "data limite segundo chico xavier", "divaldo: o mensageiro da paz",
        "bezerra de menezes: o diario de um espirito",
        "o espiritismo de kardec aos dias de hoje",
    ].map(normalizar));
    const ehCristao = (f) => {
        if (temGenero(f, "Comédia")) return false; // evita sátiras (Porta dos Fundos etc.)
        if (titulosExcluir.has(normalizar(f.titulo))) return false;
        const campos = normalizar([f.titulo, f.sinopse, (f.tags || []).join(" ")].join(" "));
        if (marcExcluir.some(m => campos.includes(m))) return false; // fora espiritismo etc.
        return marcCristaos.some(m => campos.includes(m));
    };
    cats.push(["Cristãos Cinéfilos", completar(
        cristaosFixos,
        f => ehCristao(f) && (f.avaliacao || 0) > 0,
        porVotos, LIMITE)]);

    // 8) Fã Clube da Klara Castanho — filmografia da Klara Castanho
    const klara = TODOS_FILMES
        .filter(f => temPoster(f) && temNoElenco(f, "Klara Castanho"))
        .sort(porVotos)
        .slice(0, LIMITE);
    cats.push(["Fã Clube da Klara Castanho", klara]);

    return cats;
}

function renderizarDestaques() {
    const container = document.getElementById("destaques-container");
    if (!container) return;
    container.innerHTML = "";
    montarCategorias().forEach(([titulo, filmes]) => {
        if (filmes && filmes.length >= 3) {
            criarSecaoCarrossel(titulo, filmes, container);
        }
    });
}

async function carregarDestaques() {
    const container = document.getElementById("destaques-container");
    try {
        const resp = await fetch("data/filmes.json");
        TODOS_FILMES = await resp.json();
        renderizarDestaques();
        // Re-renderiza (sem re-baixar) ao trocar de idioma
        window.aoTrocarIdioma = renderizarDestaques;
    } catch (erro) {
        console.error("Erro ao puxar dados dos destaques:", erro);
        if (container) container.innerHTML = "<p>Ocorreu um erro ao carregar os filmes.</p>";
    }
}

// --- carrossel (inalterado) ----------------------------------------------

const CARROSSEL_INICIAL = 5; // cards renderizados na abertura
const CARROSSEL_LOTE    = 5; // cards criados a cada clique que se aproxima do fim

function criarSecaoCarrossel(titulo, filmesLista, containerPai) {
    const section = document.createElement("section");
    section.className = "carrossel-section";

    section.innerHTML = `
        <h2>${typeof t === "function" ? t("cat." + titulo) : titulo}</h2>
        <div class="carrossel-container">
            <button class="carrossel-btn left btn-ant">❮</button>
            <div class="carrossel-janela">
                <div class="carrossel-track"></div>
            </div>
            <button class="carrossel-btn right btn-prox">❯</button>
        </div>
    `;

    const track   = section.querySelector(".carrossel-track");
    const btnAnt  = section.querySelector(".btn-ant");
    const btnProx = section.querySelector(".btn-prox");

    let renderizados = 0;

    function renderizarLote() {
        const lote = filmesLista.slice(renderizados, renderizados + CARROSSEL_LOTE);
        lote.forEach(filme => {
            const card = criarCardFilme(filme);
            card.classList.add("carrossel-item");
            track.appendChild(card);
        });
        renderizados += lote.length;
    }

    renderizarLote();
    containerPai.appendChild(section);
    iniciarDeslize(track, btnAnt, btnProx, filmesLista, renderizarLote, () => renderizados);
}

function iniciarDeslize(track, btnAnt, btnProx, filmesLista, renderizarLote, getRenderizados) {
    let posicaoAtual = 0;

    btnProx.addEventListener("click", () => {
        const totalRendered = track.querySelectorAll(".carrossel-item").length;
        if (posicaoAtual >= totalRendered - 2 && getRenderizados() < filmesLista.length) {
            renderizarLote();
        }
        const totalItens = track.querySelectorAll(".carrossel-item").length;
        if (posicaoAtual < totalItens - 1) {
            posicaoAtual++;
            movimentarTrack(track, posicaoAtual, true);
        } else {
            posicaoAtual = 0;
            movimentarTrack(track, posicaoAtual, false);
        }
    });

    btnAnt.addEventListener("click", () => {
        const totalItens = track.querySelectorAll(".carrossel-item").length;
        if (posicaoAtual > 0) {
            posicaoAtual--;
            movimentarTrack(track, posicaoAtual, true);
        } else {
            posicaoAtual = totalItens - 1;
            movimentarTrack(track, posicaoAtual, false);
        }
    });
}

function movimentarTrack(track, posicaoAtual, animar) {
    const item = track.querySelector(".carrossel-item");
    if (!item) return;
    const larguraCard = item.offsetWidth + 20;
    if (animar === false) {
        track.style.transition = "none";
        track.style.transform = `translateX(-${posicaoAtual * larguraCard}px)`;
        requestAnimationFrame(() => { track.style.transition = ""; });
    } else {
        track.style.transform = `translateX(-${posicaoAtual * larguraCard}px)`;
    }
}
