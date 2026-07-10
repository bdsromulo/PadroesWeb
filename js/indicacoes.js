"use strict";

// Filmes internacionais famosos = ancoras de preferencia (pool de selecao).
// Filmes brasileiros = recomendacoes geradas. Bases sao arquivos separados.

const MAX_SELECAO = 5;
// Tags dominam o score; gênero e década entram como apoio/desempate.
// O peso de cada tag ainda é modulado pela sua raridade (IDF) — ver calcularIDF.
const PESO_TAG    = 4;
const PESO_GENERO = 1;
const PESO_DECADA = 0.5;

let filmesBR            = [];    // base brasileira (recomendacoes)
let poolFilmes          = [];    // internacionais (selecao)
let selecionados        = new Set();   // ids internacionais selecionados
let ultimasRecomendacoes = [];   // guarda o ranking atual (para o racional)
let tagIDF              = new Map();    // tag -> peso de raridade (IDF)
let termoBusca          = "";          // filtro atual da barra de busca do modal
let apenasLongas        = false;       // "Me indique apenas longa-metragens"

// Normaliza texto para busca (minusculo, sem acentos)
function normalizar(txt) {
    return (txt || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
}

document.addEventListener("DOMContentLoaded", () => {
    iniciar();
});

async function iniciar() {
    try {
        const [resBR, resINT] = await Promise.all([
            fetch("../data/filmes.json"),
            fetch("../data/internacionais.json")
        ]);
        filmesBR   = await resBR.json();
        poolFilmes = await resINT.json();

        calcularIDF();
        renderizarPool();
        atualizarBarra();

        document.getElementById("btn-iniciar").addEventListener("click", abrirModal);
        const buscaInput = document.getElementById("pool-busca-input");
        if (buscaInput) {
            buscaInput.addEventListener("input", e => {
                termoBusca = e.target.value;
                renderizarPool();
            });
        }

        // Roda dentada -> dropdown de opções (ex.: apenas longas)
        const btnConfig = document.getElementById("btn-config");
        const dropConfig = document.getElementById("config-dropdown");
        if (btnConfig && dropConfig) {
            btnConfig.addEventListener("click", e => {
                e.stopPropagation();
                dropConfig.hidden = !dropConfig.hidden;
                btnConfig.setAttribute("aria-expanded", String(!dropConfig.hidden));
            });
            // fecha ao clicar fora
            document.addEventListener("click", e => {
                if (!dropConfig.hidden &&
                    !dropConfig.contains(e.target) && e.target !== btnConfig) {
                    dropConfig.hidden = true;
                    btnConfig.setAttribute("aria-expanded", "false");
                }
            });
        }
        const chkLongas = document.getElementById("chk-apenas-longas");
        if (chkLongas) {
            chkLongas.addEventListener("change", e => {
                apenasLongas = e.target.checked;
            });
        }
        document.getElementById("btn-fechar-modal").addEventListener("click", fecharModal);
        document.getElementById("btn-recomendar").addEventListener("click", gerarRecomendacoes);
        document.getElementById("btn-limpar-selecao").addEventListener("click", limparSelecao);
        // document.getElementById("btn-racional").addEventListener("click", alternarRacional);


        // Fecha o modal ao clicar no fundo ou apertar Esc
        document.getElementById("selecao-modal").addEventListener("click", e => {
            if (e.target.id === "selecao-modal") fecharModal();
        });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape") fecharModal();
        });
    } catch (erro) {
        console.error("Erro ao carregar bases de filmes:", erro);
    }
}

// ---------------------------------------------------------------------------
// Modal de seleção
// ---------------------------------------------------------------------------

function abrirModal() {
    const modal = document.getElementById("selecao-modal");
    modal.hidden = false;
    document.body.classList.add("modal-aberto");
}

function fecharModal() {
    const modal = document.getElementById("selecao-modal");
    modal.hidden = true;
    document.body.classList.remove("modal-aberto");
}

// ---------------------------------------------------------------------------
// Seleção (todos os filmes internacionais numa lista rolável)
// ---------------------------------------------------------------------------

