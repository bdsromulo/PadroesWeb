document.addEventListener("DOMContentLoaded", () => {
    carregarFilmes();
});

async function carregarFilmes() {
    try {
        // Caminho relativo à pasta js a partir da pasta pages
        const response = await fetch("../data/filmes.json");
        const filmes = await response.json();
        
        const grid = document.getElementById("catalogo-grid");
        if (grid) {
            filmes.forEach(filme => {
                grid.appendChild(criarCardFilme(filme));
            });
        }
    } catch (error) {
        console.error("Erro ao carregar filmes:", error);
    }
}

