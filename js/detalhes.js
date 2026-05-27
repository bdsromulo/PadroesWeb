document.addEventListener("DOMContentLoaded", () => {
    carregarDetalhesFilme();
});

async function carregarDetalhesFilme() {
    // Pegar o ID do filme da URL ex: detalhes.html?id=a-aventura-mistica-de-gi-x
    const urlParams = new URLSearchParams(window.location.search);
    const filmeId = urlParams.get("id");

    if (!filmeId) {
        exibirErro("Nenhum filme especificado na URL.");
        return;
    }

    try {
        const response = await fetch("../data/filmes.json");
        const filmes = await response.json();
        
        // Busca o filme pelo ID
        const filme = filmes.find(f => f.id === filmeId);

        if (!filme) {
            exibirErro("Filme não encontrado.");
            return;
        }

        preencherPagina(filme);
    } catch (error) {
        console.error("Erro ao carregar detalhes do filme:", error);
        exibirErro("Erro ao carregar os dados do filme.");
    }
}

function preencherPagina(filme) {
    // Preenchendo textos simples
    document.title = `${filme.titulo} - Cine Brasilis`;
    document.getElementById("titulo").textContent = filme.titulo || "Título indisponível";
    document.getElementById("ano").textContent = filme.ano || "";
    document.getElementById("diretor").textContent = filme.diretor || "Não informado";
    document.getElementById("produtora").textContent = filme.produtora || "Não informada";
    document.getElementById("regiao").textContent = filme.regiao || "Não informada";
    document.getElementById("estado").textContent = filme.estado || "Não informado";
    document.getElementById("sinopse").textContent = filme.sinopse || "Sem sinopse no momento.";
    
    // Configurando Imagem (Poster)
    const posterEl = document.getElementById("poster");
    if (posterEl) {
        posterEl.src = filme.poster_url || "https://via.placeholder.com/300x450?text=Sem+Poster";
        posterEl.alt = `Pôster do filme ${filme.titulo}`;
    }

    // Avaliação
    const avaliacaoEl = document.getElementById("avaliacao");
    if (avaliacaoEl) {
        avaliacaoEl.textContent = filme.avaliacao ? `★ ${filme.avaliacao}/10` : "Sem avaliação";
    }

    // Injetando listas (Generos, Elenco, Prêmios)
    preencherLista("genero", filme.genero);
    preencherLista("elenco", filme.elenco);
    preencherLista("premios", filme.premios);

    // Injetando Trailer (se houver)
    const trailerEl = document.getElementById("trailer");
    if (trailerEl) {
        if (filme.trailer) {
            // Se for do youtube no formato youtube.com/watch?v=, precisa converter para youtube.com/embed/
            let linkEmbed = filme.trailer;
            if(linkEmbed.includes("watch?v=")) {
                linkEmbed = linkEmbed.replace("watch?v=", "embed/");
            }
            trailerEl.src = linkEmbed;
            
            // Garante que a seção esteja visível se houver trailer
            trailerEl.closest(".filme-secao").style.display = "block";
        } else {
            // Esconde toda a seção do trailer se não houver vídeo
            trailerEl.closest(".filme-secao").style.display = "none";
        }
    }
}

// Função auxiliar para preencher ULs com LIs
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
        li.textContent = "Informação não disponível";
        lista.appendChild(li);
    }
}

function exibirErro(mensagem) {
    const container = document.querySelector(".detalhes-container");
    if (container) {
        container.innerHTML = `<h2>Oops!</h2><p>${mensagem}</p><a href="catalogo.html">Voltar ao catálogo</a>`;
    }
}