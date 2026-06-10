// ==========================================
// LOGICA E ESTADO DA APLICAÇÃO: LÍRIOS
// ==========================================

// Variáveis de Estado Local
let db = {
    users: [],
    obras: [],
    alocacoes: [],
    unidades: [],
    matriz: [],
    limpezas: []
};

// Estado da Interface Admin
let currentAdminTab = 'dashboard';

// Estado do Simulador Mobile
let mobileState = {
    currentUser: null,
    currentObra: null,
    currentTorre: null,
    currentPavimento: null,
    currentUnidade: null
};

// ==========================================
// 1. INICIALIZAÇÃO DO BANCO DE DADOS (LOCALSTORAGE)
// ==========================================

function initDatabase() {
    if (localStorage.getItem('lirios_db_initialized')) {
        loadFromStorage();
        return;
    }

    // Carga inicial de Usuários
    db.users = [
        { id: "u-admin", nome: "Ana Admin (Empreiteira)", email: "admin@lirios.com.br", perfil: "ADMIN", ativo: true },
        { id: "u-carlos", nome: "Carlos Limpeza", email: "carlos@lirios.com.br", perfil: "COLABORADOR", ativo: true },
        { id: "u-mariana", nome: "Mariana Silveira", email: "mariana@lirios.com.br", perfil: "COLABORADOR", ativo: true },
        { id: "u-jose", nome: "José Roberto", email: "jose@lirios.com.br", perfil: "COLABORADOR", ativo: true }
    ];

    // Carga inicial de Obras
    db.obras = [
        { id: "o-fontana", nome: "Residencial Chapada Fontana", endereco: "Av. das Flores, 120", qtd_torres: 2, qtd_pavimentos: 4, apts_por_pavimento: 4 },
        { id: "o-horizonte", nome: "Residencial Horizonte", endereco: "Rua do Sol, 45", qtd_torres: 1, qtd_pavimentos: 5, apts_por_pavimento: 6 }
    ];

    // Alocações Iniciais
    db.alocacoes = [
        { id: "al-1", obra_id: "o-fontana", usuario_id: "u-carlos" },
        { id: "al-2", obra_id: "o-fontana", usuario_id: "u-mariana" },
        { id: "al-3", obra_id: "o-horizonte", usuario_id: "u-mariana" },
        { id: "al-4", obra_id: "o-horizonte", usuario_id: "u-jose" }
    ];

    // Matriz de Valores Iniciais
    db.matriz = [
        { id: "m-1", obra_id: "o-fontana", tipo_limpeza: "GROSSA", valor: 120.00 },
        { id: "m-2", obra_id: "o-fontana", tipo_limpeza: "FINA", valor: 180.00 },
        { id: "m-3", obra_id: "o-fontana", tipo_limpeza: "PASSADA_DE_PANO", valor: 50.00 },
        
        { id: "m-4", obra_id: "o-horizonte", tipo_limpeza: "GROSSA", valor: 110.00 },
        { id: "m-5", obra_id: "o-horizonte", tipo_limpeza: "FINA", valor: 165.00 },
        { id: "m-6", obra_id: "o-horizonte", tipo_limpeza: "PASSADA_DE_PANO", valor: 45.00 }
    ];

    // Geração automática das Unidades Físicas (Triggers/Backend Logic simulation)
    db.obras.forEach(obra => {
        generateUnitsForObra(obra);
    });

    // Carga de limpezas concluídas mockadas (Histórico anterior)
    const agora = new Date();
    const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    const anteontem = new Date(agora.getTime() - 48 * 60 * 60 * 1000);

    // Pegando algumas unidades geradas da Chapada Fontana para testes
    const apto101 = db.unidades.find(u => u.obra_id === "o-fontana" && u.unidade_nome === "Apto 101" && u.torre === "Torre 1");
    const apto102 = db.unidades.find(u => u.obra_id === "o-fontana" && u.unidade_nome === "Apto 102" && u.torre === "Torre 1");
    const hall1 = db.unidades.find(u => u.obra_id === "o-fontana" && u.unidade_nome === "Hall" && u.torre === "Torre 1" && u.pavimento === 1);
    
    db.limpezas = [
        {
            id: "l-1",
            unidade_id: apto101.id,
            usuario_id: "u-carlos",
            tipo_limpeza: "GROSSA",
            data_conclusao: anteontem.toISOString(),
            valor_gerado: 120.00
        },
        {
            id: "l-2",
            unidade_id: apto101.id,
            usuario_id: "u-carlos",
            tipo_limpeza: "FINA",
            data_conclusao: ontem.toISOString(),
            valor_gerado: 180.00
        },
        {
            id: "l-3",
            unidade_id: apto102.id,
            usuario_id: "u-mariana",
            tipo_limpeza: "GROSSA",
            data_conclusao: ontem.toISOString(),
            valor_gerado: 120.00
        },
        {
            id: "l-4",
            unidade_id: hall1.id,
            usuario_id: "u-mariana",
            tipo_limpeza: "PASSADA_DE_PANO",
            data_conclusao: agora.toISOString(),
            valor_gerado: 50.00
        }
    ];

    saveToStorage();
    localStorage.setItem('lirios_db_initialized', 'true');
}