function renderizarPool() {
    const grid = document.getElementById("pool-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const limiteAtingido = selecionados.size >= MAX_SELECAO;

    const termo = normalizar(termoBusca);
    const visiveis = termo
        ? poolFilmes.filter(f =>
            normalizar(f.titulo).includes(termo) ||
            normalizar(f.titulo_original).includes(termo))
        : poolFilmes;

    const aviso = document.getElementById("pool-vazio");
    if (aviso) aviso.hidden = visiveis.length > 0;

    visiveis.forEach(filme => {
        const tile = document.createElement("div");
        tile.className = "selecao-tile";
        tile.dataset.id = filme.id;
        if (selecionados.has(filme.id)) tile.classList.add("selecionado");
        else if (limiteAtingido) tile.classList.add("desabilitado");

        const poster = filme.poster_url || "../img/sem-poster.svg";
        const ano = filme.ano ? `<span class="selecao-ano">${filme.ano}</span>` : "";
        tile.innerHTML = `
            <div class="selecao-poster">
                <img src="${poster}" alt="${filme.titulo}" loading="lazy"
                     onerror="this.onerror=null;this.src='../img/sem-poster.svg';">
                <span class="selecao-check">✓</span>
            </div>
            <p class="selecao-titulo">${filme.titulo} ${ano}</p>
        `;

        tile.addEventListener("click", () => alternarSelecao(filme.id, tile));
        grid.appendChild(tile);
    });
}

function alternarSelecao(id, tile) {
    if (selecionados.has(id)) {
        selecionados.delete(id);
        tile.classList.remove("selecionado");
    } else {
        if (selecionados.size >= MAX_SELECAO) return;
        selecionados.add(id);
        tile.classList.add("selecionado");
    }
    atualizarBarra();
    atualizarEstadoTiles();
}

function atualizarBarra() {
    const contador = document.getElementById("selecao-contador");
    const botao    = document.getElementById("btn-recomendar");
    if (contador) contador.textContent = `${selecionados.size} / ${MAX_SELECAO} selecionados`;
    if (botao) botao.disabled = selecionados.size === 0;
}

// Esmaece os tiles não selecionados quando o limite é atingido (na página atual)
function atualizarEstadoTiles() {
    const limiteAtingido = selecionados.size >= MAX_SELECAO;
    document.querySelectorAll(".selecao-tile").forEach(t => {
        const selecionado = selecionados.has(t.dataset.id);
        t.classList.toggle("desabilitado", limiteAtingido && !selecionado);
    });
}

function limparSelecao() {
    selecionados.clear();
    atualizarBarra();
    atualizarEstadoTiles();
    document.querySelectorAll(".selecao-tile").forEach(t => t.classList.remove("selecionado"));
}

// ---------------------------------------------------------------------------
// Algoritmo de recomendação (internacional -> brasileiro)
// ---------------------------------------------------------------------------

function decada(ano) {
    return ano ? Math.floor(ano / 10) * 10 : null;
}

// Calcula o peso de raridade (IDF) de cada tag sobre a base brasileira.
// Tags raras ("distopia") pesam mais que tags genéricas ("drama").
function calcularIDF() {
    const df = new Map();              // document frequency: tag -> nº de filmes BR que a têm
    let total = 0;
    filmesBR.forEach(f => {
        if (!f.tags || f.tags.length === 0) return;
        total += 1;
        new Set(f.tags).forEach(tag => df.set(tag, (df.get(tag) || 0) + 1));
    });

    tagIDF = new Map();
    df.forEach((freq, tag) => {
        // IDF suavizado: raras -> alto, comuns -> próximo de 0
        tagIDF.set(tag, Math.log(total / (1 + freq)));
    });
}

function pesoTag(tag) {
    // tags fora da base brasileira (sem referência de raridade) recebem peso médio
    const idf = tagIDF.get(tag);
    return idf !== undefined ? Math.max(idf, 0) : 1;
}

// Retorna a lista de itens em comum entre dois arrays (nao apenas a contagem)
function itensComuns(a, b) {
    if (!a || !b) return [];
    const setB = new Set(b);
    return a.filter(item => setB.has(item));
}

// Avalia um candidato contra as referencias, devolvendo score + conexoes detalhadas
function avaliar(candidato, referencias) {
    let score = 0;
    const conexoes = [];

    referencias.forEach(ref => {
        const generos = itensComuns(candidato.genero, ref.genero);
        const tags    = itensComuns(candidato.tags, ref.tags);
        const mesmaDecada = decada(candidato.ano) !== null
            && decada(candidato.ano) === decada(ref.ano);

        // Cada tag em comum contribui proporcionalmente à sua raridade (IDF)
        const pesoTags = tags.reduce((soma, t) => soma + pesoTag(t), 0);

        const sub = PESO_TAG * pesoTags
            + PESO_GENERO * generos.length
            + (mesmaDecada ? PESO_DECADA : 0);

        score += sub;
        if (sub > 0) {
            conexoes.push({ ref, generos, tags, mesmaDecada });
        }
    });

    return { score, conexoes };
}

function gerarRecomendacoes() {
    const referencias = poolFilmes.filter(f => selecionados.has(f.id));

    // --- BERT + GÊNERO, com NORMALIZAÇÃO POR ÂNCORA e representação mínima ---
    // Chaveamos por tmdb_id (o slug "id" tem ~998 colisões na base brasileira).
    const mapFilmesBR = new Map();
    filmesBR.forEach(f => mapFilmesBR.set(f.tmdb_id, f));

    const LIMITE = 12;
    const passaFiltros = (fb) =>
        fb && fb.poster_url && fb.avaliacao > 0 &&
        (!apenasLongas || fb.metragem === "Longa");

    // Para cada âncora: normaliza os scores pelo melhor match dela (escala 0-1),
    // para que âncoras de escalas diferentes pesem de forma comparável.
    const scoreTotal = new Map();          // tmdb_id -> soma normalizada
    const contribPorAncora = [];           // por âncora: [{chave, norm}] desc

    referencias.forEach(ref => {
        const sims = (ref.similares_nacionais || [])
            .filter(s => passaFiltros(mapFilmesBR.get(s.tmdb_id != null ? s.tmdb_id : s.id)));
        if (!sims.length) { contribPorAncora.push([]); return; }

        const maxScore = Math.max(...sims.map(s => s.score)) || 1;
        const contrib = [];
        sims.forEach(s => {
            const chave = s.tmdb_id != null ? s.tmdb_id : s.id;
            const norm = s.score / maxScore;               // 0..1 dentro da âncora
            scoreTotal.set(chave, (scoreTotal.get(chave) || 0) + norm);
            contrib.push({ chave, norm });
        });
        contrib.sort((a, b) => b.norm - a.norm);
        contribPorAncora.push(contrib);
    });

    // Ranking global (privilegia quem tem maior match somado)
    const ranking = [...scoreTotal.entries()]
        .map(([chave, total]) => ({ chave, total, filme: mapFilmesBR.get(chave) }))
        .sort((a, b) => b.total - a.total);

    // Meio-termo: garante ao menos 1 filme do melhor match de CADA âncora,
    // depois preenche o resto pelo ranking global.
    const MIN_POR_ANCORA = referencias.length > 1 ? 1 : 0;
    const escolhidos = new Set();
    const finais = [];

    const adicionar = (chave) => {
        if (escolhidos.has(chave) || finais.length >= LIMITE) return;
        escolhidos.add(chave);
        finais.push({
            filme: mapFilmesBR.get(chave),
            score: (scoreTotal.get(chave) || 0) * 100,
            conexoes: []
        });
    };

    if (MIN_POR_ANCORA > 0) {
        contribPorAncora.forEach(contrib => {
            let add = 0;
            for (const c of contrib) {
                if (add >= MIN_POR_ANCORA) break;
                if (!escolhidos.has(c.chave)) { adicionar(c.chave); add++; }
            }
        });
    }
    ranking.forEach(x => adicionar(x.chave));

    // Reordena para exibir do maior match para o menor
    finais.sort((a, b) => b.score - a.score);
    ultimasRecomendacoes = finais.slice(0, LIMITE);

    fecharModal();
    renderizarSelecionados(referencias);
    renderizarResultados(ultimasRecomendacoes);
}

function renderizarSelecionados(referencias) {
    const grid = document.getElementById("selecionados-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    referencias.forEach(ref => {
        grid.appendChild(criarCardFilme(ref));
    });
}

