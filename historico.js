// Script do historico, ele se refere ao historico.html

const corpoHistorico = document.getElementById('corpoHistorico');
const mensagemHistorico = document.getElementById('mensagemHistorico');
const totalRegistros = document.getElementById('totalRegistros');
const atualizarHistorico = document.getElementById('atualizarHistorico');

// Formata os valores numéricos
function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        maximumFractionDigits: 1
    });
}

// Formata a data
function formatarData(data) {
    const dataFormatada = new Date(data.replace(' ', 'T') + 'Z');

    return dataFormatada.toLocaleString('pt-BR');
}

// Busca o historico no servidor

async function carregarHistorico() {

    try {
        const resposta = await fetch('/api/historico');

        if (!resposta.ok) {
            throw new Error('Erro ao buscar histórico.');
        }

        const registros = await resposta.json();
        totalRegistros.textContent = registros.length;

        corpoHistorico.innerHTML = '';

        if (registros.length === 0) {
            corpoHistorico.innerHTML = `
                <tr>
                    <td colspan="7" class="has-text-centered">
                        Nenhum registro encontrado.
                    </td>
                </tr>
            `;
            return;
        }

        registros.forEach(registro => {
            const linha = document.createElement('tr');

            if (registro.status === 'COMPATIVEL' || registro.status === 'COMPATÍVEL') {
                linha.classList.add('is-success');
            }

            if (registro.status === 'SUSPEITA') {
                linha.classList.add('is-danger');
            }

            if (registro.tipo === 'Referencia') {
                linha.classList.add('is-info');
            }

            linha.innerHTML = `
                <td>${formatarData(registro.timestamp)}</td>
                <td>${registro.tipo}</td>
                <td>${formatarValor(registro.r)}</td>
                <td>${formatarValor(registro.g)}</td>
                <td>${formatarValor(registro.b)}</td>
                <td>${formatarValor(registro.c)}</td>
                <td>${registro.status}</td>
            `;

            corpoHistorico.appendChild(linha);
        });

    } catch (erro) {
        corpoHistorico.innerHTML = `
            <tr>
                <td colspan="7" class="has-text-centered">
                    Não foi possível carregar o histórico.
                </td>
            </tr>
        `;

        mensagemHistorico.textContent = erro.message;
    }
} 

// Carrega o historico ao abrir ou atualizar a pagina
carregarHistorico();

atualizarHistorico.addEventListener('click', carregarHistorico);