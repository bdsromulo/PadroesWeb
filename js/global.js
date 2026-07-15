"use strict";

// Gerenciamento de Tema (Dark Mode / Light Mode)
(function inicializarTema() {
    const temaSalvo = localStorage.getItem("cinebrasilis_tema");
    const prefereEscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const temaInicial = temaSalvo || (prefereEscuro ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", temaInicial);
})();

// Marca no switch qual tema está ativo (destaca a opção correspondente)
function atualizarSwitchTema() {
    const temaAtual = document.documentElement.getAttribute("data-theme");
    document.querySelectorAll(".tema-opcao").forEach((opcao) => {
        const ativo = opcao.dataset.tema === temaAtual;
        opcao.classList.toggle("ativo", ativo);
        opcao.setAttribute("aria-pressed", String(ativo));
    });
}

function definirTema(novoTema) {
    if (novoTema !== "dark" && novoTema !== "light") return;
    document.documentElement.setAttribute("data-theme", novoTema);
    localStorage.setItem("cinebrasilis_tema", novoTema);
    atualizarSwitchTema();
}

// Gerenciamento de Idioma (PT / EN)
(function inicializarIdioma() {
    const salvo = localStorage.getItem("cinebrasilis_idioma");
    document.documentElement.setAttribute("data-idioma", salvo === "en" ? "en" : "pt");
})();

function atualizarSwitchIdioma() {
    const atual = idiomaAtual();
    document.querySelectorAll(".idioma-opcao").forEach((opcao) => {
        const ativo = opcao.dataset.idioma === atual;
        opcao.classList.toggle("ativo", ativo);
        opcao.setAttribute("aria-pressed", String(ativo));
    });
}

function definirIdioma(novo) {
    if (novo !== "pt" && novo !== "en") return;
    document.documentElement.setAttribute("data-idioma", novo);
    localStorage.setItem("cinebrasilis_idioma", novo);
    atualizarSwitchIdioma();
    traduzirPagina();
    // Cada página pode reagir (re-renderizar conteúdo dinâmico)
    if (typeof window.aoTrocarIdioma === "function") window.aoTrocarIdioma();
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarSwitchTema();
    document.querySelectorAll(".tema-opcao").forEach((opcao) => {
        opcao.addEventListener("click", () => definirTema(opcao.dataset.tema));
    });

    // Idioma: traduz estáticos e liga o switch
    if (typeof traduzirPagina === "function") traduzirPagina();
    atualizarSwitchIdioma();
    document.querySelectorAll(".idioma-opcao").forEach((opcao) => {
        opcao.addEventListener("click", () => definirIdioma(opcao.dataset.idioma));
    });
});

// Funções Globais reaproveitadas em várias páginas

/**
 * Cria um elemento HTML representando um Card de Filme.
 * Pode ser usado tanto no Catálogo quanto nos Carrosséis (Home e Destaques).
 */
function criarCardFilme(filme) {
    const card = document.createElement("div");
    card.className = "filme-card";
    
    const imageUrl = filme.poster_url || "img/sem-poster.svg";

    // Avaliação e duração (só exibe se houver dado)
    const avaliacao = filme.avaliacao
        ? `<span class="filme-avaliacao">★ ${filme.avaliacao}</span>`
        : "";
    const duracao = filme.duracao
        ? `<span class="filme-duracao">${filme.duracao} min</span>`
        : "";

    // Criação dos elementos internos do card
    card.innerHTML = `
        <div class="filme-poster-container">
            <img src="${imageUrl}" alt="Pôster do filme ${filme.titulo}" class="filme-poster" loading="lazy" onerror="this.onerror=null;this.src='img/sem-poster.svg';">
        </div>
        <div class="filme-info">
            <h3 class="filme-titulo">${filme.titulo}</h3>
            <p class="filme-detalhes">
                <span class="filme-ano">${filme.ano}</span>
                ${filme.diretor ? `• <span class="filme-diretor">${filme.diretor}</span>` : ""}
            </p>
            <p class="filme-generos">${filme.genero ? traduzirGeneros(filme.genero).join(", ") : ""}</p>
            <p class="filme-meta-card">${avaliacao}${duracao}</p>
        </div>
    `;
    
    // Adiciona interatividade para ir até a página de Detalhes.
    // Usa o tmdb_id (único) para evitar ambiguidade entre filmes de mesmo título.
    card.addEventListener("click", () => {
        const identificador = filme.tmdb_id || filme.id;
        window.location.href = `detalhes?id=${identificador}`;
    });
    
    return card;
}