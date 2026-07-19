"use strict";

let filmeAtual = null;
let SINOPSES_EN = null;   // cache do arquivo de sinopses em inglês (carregado sob demanda)

document.addEventListener("DOMContentLoaded", () => {
    carregarDetalhesFilme();
});

// Carrega (uma vez) o arquivo apartado de sinopses em inglês
async function carregarSinopsesEn() {
    if (SINOPSES_EN) return SINOPSES_EN;
    try {
        const r = await fetch("data/sinopses_en.json");
        SINOPSES_EN = r.ok ? await r.json() : {};
    } catch (e) {
        SINOPSES_EN = {};
    }
    return SINOPSES_EN;
}

async function carregarDetalhesFilme() {
    const urlParams = new URLSearchParams(window.location.search);
    const filmeId = urlParams.get("id");

    if (!filmeId) {
        exibirErro("Nenhum filme especificado na URL.");
        return;
    }

    try {
        const response = await fetch("data/filmes.json");
        const filmes = await response.json();

        // Busca pelo tmdb_id (único). Mantém o slug como fallback para links antigos.
        const filme = filmes.find(f => String(f.tmdb_id) === filmeId)
            || filmes.find(f => f.id === filmeId);

        if (!filme) {
            exibirErro("Filme não encontrado.");
            return;
        }

        filmeAtual = filme;
        if (idiomaAtual() === "en") await carregarSinopsesEn();
        preencherPagina(filme);

        // Ao trocar de idioma, recarrega EN (se preciso) e re-renderiza
        window.aoTrocarIdioma = async () => {
            if (idiomaAtual() === "en") await carregarSinopsesEn();
            if (filmeAtual) preencherPagina(filmeAtual);
        };
    } catch (error) {
        console.error("Erro ao carregar detalhes do filme:", error);
        exibirErro("Erro ao carregar os dados do filme.");
    }
}