// Geração dinâmica de apartamentos e halls
function generateUnitsForObra(obra) {
    for (let t = 1; t <= obra.qtd_torres; t++) {
        const nomeTorre = `Torre ${t}`;
        for (let p = 1; p <= obra.qtd_pavimentos; p++) {
            
            // Gerar Apartamentos
            for (let a = 1; a <= obra.apts_por_pavimento; a++) {
                const aptoNum = (p * 100) + a;
                db.unidades.push({
                    id: `uni-${obra.id}-${t}-${p}-${a}`,
                    obra_id: obra.id,
                    torre: nomeTorre,
                    pavimento: p,
                    unidade_nome: `Apto ${aptoNum}`,
                    tipo_unidade: 'APARTAMENTO'
                });
            }

            // Gerar Hall do Pavimento
            db.unidades.push({
                id: `uni-${obra.id}-${t}-${p}-hall`,
                obra_id: obra.id,
                torre: nomeTorre,
                pavimento: p,
                unidade_nome: 'Hall',
                tipo_unidade: 'HALL'
            });
        }
    }
}

function saveToStorage() {
    localStorage.setItem('lirios_db', JSON.stringify(db));
}

function loadFromStorage() {
    db = JSON.parse(localStorage.getItem('lirios_db'));
}

// ==========================================
// 2. LOGICA DO CONTROLE ADMIN (DESKTOP PANEL)
// ==========================================

function switchAdminTab(tabId) {
    currentAdminTab = tabId;
    
    // Atualiza navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Adiciona classe ativa com base na função do botão
    event.currentTarget.classList.add('active');

    // Alterna painéis de conteúdo
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`tab-${tabId}`).classList.add('active');

    // Executa recarregamento dinâmico específico
    if (tabId === 'dashboard') renderAdminDashboard();
    else if (tabId === 'obras') renderAdminObras();
    else if (tabId === 'matriz') renderMatrixEditor();
    else if (tabId === 'alocacao') renderAllocationGrid();
    else if (tabId === 'relatorios') renderAuditReport();
}

// A. Renderizar Dashboard Principal
function renderAdminDashboard() {
    loadFromStorage();
    
    // Faturamento Total
    const fatTotal = db.limpezas.reduce((acc, curr) => acc + parseFloat(curr.valor_gerado), 0);
    document.getElementById('admin-fat-total').innerText = formatCurrency(fatTotal);
    
    // Obras Ativas
    document.getElementById('admin-obras-total').innerText = db.obras.length;
    
    // Limpezas Realizadas
    document.getElementById('admin-limpezas-total').innerText = db.limpezas.length;

    // Faturamento Período (Hoje, 7 dias, Mês)
    const agora = new Date();
    const hojeStr = agora.toISOString().split('T')[0];
    
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(agora.getDate() - 6);
    seteDiasAtras.setHours(0, 0, 0, 0);

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    let fatHoje = 0;
    let fatSemana = 0;
    let fatMes = 0;

    db.limpezas.forEach(l => {
        const dataL = new Date(l.data_conclusao);
        const dataLStr = l.data_conclusao.split('T')[0];
        const valor = parseFloat(l.valor_gerado);

        if (dataLStr === hojeStr) fatHoje += valor;
        if (dataL >= seteDiasAtras) fatSemana += valor;
        if (dataL >= inicioMes) fatMes += valor;
    });

    document.getElementById('fat-diario').innerText = formatCurrency(fatHoje);
    document.getElementById('fat-semanal').innerText = formatCurrency(fatSemana);
    document.getElementById('fat-mensal').innerText = formatCurrency(fatMes);

    // Gráfico de Produtividade
    renderProductivityChart();
}

