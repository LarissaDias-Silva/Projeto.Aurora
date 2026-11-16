// mesma coisa do simulador html, so que esse aqui é o javascript ne

const mensagem = document.getElementById('mensagem');

const referencia = {
    r: 1200,
    g: 950,
    b: 700,
    c: 3000
};

// Enviar calibração
document.getElementById('calibrar').addEventListener('click', async () => {
    try {
        const resposta = await fetch('/api/calibracao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(referencia)
        });

        const dados = await resposta.json();

        mensagem.textContent = dados.mensagem || 'Calibração enviada com sucesso!';
    } catch (erro) {
        mensagem.textContent = 'Erro ao enviar calibração.';
    }
});

// Enviar amostra
async function enviarAmostra(valores, status) {
    try {
        const resposta = await fetch('/api/teste', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...valores,
                status: status
            })
        });

        const dados = await resposta.json();

        mensagem.textContent = dados.mensagem || 'Amostra enviada com sucesso!';
    } catch (erro) {
        mensagem.textContent = 'Erro ao enviar amostra.';
    }
}

// Amostra compatível
document.getElementById('compativel').addEventListener('click', () => {
    enviarAmostra({
        r: 1240,
        g: 930,
        b: 710,
        c: 3050
    }, 'COMPATIVEL');
});

// Amostra suspeita
document.getElementById('suspeita').addEventListener('click', () => {
    enviarAmostra({
        r: 1800,
        g: 500,
        b: 1200,
        c: 4500
    }, 'SUSPEITA');
});