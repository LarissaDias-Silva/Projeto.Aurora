// Esse arquivo tem em base o Node.js
// Ele serve basicamente para fazer a conexão entre o servidor web com o esp32

const express = require('express'); // importa o framework Express, serve para gerenciar e criar urls
const http = require('http'); // importa o HTTP, serve para criar um servidor web basico
const { Server } = require('socket.io'); // importa a classe Server (Socket.IO), permite transferencia de dados em tempo real
const sqlite3 = require('sqlite3').verbose(); // importa o drive do banco de dados SQLite3 em modo detalhado

const app = express(); // Inicia app como express, sera usado para configurar algumas coisas
const server = http.createServer(app); // Cria um servidor HTTP, torna 'app' como gerenciadora das requisições
const io = new Server(server); // inicia o Socked.IO, que gerencia as conexões em tempo real

app.use(express.json()); // ativa a ponte entre web e sistema, garante que o servidor consiga ler os dados do ESP32
app.use(express.static('public')); // configura o Express para coisar arquivos dentro da pasta public


const db = new sqlite3.Database('./aurora_dados.db', (err)=> // abre ou cria um banco de dados chamado 'aurora_dados.banco', recebe o parametro 'err' para verificar erros
{
    if(!err) // caso a variavel 'err' estiver vazia: caso não haja erros
    {           // aqui em baixo ele cria uma tabela chamada historico, caso ela não exista
                // a tabela salva o Id, o tipo de leitura, varivesi de leitura, resultado, e data gerada automaticamente
        db.run(`CREATE TABLE IF NOT EXISTS historico 
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo Text,
                r REAL, 
                g REAL,
                b REAL, 
                c REAL,
                status Text,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            console.log('Conexão estabelecida.'); // exibe uma mensagem no terminal caso esteja tudo certo
    }
});

app.post('/api/calibracao', (req, res) => // cria uma rota HTTP do tipo POST, serve para receber os dados do ESP32
{
    const {r, g, b, c} = req.body; // Pega as informações guardadas nessas variaveis

    db.run(`INSERT INTO historico (tipo, r, g, b, c, status) VALUES (?, ?, ?, ?, ?, ?)`, // cria uma nova linha na tabela historico
       ['Referencia', r, g, b, c, 'Calibrando'], function(err)
       {
        if(err) return res.status(500).send(err.message); // se ocorrer erro interrompe a execução

        io.emit('novaCalibracao', {r, g, b, c}); // dispara um evento e faz com que o site atualize automaticamente
        res.json({mensagem: 'Referencia salva com sucesso!'});
        // res.status(200).send('Referencia salva.'); // mostra a mensagem de sucesso
       }); 
});

app.post('/api/teste', (req, res) => // cria uma rota HTTP do tipo POST, serve para analizar a amostra
{
    const{r, g, b, c, status} = req.body; // pega as informações guardadas nessas variaveis

    db.run(`INSERT INTO historico (tipo, r, g, b, c, status) VALUES (?, ?, ?, ?, ?, ?)`, // insere os dados na linha criada
        ['Amostra', r, g, b, c, status], function(err)
        {
            if(err) return res.status(500).send(err.message); // retorna erro caso o banco falhe

            io.emit('novoTeste', { r, g, b, c, status}); // dispara um evento e atualiza automaticamente
            res.json({mensagem: 'Resultado da amostra registrada!'});
            //res.status(200).send('Resultado da amostra registrada'); // mostra a mensagem de sucesso
        }

    );
});

// Busca todo o histórico de análises
app.get('/api/historico', (req, res) => {
    db.all(
        'SELECT * FROM historico ORDER BY timestamp DESC',
        [],
        (erro, registros) => {
            if (erro) {
                console.error('Erro ao buscar histórico:', erro);
                return res.status(500).json({
                    mensagem: 'Erro ao consultar histórico.'
                });
            }

            res.json(registros);
        }
    );
});

// Busca as últimas leituras
app.get('/api/ultimos', (req, res) => {
    db.get(
        `SELECT * FROM historico WHERE tipo = 'Referencia' ORDER BY id DESC LIMIT 1`,
        (err, referencia) => {
            if (err) return res.status(500).send(err.message);

            db.get(
                `SELECT * FROM historico WHERE tipo = 'Amostra' ORDER BY id DESC LIMIT 1`,
                (err2, amostra) => {
                    if (err2) return res.status(500).send(err2.message);

                    if (amostra && referencia && amostra.id < referencia.id) {
                        amostra = null;
                    }

                    res.json({
                        referencia: referencia || null,
                        amostra: amostra || null
                    });
                }
            );
        }
    );
});
server.listen(3000, () => // inicializa o sistema
{
    console.log('Servidor funcionando.') // informa que esta funcionando
});