document.addEventListener("DOMContentLoaded", () => {
    carregarDestaques();
});

async function carregarDestaques() {
    try {
        const response = await fetch("../data/filmes.json");
        const filmes = await response.json();
        
        const containerPrincipal = document.getElementById("destaques-container");
        if (!containerPrincipal) return;

        containerPrincipal.innerHTML = ""; // Limpa o "Carregando..."

        // Categoria 1: Melhores Avaliados (Nota Ouro)
        const melhoresAvaliados = [...filmes]
            .filter(f => f.avaliacao > 0)
            .sort((a, b) => b.avaliacao - a.avaliacao)
            .slice(0, 10);
        if(melhoresAvaliados.length > 0) criarSecaoCarrossel("Aclamados pela Crítica", melhoresAvaliados, containerPrincipal);

        // Categoria 2: Anos 2000 (Entre 2000 e 2009)
        const anos2000 = filmes.filter(f => f.ano >= 2000 && f.ano <= 2009);
        if(anos2000.length > 0) criarSecaoCarrossel("Clássicos dos Anos 2000", anos2000, containerPrincipal);

        // Categoria 3: Anos 2010 (Entre 2010 e 2019)
        const anos2010 = filmes.filter(f => f.ano >= 2010 && f.ano <= 2019);
        if(anos2010.length > 0) criarSecaoCarrossel("Sucessos da Década de 2010", anos2010, containerPrincipal);

        // Categoria 4: Recentes (2020+)
        const recentes = filmes.filter(f => f.ano >= 2020);
        if(recentes.length > 0) criarSecaoCarrossel("Lançamentos Recentes", recentes, containerPrincipal);

        // Categoria 5: Comédias Brasileiras
        const comedias = filmes.filter(f => f.genero && f.genero.includes("Comédia") && f.avaliacao >= 8);
        if(comedias.length > 0) criarSecaoCarrossel("Para dar Boas Risadas", comedias, containerPrincipal);

    } catch (erro) {
        console.error("Erro ao puxar dados dos destaques:", erro);
        document.getElementById("destaques-container").innerHTML = "<p>Ocorreu um erro ao carregar os filmes.</p>";
    }
}

function criarSecaoCarrossel(titulo, filmesLista, containerPai) {
    // Cria o esqueleto da seção usando as classes CSS globais do carrossel
    const section = document.createElement("section");
    section.className = "carrossel-section";
    
    section.innerHTML = `
        <h2>${titulo}</h2>
        <div class="carrossel-container">
            <button class="carrossel-btn left btn-ant">❮</button>
            <div class="carrossel-janela">
                <div class="carrossel-track"></div>
            </div>
            <button class="carrossel-btn right btn-prox">❯</button>
        </div>
    `;

    const track = section.querySelector(".carrossel-track");
    const btnAnt = section.querySelector(".btn-ant");
    const btnProx = section.querySelector(".btn-prox");

    filmesLista.forEach(filme => {
        const card = criarCardFilme(filme);
        card.classList.add("carrossel-item");
        track.appendChild(card);
    });

    containerPai.appendChild(section);

    iniciarDeslize(track, btnAnt, btnProx);
}

function iniciarDeslize(track, btnAnt, btnProx) {
    let posicaoAtual = 0;

    btnProx.addEventListener("click", () => {
        const totalItens = track.querySelectorAll(".carrossel-item").length;
        if (posicaoAtual < totalItens - 1) { 
            posicaoAtual++;
        } else {
            posicaoAtual = 0; 
        }
        movimentarTrack(track, posicaoAtual);
    });

    btnAnt.addEventListener("click", () => {
        const totalItens = track.querySelectorAll(".carrossel-item").length;
        if (posicaoAtual > 0) {
            posicaoAtual--;
        } else {
            posicaoAtual = totalItens - 1;
        }
        movimentarTrack(track, posicaoAtual);
    });
}

function movimentarTrack(track, posicaoAtual) {
    const item = track.querySelector(".carrossel-item");
    if(!item) return;

    const larguraCard = item.offsetWidth + 20; 
    track.style.transform = `translateX(-${posicaoAtual * larguraCard}px)`;
}