// B. Renderização e Lógica do Gráfico de Produtividade dos Colaboradores
function renderProductivityChart() {
    const chartContainer = document.getElementById('productivity-chart');
    chartContainer.innerHTML = '';

    const colaboradores = db.users.filter(u => u.perfil === 'COLABORADOR' && u.ativo);
    
    if (colaboradores.length === 0) {
        chartContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding-top: 40px;">Nenhum colaborador ativo cadastrado.</div>`;
        return;
    }

    // Calcula contagem de limpezas feitas por funcionário (Últimos 30 dias)
    const limite30Dias = new Date();
    limite30Dias.setDate(limite30Dias.getDate() - 30);

    let totalLimpezas = 0;
    let colaboradoresAtivosNoPeriodo = 0;
    
    const mapaProd = {};
    colaboradores.forEach(c => {
        mapaProd[c.id] = 0;
    });

    db.limpezas.forEach(l => {
        const dataL = new Date(l.data_conclusao);
        if (dataL >= limite30Dias && mapaProd[l.usuario_id] !== undefined) {
            mapaProd[l.usuario_id]++;
            totalLimpezas++;
        }
    });

    // Número de funcionários que realizaram pelo menos 1 limpeza para calcular a média real
    Object.values(mapaProd).forEach(qtd => {
        if (qtd > 0) colaboradoresAtivosNoPeriodo++;
    });

    // Média global de limpezas por colaborador ativo
    const divisor = colaboradores.length; // Usamos todos para a média global do canteiro
    const mediaGlobal = divisor > 0 ? (totalLimpezas / divisor) : 0;

    // Encontrar o maior valor de limpezas para normalizar o gráfico de barras
    const maxLimpezas = Math.max(...Object.values(mapaProd), 5); // no mínimo 5 para não quebrar proporção

    colaboradores.forEach(colab => {
        const qtdLimpezas = mapaProd[colab.id];
        const status = qtdLimpezas >= mediaGlobal ? 'acima' : 'abaixo';
        const percentWidth = (qtdLimpezas / maxLimpezas) * 100;
        
        // Posição proporcional do marcador de média na barra
        const mediaMarkerPercent = (mediaGlobal / maxLimpezas) * 100;

        const row = document.createElement('div');
        row.className = 'productivity-row';
        row.innerHTML = `
            <div class="prod-header">
                <span><i class="fa-solid fa-user-ninja" style="color: var(--text-secondary); margin-right: 6px;"></i> ${colab.nome}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="prod-badge ${status}">${status.toUpperCase()} DA MÉDIA</span>
                    <strong style="color: #fff">${qtdLimpezas} limpezas</strong>
                </div>
            </div>
            <div class="prod-bar-outer">
                <div class="prod-bar-inner ${status}" style="width: ${percentWidth}%"></div>
                <!-- Linha de marcação da média -->
                <div class="chart-marker" style="left: ${mediaMarkerPercent}%">
                    <span class="chart-marker-label">Média (${mediaGlobal.toFixed(1)})</span>
                </div>
            </div>
        `;
        chartContainer.appendChild(row);
    });
}

