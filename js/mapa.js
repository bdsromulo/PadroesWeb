let filmesPorEstado = {};

document.addEventListener("DOMContentLoaded", () => {
    inicializarMapa();
});

async function inicializarMapa() {
    try {
        const response = await fetch("../data/filmes.json");
        const filmes = await response.json();
        indexarPorEstado(filmes);
        configurarEstados();
        mostrarEstadoInicial();
    } catch (erro) {
        console.error("Erro ao carregar dados do mapa:", erro);
    }
}

// Agrupa os filmes por UF para lookup rápido no clique
function indexarPorEstado(filmes) {
    filmesPorEstado = {};
    filmes.forEach(filme => {
        if (filme.estado) {
            (filmesPorEstado[filme.estado] ||= []).push(filme);
        }
    });
    // Ordena cada estado pelos melhores avaliados
    Object.values(filmesPorEstado).forEach(lista =>
        lista.sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0))
    );
}

// Os <path> do SVG têm id="BRSP" e name="São Paulo", mas não têm classe.
// Selecionamos pelos ids de 4 letras (BR + UF) e adicionamos a classe/handler.
function configurarEstados() {
    const containerInfo = document.getElementById("info-estado-container");
    const estados = [...document.querySelectorAll('#mapa-brasil-container path[id^="BR"]')]
        .filter(p => p.id.length === 4);

    estados.forEach(path => {
        path.classList.add("estado");
        path.addEventListener("click", function () {
            estados.forEach(e => e.classList.remove("ativo"));
            this.classList.add("ativo");

            const uf   = this.id.slice(2);          // "BRSP" -> "SP"
            const nome = this.getAttribute("name") || uf;
            gerarPainelEstado(uf, nome, containerInfo);
        });
    });
}

function gerarPainelEstado(uf, nome, container) {
    const filmes = filmesPorEstado[uf] || [];
    container.classList.add("visivel");

    if (filmes.length === 0) {
        container.innerHTML = `
            <div class="aviso-card">
                <h3>${nome}</h3>
                <p>Nenhuma produção catalogada para este estado ainda.</p>
            </div>
        `;
        return;
    }

    // Cabeçalho + grid com os primeiros filmes (limita para não renderizar milhares)
    const LIMITE = 12;
    container.innerHTML = `
        <div class="painel-estado-header">
            <h3>${nome} <span class="painel-uf">${uf}</span></h3>
            <p class="painel-contagem">${filmes.length} ${filmes.length === 1 ? "produção" : "produções"}</p>
        </div>
        <div class="painel-grid" id="painel-grid"></div>
    `;

    const grid = container.querySelector("#painel-grid");
    filmes.slice(0, LIMITE).forEach(filme => {
        grid.appendChild(criarCardFilme(filme));
    });
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
}
