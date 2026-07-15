"use strict";

let filmesPorEstado = {};
let ultimoEstadoPainel = null;   // {uf, nome, container} para re-render ao trocar idioma

const SVG_NS = "http://www.w3.org/2000/svg";

// Estados pequenos demais para caber o rótulo dentro: recebem rótulo externo + linha
const ESTADOS_EXTERNOS = new Set(["RJ", "ES", "AL", "SE", "PB", "RN", "PE", "DF"]);
// Ajuste manual de X e Y para estados com ilhas oceânicas
const AJUSTES_CENTRO = {
    "RN": { dx: -50,  dy: 50 }, // Puxa 80px pra esquerda e 10px pra baixo  
    "ES": { dx: -100,  dy: -5 } // Puxa 90px pra esquerda e 10px pra cima
};
const COLUNA_EXTERNA_X = 945;   // x da coluna de rótulos externos (viewBox 0..1000)

document.addEventListener("DOMContentLoaded", () => {
    inicializarMapa();
});

async function inicializarMapa() {
    try {
        const response = await fetch("data/filmes.json");
        const filmes = await response.json();
        indexarPorEstado(filmes);
        configurarEstados();
        criarRotulos();
        mostrarEstadoInicial();

        // Ao trocar de idioma, re-renderiza o painel do estado selecionado
        window.aoTrocarIdioma = () => {
            if (ultimoEstadoPainel) {
                gerarPainelEstado(ultimoEstadoPainel.uf, ultimoEstadoPainel.nome,
                                  ultimoEstadoPainel.container);
            }
        };
    } catch (erro) {
        console.error("Erro ao carregar dados do mapa:", erro);
    }
}

function indexarPorEstado(filmes) {
    filmesPorEstado = {};
    filmes.forEach(filme => {
        if (filme.estado) {
            (filmesPorEstado[filme.estado] ||= []).push(filme);
        }
    });
    Object.values(filmesPorEstado).forEach(lista =>
        lista.sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0))
    );
}

function pathsDosEstados() {
    return [...document.querySelectorAll('#mapa-brasil-container path[id^="BR"]')]
        .filter(p => p.id.length === 4);
}

function configurarEstados() {
    const containerInfo = document.getElementById("info-estado-container");
    const estados = pathsDosEstados();

    estados.forEach(path => {
        path.classList.add("estado");
        path.addEventListener("click", () => selecionarEstado(path, estados, containerInfo));
    });
}

function selecionarEstado(path, estados, containerInfo) {
    estados.forEach(e => {
        e.classList.remove("ativo");
        const lbl = e.rotulo;
        if (lbl) lbl.forEach(el => el.classList.remove("rotulo-ativo"));
    });
    path.classList.add("ativo");
    if (path.rotulo) path.rotulo.forEach(el => el.classList.add("rotulo-ativo"));

    const uf   = path.id.slice(2);
    const nome = path.getAttribute("data-name") || uf;
    gerarPainelEstado(uf, nome, containerInfo);
}

// ---------------------------------------------------------------------------
// Rótulos (siglas) sobre o mapa
// ---------------------------------------------------------------------------

function criarRotulos() {
    const svg = document.querySelector("#mapa-brasil-container svg");
    if (!svg) return;
    const estados = pathsDosEstados();
    const containerInfo = document.getElementById("info-estado-container");

    // Estados com rótulo externo, ordenados verticalmente para distribuir a coluna
    const externos = estados
        .filter(p => ESTADOS_EXTERNOS.has(p.id.slice(2)))
        .map(p => ({ path: p, bbox: p.getBBox() }))
        .sort((a, b) => (a.bbox.y + a.bbox.height / 2) - (b.bbox.y + b.bbox.height / 2));

    // Distribui as posições verticais dos rótulos externos
    const topo = 120, base = 800;
    const passo = externos.length > 1 ? (base - topo) / (externos.length - 1) : 0;

    estados.forEach(path => {
        const uf = path.id.slice(2);
        const bbox = path.getBBox();
        let cx = bbox.x + bbox.width / 2;
        let cy = bbox.y + bbox.height / 2;

        if (AJUSTES_CENTRO[uf]) {
            cx += AJUSTES_CENTRO[uf].dx;
            cy += AJUSTES_CENTRO[uf].dy;
        }

        if (ESTADOS_EXTERNOS.has(uf)) {
            const idx = externos.findIndex(e => e.path === path);
            const labelY = topo + passo * idx;
            criarRotuloExterno(svg, path, uf, cx, cy, labelY, estados, containerInfo);
        } else {
            const texto = criarTexto(uf, cx, cy, "rotulo-uf rotulo-interno");
            svg.appendChild(texto);
            path.rotulo = [texto];
            vincularHover(path);
        }
    });
}