// C. Cadastro de Obras
function renderAdminObras() {
    loadFromStorage();
    const tbody = document.querySelector('#table-obras-list tbody');
    tbody.innerHTML = '';

    if (db.obras.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhuma obra cadastrada.</td></tr>`;
        return;
    }

    db.obras.forEach(o => {
        // Encontrar contagem de unidades
        const totalUni = db.unidades.filter(u => u.obra_id === o.id).length;
        
        // Colaboradores alocados
        const alocados = db.alocacoes.filter(al => al.obra_id === o.id).map(al => {
            const usr = db.users.find(u => u.id === al.usuario_id);
            return usr ? `<span class="alloc-badge">${usr.nome}</span>` : '';
        }).join(' ');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: #fff;">${o.nome}</td>
            <td>${o.qtd_torres} Torre(s) / ${o.qtd_pavimentos} Pavimentos / ${o.apts_por_pavimento} Apts por Andar</td>
            <td><strong>${totalUni}</strong> registros</td>
            <td>${alocados || '<span style="color: var(--text-muted)">Nenhum</span>'}</td>
            <td>
                <button class="btn-secondary" onclick="adminDeleteObra('${o.id}')" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.2);">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Atualiza selects de outras abas
    updateObraSelects();
}

function adminCreateObra() {
    const nome = document.getElementById('obra-nome').value;
    const torres = parseInt(document.getElementById('obra-torres').value);
    const pavimentos = parseInt(document.getElementById('obra-pavimentos').value);
    const apts = parseInt(document.getElementById('obra-apts').value);

    const novaObra = {
        id: `o-${Date.now()}`,
        nome,
        qtd_torres: torres,
        qtd_pavimentos: pavimentos,
        apts_por_pavimento: apts
    };

    db.obras.push(novaObra);
    
    // Simula trigger do backend e cria as unidades
    generateUnitsForObra(novaObra);

    // Cria matriz padrão zerada/inicial para esta obra
    db.matriz.push(
        { id: `m-${Date.now()}-1`, obra_id: novaObra.id, tipo_limpeza: 'GROSSA', valor: 0.00 },
        { id: `m-${Date.now()}-2`, obra_id: novaObra.id, tipo_limpeza: 'FINA', valor: 0.00 },
        { id: `m-${Date.now()}-3`, obra_id: novaObra.id, tipo_limpeza: 'PASSADA_DE_PANO', valor: 0.00 }
    );

    saveToStorage();
    renderAdminObras();

    // Reset Form
    document.getElementById('form-criar-obra').reset();
    alert(`Obra "${nome}" cadastrada! Estrutura física de unidades gerada.`);
}

function adminDeleteObra(id) {
    if (!confirm("Tem certeza que deseja excluir esta obra? Todas as unidades e limpezas vinculadas serão deletadas de forma definitiva.")) return;
    
    db.obras = db.obras.filter(o => o.id !== id);
    db.unidades = db.unidades.filter(u => u.obra_id !== id);
    db.alocacoes = db.alocacoes.filter(al => al.obra_id !== id);
    db.matriz = db.matriz.filter(m => m.obra_id !== id);
    // Nota: Excluir a obra removerá o histórico de limpezas (ON DELETE CASCADE)
    db.limpezas = db.limpezas.filter(l => {
        const uni = db.unidades.find(u => u.id === l.unidade_id);
        return uni && uni.obra_id === id ? false : true;
    });

    saveToStorage();
    renderAdminObras();
}

// D. Estúdio de Preços (Matriz de Valores)
function updateObraSelects() {
    const matrizSelect = document.getElementById('matriz-obra-select');
    const alocSelect = document.getElementById('alocacao-obra-select');
    const filtroReport = document.getElementById('filtro-relatorio-obra');

    const opts = db.obras.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
    
    matrizSelect.innerHTML = opts;
    alocSelect.innerHTML = opts;
    filtroReport.innerHTML = `<option value="ALL">Todas as Obras</option>` + opts;
}

function renderMatrixEditor() {
    loadFromStorage();
    const obraId = document.getElementById('matriz-obra-select').value;
    const container = document.getElementById('matrix-inputs-container');
    container.innerHTML = '';

    if (!obraId) {
        container.innerHTML = `<div style="color: var(--text-muted)">Cadastre uma obra primeiro.</div>`;
        return;
    }

    const tipos = [
        { key: 'GROSSA', label: 'Limpeza Grossa', icon: 'fa-box-open' },
        { key: 'FINA', label: 'Limpeza Fina', icon: 'fa-circle-check' },
        { key: 'PASSADA_DE_PANO', label: 'Passada de Pano', icon: 'fa-broom' }
    ];

    tipos.forEach(t => {
        const itemMatriz = db.matriz.find(m => m.obra_id === obraId && m.tipo_limpeza === t.key) || { valor: 0.00 };
        
        const div = document.createElement('div');
        div.className = 'matrix-item';
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fa-solid ${t.icon}" style="font-size: 18px; color: var(--primary-light)"></i>
                <span style="font-weight: 500;">${t.label}</span>
            </div>
            <div class="matrix-input-group">
                <span class="currency-symbol">R$</span>
                <input type="number" class="matrix-input" id="mat-input-${t.key}" step="0.01" min="0" value="${parseFloat(itemMatriz.valor).toFixed(2)}">
            </div>
        `;
        container.appendChild(div);
    });
}

