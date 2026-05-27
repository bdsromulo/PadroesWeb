document.addEventListener("DOMContentLoaded", () => {
    const estados = document.querySelectorAll(".estado");
    const containerInfo = document.getElementById("info-estado-container");

    estados.forEach(estado => {
        estado.addEventListener("click", function() {
            // Remove o destaque do estado selecionado anteriormente
            estados.forEach(e => e.classList.remove("ativo"));
            
            // Destaca o estado que foi clicado agora
            this.classList.add("ativo");

            // Pega o ID do estado (ex: "BRRS", "BRSP")
            const idEstado = this.id;
            
            // Chama a função para desenhar o card na tela
            gerarCardEstado(idEstado, containerInfo);
        });
    });
});

function gerarCardEstado(idEstado, container) {
    // Exemplo de banco de dados simulado
    const bancoFilmes = {
        "BRRS": { nome: "Rio Grande do Sul", titulo: "O Tempo e o Vento", ano: 2013, diretor: "Jayme Monjardim", poster: "https://via.placeholder.com/300x450?text=O+Tempo+e+o+Vento" },
        "BRSP": { nome: "São Paulo", titulo: "O Ano em que Meus Pais Saíram de Férias", ano: 2006, diretor: "Cao Hamburger", poster: "https://via.placeholder.com/300x450?text=O+Ano+em+que..." },
        "BRMG": { nome: "Minas Gerais", titulo: "O Menino no Espelho", ano: 2014, diretor: "Guilherme Fiúza", poster: "https://image.tmdb.org/t/p/w500/l3inJ0LKrccEK5mNqQzmJlGjLPy.jpg" }
    };

    const dados = bancoFilmes[idEstado];

    if (dados) {
        // Renderiza o card com o filme do estado selecionado
        container.innerHTML = `
            <div class="filme-card">
                <div class="filme-poster-container">
                    <img src="${dados.poster}" alt="Pôster do filme" class="filme-poster" loading="lazy">
                </div>
                <div class="filme-info">
                    <span class="regiao-tag">${dados.nome}</span>
                    <h3 class="filme-titulo">${dados.titulo}</h3>
                    <p class="filme-detalhes">
                        <span class="filme-ano">${dados.ano}</span> • <span class="filme-diretor">${dados.diretor}</span>
                    </p>
                </div>
            </div>
        `;
    } else {
        // Fallback caso clique em um estado sem filmes mapeados ainda
        container.innerHTML = `
            <div class="aviso-card">
                <h3>Estado: ${idEstado}</h3>
                <p>Nenhuma produção cadastrada para esta região ainda. Explore outros estados!</p>
            </div>
        `;
    }
}