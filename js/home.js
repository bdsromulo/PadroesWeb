document.addEventListener("DOMContentLoaded", () => {
    carregarCarrosel();
});

// Define quais filmes você quer mostrar manualmente aqui na lista
const IDs_DOS_FILMES_NO_CARROSSEL = [
    "ainda-estou-aqui",          
    "cidade-de-deus",      
    "o-auto-da-compadecida",
    "central-do-brasil",
    "tropa-de-elite",
    "que-horas-ela-volta"
];

async function carregarCarrosel() {
    try {
        const response = await fetch("../data/filmes.json");
        const filmes = await response.json();
    
        const track = document.getElementById("carrossel-track");
        
        if (!track) return;
    
        // Filtra todos os filmes e pega somente os selecionados da lisra
        const filmesSelecionados = filmes.filter(filme => 
            IDs_DOS_FILMES_NO_CARROSSEL.includes(filme.id)
        );
        
        // Se a lista acima não casar com os nomes dos seus filmes, ele vai pegar os 5 primeiros que achar no JSON
        const filmesParaExibir = filmesSelecionados.length > 0 ? filmesSelecionados : filmes.slice(0, 7);
    
        filmesParaExibir.forEach(filme => {
            const card = criarCardFilme(filme);
            card.classList.add("carrossel-item"); // Garante a classe pro CSS do carrossel funcionar
            track.appendChild(card);
        });
        
        // Iniciar Lógica de Deslizar do Carrossel
        iniciarLogicaDeslizante();

    } catch (erro) {
        console.error("Erro ao puxar dados do carrossel:", erro);
    }
}

function iniciarLogicaDeslizante() {
    const track = document.getElementById("carrossel-track");
    const btnAnt = document.getElementById("btn-ant");
    const btnProx = document.getElementById("btn-prox");
    
    let posicaoAtual = 0;
    
    btnProx.addEventListener("click", () => {
        // Quantos cards foram gerados
        const totalItens = track.querySelectorAll(".carrossel-item").length;
        
        // Se ainda não chegamos no fim, avança 1 
        if (posicaoAtual < totalItens - 1) { 
            posicaoAtual++;
        } else {
            posicaoAtual = 0; // Se estiver no fim, volta pro começo
        }
        atualizarCarrossel(track, posicaoAtual);
    });
    
    btnAnt.addEventListener("click", () => {
        const totalItens = track.querySelectorAll(".carrossel-item").length;
        
        if (posicaoAtual > 0) {
            posicaoAtual--;
        } else {
            posicaoAtual = totalItens - 1; // Se estiver no início, vai pro último
        }
        atualizarCarrossel(track, posicaoAtual);
    });
}

function atualizarCarrossel(track, posicaoAtual) {
    // Calculamos a largura do primeiro item 
    const item = track.querySelector(".carrossel-item");
    // pega toda a largura + a distância de gap 
    const larguraCard = item.offsetWidth + 20; 
    
    // Empurra pro lado X pixels
    track.style.transform = `translateX(-${posicaoAtual * larguraCard}px)`;
}