function adminSaveMatrix() {
    const obraId = document.getElementById('matriz-obra-select').value;
    if (!obraId) return;

    const tipos = ['GROSSA', 'FINA', 'PASSADA_DE_PANO'];
    
    tipos.forEach(tipo => {
        const inputVal = parseFloat(document.getElementById(`mat-input-${tipo}`).value) || 0;
        const index = db.matriz.findIndex(m => m.obra_id === obraId && m.tipo_limpeza === tipo);
        
        if (index !== -1) {
            db.matriz[index].valor = inputVal;
        } else {
            db.matriz.push({
                id: `m-${Date.now()}-${tipo}`,
                obra_id: obraId,
                tipo_limpeza: tipo,
                valor: inputVal
            });
        }
    });

    saveToStorage();
    alert("Matriz de valores salva com sucesso!");
}

// E. Alocação Rápida
function renderAllocationGrid() {
    loadFromStorage();
    const obraId = document.getElementById('alocacao-obra-select').value;
    const container = document.getElementById('allocation-employees-list');
    container.innerHTML = '';

    if (!obraId) return;

    const colaboradores = db.users.filter(u => u.perfil === 'COLABORADOR' && u.ativo);

    colaboradores.forEach(c => {
        const alocado = db.alocacoes.some(al => al.obra_id === obraId && al.usuario_id === c.id);
        
        const div = document.createElement('div');
        div.style = "display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02); padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color)";
        div.innerHTML = `
            <input type="checkbox" id="alloc-chk-${c.id}" ${alocado ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
            <label for="alloc-chk-${c.id}" style="font-size: 13px; color: #fff; cursor: pointer;">${c.nome} (${c.email})</label>
        `;
        container.appendChild(div);
    });
}

function adminSaveAllocations() {
    const obraId = document.getElementById('alocacao-obra-select').value;
    if (!obraId) return;

    // Remove alocações anteriores daquela obra
    db.alocacoes = db.alocacoes.filter(al => al.obra_id !== obraId);

    const colaboradores = db.users.filter(u => u.perfil === 'COLABORADOR');
    colaboradores.forEach(c => {
        const chk = document.getElementById(`alloc-chk-${c.id}`);
        if (chk && chk.checked) {
            db.alocacoes.push({
                id: `al-${Date.now()}-${c.id}`,
                obra_id: obraId,
                usuario_id: c.id
            });
        }
    });

    saveToStorage();
    alert("Vínculos de equipe salvos com sucesso!");
    renderAdminObras(); // recarrega a tabela de obras que mostra os badges de equipe
}

