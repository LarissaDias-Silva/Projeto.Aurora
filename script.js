
// Script do site Projeto Aurora
// Recebe em tempo real (Socket.IO) os dados que o ESP32 envia ao servidor,
// atualiza os valores na tela, o resultado e o gráfico de comparação.
 
const socket = io(); // conecta ao servidor que entregou a página
 
const el = {
    r: document.getElementById('valorR'),
    g: document.getElementById('valorG'),
    b: document.getElementById('valorB'),
    c: document.getElementById('valorC'),
    tipo: document.getElementById('tipoLeitura'),
    status: document.getElementById('status'),
    diferenca: document.getElementById('diferenca'),
    canvas: document.getElementById('grafico'),
    vazio: document.getElementById('graficoVazio')
};
 
let referencia = null; // {r, g, b, c} da última calibração
let amostra = null;    // {r, g, b, c, status} da última amostra analisada
 
 
// ---------- Utilidades ----------
 
// converte os dados recebidos em números (o banco e o ESP32 podem mandar texto)
function lerValores(d)
{
    return { r: Number(d.r), g: Number(d.g), b: Number(d.b), c: Number(d.c) };
}
 
function formatar(v)
{
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '---';
    return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
 
// mesma conta do ESP32: média da diferença percentual de R, G, B e C
function diferencaMedia(ref, amo)
{
    const canais = ['r', 'g', 'b', 'c'];
    let soma = 0;
 
    for (const k of canais)
    {
        if (!ref[k]) return null; // evita dividir por zero
        soma += Math.abs(amo[k] - ref[k]) / ref[k] * 100;
    }
 
    return soma / canais.length;
}
 
// aceita "COMPATIVEL", "Compatível", "SUSPEITA"... independente de acento e maiúsculas
function classificarStatus(texto)
{
    const t = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
 
    if (t.startsWith('COMPAT')) return { rotulo: 'COMPATÍVEL', classe: 'status-ok' };
    if (t.startsWith('SUSP')) return { rotulo: 'SUSPEITA', classe: 'status-alerta' };
 
    return { rotulo: texto || 'Aguardando Análise', classe: '' };
}
 
 
// ---------- Atualização da tela ----------
 
function mostrarLeitura(v, rotulo)
{
    el.r.textContent = formatar(v.r);
    el.g.textContent = formatar(v.g);
    el.b.textContent = formatar(v.b);
    el.c.textContent = formatar(v.c);
    el.tipo.textContent = rotulo;
}
 
function mostrarStatus(texto, classe)
{
    el.status.textContent = texto;
    el.status.classList.remove('status-ok', 'status-alerta');
    if (classe) el.status.classList.add(classe);
}
 
function aplicarReferencia(d)
{
    referencia = lerValores(d);
    amostra = null; // uma nova calibração inicia um novo ciclo
 
    mostrarLeitura(referencia, 'Referência (calibração)');
    mostrarStatus('Referência salva. Coloque a amostra.', '');
    el.diferenca.textContent = '';
    desenharGrafico();
}
 
function aplicarAmostra(d)
{
    amostra = lerValores(d);
    amostra.status = d.status;
 
    const s = classificarStatus(d.status);
 
    mostrarLeitura(amostra, 'Amostra');
    mostrarStatus(s.rotulo, s.classe);
 
    const dif = referencia ? diferencaMedia(referencia, amostra) : null;
    el.diferenca.textContent = dif === null ? '' : 'Diferença média em relação à referência: ' + formatar(dif) + '%';
 
    desenharGrafico();
}
 
 
// ---------- Gráfico (barras: referência x amostra) ----------
 
const CORES = { referencia: '#1C3152', amostra: '#4385D6', grade: '#D5DFED', texto: '#64748B' };
 
function desenharGrafico()
{
    if (!referencia && !amostra)
    {
        el.canvas.hidden = true;
        el.vazio.hidden = false;
        return;
    }
 
    el.vazio.hidden = true;
    el.canvas.hidden = false;
 
    const dpr = window.devicePixelRatio || 1;
    const w = el.canvas.clientWidth;
    const h = el.canvas.clientHeight;
 
    el.canvas.width = w * dpr;
    el.canvas.height = h * dpr;
 
    const ctx = el.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px "Times New Roman", serif';
 
    const canais = ['r', 'g', 'b', 'c'];
    const series = [];
    if (referencia) series.push({ nome: 'Referência', cor: CORES.referencia, dados: referencia });
    if (amostra) series.push({ nome: 'Amostra', cor: CORES.amostra, dados: amostra });
 
    const margem = { esq: 56, dir: 16, topo: 34, base: 28 };
    const areaW = w - margem.esq - margem.dir;
    const areaH = h - margem.topo - margem.base;
 
    let maximo = 0;
    for (const s of series) for (const k of canais) maximo = Math.max(maximo, s.dados[k] || 0);
    maximo = (maximo || 1) * 1.15;
 
    // grade horizontal e valores do eixo Y
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++)
    {
        const y = margem.topo + areaH - (areaH * i / 4);
        ctx.strokeStyle = CORES.grade;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margem.esq, y);
        ctx.lineTo(w - margem.dir, y);
        ctx.stroke();
 
        ctx.fillStyle = CORES.texto;
        ctx.fillText(formatar(maximo * i / 4), margem.esq - 8, y);
    }
 
    // barras
    const larguraGrupo = areaW / canais.length;
    const larguraBarra = Math.min(40, larguraGrupo * 0.3);
    const espaco = 4;
    const larguraTotal = series.length * larguraBarra + (series.length - 1) * espaco;
 
    canais.forEach((k, i) =>
    {
        const inicio = margem.esq + larguraGrupo * i + (larguraGrupo - larguraTotal) / 2;
 
        series.forEach((s, j) =>
        {
            const valor = s.dados[k] || 0;
            const altura = areaH * valor / maximo;
            const x = inicio + j * (larguraBarra + espaco);
            const y = margem.topo + areaH - altura;
 
            ctx.fillStyle = s.cor;
            ctx.fillRect(x, y, larguraBarra, altura);
 
            ctx.fillStyle = CORES.texto;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(formatar(valor), x + larguraBarra / 2, y - 3);
        });
 
        ctx.fillStyle = '#101D35';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(k.toUpperCase(), margem.esq + larguraGrupo * i + larguraGrupo / 2, margem.topo + areaH + 8);
    });
 
    // legenda
    let xLegenda = margem.esq;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const s of series)
    {
        ctx.fillStyle = s.cor;
        ctx.fillRect(xLegenda, 10, 12, 12);
        ctx.fillStyle = '#101D35';
        ctx.fillText(s.nome, xLegenda + 18, 16);
        xLegenda += 18 + ctx.measureText(s.nome).width + 20;
    }
}
 
window.addEventListener('resize', desenharGrafico);
 
 
// ---------- Eventos em tempo real (vindos do server.js) ----------
 
socket.on('novaCalibracao', aplicarReferencia);
socket.on('novoTeste', aplicarAmostra);
 
 
// ---------- Ao abrir/atualizar a página: recupera a última leitura salva ----------
 
fetch('/api/ultimos')
    .then(resposta => resposta.json())
    .then(dados =>
    {
        if (dados.referencia) aplicarReferencia(dados.referencia);
        if (dados.amostra) aplicarAmostra(dados.amostra);
    })
    .catch(() => { /* sem histórico ainda: a tela continua aguardando o ESP32 */ });