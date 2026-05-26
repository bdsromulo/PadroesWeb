// Funções Globais reaproveitadas em várias páginas

/**
 * Cria um elemento HTML representando um Card de Filme.
 * Pode ser usado tanto no Catálogo quanto nos Carrosséis (Home e Destaques).
 */
function criarCardFilme(filme) {
    const card = document.createElement("div");
    card.className = "filme-card";
    
    // Usa a poster_url do JSON, garantindo um fallback se não houver
    const imageUrl = filme.poster_url || "https://via.placeholder.com/300x450?text=Sem+Poster";
    
    // Criação dos elementos internos do card
    card.innerHTML = `
        <div class="filme-poster-container">
            <img src="${imageUrl}" alt="Pôster do filme ${filme.titulo}" class="filme-poster" loading="lazy">
        </div>
        <div class="filme-info">
            <h3 class="filme-titulo">${filme.titulo}</h3>
            <p class="filme-detalhes">
                <span class="filme-ano">${filme.ano}</span> 
                ${filme.diretor ? `• <span class="filme-diretor">${filme.diretor}</span>` : ""}
            </p>
            <p class="filme-generos">${filme.genero ? filme.genero.join(", ") : ""}</p>
        </div>
    `;
    
    // Adiciona interatividade para ir até a página de Detalhes
    card.addEventListener("click", () => {
        // Assume que a maioria das páginas está na pasta /pages/
        window.location.href = `detalhes.html?id=${filme.id}`;
    });
    
    return card;
}