// F. Relatório de Conferência
function renderAuditReport() {
    loadFromStorage();
    const obraFiltro = document.getElementById('filtro-relatorio-obra').value;
    const periodoFiltro = document.getElementById('filtro-relatorio-periodo').value;
    const tbody = document.querySelector('#table-audit-report tbody');
    tbody.innerHTML = '';

    const agora = new Date();
    const hojeStr = agora.toISOString().split('T')[0];
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(agora.getDate() - 6);
    seteDiasAtras.setHours(0,0,0,0);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    // Filtra limpezas
    const limpezasFiltradas = db.limpezas.filter(l => {
        const uni = db.unidades.find(u => u.id === l.unidade_id);
        if (!uni) return false;

        // Filtro por obra
        if (obraFiltro !== 'ALL' && uni.obra_id !== obraFiltro) return false;

        // Filtro por período
        const dataL = new Date(l.data_conclusao);
        const dataLStr = l.data_conclusao.split('T')[0];

        if (periodoFiltro === 'TODAY' && dataLStr !== hojeStr) return false;
        if (periodoFiltro === 'WEEK' && dataL < seteDiasAtras) return false;
        if (periodoFiltro === 'MONTH' && dataL < inicioMes) return false;

        return true;
    });

    if (limpezasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhuma limpeza encontrada no período selecionado.</td></tr>`;
        return;
    }

    // Ordena por data decrescente (mais recente primeiro)
    limpezasFiltradas.sort((a,b) => new Date(b.data_conclusao) - new Date(a.data_conclusao));

    limpezasFiltradas.forEach(l => {
        const uni = db.unidades.find(u => u.id === l.unidade_id);
        const obra = db.obras.find(o => o.id === uni.obra_id);
        const colab = db.users.find(u => u.id === l.usuario_id);
        const dataFormatada = new Date(l.data_conclusao).toLocaleString('pt-BR');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td><strong>${obra.nome}</strong><br><span style="font-size: 11px; color: var(--text-secondary);">${uni.torre} - Andar ${uni.pavimento} - ${uni.unidade_nome}</span></td>
            <td style="font-weight: 500;">${colab ? colab.nome : 'Excluído'}</td>
            <td>
                <span class="prod-badge" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--border-color)">
                    ${l.tipo_limpeza.replace(/_/g, ' ')}
                </span>
            </td>
            <td style="text-align: right; font-weight: 700; color: var(--success);">${formatCurrency(l.valor_gerado)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 3. LOGICA DO SIMULADOR MOBILE (COLABORADOR APP)
// ==========================================

function loadMobileWorkers() {
    const select = document.getElementById('mobile-user-select');
    const colaboradores = db.users.filter(u => u.perfil === 'COLABORADOR' && u.ativo);
    
    select.innerHTML = colaboradores.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

function mobileLogin() {
    const userId = document.getElementById('mobile-user-select').value;
    const user = db.users.find(u => u.id === userId);
    
    if (!user) return;

    mobileState.currentUser = user;

    // Atualiza layout do rodapé
    document.getElementById('mobile-footer-username').innerText = user.nome;
    document.getElementById('mobile-footer').style.display = 'flex';

    // Transição de tela
    mobileNavigate('obras');
    renderMobileObras();
}

function mobileLogout() {
    mobileState = {
        currentUser: null,
        currentObra: null,
        currentTorre: null,
        currentPavimento: null,
        currentUnidade: null
    };

    document.getElementById('mobile-footer').style.display = 'none';
    mobileNavigate('login');
}

function renderMobileObras() {
    const container = document.getElementById('mobile-obras-list');
    container.innerHTML = '';

    // Filtra obras que o colaborador está alocado
    const obrasAlocadas = db.alocacoes
        .filter(al => al.usuario_id === mobileState.currentUser.id)
        .map(al => db.obras.find(o => o.id === al.obra_id))
        .filter(o => o !== undefined);

    if (obrasAlocadas.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding-top: 40px;">Você não está alocado a nenhuma obra ativa. Contate o administrador.</div>`;
        return;
    }

    obrasAlocadas.forEach(o => {
        const div = document.createElement('div');
        div.className = 'mobile-card';
        div.onclick = () => mobileSelectObra(o.id);
        div.innerHTML = `
            <div>
                <div class="mobile-card-title">${o.nome}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${o.qtd_torres} torre(s) cadastrada(s)</div>
            </div>
            <i class="fa-solid fa-chevron-right chevron-icon"></i>
        `;
        container.appendChild(div);
    });
}

function mobileSelectObra(obraId) {
    const obra = db.obras.find(o => o.id === obraId);
    mobileState.currentObra = obra;

    document.getElementById('mobile-torres-title').innerText = obra.nome;
    mobileNavigate('torres');
    renderMobileTorres();
}