function criarTexto(uf, x, y, classe) {
    const texto = document.createElementNS(SVG_NS, "text");
    texto.setAttribute("x", x);
    texto.setAttribute("y", y);
    texto.setAttribute("class", classe);
    texto.textContent = uf;
    return texto;
}

function criarRotuloExterno(svg, path, uf, cx, cy, labelY, estados, containerInfo) {
    // Linha do centro do estado até a coluna de rótulos
    const linha = document.createElementNS(SVG_NS, "line");
    linha.setAttribute("x1", cx);
    linha.setAttribute("y1", cy);
    linha.setAttribute("x2", COLUNA_EXTERNA_X - 6);
    linha.setAttribute("y2", labelY);
    linha.setAttribute("class", "rotulo-linha");

    const texto = criarTexto(uf, COLUNA_EXTERNA_X, labelY + 5, "rotulo-uf rotulo-externo");

    svg.appendChild(linha);
    svg.appendChild(texto);

    path.rotulo = [texto, linha];
    vincularHover(path);

    // Hover/clique também a partir do rótulo externo e da linha
    [texto, linha].forEach(el => {
        el.addEventListener("mouseenter", () => realcar(path, true));
        el.addEventListener("mouseleave", () => realcar(path, false));
        el.addEventListener("click", () => selecionarEstado(path, estados, containerInfo));
    });
}

function vincularHover(path) {
    path.addEventListener("mouseenter", () => realcar(path, true));
    path.addEventListener("mouseleave", () => realcar(path, false));
}

function realcar(path, ativo) {
    path.classList.toggle("estado-hover", ativo);

    if (path.rotulo) {
        path.rotulo.forEach(el => el.classList.toggle("rotulo-hover", ativo));
    }
}

// ---------------------------------------------------------------------------
// Painel lateral
// ---------------------------------------------------------------------------

function gerarPainelEstado(uf, nome, container) {
    ultimoEstadoPainel = { uf, nome, container };
    const filmes = filmesPorEstado[uf] || [];
    container.classList.add("visivel");

    // Monta o caminho da imagem dinamicamente baseado na sigla (ex: pr.png)
    const caminhoBandeira = `img/bandeiras/${uf.toLowerCase()}.png`;

    // Resumo compacto no painel lateral quando não há filmes
    if (filmes.length === 0) {
        container.innerHTML = `
            <div class="aviso-card">
                <img src="${caminhoBandeira}" alt="Bandeira de ${nome}" class="bandeira-estado" onerror="this.style.display='none'">
                <h3>${nome} <span class="painel-uf">${uf}</span></h3>
                <p>${t("mapa.semProducoes")}</p>
            </div>
        `;
        ocultarCarrosselEstado();
        return;
    }

    // Painel principal quando há filmes
    container.innerHTML = `
        <div class="painel-estado-header">
            <img src="${caminhoBandeira}" alt="Bandeira de ${nome}" class="bandeira-estado" onerror="this.style.display='none'">
            <div class="painel-estado-info">
                <h3>${nome} <span class="painel-uf">${uf}</span></h3>
                <p class="painel-contagem">${filmes.length} ${filmes.length === 1 ? t("mapa.producaoSing") : t("mapa.producaoPlur")}</p>
                <p class="painel-dica">${t("mapa.dica")}</p>
            </div>
        </div>
    `;

    renderizarCarrosselEstado(nome, filmes);
}