function preencherPagina(filme) {
    document.title = `${filme.titulo} - Cine Brasilis`;

    const en = idiomaAtual() === "en";
    const locale = en ? "en-US" : "pt-BR";
    const naoInfo = t("det.naoInformado");

    // Sinopse: em inglês usa o arquivo apartado; se não houver, cai no PT (paciência)
    let sinopse = filme.sinopse || "";
    if (en && SINOPSES_EN) {
        const enOv = SINOPSES_EN[String(filme.tmdb_id)];
        if (enOv) sinopse = enOv;
    }

    // Textos simples
    document.getElementById("titulo").textContent        = filme.titulo        || naoInfo;
    document.getElementById("ano").textContent           = filme.ano           || "";
    document.getElementById("diretor").textContent       = filme.diretor       || naoInfo;
    document.getElementById("produtora").textContent     = filme.produtora     || naoInfo;
    document.getElementById("regiao").textContent        = filme.regiao        || naoInfo;
    document.getElementById("estado").textContent        = filme.estado        || naoInfo;
    document.getElementById("sinopse").textContent       = sinopse             || t("det.semSinopse");
    document.getElementById("data-lancamento").textContent = filme.data_lancamento
        ? new Date(filme.data_lancamento).toLocaleDateString(locale) : naoInfo;

    // Duração
    const duracaoEl = document.getElementById("duracao");
    if (duracaoEl) {
        duracaoEl.textContent = filme.duracao ? `${filme.duracao} ${t("det.min")}` : "";
    }

    // Classificação indicativa
    const classEl = document.getElementById("classificacao");
    if (classEl) {
        classEl.textContent = filme.classificacao || "";
    }

    // Avaliação + contagem de votos
    const avaliacaoEl = document.getElementById("avaliacao");
    if (avaliacaoEl) {
        avaliacaoEl.textContent = filme.avaliacao ? `★ ${filme.avaliacao}/10` : t("det.semAvaliacao");
    }
    const voteEl = document.getElementById("vote-count");
    if (voteEl) {
        voteEl.textContent = filme.vote_count
            ? `(${filme.vote_count.toLocaleString(locale)} ${t("det.votos")})` : "";
    }

    // Link IMDB
    const imdbRow  = document.getElementById("imdb-row");
    const imdbLink = document.getElementById("imdb-link");
    if (imdbRow && imdbLink) {
        if (filme.imdb_id) {
            imdbLink.href = `https://www.imdb.com/title/${filme.imdb_id}/`;
            imdbLink.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg" alt="Ver no IMDB" class="imdb-logo">`;
            imdbRow.style.display = "";
        } else {
            imdbRow.style.display = "none";
        }
    }

    // Link Letterboxd (gerado do tmdb_id: letterboxd.com/tmdb/{id} redireciona para o filme)
    const lbRow  = document.getElementById("letterboxd-row");
    const lbLink = document.getElementById("letterboxd-link");
    if (lbRow && lbLink) {
        if (filme.tmdb_id) {
            lbLink.href = `https://letterboxd.com/tmdb/${filme.tmdb_id}`;
            lbLink.innerHTML = `<img src="img/logo_letterboxd.svg" alt="Ver no Letterboxd" class="letterboxd-logo">`;
            lbRow.style.display = "";
        } else {
            lbRow.style.display = "none";
        }
    }

    // Poster
    const posterEl = document.getElementById("poster");
    if (posterEl) {
        posterEl.src    = filme.poster_url || "img/sem-poster.svg";
        posterEl.alt    = `Pôster do filme ${filme.titulo}`;
        posterEl.onerror = function () { this.onerror = null; this.src = "img/sem-poster.svg"; };
    }

    // Backdrop como banner acima do conteúdo
    const backdropEl = document.getElementById("backdrop-banner");
    if (backdropEl) {
        if (filme.backdrop_url) {
            backdropEl.style.backgroundImage = `url('${filme.backdrop_url}')`;
            backdropEl.style.display = "block";
            backdropEl.style.cursor = "zoom-in";
            backdropEl.addEventListener("click", () => abrirLightbox(filme.backdrop_url));
        } else {
            backdropEl.style.display = "none";
        }
    }

    // Listas
    preencherLista("genero",  traduzirGeneros(filme.genero));
    preencherLista("elenco",  filme.elenco);
    // Onde Assistir (YouTube grátis + providers TMDB/JustWatch)
    preencherOndeAssistir(filme);

    // Prêmios: a seção só aparece quando o filme realmente tem prêmios
    const premiosLista = document.getElementById("premios");
    if (premiosLista) {
        const secaoPremios = premiosLista.closest(".filme-secao");
        if (filme.premios && filme.premios.length > 0) {
            preencherLista("premios", filme.premios);
            if (secaoPremios) secaoPremios.style.display = "";
        } else if (secaoPremios) {
            secaoPremios.style.display = "none";
        }
    }
    preencherTags(filme.tags);

    // Trailer
    const trailerEl = document.getElementById("trailer");
    if (trailerEl) {
        if (filme.trailer) {
            let linkEmbed = filme.trailer;
            if (linkEmbed.includes("watch?v=")) {
                linkEmbed = linkEmbed.replace("watch?v=", "embed/");
            }
            trailerEl.src = linkEmbed;
            trailerEl.closest(".filme-secao").style.display = "block";
        } else {
            trailerEl.closest(".filme-secao").style.display = "none";
        }
    }
}

function abrirLightbox(url) {
    const lightbox = document.getElementById("lightbox");
    const img      = document.getElementById("lightbox-img");
    img.src        = url;
    lightbox.classList.add("lightbox--ativo");
}

function fecharLightbox() {
    const lightbox = document.getElementById("lightbox");
    lightbox.classList.remove("lightbox--ativo");
}

document.addEventListener("DOMContentLoaded", () => {
    const lightbox = document.getElementById("lightbox");
    if (lightbox) {
        lightbox.addEventListener("click", fecharLightbox);
    }
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") fecharLightbox();
    });
});

function preencherTags(tags) {
    const container = document.getElementById("tags");
    if (!container) return;
    container.innerHTML = "";
    if (tags && tags.length > 0) {
        tags.forEach(tag => {
            const span = document.createElement("span");
            span.className = "tag-chip";
            span.textContent = tag;
            container.appendChild(span);
        });
    } else {
        container.innerHTML = `<span class='detalhe-vazio'>${t("det.semTags")}</span>`;
    }
}

// Função auxiliar para preencher ULs com LIs
const LOGO_PROVIDER_BASE = "https://image.tmdb.org/t/p/w92";