function renderMobileTorres() {
    const container = document.getElementById('mobile-torres-list');
    container.innerHTML = '';

    // Pega torres únicas cadastradas para a obra
    const unidadesObra = db.unidades.filter(u => u.obra_id === mobileState.currentObra.id);
    const torres = [...new Set(unidadesObra.map(u => u.torre))].sort();

    torres.forEach(t => {
        const div = document.createElement('div');
        div.className = 'mobile-card';
        div.onclick = () => mobileSelectTorre(t);
        div.innerHTML = `
            <div class="mobile-card-title">${t}</div>
            <i class="fa-solid fa-chevron-right chevron-icon"></i>
        `;
        container.appendChild(div);
    });
}

function mobileSelectTorre(torreName) {
    mobileState.currentTorre = torreName;
    document.getElementById('mobile-pavimentos-title').innerText = torreName;
    mobileNavigate('pavimentos');
    renderMobilePavimentos();
}

function renderMobilePavimentos() {
    const container = document.getElementById('mobile-pavimentos-list');
    container.innerHTML = '';

    const unidadesTorre = db.unidades.filter(u => u.obra_id === mobileState.currentObra.id && u.torre === mobileState.currentTorre);
    const pavimentos = [...new Set(unidadesTorre.map(u => u.pavimento))].sort((a,b) => b - a); // ordem decrescente (torrinha)

    pavimentos.forEach(p => {
        const div = document.createElement('div');
        div.className = 'mobile-card';
        div.onclick = () => mobileSelectPavimento(p);
        div.innerHTML = `
            <div class="mobile-card-title">${p}º Pavimento (Andar)</div>
            <i class="fa-solid fa-chevron-right chevron-icon"></i>
        `;
        container.appendChild(div);
    });
}

function mobileSelectPavimento(pavimentoNum) {
    mobileState.currentPavimento = pavimentoNum;
    document.getElementById('mobile-unidades-title').innerText = `${pavimentoNum}º Pavimento`;
    mobileNavigate('unidades');
    renderMobileUnidades();
}

function renderMobileUnidades() {
    const grid = document.getElementById('mobile-unidades-grid');
    grid.innerHTML = '';

    const unidades = db.unidades.filter(u => 
        u.obra_id === mobileState.currentObra.id && 
        u.torre === mobileState.currentTorre && 
        u.pavimento === mobileState.currentPavimento
    ).sort((a,b) => a.unidade_nome.localeCompare(b.unidade_nome));

    unidades.forEach(uni => {
        // Encontra histórico de limpezas dessa unidade específica
        const limpezasFeitas = db.limpezas.filter(l => l.unidade_id === uni.id);
        const grossaFeita = limpezasFeitas.some(l => l.tipo_limpeza === 'GROSSA');
        const finaFeita = limpezasFeitas.some(l => l.tipo_limpeza === 'FINA');
        const passadaFeita = limpezasFeitas.some(l => l.tipo_limpeza === 'PASSADA_DE_PANO');

        const isHall = uni.tipo_unidade === 'HALL';

        const cell = document.createElement('div');
        cell.className = `grid-cell ${isHall ? 'hall' : ''}`;
        cell.onclick = () => mobileSelectUnidade(uni.id);
        cell.innerHTML = `
            <div class="grid-cell-title">${uni.unidade_nome}</div>
            <div class="badge-row">
                <span class="badge-micro ${grossaFeita ? 'active' : ''}" title="Limpeza Grossa">G</span>
                <span class="badge-micro ${finaFeita ? 'active' : ''}" title="Limpeza Fina">F</span>
                <span class="badge-micro ${passadaFeita ? 'active' : ''}" title="Passada de Pano">P</span>
            </div>
        `;
        grid.appendChild(cell);
    });
}

function mobileSelectUnidade(unidadeId) {
    const uni = db.unidades.find(u => u.id === unidadeId);
    mobileState.currentUnidade = uni;

    document.getElementById('mobile-detalhe-title').innerText = uni.unidade_nome;
    document.getElementById('mobile-detalhe-subtitle').innerText = `${mobileState.currentTorre} - ${uni.pavimento}º Andar`;
    mobileNavigate('detalhe');
    renderMobileChecklist();
}