// ---------------------------------------------------------------------------
// Carrossel de filmes do estado (abaixo do mapa)
// ---------------------------------------------------------------------------

function renderizarCarrosselEstado(nome, filmes) {
    const bloco  = document.getElementById("filmes-estado-bloco");
    const titulo = document.getElementById("filmes-estado-titulo");
    const track  = document.getElementById("estado-track");
    if (!bloco || !track) return;

    const LIMITE = 30;
    titulo.textContent = t("mapa.producoesDe").replace("{nome}", nome);
    track.innerHTML = "";

    filmes.slice(0, LIMITE).forEach(filme => {
        const card = criarCardFilme(filme);
        card.classList.add("carrossel-item");
        track.appendChild(card);
    });

    bloco.style.display = "block";
    iniciarDeslizeEstado(track);
    bloco.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function ocultarCarrosselEstado() {
    const bloco = document.getElementById("filmes-estado-bloco");
    if (bloco) bloco.style.display = "none";
}

// Reinicia os listeners do carrossel do zero a cada estado selecionado
function iniciarDeslizeEstado(track) {
    const btnAnt  = document.getElementById("estado-btn-ant");
    const btnProx = document.getElementById("estado-btn-prox");

    // Clona os botões para descartar listeners de seleções anteriores
    const novoAnt  = btnAnt.cloneNode(true);
    const novoProx = btnProx.cloneNode(true);
    btnAnt.replaceWith(novoAnt);
    btnProx.replaceWith(novoProx);

    let posicao = 0;

    novoProx.addEventListener("click", () => {
        const total = track.querySelectorAll(".carrossel-item").length;
        if (posicao < total - 1) {
            posicao++;
            moverTrack(track, posicao, true);
        } else {
            posicao = 0;
            moverTrack(track, posicao, false); // volta ao início sem animar
        }
    });

    novoAnt.addEventListener("click", () => {
        const total = track.querySelectorAll(".carrossel-item").length;
        if (posicao > 0) {
            posicao--;
            moverTrack(track, posicao, true);
        } else {
            posicao = total - 1;
            moverTrack(track, posicao, false);
        }
    });
}

function moverTrack(track, posicao, animar) {
    const item = track.querySelector(".carrossel-item");
    if (!item) return;
    const largura = item.offsetWidth + 20;

    if (animar === false) {
        track.style.transition = "none";
        track.style.transform = `translateX(-${posicao * largura}px)`;
        requestAnimationFrame(() => { track.style.transition = ""; });
    } else {
        track.style.transform = `translateX(-${posicao * largura}px)`;
    }
}

function mostrarEstadoInicial() {
    const container = document.getElementById("info-estado-container");
    container.innerHTML = `
        <div class="aviso-card">
            <h3>Explore o cinema por estado</h3>
            <p>Clique em um estado no mapa para ver as produções daquela região.</p>
        </div>
    `;
    container.classList.add("visivel");
    ocultarCarrosselEstado();
}

document.addEventListener("click", (event) => {
    // Lista de elementos que não devem acionar o reset se clicados
    const clicouNoEstado = event.target.closest(".estado");
    const clicouNoRotulo = event.target.closest(".rotulo-uf");
    const clicouNaLinha = event.target.closest(".rotulo-linha");
    const clicouNoPainel = event.target.closest("#info-estado-container");
    const clicouNoCarrossel = event.target.closest("#filmes-estado-bloco");

    // Se o clique não foi em nenhum desses elementos, reseta o mapa
    if (!clicouNoEstado && !clicouNoRotulo && !clicouNaLinha && !clicouNoPainel && !clicouNoCarrossel) {
        resetarMapa();
    }
});

function resetarMapa() {
    const estados = pathsDosEstados();
    
    // Remove a classe 'ativo' de todos os estados e rótulos
    estados.forEach(e => {
        e.classList.remove("ativo");
        if (e.rotulo) {
            e.rotulo.forEach(el => el.classList.remove("rotulo-ativo"));
        }
    });

    // Chama a função pronta para voltar a mensagem original
    mostrarEstadoInicial(); 
}