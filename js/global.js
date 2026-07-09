"use strict";

// Gerenciamento de Tema (Dark Mode / Light Mode)
(function inicializarTema() {
    const temaSalvo = localStorage.getItem("cinebrasilis_tema");
    const prefereEscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const temaInicial = temaSalvo || (prefereEscuro ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", temaInicial);
})();

function atualizarIconeBotaoTema() {
    const btn = document.getElementById("btn-tema");
    if (!btn) return;
    const temaAtual = document.documentElement.getAttribute("data-theme");
    btn.innerHTML = temaAtual === "dark" ? "☀️ <span>Claro</span>" : "🌙 <span>Escuro</span>";
    btn.setAttribute("title", temaAtual === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro");
}

function alternarTema() {
    const temaAtual = document.documentElement.getAttribute("data-theme");
    const novoTema = temaAtual === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", novoTema);
    localStorage.setItem("cinebrasilis_tema", novoTema);
    atualizarIconeBotaoTema();
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarIconeBotaoTema();
    const btn = document.getElementById("btn-tema");
    if (btn) {
        btn.addEventListener("click", alternarTema);
    }
});

// Funções Globais reaproveitadas em várias páginas

/**
 * Cria um elemento HTML representando um Card de Filme.
 * Pode ser usado tanto no Catálogo quanto nos Carrosséis (Home e Destaques).
 */
function criarCardFilme(filme) {
    const card = document.createElement("div");
    card.className = "filme-card";
    
    const imageUrl = filme.poster_url || "../img/sem-poster.svg";

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
            <img src="${imageUrl}" alt="Pôster do filme ${filme.titulo}" class="filme-poster" loading="lazy" onerror="this.onerror=null;this.src='../img/sem-poster.svg';">
        </div>
        <div class="filme-info">
            <h3 class="filme-titulo">${filme.titulo}</h3>
            <p class="filme-detalhes">
                <span class="filme-ano">${filme.ano}</span>
                ${filme.diretor ? `• <span class="filme-diretor">${filme.diretor}</span>` : ""}
            </p>
            <p class="filme-generos">${filme.genero ? filme.genero.join(", ") : ""}</p>
            <p class="filme-meta-card">${avaliacao}${duracao}</p>
        </div>
    `;
    
    // Adiciona interatividade para ir até a página de Detalhes.
    // Usa o tmdb_id (único) para evitar ambiguidade entre filmes de mesmo título.
    card.addEventListener("click", () => {
        const identificador = filme.tmdb_id || filme.id;
        window.location.href = `detalhes.html?id=${identificador}`;
    });
    
    return card;
}