function renderMobileChecklist() {
    const container = document.getElementById('mobile-checklist-cards');
    container.innerHTML = '';

    const uni = mobileState.currentUnidade;
    
    // Filtra histórico da unidade
    const limpezasFeitas = db.limpezas.filter(l => l.unidade_id === uni.id);

    const checkItems = [
        { key: 'GROSSA', label: 'Limpeza Grossa', desc: 'Remoção de resíduos pesados e entulhos de obra.' },
        { key: 'FINA', label: 'Limpeza Fina', desc: 'Limpeza detalhada de vidros, pisos, louças e acabamentos.' },
        { key: 'PASSADA_DE_PANO', label: 'Passada de Pano', desc: 'Higienização de manutenção pré-entrega.' }
    ];

    checkItems.forEach(item => {
        const registro = limpezasFeitas.find(l => l.tipo_limpeza === item.key);
        const concluida = registro !== undefined;

        const card = document.createElement('div');
        card.className = 'checklist-card';
        
        let actionHTML = '';
        if (concluida) {
            const executor = db.users.find(u => u.id === registro.usuario_id);
            const dataStr = new Date(registro.data_conclusao).toLocaleDateString('pt-BR');
            const horaStr = new Date(registro.data_conclusao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            actionHTML = `
                <div class="checklist-completed-info">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>✓ Concluída por ${executor ? executor.nome : 'Equipe'} em ${dataStr} às ${horaStr}</span>
                </div>
            `;
        } else {
            actionHTML = `
                <button class="btn-mobile-primary" onclick="mobileCompleteCleaning('${item.key}')" style="margin-top: 10px;">
                    <i class="fa-solid fa-check"></i> Finalizar Tarefa
                </button>
            `;
        }

        card.innerHTML = `
            <div class="checklist-title">${item.label}</div>
            <div class="checklist-info">${item.desc}</div>
            ${actionHTML}
        `;
        container.appendChild(card);
    });
}

function mobileCompleteCleaning(tipo) {
    const uni = mobileState.currentUnidade;
    const colab = mobileState.currentUser;

    // Busca valor configurado na matriz para esta obra
    const precoConfig = db.matriz.find(m => m.obra_id === uni.obra_id && m.tipo_limpeza === tipo);
    const valorSnap = precoConfig ? parseFloat(precoConfig.valor) : 0.00;

    const novoLog = {
        id: `l-${Date.now()}`,
        unidade_id: uni.id,
        usuario_id: colab.id,
        tipo_limpeza: tipo,
        data_conclusao: new Date().toISOString(),
        valor_gerado: valorSnap
    };

    db.limpezas.push(novoLog);
    saveToStorage();

    // Feedback visual do simulador
    showToast("Sucesso! Registro de limpeza gravado.");
    
    // Atualiza telas
    renderMobileChecklist();
    
    // Re-calcula dashboards na parte administrativa no mesmo instante
    renderAdminDashboard();
    renderAuditReport();
}

function showToast(mensagem) {
    const toast = document.getElementById('mobile-toast');
    document.getElementById('mobile-toast-text').innerText = mensagem;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Helpers de Navegação do simulador mobile
function mobileNavigate(screenId) {
    document.querySelectorAll('.mobile-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`m-screen-${screenId}`).classList.add('active');
}

function mobileBackToObras() {
    mobileNavigate('obras');
    renderMobileObras();
}

function mobileBackToTorres() {
    mobileNavigate('torres');
    renderMobileTorres();
}

function mobileBackToPavimentos() {
    mobileNavigate('pavimentos');
    renderMobilePavimentos();
}

function mobileBackToUnidades() {
    mobileNavigate('unidades');
    renderMobileUnidades();
}

// ==========================================
// 4. METODOS GERAIS E INICIALIZAÇÃO DA PAGINA
// ==========================================

function formatCurrency(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Relógio simulador
function updatePhoneClock() {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    document.getElementById('phone-clock').innerText = `${horas}:${minutos}`;
}

// Carregar página inicial
window.onload = function() {
    initDatabase();
    
    // Carregar UI Admin
    updateObraSelects();
    renderAdminDashboard();
    
    // Carregar UI Mobile
    loadMobileWorkers();
    
    // Relógio do Celular
    updatePhoneClock();
    setInterval(updatePhoneClock, 1000);
};