function renderizarResultados(ranqueados) {
    const bloco = document.getElementById("resultados-bloco");
    const grid  = document.getElementById("resultados-grid");
    grid.innerHTML = "";

    if (ranqueados.length === 0) {
        grid.innerHTML = "<p class='resultados-vazio'>Não encontramos produções brasileiras semelhantes o suficiente. Tente outras combinações.</p>";
    } else {
        ranqueados.forEach(item => grid.appendChild(criarCardFilme(item.filme)));
    }

    // montarRacional(ranqueados); // OCULTADO TEMPORARIAMENTE (Antigo modelo baseado em tags)
    const toggleRacional = document.getElementById("btn-racional");
    if(toggleRacional) toggleRacional.style.display = "none";

    bloco.style.display = "block";
    bloco.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------------------------------------------------------------------------
// Racional: explica por que cada filme foi recomendado
// ---------------------------------------------------------------------------

function chip(texto, classe) {
    return `<span class="racional-chip ${classe || ""}">${texto}</span>`;
}

function montarRacional(ranqueados) {
    const painel  = document.getElementById("racional-painel");
    const toggle  = document.getElementById("btn-racional");
    if (!painel || !toggle) return;

    // Recolhe o painel sempre que um novo ranking é gerado
    painel.style.display = "none";
    toggle.setAttribute("aria-expanded", "false");
    toggle.querySelector(".racional-label").textContent = "Mostrar racional";

    if (ranqueados.length === 0) {
        toggle.style.display = "none";
        painel.innerHTML = "";
        return;
    }
    toggle.style.display = "inline-flex";

    painel.innerHTML = ranqueados.map(item => {
        const f = item.filme;
        const capaBR = f.poster_url || "../img/sem-poster.svg";

        const conexoesHtml = item.conexoes.map(c => {
            const capaINT = c.ref.poster_url || "../img/sem-poster.svg";
            const fatores = [];
            if (c.generos.length) {
                fatores.push(`<div class="racional-fator"><span class="racional-rotulo">Gêneros</span>${c.generos.map(g => chip(g)).join("")}</div>`);
            }
            if (c.tags.length) {
                fatores.push(`<div class="racional-fator"><span class="racional-rotulo">Tags</span>${c.tags.map(t => chip(t)).join("")}</div>`);
            }
            if (c.mesmaDecada) {
                fatores.push(`<div class="racional-fator"><span class="racional-rotulo">Período</span>${chip("mesma década (" + decada(f.ano) + "s)")}</div>`);
            }
            return `
                <div class="racional-conexao">
                    <div class="racional-origem">
                        <img src="${capaINT}" alt="${c.ref.titulo}" loading="lazy"
                             onerror="this.onerror=null;this.src='../img/sem-poster.svg';">
                        <span>${c.ref.titulo}</span>
                    </div>
                    <div class="racional-fatores">${fatores.join("")}</div>
                </div>
            `;
        }).join("");

        return `
            <div class="racional-item">
                <div class="racional-cabecalho">
                    <img class="racional-capa-br" src="${capaBR}" alt="${f.titulo}" loading="lazy"
                         onerror="this.onerror=null;this.src='../img/sem-poster.svg';">
                    <div>
                        <p class="racional-titulo">${f.titulo}</p>
                        <p class="racional-afinidade">afinidade ${Math.round(item.score)}</p>
                    </div>
                </div>
                <div class="racional-conexoes">${conexoesHtml}</div>
            </div>
        `;
    }).join("");
}

function alternarRacional() {
    const painel = document.getElementById("racional-painel");
    const toggle = document.getElementById("btn-racional");
    const aberto = painel.style.display !== "none";
    painel.style.display = aberto ? "none" : "block";
    toggle.setAttribute("aria-expanded", String(!aberto));
    toggle.querySelector(".racional-label").textContent = aberto ? "Mostrar racional" : "Ocultar racional";
}
