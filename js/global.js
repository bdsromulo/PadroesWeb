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
// Cafezinho — pílula de contribuição via PIX
//
// Injetada aqui, e não no HTML, para não repetir o mesmo bloco nas sete
// páginas. Fica só em português: o atributo data-idioma esconde tudo no modo
// EN pelo CSS, partindo do princípio de que quem lê em inglês não usa PIX.

// Mesma string do QR (img/pix-qr.svg é gerado a partir dela por
// scripts/gerar_qr_pix.py). Se uma mudar, a outra precisa mudar junto.
const PIX_PAYLOAD = "00020101021126580014br.gov.bcb.pix013644a67e70-cbbd-4c38-b2de-1e4c5b4cb7975204000053039865802BR5917ROMULO B DA SILVA6008CURITIBA62070503***63046CD8";

// sessionStorage (e não localStorage, como tema/idioma): quem fecha não vê de
// novo enquanto navega, mas a pílula volta numa próxima visita.
const CAFEZINHO_OCULTO = "cinebrasilis_cafezinho_oculto";

const CAFEZINHO_ICONE = `
    <svg class="cafezinho-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9.6 2.8c-.7.9-.7 1.7 0 2.6M13.4 2.4c-.7.9-.7 1.7 0 2.6"
              fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M7.4 11.2h9.2l-.6 4.4H8z" fill="currentColor" opacity=".8"/>
        <path d="M6.2 7.6h11.6l-1.5 12.3a1.7 1.7 0 0 1-1.7 1.5H9.4a1.7 1.7 0 0 1-1.7-1.5z"
              fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M10.3 12.4 9.8 21M13.7 12.4l.5 8.6"
              fill="none" stroke="currentColor" stroke-width=".9" opacity=".45"/>
    </svg>`;

function copiarChavePix(botao) {
    const original = t("cafe.copiar");
    navigator.clipboard.writeText(PIX_PAYLOAD).then(() => {
        botao.textContent = t("cafe.copiado");
        setTimeout(() => { botao.textContent = original; }, 2000);
    }).catch(() => {
        botao.textContent = t("cafe.copiarFalhou");
        setTimeout(() => { botao.textContent = original; }, 2000);
    });
}

function montarCafezinho() {
    if (sessionStorage.getItem(CAFEZINHO_OCULTO) === "1") return;

    const caixa = document.createElement("aside");
    caixa.className = "cafezinho";
    caixa.setAttribute("aria-label", "Contribuição");
    caixa.innerHTML = `
        <div class="cafezinho-painel" id="cafezinho-painel" hidden>
            <h2 data-i18n="cafe.titulo">Me pague um cafezinho</h2>
            <p class="cafezinho-texto" data-i18n="cafe.texto"></p>
            <!-- Sem loading="lazy": o painel nasce hidden, e o navegador nunca
                 dispara o lazy-load de imagem em container escondido — o QR
                 ficaria em branco justamente para quem abrisse o painel. -->
            <img class="cafezinho-qr" src="img/pix-qr.svg" width="168" height="168"
                 alt="QR Code PIX do Cine Brasilis">
            <p class="cafezinho-chave-label" data-i18n="cafe.chaveLabel">Chave PIX (copia e cola)</p>
            <div class="cafezinho-chave">
                <code title="${PIX_PAYLOAD}">${PIX_PAYLOAD}</code>
                <button type="button" class="cafezinho-copiar" data-i18n="cafe.copiar">Copiar</button>
            </div>
        </div>
        <button type="button" class="cafezinho-abrir" aria-expanded="false" aria-controls="cafezinho-painel">
            ${CAFEZINHO_ICONE}
            <span data-i18n="cafe.pilula">Me pague um cafezinho</span>
        </button>
        <button type="button" class="cafezinho-fechar" data-i18n-titulo="cafe.ocultar">&times;</button>`;
    document.body.appendChild(caixa);

    const painel = caixa.querySelector(".cafezinho-painel");
    const abrir = caixa.querySelector(".cafezinho-abrir");
    const fechar = caixa.querySelector(".cafezinho-fechar");

    // Mesmo texto do <span> visível, para leitor de tela e WCAG "label in name".
    abrir.setAttribute("aria-label", t("cafe.pilula"));
    fechar.setAttribute("aria-label", t("cafe.ocultar"));
    fechar.setAttribute("title", t("cafe.ocultar"));

    function alternarPainel(mostrar) {
        painel.hidden = !mostrar;
        abrir.setAttribute("aria-expanded", String(mostrar));
    }

    abrir.addEventListener("click", () => alternarPainel(painel.hidden));

    fechar.addEventListener("click", () => {
        caixa.remove();
        sessionStorage.setItem(CAFEZINHO_OCULTO, "1");
    });

    caixa.querySelector(".cafezinho-copiar").addEventListener("click", function () {
        copiarChavePix(this);
    });

    // Clicar fora ou apertar Esc fecha o painel, mas mantém a pílula: só o ×
    // dispensa de vez.
    document.addEventListener("click", (evento) => {
        if (!painel.hidden && !caixa.contains(evento.target)) alternarPainel(false);
    });
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && !painel.hidden) {
            alternarPainel(false);
            abrir.focus();
        }
    });

    if (typeof traduzirPagina === "function") traduzirPagina(caixa);
}

// A seção equivalente na página Sobre já vem no HTML: aqui só liga o copiar.
function ligarCafezinhoSobre() {
    const botao = document.getElementById("cafezinho-copiar-sobre");
    if (botao) botao.addEventListener("click", () => copiarChavePix(botao));
}

document.addEventListener("DOMContentLoaded", () => {
    montarCafezinho();
    ligarCafezinhoSobre();
});