function criarGrupoProviders(rotulo, provedores) {
    const grupo = document.createElement("div");
    grupo.className = "oa-grupo";

    const titulo = document.createElement("h3");
    titulo.className = "oa-grupo-titulo";
    titulo.textContent = rotulo;
    grupo.appendChild(titulo);

    const lista = document.createElement("ul");
    lista.className = "oa-lista";
    provedores.forEach(p => {
        const li = document.createElement("li");
        li.className = "oa-provider";
        li.title = p.nome;

        // Fonte da logo: caminho local (asset próprio) ou path do TMDB
        const src = p.logoLocal || (p.logo ? `${LOGO_PROVIDER_BASE}${p.logo}` : "");
        let conteudo;
        if (src) {
            conteudo = document.createElement("img");
            conteudo.src = src;
            conteudo.alt = p.nome;
            conteudo.loading = "lazy";
        } else {
            conteudo = document.createTextNode(p.nome);
        }

        // Provider com link direto (ex.: YouTube grátis) fica clicável
        if (p.url) {
            const a = document.createElement("a");
            a.href = p.url;
            a.target = "_blank";
            a.rel = "noopener";
            a.setAttribute("aria-label", p.nome);
            a.appendChild(conteudo);
            li.appendChild(a);
        } else {
            li.appendChild(conteudo);
        }
        lista.appendChild(li);
    });
    grupo.appendChild(lista);
    return grupo;
}

function preencherOndeAssistir(filme) {
    const secao     = document.getElementById("secao-onde-assistir");
    const container = document.getElementById("onde-assistir");
    if (!secao || !container) return;

    container.innerHTML = "";
    const oa = filme.onde_assistir || {};
    let temConteudo = false;

    // Vídeo completo mapeado no YouTube entra como provider gratuito clicável
    const gratis = (oa.free || []).concat(oa.ads || []);
    if (filme.youtube_gratis) {
        gratis.unshift({
            nome: "YouTube",
            logoLocal: "img/logo_youtube.svg",
            url: filme.youtube_gratis
        });
    }

    // Grupos de providers (dados JustWatch via TMDB)
    const grupos = [
        [t("det.oaStreaming"), oa.flatrate || []],
        [t("det.oaGratis"),    gratis],
        [t("det.oaAlugar"),    oa.rent || []],
        [t("det.oaComprar"),   oa.buy || []]
    ];
    let temProviders = false;
    grupos.forEach(([rotulo, provedores]) => {
        if (provedores.length > 0) {
            container.appendChild(criarGrupoProviders(rotulo, provedores));
            temProviders = true;
            temConteudo = true;
        }
    });

    // Sem nenhuma opção de onde assistir: mostra o estado vazio (pipoca triste)
    if (!temConteudo) {
        const vazio = document.createElement("div");
        vazio.className = "oa-vazio";
        vazio.innerHTML =
            '<span class="oa-vazio-icone" aria-hidden="true">🍿😢</span>' +
            `<p class="oa-vazio-texto">${t("det.oaVazio")}</p>`;
        container.appendChild(vazio);
    }

    // Botão de busca no YouTube: sempre disponível (identidade do YouTube)
    const busca = document.createElement("a");
    busca.className = "oa-youtube-btn";
    busca.href = "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(`"${filme.titulo}" FILME COMPLETO`);
    busca.target = "_blank";
    busca.rel = "noopener";
    busca.innerHTML =
        '<img src="img/logo_youtube.svg" alt="" class="oa-youtube-btn-icone">' +
        `<span>${t("det.oaBuscarYoutube")}</span>`;
    container.appendChild(busca);

    // Atribuição JustWatch: obrigatória sempre que os providers aparecem
    const fonte = document.getElementById("onde-assistir-fonte");
    if (fonte) {
        fonte.style.display = temProviders ? "" : "none";
        const linkJw = document.getElementById("justwatch-link");
        if (linkJw && oa.link) linkJw.href = oa.link;
    }

    // A seção "Onde Assistir" fica sempre visível
    secao.style.display = "";
}

function preencherLista(elementoId, arrayDeItems) {
    const lista = document.getElementById(elementoId);
    if (!lista) return;

    lista.innerHTML = ""; // Limpa itens antigos
    
    if (arrayDeItems && arrayDeItems.length > 0) {
        arrayDeItems.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            lista.appendChild(li);
        });
    } else {
        const li = document.createElement("li");
        li.textContent = t("det.infoIndisponivel");
        lista.appendChild(li);
    }
}

function exibirErro(mensagem) {
    const container = document.querySelector(".detalhes-container");
    if (container) {
        container.innerHTML = `<h2>Oops!</h2><p>${mensagem}</p><a href="catalogo">Voltar ao catálogo</a>`;
    }
}