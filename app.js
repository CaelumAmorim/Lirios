// ==========================================
// LOGICA E ESTADO DA APLICAÇÃO: LÍRIOS (V3)
// ==========================================

// Variáveis de Estado Local
let db = {
    users: [],
    obras: [],
    alocacoes: [],
    unidades: [],
    matriz: [],
    limpezas: [],
    servicos: [] // Serviços de Limpeza Dinâmicos
};

// Estado da Sessão Admin
let adminSession = null;
let currentAdminTab = 'dashboard';
let activeObraId = null;
let editingUserId = null;

// Estado do Aplicativo de Campo (Colaborador)
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
        
        // Migração de usuários do banco para usar username em vez de email
        let migrated = false;
        db.users.forEach(u => {
            if (u.email !== undefined) {
                u.username = u.email.includes('@') ? u.email.split('@')[0] : u.email;
                delete u.email;
                migrated = true;
            }
        });
        
        // Garante que a usuária Michele Santos (CEO) exista no banco de dados local
        const micheleExists = db.users.some(u => u.username === 'michelesantos');
        if (!micheleExists) {
            db.users = db.users.filter(u => u.id !== 'u-ceo'); // remove CEO antigo
            db.users.push({ id: "u-ceo", nome: "Michele Santos (CEO)", username: "michelesantos", senha: "Michele123", perfil: "CEO", ativo: true });
            migrated = true;
        }
        
        if (migrated) {
            saveToStorage();
        }
        
        // Recupera sessão admin ativa se persistida
        const savedSession = localStorage.getItem('lirios_admin_session');
        if (savedSession) {
            adminSession = JSON.parse(savedSession);
        }
        return;
    }

    // 1.1 Serviços de Limpeza Iniciais (Dinâmicos)
    db.servicos = [
        { chave: "GROSSA", label: "Limpeza Grossa", icon: "fa-box-open" },
        { chave: "FINA", label: "Limpeza Fina", icon: "fa-circle-check" },
        { chave: "PESADA", label: "Limpeza Pesada", icon: "fa-helmet-safety" },
        { chave: "PASSADA_DE_PANO", label: "Passada de Pano", icon: "fa-broom" },
        { chave: "LAVAGEM_POS_FORMA", label: "Lavagem pós forma", icon: "fa-shower" }
    ];

    // 1.2 Carga inicial de Usuários (CEO, Admins e Colaboradores com senhas)
    db.users = [
        { id: "u-ceo", nome: "Michele Santos (CEO)", username: "michelesantos", senha: "Michele123", perfil: "CEO", ativo: true },
        { id: "u-admin", nome: "Ana Paula (Administrador)", username: "admin", senha: "123", perfil: "ADMIN", ativo: true },
        { id: "u-carlos", nome: "Carlos Limpeza", username: "carlos", senha: "456", perfil: "COLABORADOR", ativo: true },
        { id: "u-jose", nome: "José Roberto", username: "jose", senha: "456", perfil: "COLABORADOR", ativo: true },
        { id: "u-andre", nome: "André Lucas", username: "andre", senha: "456", perfil: "COLABORADOR", ativo: true }
    ];

    // 1.3 Carga inicial de Obras com Torres Dinâmicas
    db.obras = [
        { 
            id: "o-fontana", 
            nome: "Residencial Chapada Fontana",
            torres: [
                { nome: "Torre 01", pavimentos: 4, apts_por_pavimento: 4, qtd_halls: 1 },
                { nome: "Torre 02", pavimentos: 4, apts_por_pavimento: 4, qtd_halls: 1 }
            ]
        },
        { 
            id: "o-horizonte", 
            nome: "Residencial Horizonte",
            torres: [
                { nome: "Torre Única", pavimentos: 5, apts_por_pavimento: 6, qtd_halls: 1 }
            ]
        }
    ];

    // 1.4 Alocações Iniciais
    db.alocacoes = [
        { id: "al-1", obra_id: "o-fontana", usuario_id: "u-carlos" },
        { id: "al-2", obra_id: "o-fontana", usuario_id: "u-jose" },
        { id: "al-3", obra_id: "o-horizonte", usuario_id: "u-andre" },
        { id: "al-4", obra_id: "o-horizonte", usuario_id: "u-carlos" }
    ];

    // 1.5 Matriz de Valores Iniciais para os Serviços Iniciais nas Obras de Teste
    const valoresFontana = { GROSSA: 120.00, FINA: 180.00, PESADA: 220.00, PASSADA_DE_PANO: 50.00, LAVAGEM_POS_FORMA: 90.00 };
    const valoresHorizonte = { GROSSA: 110.00, FINA: 165.00, PESADA: 200.00, PASSADA_DE_PANO: 45.00, LAVAGEM_POS_FORMA: 80.00 };

    db.servicos.forEach(srv => {
        db.matriz.push({
            id: `m-fontana-${srv.chave}`,
            obra_id: "o-fontana",
            tipo_limpeza: srv.chave,
            valor: valoresFontana[srv.chave] || 0.00
        });
        db.matriz.push({
            id: `m-horizonte-${srv.chave}`,
            obra_id: "o-horizonte",
            tipo_limpeza: srv.chave,
            valor: valoresHorizonte[srv.chave] || 0.00
        });
    });

    // 1.6 Geração das Unidades Físicas (Apartamentos e Halls)
    db.obras.forEach(obra => {
        generateUnitsForObra(obra);
    });

    // 1.7 Carga de limpezas mockadas anteriores
    const agora = new Date();
    const hoje = new Date(agora.getTime() - 2 * 60 * 60 * 1000); 
    const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    const anteontem = new Date(agora.getTime() - 48 * 60 * 60 * 1000);

    const apto101 = db.unidades.find(u => u.obra_id === "o-fontana" && u.unidade_nome === "Apto 101" && u.torre === "Torre 01");
    const apto102 = db.unidades.find(u => u.obra_id === "o-fontana" && u.unidade_nome === "Apto 102" && u.torre === "Torre 01");
    const apto103 = db.unidades.find(u => u.obra_id === "o-fontana" && u.unidade_nome === "Apto 103" && u.torre === "Torre 01");
    const hall1 = db.unidades.find(u => u.obra_id === "o-fontana" && u.unidade_nome === "Hall" && u.torre === "Torre 01" && u.pavimento === 1);
    
    db.limpezas = [
        {
            id: "l-1",
            unidade_id: apto101.id,
            usuario_id: "u-carlos",
            tipo_limpeza: "GROSSA",
            data_inicio: new Date(anteontem.getTime() - 45 * 60 * 1000).toISOString(),
            data_conclusao: anteontem.toISOString(),
            valor_gerado: 120.00,
            observacao_canteiro: "Concluído sem pendências"
        },
        {
            id: "l-2",
            unidade_id: apto101.id,
            usuario_id: "u-carlos",
            tipo_limpeza: "FINA",
            data_inicio: new Date(ontem.getTime() - 60 * 60 * 1000).toISOString(),
            data_conclusao: ontem.toISOString(),
            valor_gerado: 180.00,
            observacao_canteiro: "Faltou material para concluir metais"
        },
        {
            id: "l-3",
            unidade_id: apto102.id,
            usuario_id: "u-jose",
            tipo_limpeza: "GROSSA",
            data_inicio: new Date(ontem.getTime() - 30 * 60 * 1000).toISOString(),
            data_conclusao: ontem.toISOString(),
            valor_gerado: 120.00,
            observacao_canteiro: "Faltou água na torre à tarde"
        },
        {
            id: "l-4",
            unidade_id: hall1.id,
            usuario_id: "u-jose",
            tipo_limpeza: "PASSADA_DE_PANO",
            data_inicio: new Date(hoje.getTime() - 20 * 60 * 1000).toISOString(),
            data_conclusao: hoje.toISOString(),
            valor_gerado: 50.00,
            observacao_canteiro: ""
        },
        {
            id: "l-5",
            unidade_id: apto103.id,
            usuario_id: "u-carlos",
            tipo_limpeza: "PESADA",
            data_inicio: new Date(agora.getTime() - 40 * 60 * 1000).toISOString(),
            data_conclusao: null,
            valor_gerado: 0.00,
            observacao_canteiro: ""
        }
    ];

    db.meta_produtividade = 4.0;
    saveToStorage();
    localStorage.setItem('lirios_db_initialized', 'true');
}

// Geração dinâmica de apartamentos e halls conforme configuração individual de cada torre
function generateUnitsForObra(obra) {
    if (!obra.torres || !Array.isArray(obra.torres)) return;

    obra.torres.forEach((tConfig, idx) => {
        const nomeTorre = tConfig.nome || `Torre ${idx + 1}`;
        const totalHalls = tConfig.qtd_halls !== undefined ? parseInt(tConfig.qtd_halls) : 1;
        const totalApts = tConfig.apts_por_pavimento !== undefined ? parseInt(tConfig.apts_por_pavimento) : 4;
        const totalPavs = tConfig.pavimentos !== undefined ? parseInt(tConfig.pavimentos) : 4;

        for (let p = 1; p <= totalPavs; p++) {
            
            // Gerar Apartamentos
            for (let a = 1; a <= totalApts; a++) {
                const aptoNum = (p * 100) + a;
                db.unidades.push({
                    id: `uni-${obra.id}-${nomeTorre.replace(/\s+/g, '_')}-${p}-${a}`,
                    obra_id: obra.id,
                    torre: nomeTorre,
                    pavimento: p,
                    unidade_nome: `Apto ${aptoNum}`,
                    tipo_unidade: 'APARTAMENTO'
                });
            }

            // Gerar Halls
            for (let h = 1; h <= totalHalls; h++) {
                const nomeHall = totalHalls === 1 ? 'Hall' : `Hall ${h}`;
                db.unidades.push({
                    id: `uni-${obra.id}-${nomeTorre.replace(/\s+/g, '_')}-${p}-hall-${h}`,
                    obra_id: obra.id,
                    torre: nomeTorre,
                    pavimento: p,
                    unidade_nome: nomeHall,
                    tipo_unidade: 'HALL'
                });
            }
        }
    });
}

function saveToStorage() {
    localStorage.setItem('lirios_db', JSON.stringify(db));
}

function loadFromStorage() {
    db = JSON.parse(localStorage.getItem('lirios_db'));
    if (db && db.meta_produtividade === undefined) {
        db.meta_produtividade = 4.0;
    }
}


// ==========================================
// 2. LOGICA DO PORTAL DE NAVEGAÇÃO E ENTRADA
// ==========================================

function selectPortal(type) {
    document.getElementById('portal-entry-screen').style.display = 'none';
    
    if (type === 'admin') {
        document.getElementById('admin-panel-layout').style.display = 'flex';
        document.getElementById('admin-login-view').style.display = 'flex';
        document.getElementById('admin-workspace').style.display = 'none';
        
        if (adminSession) {
            showAdminPanel();
        }
    } else if (type === 'colab') {
        document.getElementById('colab-panel-layout').style.display = 'flex';
        mobileLogout(); // Força tela de login
        loadMobileWorkers();
    }
}

function backToPortal() {
    // Esconde os layouts
    document.getElementById('admin-panel-layout').style.display = 'none';
    document.getElementById('colab-panel-layout').style.display = 'none';
    
    // Mostra o portal
    document.getElementById('portal-entry-screen').style.display = 'flex';
}

// ==========================================
// 3. CONTROLE DE AUTENTICAÇÃO ADMINISTRATIVA (CEO & ADMIN)
// ==========================================

function handleAdminLogin() {
    const userVal = document.getElementById('admin-username').value.trim().toLowerCase();
    const passVal = document.getElementById('admin-password').value;

    // Procura usuário no banco que tenha perfil CEO ou ADMIN e bata com o username ou nome
    const user = db.users.find(u => {
        if (u.perfil === 'CEO' || u.perfil === 'ADMIN') {
            return (u.username && u.username.toLowerCase() === userVal) || u.nome.toLowerCase().includes(userVal);
        }
        return false;
    });

    if (user && user.senha === passVal) {
        adminSession = user;
        localStorage.setItem('lirios_admin_session', JSON.stringify(user));
        
        // Reset do login
        document.getElementById('form-admin-login').reset();
        showAdminPanel();
    } else {
        alert("Credenciais administrativas incorretas! Tente o usuário cadastrado com a senha definida.");
    }
}

function showAdminPanel() {
    if (!adminSession) return;

    // Configura interface
    document.getElementById('admin-role-badge').innerText = adminSession.perfil === 'CEO' ? 'PAINEL CENTRAL - CEO' : 'PAINEL CENTRAL - ADMIN';
    document.getElementById('admin-logged-name').innerText = adminSession.nome;

    document.getElementById('admin-login-view').style.display = 'none';
    document.getElementById('admin-workspace').style.display = 'flex';

    if (db.obras.length > 0 && !activeObraId) {
        activeObraId = db.obras[0].id;
    }

    updateObraSelects();
    renderAdminDashboard();
}

function handleAdminLogout() {
    adminSession = null;
    localStorage.removeItem('lirios_admin_session');

    document.getElementById('admin-workspace').style.display = 'none';
    document.getElementById('admin-login-view').style.display = 'flex';
}

// ==========================================
// 4. SELETOR GLOBAL DE OBRA
// ==========================================

function handleGlobalObraChange() {
    activeObraId = document.getElementById('global-obra-select').value;
    
    const matrizSelect = document.getElementById('matriz-obra-select');
    const alocSelect = document.getElementById('alocacao-obra-select');
    if (matrizSelect) matrizSelect.value = activeObraId;
    if (alocSelect) alocSelect.value = activeObraId;

    switchAdminTab(currentAdminTab);
}

function updateObraSelects() {
    const globalSelect = document.getElementById('global-obra-select');
    const matrizSelect = document.getElementById('matriz-obra-select');
    const alocSelect = document.getElementById('alocacao-obra-select');
    const filtroReport = document.getElementById('filtro-relatorio-obra');

    if (!globalSelect) return;

    const opts = db.obras.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
    
    globalSelect.innerHTML = opts;
    if (activeObraId) globalSelect.value = activeObraId;

    if (matrizSelect) {
        matrizSelect.innerHTML = opts;
        if (activeObraId) matrizSelect.value = activeObraId;
    }
    if (alocSelect) {
        alocSelect.innerHTML = opts;
        if (activeObraId) alocSelect.value = activeObraId;
    }
    if (filtroReport) {
        filtroReport.innerHTML = `<option value="ALL">Todas as Obras</option>` + opts;
        if (activeObraId) filtroReport.value = activeObraId;
    }
}

// ==========================================
// 5. NAVEGAÇÃO DOS PAINÉIS DE TABS ADMIN
// ==========================================

function switchAdminTab(tabId) {
    currentAdminTab = tabId;
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`tab-${tabId}`).classList.add('active');

    loadFromStorage();
    if (tabId === 'dashboard') renderAdminDashboard();
    else if (tabId === 'obras') {
        renderAdminObras();
        resetTorreConfigCards();
    }
    else if (tabId === 'equipe') renderTeamTab();
    else if (tabId === 'matriz') {
        renderServicesList();
        renderMatrixEditor();
    }
    else if (tabId === 'alocacao') {
        renderTeamTab();
        renderAllocationGrid();
    }
    else if (tabId === 'relatorios') renderAuditReport();
    else if (tabId === 'mapa') initTowerMapTab();
}

// ==========================================
// 6. DASHBOARD E MÉTICAS FINANCEIRAS (OBRA SELECIONADA)
// ==========================================

function renderAdminDashboard() {
    loadFromStorage();
    
    const metaInput = document.getElementById('admin-meta-prod-input');
    if (metaInput) {
        metaInput.value = db.meta_produtividade !== undefined ? db.meta_produtividade : 4.0;
    }
    
    if (!activeObraId) {
        document.getElementById('admin-fat-diario').innerText = "R$ 0,00";
        document.getElementById('admin-fat-realizado').innerText = "R$ 0,00";
        document.getElementById('admin-fat-previsto').innerText = "R$ 0,00";
        document.getElementById('admin-fat-faltante').innerText = "R$ 0,00";
        document.getElementById('admin-progresso-fisico').innerText = "0 / 0";
        return;
    }

    const obra = db.obras.find(o => o.id === activeObraId);
    if (!obra) return;

    const unidadesObra = db.unidades.filter(u => u.obra_id === activeObraId);
    const idsUnidades = unidadesObra.map(u => u.id);
    
    // Limpezas concluídas
    const limpezasConcluidasObra = db.limpezas.filter(l => idsUnidades.includes(l.unidade_id) && l.data_conclusao !== null);

    // 1. Faturamento Diário (Hoje)
    const hojeStrLocal = new Date().toLocaleDateString('pt-BR');
    const limpezasHoje = limpezasConcluidasObra.filter(l => {
        if (!l.data_conclusao) return false;
        const dataLStr = new Date(l.data_conclusao).toLocaleDateString('pt-BR');
        return dataLStr === hojeStrLocal;
    });
    const fatDiario = limpezasHoje.reduce((acc, curr) => acc + parseFloat(curr.valor_gerado), 0);
    document.getElementById('admin-fat-diario').innerText = formatCurrency(fatDiario);

    // 2. Faturamento Realizado
    const fatRealizado = limpezasConcluidasObra.reduce((acc, curr) => acc + parseFloat(curr.valor_gerado), 0);
    document.getElementById('admin-fat-realizado').innerText = formatCurrency(fatRealizado);

    // 3. Faturamento Previsto (Com base na lista dinâmica de serviços)
    const precosObra = db.matriz.filter(m => m.obra_id === activeObraId);
    
    // Filtra apenas preços de serviços que ainda estão ATIVOS no db
    const chavesServicosAtivos = db.servicos.map(s => s.chave);
    const precosAtivos = precosObra.filter(m => chavesServicosAtivos.includes(m.tipo_limpeza));
    
    const somaPrecos = precosAtivos.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
    const fatPrevisto = unidadesObra.length * somaPrecos;
    document.getElementById('admin-fat-previsto').innerText = formatCurrency(fatPrevisto);

    // 4. Faturamento Faltante
    const fatFaltante = Math.max(0, fatPrevisto - fatRealizado);
    document.getElementById('admin-fat-faltante').innerText = formatCurrency(fatFaltante);

    // 5. Progresso Físico
    const totalTarefasPossiveis = unidadesObra.length * db.servicos.length;
    const totalTarefasConcluidas = limpezasConcluidasObra.filter(l => chavesServicosAtivos.includes(l.tipo_limpeza)).length;
    document.getElementById('admin-progresso-fisico').innerText = `${totalTarefasConcluidas} / ${totalTarefasPossiveis}`;

    // Gráficos e painéis
    renderProductivityChart();
    renderMissingTasksPanel(unidadesObra, limpezasConcluidasObra, precosAtivos);
}

function renderMissingTasksPanel(unidadesObra, limpezasConcluidasObra, precosAtivos) {
    const container = document.getElementById('missing-tasks-container');
    container.innerHTML = '';

    const totalUnidades = unidadesObra.length;

    if (totalUnidades === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;">Nenhuma unidade física gerada.</div>`;
        return;
    }

    if (db.servicos.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;">Nenhum serviço de limpeza cadastrado.</div>`;
        return;
    }

    db.servicos.forEach(srv => {
        const precoItem = precosAtivos.find(m => m.tipo_limpeza === srv.chave);
        const precoValor = precoItem ? parseFloat(precoItem.valor) : 0.00;

        const concluidas = limpezasConcluidasObra.filter(l => l.tipo_limpeza === srv.chave).length;
        const faltantes = Math.max(0, totalUnidades - concluidas);
        const percentConclusao = totalUnidades > 0 ? (concluidas / totalUnidades) * 100 : 0;
        const valorFaltanteSrv = faltantes * precoValor;

        const row = document.createElement('div');
        row.className = 'missing-task-row';
        row.innerHTML = `
            <div class="missing-task-row-content">
                <div class="missing-task-info">
                    <span class="missing-task-name">
                        <i class="fa-solid ${srv.icon || 'fa-broom'}" style="color: var(--primary-light)"></i>
                        <strong>${srv.label}</strong>
                    </span>
                    <span class="missing-task-count">${concluidas} de ${totalUnidades} concluídas</span>
                </div>
                <div class="missing-task-bar-outer" style="margin: 6px 0;">
                    <div class="missing-task-bar-inner" style="width: ${percentConclusao}%"></div>
                </div>
                <div class="missing-task-footer">
                    <span>Faltam: <strong>${faltantes} unidades</strong></span>
                    <span class="missing-task-value-left">${formatCurrency(valorFaltanteSrv)} faltante</span>
                </div>
            </div>
        `;
        container.appendChild(row);
    });
}

function renderProductivityChart() {
    const chartContainer = document.getElementById('productivity-chart');
    chartContainer.innerHTML = '';

    const colaboradores = db.users.filter(u => u.perfil === 'COLABORADOR' && u.ativo);
    
    if (colaboradores.length === 0) {
        chartContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding-top: 40px;">Nenhum colaborador cadastrado.</div>`;
        return;
    }

    const limite30Dias = new Date();
    limite30Dias.setDate(limite30Dias.getDate() - 30);

    const targetMeta = db.meta_produtividade !== undefined ? db.meta_produtividade : 4.0;

    colaboradores.forEach(colab => {
        const limpezasColab = db.limpezas.filter(l => l.usuario_id === colab.id && l.data_conclusao !== null && new Date(l.data_conclusao) >= limite30Dias);
        const qtdLimpezas = limpezasColab.length;

        const datasUnicas = [...new Set(limpezasColab.map(l => l.data_conclusao.split('T')[0]))];
        const diasTrabalhados = datasUnicas.length;
        const mediaDiaria = diasTrabalhados > 0 ? (qtdLimpezas / diasTrabalhados) : 0;

        // Determinar badge e cor com base na meta diária editável
        let performanceBadge = "";
        let barColor = "";
        
        if (mediaDiaria > targetMeta + 0.5) {
            performanceBadge = `<span class="prod-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3);">ACIMA DA META</span>`;
            barColor = "linear-gradient(90deg, #10B981, #34D399)";
        } else if (mediaDiaria < targetMeta - 0.5) {
            performanceBadge = `<span class="prod-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3);">ABAIXO DA META</span>`;
            barColor = "linear-gradient(90deg, #EF4444, #F87171)";
        } else {
            performanceBadge = `<span class="prod-badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3);">NA META</span>`;
            barColor = "linear-gradient(90deg, #F59E0B, #FBBF24)";
        }

        const maxUnidadesNormalizacao = Math.max(15, targetMeta * 2);
        const percentWidth = Math.min((mediaDiaria / maxUnidadesNormalizacao) * 100, 100);

        const row = document.createElement('div');
        row.className = 'productivity-row';
        row.style.marginBottom = '20px';
        row.innerHTML = `
            <div class="prod-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 600;"><i class="fa-solid fa-helmet-safety" style="color: var(--primary-light); margin-right: 6px;"></i> ${colab.nome}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${performanceBadge}
                    <span style="font-size: 11px; color: var(--text-secondary);">${qtdLimpezas} limpezas no mês</span>
                    <strong style="font-size: 13px;">${mediaDiaria.toFixed(1)} apts/dia</strong>
                </div>
            </div>
            <div class="prod-bar-outer" style="height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; position: relative;">
                <div class="prod-bar-inner" style="width: ${percentWidth}%; height: 100%; border-radius: 6px; background: ${barColor};"></div>
                <!-- Linha indicadora da meta -->
                <div style="position: absolute; left: ${(targetMeta / maxUnidadesNormalizacao) * 100}%; top: 0; bottom: 0; width: 2px; background: #fff; opacity: 0.5;" title="Meta: ${targetMeta} apts/dia"></div>
            </div>
        `;
        chartContainer.appendChild(row);
    });
}

function saveMetaProdutividade() {
    const input = document.getElementById('admin-meta-prod-input');
    if (!input) return;
    const value = parseFloat(input.value) || 4.0;
    
    loadFromStorage();
    db.meta_produtividade = value;
    saveToStorage();
    
    renderProductivityChart();
}

// ==========================================
// 7. GERENCIAMENTO DE EQUIPE (CRUD COLABORADORES)
// ==========================================

function renderTeamTab() {
    loadFromStorage();
    const tbody = document.querySelector('#table-equipe-list tbody');
    tbody.innerHTML = '';

    db.users.forEach(u => {
        const tr = document.createElement('tr');
        
        let perfilBadge = `<span class="prod-badge" style="background: rgba(99, 102, 241, 0.15); color: var(--primary-light); border: 1px solid rgba(99, 102, 241, 0.3); margin-left: 8px;">ADMIN</span>`;
        if (u.perfil === 'CEO') {
            perfilBadge = `<span class="prod-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); margin-left: 8px;">CEO</span>`;
        } else if (u.perfil === 'COLABORADOR') {
            perfilBadge = `<span class="prod-badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); margin-left: 8px;">COLAB</span>`;
        }

        const isCeo = u.perfil === 'CEO';
        
        const editButton = `
            <button class="btn-secondary" onclick="adminEditUser('${u.id}')" style="color: var(--primary-light); border-color: rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.03); padding: 4px 8px; font-size: 11px; margin-right: 4px;">
                <i class="fa-solid fa-user-pen"></i> Editar
            </button>
        `;
        
        const deleteButton = isCeo ? '<span style="color: var(--text-muted); font-size: 11px; font-style: italic; margin-left: 4px;">Vitalício</span>' : `
            <button class="btn-secondary" onclick="adminDeleteUser('${u.id}')" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.03); padding: 4px 8px; font-size: 11px;">
                <i class="fa-solid fa-user-minus"></i> Excluir
            </button>
        `;

        // Check if CEO is logged in
        const showPassword = adminSession && adminSession.perfil === 'CEO';
        const displayPassword = showPassword ? u.senha : '***';

        tr.innerHTML = `
            <td style="font-weight: 600;">${u.nome}${perfilBadge}</td>
            <td>${u.username}</td>
            <td style="font-family: monospace; font-size: 13px; letter-spacing: 1px;">${displayPassword}</td>
            <td>
                ${editButton}
                ${deleteButton}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function adminCreateUser() {
    const nome = document.getElementById('usr-nome').value.trim();
    const username = document.getElementById('usr-username').value.trim().toLowerCase();
    const senha = document.getElementById('usr-senha').value;
    const perfil = document.getElementById('usr-perfil').value;

    if (!nome || !username || !senha) {
        alert("Preencha todos os campos obrigatórios!");
        return;
    }

    if (editingUserId) {
        // Modo Edição
        if (db.users.some(u => u.username.toLowerCase() === username && u.id !== editingUserId)) {
            alert("Já existe um membro cadastrado com este usuário de login!");
            return;
        }

        const user = db.users.find(u => u.id === editingUserId);
        if (user) {
            user.nome = nome;
            user.username = username;
            user.senha = senha;
            user.perfil = perfil;
        }

        editingUserId = null;
        alert("Membro da equipe atualizado com sucesso!");
    } else {
        // Modo Cadastro
        if (db.users.some(u => u.username.toLowerCase() === username)) {
            alert("Já existe um membro cadastrado com este usuário de login!");
            return;
        }

        const novoUsuario = {
            id: `u-${Date.now()}`,
            nome,
            username,
            senha,
            perfil,
            ativo: true
        };

        db.users.push(novoUsuario);
        alert(`Membro "${nome}" cadastrado com sucesso!`);
    }

    saveToStorage();

    adminCancelEdit();
    renderTeamTab();
    loadMobileWorkers(); // atualiza select do mobile
    renderAllocationGrid(); // sincroniza o grid de alocação à direita
}

function adminEditUser(userId) {
    const user = db.users.find(u => u.id === userId);
    if (!user) return;

    editingUserId = userId;

    document.getElementById('usr-nome').value = user.nome;
    document.getElementById('usr-username').value = user.username;
    document.getElementById('usr-senha').value = user.senha;
    document.getElementById('usr-perfil').value = user.perfil;

    document.getElementById('form-colaborador-titulo').innerHTML = `
        <i class="fa-solid fa-user-pen" style="color: var(--primary-light)"></i>
        Editar Membro da Equipe
    `;
    document.getElementById('btn-salvar-colaborador').innerHTML = `
        <i class="fa-solid fa-user-check"></i> Salvar Alterações
    `;
    document.getElementById('btn-cancelar-edicao').style.display = 'inline-block';
}

function adminCancelEdit() {
    editingUserId = null;
    document.getElementById('form-criar-colaborador').reset();

    document.getElementById('form-colaborador-titulo').innerHTML = `
        <i class="fa-solid fa-user-plus" style="color: var(--primary-light)"></i>
        Adicionar Membro da Equipe
    `;
    document.getElementById('btn-salvar-colaborador').innerHTML = `
        <i class="fa-solid fa-user-check"></i> Cadastrar Membro
    `;
    document.getElementById('btn-cancelar-edicao').style.display = 'none';
}

function adminDeleteUser(userId) {
    if (!confirm("Tem certeza que deseja excluir este membro da equipe? Todas as alocações e vínculos ativos serão removidos.")) return;

    db.users = db.users.filter(u => u.id !== userId);
    db.alocacoes = db.alocacoes.filter(al => al.usuario_id !== userId);
    
    saveToStorage();
    renderTeamTab();
    loadMobileWorkers();
    renderAllocationGrid(); // sincroniza o grid de alocação à direita
}

// ==========================================
// 8. GERENCIAMENTO DE SERVIÇOS (CRUD SERVIÇOS)
// ==========================================

function renderServicesList() {
    const container = document.getElementById('admin-services-list');
    container.innerHTML = '';

    if (db.servicos.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 12px; font-style: italic;">Nenhum serviço cadastrado.</div>`;
        return;
    }

    db.servicos.forEach(srv => {
        const div = document.createElement('div');
        div.className = 'matrix-item';
        div.style.padding = '8px 16px';
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid ${srv.icon || 'fa-broom'}" style="color: var(--primary-light)"></i>
                <span style="font-weight: 500; font-size: 13px;">${srv.label}</span>
            </div>
            <button class="btn-secondary" onclick="adminDeleteService('${srv.chave}')" style="color: var(--danger); border: none; background: transparent; padding: 4px; cursor: pointer;" title="Excluir Serviço">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function adminCreateService() {
    const label = document.getElementById('srv-nome').value.trim();
    if (!label) return;

    // Gera chave única
    const chave = label.toUpperCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (db.servicos.some(s => s.chave === chave)) {
        alert("Já existe um serviço com esse nome ou similar!");
        return;
    }

    const novosServicosIcones = ['fa-shower', 'fa-broom', 'fa-wind', 'fa-brush', 'fa-soap', 'fa-bucket'];
    const randomIcon = novosServicosIcones[Math.floor(Math.random() * novosServicosIcones.length)];

    const novoServico = {
        chave,
        label,
        icon: randomIcon
    };

    db.servicos.push(novoServico);

    // Propaga o novo serviço na matriz de preços para todas as obras existentes com valor R$ 0,00
    db.obras.forEach(o => {
        db.matriz.push({
            id: `m-${Date.now()}-${o.id}-${chave}`,
            obra_id: o.id,
            tipo_limpeza: chave,
            valor: 0.00
        });
    });

    saveToStorage();
    document.getElementById('form-criar-servico').reset();
    
    renderServicesList();
    renderMatrixEditor();
    renderAdminDashboard();

    alert(`Serviço de limpeza "${label}" adicionado com sucesso!`);
}

function adminDeleteService(serviceKey) {
    if (!confirm("Deseja mesmo excluir este serviço de limpeza? Ele não aparecerá mais nos novos checklists do app de campo.")) return;

    // Remove do array de serviços ativos
    db.servicos = db.servicos.filter(s => s.chave !== serviceKey);
    
    saveToStorage();
    
    renderServicesList();
    renderMatrixEditor();
    renderAdminDashboard();
}

// ==========================================
// 9. MATRIZ DE PREÇOS (EDIÇÃO DOS VALORES)
// ==========================================

function renderMatrixEditor() {
    loadFromStorage();
    const obraId = document.getElementById('matriz-obra-select').value;
    const container = document.getElementById('matrix-inputs-container');
    container.innerHTML = '';

    if (!obraId) {
        container.innerHTML = `<div style="color: var(--text-muted)">Cadastre uma obra primeiro.</div>`;
        return;
    }

    if (db.servicos.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Cadastre serviços de limpeza ativos ao lado primeiro.</div>`;
        return;
    }

    db.servicos.forEach(srv => {
        const itemMatriz = db.matriz.find(m => m.obra_id === obraId && m.tipo_limpeza === srv.chave) || { valor: 0.00 };
        
        const div = document.createElement('div');
        div.className = 'matrix-item';
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fa-solid ${srv.icon || 'fa-broom'}" style="font-size: 18px; color: var(--primary-light)"></i>
                <span style="font-weight: 500;">${srv.label}</span>
            </div>
            <div class="matrix-input-group">
                <span class="currency-symbol">R$</span>
                <input type="number" class="matrix-input" id="mat-input-${srv.chave}" step="0.01" min="0" value="${parseFloat(itemMatriz.valor).toFixed(2)}">
            </div>
        `;
        container.appendChild(div);
    });
}

function adminSaveMatrix() {
    const obraId = document.getElementById('matriz-obra-select').value;
    if (!obraId) return;

    db.servicos.forEach(srv => {
        const inputVal = parseFloat(document.getElementById(`mat-input-${srv.chave}`).value) || 0;
        const index = db.matriz.findIndex(m => m.obra_id === obraId && m.tipo_limpeza === srv.chave);
        
        if (index !== -1) {
            db.matriz[index].valor = inputVal;
        } else {
            db.matriz.push({
                id: `m-${Date.now()}-${srv.chave}`,
                obra_id: obraId,
                tipo_limpeza: srv.chave,
                valor: inputVal
            });
        }
    });

    saveToStorage();
    alert("Preços dos serviços da obra salvos!");
    
    if (obraId === activeObraId) {
        renderAdminDashboard();
    }
}

// ==========================================
// 10. CADASTRO E ALOCAÇÃO DE OBRAS
// ==========================================

function renderAdminObras() {
    loadFromStorage();
    const tbody = document.querySelector('#table-obras-list tbody');
    tbody.innerHTML = '';

    if (db.obras.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhuma obra cadastrada.</td></tr>`;
        return;
    }

    db.obras.forEach(o => {
        const totalUni = db.unidades.filter(u => u.obra_id === o.id).length;
        
        // Exibição amigável e detalhada de cada torre cadastrada na obra
        let torresListInfo = "";
        if (o.torres && Array.isArray(o.torres)) {
            torresListInfo = o.torres.map(t => {
                const hallsLabel = t.qtd_halls !== undefined ? `, ${t.qtd_halls} hall(s)` : "";
                return `<strong>${t.nome}:</strong> ${t.pavimentos} pav. (${t.apts_por_pavimento} apts/andar${hallsLabel})`;
            }).join('<br>');
        } else {
            torresListInfo = "Estrutura antiga";
        }

        const alocados = db.alocacoes.filter(al => al.obra_id === o.id).map(al => {
            const usr = db.users.find(u => u.id === al.usuario_id);
            return usr ? `<span class="alloc-badge">${usr.nome}</span>` : '';
        }).join(' ');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${o.nome}</td>
            <td style="font-size: 11px; line-height: 1.4;">${torresListInfo}</td>
            <td><strong>${totalUni}</strong> registros</td>
            <td>${alocados || '<span style="color: var(--text-muted)">Nenhum</span>'}</td>
            <td>
                <button class="btn-secondary" onclick="adminDeleteObra('${o.id}')" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.03);">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function adminCreateObra() {
    const nome = document.getElementById('obra-nome').value.trim();
    const container = document.getElementById('torres-cards-container');
    
    if (!container || container.children.length === 0) {
        alert("Adicione pelo menos 1 torre para cadastrar a obra!");
        return;
    }

    // Coleta as configurações dinâmicas de cada card de torre
    const torresConfig = [];
    const cards = container.getElementsByClassName('torre-config-card');
    
    for (let card of cards) {
        const tNome = card.querySelector('.card-torre-nome').value.trim();
        const tPavs = parseInt(card.querySelector('.card-torre-pavs').value) || 1;
        const tApts = parseInt(card.querySelector('.card-torre-apts').value) || 1;
        const tHalls = 1; // Sempre 1 hall por pavimento conforme regra de negócio implícita

        if (!tNome) {
            alert("Preencha o nome de todas as torres antes de salvar!");
            return;
        }

        torresConfig.push({
            nome: tNome,
            pavimentos: tPavs,
            apts_por_pavimento: tApts,
            qtd_halls: tHalls
        });
    }

    const novaObra = {
        id: `o-${Date.now()}`,
        nome,
        torres: torresConfig
    };

    db.obras.push(novaObra);
    generateUnitsForObra(novaObra);

    // Inicializa a matriz com valor 0.00 para cada serviço ativo na central
    db.servicos.forEach(srv => {
        db.matriz.push({
            id: `m-${Date.now()}-${novaObra.id}-${srv.chave}`,
            obra_id: novaObra.id,
            tipo_limpeza: srv.chave,
            valor: 0.00
        });
    });

    saveToStorage();
    
    activeObraId = novaObra.id;
    updateObraSelects();

    // Reset Form e re-inicializa cards padrão
    document.getElementById('form-criar-obra').reset();
    resetTorreConfigCards();
    
    renderAdminObras();
    alert(`Obra "${nome}" cadastrada com sucesso com a estrutura de torres configurada!`);
}

function adminDeleteObra(id) {
    if (!confirm("Deseja mesmo excluir esta obra? Todos os dados históricos serão apagados.")) return;
    
    db.obras = db.obras.filter(o => o.id !== id);
    db.unidades = db.unidades.filter(u => u.obra_id !== id);
    db.alocacoes = db.alocacoes.filter(al => al.obra_id !== id);
    db.matriz = db.matriz.filter(m => m.obra_id !== id);
    db.limpezas = db.limpezas.filter(l => {
        const uni = db.unidades.find(u => u.id === l.unidade_id);
        return uni && uni.obra_id === id ? false : true;
    });

    saveToStorage();

    if (activeObraId === id) {
        activeObraId = db.obras.length > 0 ? db.obras[0].id : null;
    }
    updateObraSelects();
    renderAdminObras();
}

// Carregar página inicial
window.onload = function() {
    initDatabase();
    
    // Mostra o portal geral de entrada inicialmente
    document.getElementById('portal-entry-screen').style.display = 'flex';
    document.getElementById('admin-panel-layout').style.display = 'none';
    document.getElementById('colab-panel-layout').style.display = 'none';
    
    // Inicializa cards de torres do configurador físico
    resetTorreConfigCards();
    
    // Inicializa os temas do painel e do celular
    initThemes();
};

// ==========================================
// 13. CONFIGURADOR DINÂMICO DE TORRES (CARDS)
// ==========================================

function addNewTorreCard(nome = "", pavs = 10, apts = 4) {
    const container = document.getElementById('torres-cards-container');
    if (!container) return;

    const cardId = `torre-card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const cardCount = container.children.length + 1;
    const defaultNome = nome || `Torre ${String(cardCount).padStart(2, '0')}`;

    const div = document.createElement('div');
    div.className = 'torre-config-card';
    div.id = cardId;
    div.innerHTML = `
        <button type="button" class="btn-delete-card" onclick="deleteTorreCard('${cardId}')" title="Remover Torre">
            <i class="fa-solid fa-trash-can" style="color: var(--danger);"></i>
        </button>
        
        <div class="form-group" style="margin-bottom: 0;">
            <label style="color: var(--text-secondary); font-size: 10px;">Nome da Torre / Bloco</label>
            <input type="text" class="card-torre-nome" value="${defaultNome}" placeholder="Ex: Torre 01" required style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 12px; margin-top: 4px;">
        </div>

        <div style="display: flex; gap: 8px; width: 100%;">
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
                <label style="color: var(--text-secondary); font-size: 10px;">Pavimentos</label>
                <input type="number" class="card-torre-pavs" min="1" max="50" value="${pavs}" required style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 12px; margin-top: 4px;">
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
                <label style="color: var(--text-secondary); font-size: 10px;">Aptos por Pav.</label>
                <input type="number" class="card-torre-apts" min="1" max="25" value="${apts}" required style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 12px; margin-top: 4px;">
            </div>
        </div>
    `;
    container.appendChild(div);
}

function deleteTorreCard(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
        card.remove();
    }
}

function resetTorreConfigCards() {
    const container = document.getElementById('torres-cards-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Adiciona as 3 torres iniciais no formato solicitado pelo usuário (Torre 01 de 12 andares, Torre 02 de 11 andares, Torre 03 de 11 andares, com 8 aptos/andar)
    addNewTorreCard("Torre 01", 12, 8);
    addNewTorreCard("Torre 02", 11, 8);
    addNewTorreCard("Torre 03", 11, 8);
}

// Alocações de Funcionários
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
            <label for="alloc-chk-${c.id}" style="font-size: 13px; cursor: pointer;">${c.nome} (${c.username})</label>
        `;
        container.appendChild(div);
    });
}

function adminSaveAllocations() {
    const obraId = document.getElementById('alocacao-obra-select').value;
    if (!obraId) return;

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
    alert("Equipe alocada com sucesso!");
    renderAdminObras();
}

// Relatório de Conferência
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

    const limpezasFiltradas = db.limpezas.filter(l => {
        const uni = db.unidades.find(u => u.id === l.unidade_id);
        if (!uni) return false;

        if (obraFiltro !== 'ALL' && uni.obra_id !== obraFiltro) return false;

        const dataL = new Date(l.data_conclusao);
        const dataLStr = l.data_conclusao ? l.data_conclusao.split('T')[0] : "";

        if (periodoFiltro === 'TODAY' && dataLStr !== hojeStr) return false;
        if (periodoFiltro === 'WEEK' && dataL < seteDiasAtras) return false;
        if (periodoFiltro === 'MONTH' && dataL < inicioMes) return false;

        return true;
    });

    if (limpezasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Nenhum serviço registrado.</td></tr>`;
        return;
    }

    limpezasFiltradas.sort((a,b) => new Date(b.data_inicio) - new Date(a.data_inicio));

    limpezasFiltradas.forEach(l => {
        const uni = db.unidades.find(u => u.id === l.unidade_id);
        const obra = db.obras.find(o => o.id === uni.obra_id);
        const colab = db.users.find(u => u.id === l.usuario_id);
        
        const formatInicio = new Date(l.data_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const formatFim = l.data_conclusao ? new Date(l.data_conclusao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : `<span style="color: var(--warning);"><i class="fa-solid fa-spinner fa-spin"></i> Em Execução</span>`;
        
        const labelServico = db.servicos.find(s => s.chave === l.tipo_limpeza)?.label || l.tipo_limpeza.replace(/_/g, ' ');
        const observacaoStr = l.observacao_canteiro ? l.observacao_canteiro : `<span style="color: var(--text-muted); font-style: italic;">Nenhuma</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size: 11px; line-height: 1.4;">
                <span style="color: var(--text-secondary); display: block;">Início: ${formatInicio}</span>
                <span style="display: block;">Fim: ${formatFim}</span>
            </td>
            <td><strong>${obra.nome}</strong><br><span style="font-size: 11px; color: var(--text-secondary);">${uni.torre} - ${uni.unidade_nome} (Andar ${uni.pavimento})</span></td>
            <td style="font-weight: 500;">${colab ? colab.nome : 'Desconhecido'}</td>
            <td>
                <span class="prod-badge" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); text-transform: uppercase;">
                    ${labelServico}
                </span>
            </td>
            <td style="font-size: 12px;">${observacaoStr}</td>
            <td style="text-align: right; font-weight: 700; color: ${l.data_conclusao ? 'var(--success)' : 'var(--text-muted)'};">${l.data_conclusao ? formatCurrency(l.valor_gerado) : 'R$ 0,00'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 11. LOGICA DO SIMULADOR MOBILE (COLABORADOR APP)
// ==========================================

function loadMobileWorkers() {
    const select = document.getElementById('mobile-user-select');
    if (!select) return;
    const colaboradores = db.users.filter(u => u.perfil === 'COLABORADOR' && u.ativo);
    select.innerHTML = colaboradores.map(c => `<option value="${c.id}">${c.nome} (${c.username})</option>`).join('');
}

function mobileLogin() {
    loadFromStorage();
    const userId = document.getElementById('mobile-user-select').value;
    const passVal = document.getElementById('mobile-user-pass').value;

    const user = db.users.find(u => u.id === userId);
    
    if (user && user.senha === passVal) {
        mobileState.currentUser = user;

        // Limpa input de senha para segurança
        document.getElementById('mobile-user-pass').value = '';

        document.getElementById('mobile-footer-username').innerText = user.nome;
        document.getElementById('mobile-footer').style.display = 'flex';

        mobileNavigate('obras');
        renderMobileObras();
    } else {
        alert("Senha de colaborador incorreta! Tente a senha cadastrada na central administrativa.");
    }
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
    document.getElementById('mobile-user-pass').value = '';
    mobileNavigate('login');
}

function renderMobileObras() {
    const container = document.getElementById('mobile-obras-list');
    container.innerHTML = '';

    const obrasAlocadas = db.alocacoes
        .filter(al => al.usuario_id === mobileState.currentUser.id)
        .map(al => db.obras.find(o => o.id === al.obra_id))
        .filter(o => o !== undefined);

    if (obrasAlocadas.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding-top: 40px;">Você não está alocado a nenhuma obra ativa.</div>`;
        return;
    }

    obrasAlocadas.forEach(o => {
        const div = document.createElement('div');
        div.className = 'mobile-card';
        div.onclick = () => mobileSelectObra(o.id);
        div.innerHTML = `
            <div>
                <div class="mobile-card-title">${o.nome}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">Acesso ao Canteiro de Obras</div>
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
    const pavimentos = [...new Set(unidadesTorre.map(u => u.pavimento))].sort((a,b) => b - a);

    pavimentos.forEach(p => {
        const div = document.createElement('div');
        div.className = 'mobile-card';
        div.onclick = () => mobileSelectPavimento(p);
        div.innerHTML = `
            <div class="mobile-card-title">${p}º Pavimento</div>
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
        const limpezasFeitas = db.limpezas.filter(l => l.unidade_id === uni.id);
        
        // Verifica o estado de cada serviço ATIVO cadastrado na central
        const badgeRowHTML = db.servicos.map(srv => {
            const state = getServiceState(limpezasFeitas, srv.chave);
            const microLetter = srv.label.charAt(0);
            return `<span class="badge-micro" title="${srv.label}" style="${getMicroBadgeColor(state)}">${microLetter}</span>`;
        }).join('');

        const isHall = uni.tipo_unidade === 'HALL';

        const cell = document.createElement('div');
        cell.className = `grid-cell ${isHall ? 'hall' : ''}`;
        cell.onclick = () => mobileSelectUnidade(uni.id);
        
        cell.innerHTML = `
            <div class="grid-cell-title">${uni.unidade_nome}</div>
            <div class="badge-row" style="margin-top: 4px; display: flex; gap: 3px;">
                ${badgeRowHTML}
            </div>
        `;
        grid.appendChild(cell);
    });
}

function getServiceState(limpezas, srvType) {
    const log = limpezas.find(l => l.tipo_limpeza === srvType);
    if (!log) return 'DISPONIVEL';
    if (log.data_conclusao === null) return 'EM_ANDAMENTO';
    return 'CONCLUIDO';
}

function getMicroBadgeColor(state) {
    if (state === 'CONCLUIDO') return 'background-color: var(--success); color: #fff; font-weight: bold;';
    if (state === 'EM_ANDAMENTO') return 'background-color: var(--warning); color: #000; font-weight: bold;';
    return 'background-color: rgba(255,255,255,0.06); color: var(--text-muted);';
}

function mobileSelectUnidade(unidadeId) {
    const uni = db.unidades.find(u => u.id === unidadeId);
    mobileState.currentUnidade = uni;

    document.getElementById('mobile-detalhe-title').innerText = uni.unidade_nome;
    document.getElementById('mobile-detalhe-subtitle').innerText = `${mobileState.currentTorre} - ${uni.pavimento}º Andar`;
    
    mobileNavigate('detalhe');
    
    // Renderiza dinamicamente as opções do Select móvel com os Serviços Ativos
    const select = document.getElementById('mobile-service-select');
    select.innerHTML = db.servicos.map(s => `<option value="${s.chave}">${s.label}</option>`).join('');

    // Reseta observação
    document.getElementById('mobile-obs-text').value = '';

    handleMobileServiceSelectChange();
    renderMobileUnitHistory();
}

function handleMobileServiceSelectChange() {
    loadFromStorage();
    const serviceType = document.getElementById('mobile-service-select').value;
    const uni = mobileState.currentUnidade;
    
    if (!serviceType) return;

    const logsUnidade = db.limpezas.filter(l => l.unidade_id === uni.id);
    const logServico = logsUnidade.find(l => l.tipo_limpeza === serviceType);

    const statusBox = document.getElementById('mobile-service-status-box');
    const obsSection = document.getElementById('mobile-obs-section');
    const actionsContainer = document.getElementById('mobile-action-buttons-container');

    statusBox.className = '';
    obsSection.style.display = 'none';
    actionsContainer.innerHTML = '';

    if (!logServico) {
        statusBox.classList.add('status-disponivel');
        statusBox.innerHTML = `<i class="fa-solid fa-circle-info"></i> Serviço disponível para início.`;
        
        actionsContainer.innerHTML = `
            <button class="btn-mobile-primary" onclick="mobileStartCleaning('${serviceType}')">
                <i class="fa-solid fa-play"></i> Iniciar Limpeza
            </button>
        `;
    } else if (logServico.data_conclusao === null) {
        statusBox.classList.add('status-em-andamento');
        
        const horaInicio = new Date(logServico.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        statusBox.innerHTML = `<i class="fa-solid fa-hourglass-half fa-spin"></i> Em andamento. Iniciado às: <strong>${horaInicio}</strong>`;
        
        obsSection.style.display = 'block';
        document.getElementById('mobile-obs-text').value = logServico.observacao_canteiro || "";

        actionsContainer.innerHTML = `
            <button class="btn-mobile-primary" style="background: linear-gradient(90deg, #10B981, #059669); border: none;" onclick="mobileFinishCleaning('${logServico.id}')">
                <i class="fa-solid fa-circle-check"></i> Finalizar Limpeza (Check)
            </button>
            <button class="btn-secondary" style="border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); color: var(--danger); font-size: 11px; font-weight: 600; padding: 8px;" onclick="mobileCancelCleaning('${logServico.id}')">
                Cancelar Início
            </button>
        `;
    } else {
        statusBox.classList.add('status-concluido');
        
        const formatFim = new Date(logServico.data_conclusao).toLocaleString('pt-BR');
        const executor = db.users.find(u => u.id === logServico.usuario_id);
        
        statusBox.innerHTML = `
            <div style="margin-bottom: 4px;"><i class="fa-solid fa-circle-check"></i> <strong>Serviço Concluído!</strong></div>
            <div>Por: ${executor ? executor.nome : 'Time'}</div>
            <div>Em: ${formatFim}</div>
            <div style="margin-top: 4px; font-style: italic; color: var(--text-primary)">Obs: ${logServico.observacao_canteiro || 'Nenhuma'}</div>
        `;
    }
}

function appendMobileObs(text) {
    const textarea = document.getElementById('mobile-obs-text');
    if (textarea.value.trim() === "") {
        textarea.value = text;
    } else {
        textarea.value += ", " + text;
    }
}

function mobileStartCleaning(tipo) {
    const uni = mobileState.currentUnidade;
    const colab = mobileState.currentUser;

    const novoLog = {
        id: `l-${Date.now()}`,
        unidade_id: uni.id,
        usuario_id: colab.id,
        tipo_limpeza: tipo,
        data_inicio: new Date().toISOString(),
        data_conclusao: null,
        valor_gerado: 0.00,
        observacao_canteiro: ""
    };

    db.limpezas.push(novoLog);
    saveToStorage();

    showToast("Serviço iniciado!");
    
    handleMobileServiceSelectChange();
    renderMobileUnidades();
    renderAdminDashboard();
    renderAuditReport();
}

function mobileCancelCleaning(logId) {
    if (!confirm("Deseja mesmo cancelar a limpeza?")) return;

    db.limpezas = db.limpezas.filter(l => l.id !== logId);
    saveToStorage();

    showToast("Serviço cancelado.");
    handleMobileServiceSelectChange();
    renderMobileUnidades();
    renderAdminDashboard();
    renderAuditReport();
}

function mobileFinishCleaning(logId) {
    const obsText = document.getElementById('mobile-obs-text').value.trim();
    const uni = mobileState.currentUnidade;
    
    const index = db.limpezas.findIndex(l => l.id === logId);
    if (index === -1) return;

    const tipo = db.limpezas[index].tipo_limpeza;

    const precoConfig = db.matriz.find(m => m.obra_id === uni.obra_id && m.tipo_limpeza === tipo);
    const valorSnap = precoConfig ? parseFloat(precoConfig.valor) : 0.00;

    db.limpezas[index].data_conclusao = new Date().toISOString();
    db.limpezas[index].valor_gerado = valorSnap;
    db.limpezas[index].observacao_canteiro = obsText;

    saveToStorage();
    showToast("Limpeza finalizada com sucesso!");

    handleMobileServiceSelectChange();
    renderMobileUnitHistory();
    renderMobileUnidades();
    
    renderAdminDashboard();
    renderAuditReport();
}

function renderMobileUnitHistory() {
    const container = document.getElementById('mobile-unit-history-list');
    container.innerHTML = '';

    const uni = mobileState.currentUnidade;
    const limpezasFeitas = db.limpezas.filter(l => l.unidade_id === uni.id && l.data_conclusao !== null);

    if (limpezasFeitas.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 10px;">Nenhum serviço finalizado.</div>`;
        return;
    }

    limpezasFeitas.forEach(log => {
        const executor = db.users.find(u => u.id === log.usuario_id);
        const dataStr = new Date(log.data_conclusao).toLocaleDateString('pt-BR');
        const labelSrv = db.servicos.find(s => s.chave === log.tipo_limpeza)?.label || log.tipo_limpeza.replace(/_/g, ' ');

        const div = document.createElement('div');
        div.className = 'mobile-card';
        div.style.padding = '10px';
        div.style.background = 'rgba(255,255,255,0.02)';
        div.innerHTML = `
            <div style="width: 100%;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: var(--success);">
                    <span>${labelSrv}</span>
                    <span style="font-size: 10px; color: var(--text-secondary); font-weight: normal;">${dataStr}</span>
                </div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Por: ${executor ? executor.nome : 'Time'}</div>
                ${log.observacao_canteiro ? `<div style="font-size: 11px; margin-top: 4px; color: var(--text-primary);"><i class="fa-solid fa-comment-dots"></i> ${log.observacao_canteiro}</div>` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

function showToast(mensagem) {
    const toast = document.getElementById('mobile-toast');
    document.getElementById('mobile-toast-text').innerText = mensagem;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function mobileNavigate(screenId) {
    document.querySelectorAll('.mobile-view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });
    const el = document.getElementById(`m-screen-${screenId}`);
    el.style.display = 'flex';
    el.classList.add('active');
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

function mobileOpenChangePassword() {
    document.getElementById('mobile-senha-atual').value = '';
    document.getElementById('mobile-senha-nova').value = '';
    mobileNavigate('senha');
}

function mobileBackFromSenha() {
    mobileNavigate('obras');
    renderMobileObras();
}

function mobileUpdatePassword() {
    const currentPass = document.getElementById('mobile-senha-atual').value;
    const newPass = document.getElementById('mobile-senha-nova').value.trim();

    if (!mobileState.currentUser) {
        alert("Nenhum usuário ativo logado!");
        return;
    }

    const user = db.users.find(u => u.id === mobileState.currentUser.id);
    if (!user) {
        alert("Usuário não encontrado!");
        return;
    }

    if (user.senha !== currentPass) {
        alert("Senha atual incorreta!");
        return;
    }

    if (newPass.length < 3) {
        alert("A nova senha deve ter no mínimo 3 caracteres!");
        return;
    }

    user.senha = newPass;
    mobileState.currentUser.senha = newPass;
    
    saveToStorage();
    showToast("Senha alterada com sucesso!");

    document.getElementById('mobile-senha-atual').value = '';
    document.getElementById('mobile-senha-nova').value = '';
    
    mobileNavigate('obras');
    renderMobileObras();
}

// ==========================================
// 12. METODOS GERAIS E INICIALIZAÇÃO DA PAGINA
// ==========================================

function formatCurrency(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// ==========================================
// CONTROLE DE TEMAS (ADMIN & MOBILE)
// ==========================================

function initThemes() {
    loadFromStorage();
    
    // Recupera temas salvos
    const adminTheme = localStorage.getItem('lirios_theme_admin') || 'theme-dark-classic';
    const mobileTheme = localStorage.getItem('lirios_theme_mobile') || 'theme-dark-classic';
    
    applyAdminTheme(adminTheme);
    applyMobileTheme(mobileTheme);
    
    // Configura selects se existirem na página
    const adminSelect = document.getElementById('admin-theme-select');
    if (adminSelect) adminSelect.value = adminTheme;
    
    const mobileSelect = document.getElementById('mobile-theme-select');
    if (mobileSelect) mobileSelect.value = mobileTheme;
    
    const mobileSelectFooter = document.getElementById('mobile-theme-select-footer');
    if (mobileSelectFooter) mobileSelectFooter.value = mobileTheme;
}

function changeAdminTheme() {
    const theme = document.getElementById('admin-theme-select').value;
    applyAdminTheme(theme);
}

function applyAdminTheme(theme) {
    const adminLayout = document.getElementById('admin-panel-layout');
    if (!adminLayout) return;
    
    // Remove classes antigas
    adminLayout.classList.remove('theme-dark-classic', 'theme-light-elegant', 'theme-emerald-neon', 'theme-volcano-orange');
    // Adiciona a nova
    adminLayout.classList.add(theme);
    
    localStorage.setItem('lirios_theme_admin', theme);
}

function changeMobileTheme() {
    const theme = document.getElementById('mobile-theme-select').value;
    applyMobileTheme(theme);
    
    // Sincroniza o select do rodapé se ele existir
    const footerSelect = document.getElementById('mobile-theme-select-footer');
    if (footerSelect) footerSelect.value = theme;
}

function changeMobileThemeFooter() {
    const theme = document.getElementById('mobile-theme-select-footer').value;
    applyMobileTheme(theme);
    
    // Sincroniza o select da tela de login
    const loginSelect = document.getElementById('mobile-theme-select');
    if (loginSelect) loginSelect.value = theme;
}

function applyMobileTheme(theme) {
    const colabLayout = document.getElementById('colab-panel-layout');
    if (!colabLayout) return;
    
    colabLayout.classList.remove('theme-dark-classic', 'theme-light-elegant', 'theme-emerald-neon', 'theme-volcano-orange');
    colabLayout.classList.add(theme);
    
    localStorage.setItem('lirios_theme_mobile', theme);
}

// ==========================================
// 13. TOWER VISUALIZER MAP GRID (MAPA GERAL)
// ==========================================

function initTowerMapTab() {
    loadFromStorage();
    
    const torreSelect = document.getElementById('mapa-torre-select');
    const servicoSelect = document.getElementById('mapa-servico-filter');
    if (!torreSelect || !servicoSelect) return;

    if (!activeObraId) {
        torreSelect.innerHTML = `<option value="">Nenhuma Obra Ativa</option>`;
        servicoSelect.innerHTML = `<option value="ALL">Visão Geral (Todos os Serviços)</option>`;
        document.getElementById('map-legend-bar').innerHTML = '';
        document.getElementById('tower-map-grid').innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">Nenhuma obra ativa selecionada.</div>';
        return;
    }

    const obra = db.obras.find(o => o.id === activeObraId);
    if (!obra) return;

    // Popula as Torres da obra ativa
    if (obra.torres && Array.isArray(obra.torres) && obra.torres.length > 0) {
        torreSelect.innerHTML = obra.torres.map(t => `<option value="${t.nome}">${t.nome}</option>`).join('');
    } else {
        torreSelect.innerHTML = `<option value="">Sem Torres</option>`;
    }

    // Popula os Serviços de Limpeza Ativos
    const activeServicesOptions = db.servicos.map(s => `<option value="${s.chave}">${s.label}</option>`).join('');
    servicoSelect.innerHTML = `<option value="ALL">Visão Geral (Todos os Serviços)</option>` + activeServicesOptions;

    renderTowerMap();
}

function renderTowerMap() {
    loadFromStorage();
    const gridContainer = document.getElementById('tower-map-grid');
    const legendContainer = document.getElementById('map-legend-bar');
    if (!gridContainer || !legendContainer) return;

    gridContainer.innerHTML = '';
    legendContainer.innerHTML = '';

    if (!activeObraId) {
        gridContainer.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">Nenhuma obra selecionada.</div>';
        return;
    }

    const obra = db.obras.find(o => o.id === activeObraId);
    const selectedTorreName = document.getElementById('mapa-torre-select').value;
    const selectedFilter = document.getElementById('mapa-servico-filter').value;

    if (!obra || !selectedTorreName) {
        gridContainer.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">Selecione uma torre válida.</div>';
        return;
    }

    const tConfig = obra.torres.find(t => t.nome === selectedTorreName);
    if (!tConfig) {
        gridContainer.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">Estrutura da torre não encontrada.</div>';
        return;
    }

    const totalPavs = parseInt(tConfig.pavimentos) || 1;
    const totalApts = parseInt(tConfig.apts_por_pavimento) || 1;
    
    // 1. Renderiza a Legenda correspondente
    renderLegend(selectedFilter, legendContainer);

    // 2. Título do Cabeçalho da Torre
    const headerTitle = document.createElement('div');
    headerTitle.style = "width: 100%; text-align: center; font-size: 16px; font-weight: 800; font-family: 'Outfit', sans-serif; text-transform: uppercase; background: var(--primary-gradient); color: #fff; padding: 10px; border-radius: 8px; margin-bottom: 12px; letter-spacing: 1px;";
    headerTitle.innerText = `${obra.nome} - ${selectedTorreName}`;
    gridContainer.appendChild(headerTitle);

    const towerGrid = document.createElement('div');
    towerGrid.className = "tower-map-grid";
    
    // 3. Renderiza os Pavimentos de forma Decrescente (do último ao primeiro)
    for (let p = totalPavs; p >= 1; p--) {
        const row = document.createElement('div');
        row.className = "tower-row";

        // Filtra as unidades criadas para este andar e torre
        const unidadesAndar = db.unidades.filter(uni => 
            uni.obra_id === activeObraId && 
            uni.torre === selectedTorreName && 
            uni.pavimento === p
        );

        // Separa Apartamentos e Halls
        const apts = unidadesAndar.filter(u => u.tipo_unidade === 'APARTAMENTO').sort((a, b) => a.unidade_nome.localeCompare(b.unidade_nome));
        const halls = unidadesAndar.filter(u => u.tipo_unidade === 'HALL').sort((a, b) => a.unidade_nome.localeCompare(b.unidade_nome));

        // Divide apartamentos ao meio (Esquerda vs Direita)
        const half = Math.ceil(apts.length / 2);
        const leftApts = apts.slice(0, half);
        const rightApts = apts.slice(half);

        // 3.1 Renderiza os Apartamentos do Lado Esquerdo
        leftApts.forEach(uni => {
            row.appendChild(createUnitMapCell(uni, selectedFilter));
        });

        // 3.2 Renderiza o Hall no Centro
        if (halls.length > 0) {
            halls.forEach(h => {
                row.appendChild(createUnitMapCell(h, selectedFilter, `${p}º HALL`));
            });
        } else {
            // Cria um Hall temporário se a estrutura for antiga para manter o alinhamento central
            const dummyHall = document.createElement('div');
            dummyHall.className = "tower-cell hall";
            dummyHall.innerHTML = `<span class="tower-cell-title">${p}º HALL</span>`;
            row.appendChild(dummyHall);
        }

        // 3.3 Renderiza os Apartamentos do Lado Direito
        rightApts.forEach(uni => {
            row.appendChild(createUnitMapCell(uni, selectedFilter));
        });

        towerGrid.appendChild(row);
    }
    gridContainer.appendChild(towerGrid);
}

function renderLegend(selectedFilter, legendContainer) {
    if (selectedFilter === 'ALL') {
        // Legenda completa dos 5 serviços com suas cores
        legendContainer.innerHTML = `
            <div style="font-weight: 600; color: var(--text-secondary); margin-right: 8px;">Frentes de Serviço:</div>
            ${db.servicos.map(s => {
                const srvClass = getServiceColorClass(s.chave);
                return `
                    <div class="legend-pill">
                        <div class="legend-color-box ${srvClass}"></div>
                        <span>${s.label}</span>
                    </div>
                `;
            }).join('')}
            <div style="width: 1px; height: 16px; background: var(--border-color); margin: 0 8px;"></div>
            <div class="legend-pill" style="border-style: dashed; background: transparent;">
                <div style="width: 10px; height: 10px; border: 1px dashed var(--warning); border-radius: 2px;"></div>
                <span>Tracejado = Em Execução</span>
            </div>
            <div class="legend-pill">
                <div style="width: 10px; height: 10px; background: var(--success); border-radius: 2px;"></div>
                <span>Aceso = Concluído</span>
            </div>
        `;
    } else {
        // Legenda de frente individual selecionada
        const srv = db.servicos.find(s => s.chave === selectedFilter);
        const srvLabel = srv ? srv.label : selectedFilter;
        const srvClass = getServiceColorClass(selectedFilter);
        
        legendContainer.innerHTML = `
            <div style="font-weight: 600; color: var(--text-secondary); margin-right: 8px;">Status da Frente: <strong>${srvLabel}</strong></div>
            <div class="legend-pill">
                <div class="legend-color-box ${srvClass}"></div>
                <span>Preenchido = Concluído</span>
            </div>
            <div class="legend-pill" style="border-style: dashed; background: transparent; padding-left: 8px;">
                <div class="legend-color-box ${srvClass}" style="opacity: 0.15; border: 1px dashed var(--srv-color); width: 10px; height: 10px;"></div>
                <span>Tracejado = Em Execução</span>
            </div>
            <div class="legend-pill" style="opacity: 0.5;">
                <div style="width: 12px; height: 12px; border: 1px solid var(--border-color); border-radius: 3px; background: rgba(255,255,255,0.02);"></div>
                <span>Sem Cor = Não Iniciado</span>
            </div>
        `;
    }
}

function getServiceColorClass(chave) {
    const key = chave.toLowerCase();
    if (['grossa', 'fina', 'pesada', 'passada_de_pano', 'lavagem_pos_forma'].includes(key)) {
        return `srv-color-${key}`;
    }
    // Fallback circular para novos serviços inseridos dinamicamente
    const keys = db.servicos.map(s => s.chave);
    const idx = keys.indexOf(chave);
    const colors = ['grossa', 'fina', 'pesada', 'passada_de_pano', 'lavagem_pos_forma'];
    const colName = colors[idx % colors.length];
    return `srv-color-${colName}`;
}

function createUnitMapCell(uni, selectedFilter, customLabel = null) {
    const cell = document.createElement('div');
    const isHall = uni.tipo_unidade === 'HALL';
    cell.className = `tower-cell ${isHall ? 'hall' : 'apartment'}`;
    
    const labelText = customLabel || uni.unidade_nome;
    cell.innerHTML = `<span class="tower-cell-title">${labelText}</span>`;

    if (!isHall) {
        cell.onclick = () => openUnitDetailsModal(uni.id);
    }

    const limpezasUnit = db.limpezas.filter(l => l.unidade_id === uni.id);

    if (selectedFilter === 'ALL') {
        // Exibe pequenos blocos coloridos (G, F, P, Pa, L) de todos os serviços na célula
        const dotsContainer = document.createElement('div');
        dotsContainer.className = "service-dots-container";
        
        db.servicos.forEach(srv => {
            const log = limpezasUnit.find(l => l.tipo_limpeza === srv.chave);
            const dot = document.createElement('div');
            dot.className = `service-dot-block ${getServiceColorClass(srv.chave)}`;
            dot.innerText = srv.label.charAt(0);
            dot.title = `${srv.label}: ${log ? (log.data_conclusao ? 'Concluído' : 'Em Execução') : 'Não Iniciado'}`;

            if (!log) {
                dot.classList.add('not-started');
            } else if (log.data_conclusao === null) {
                dot.classList.add('in-progress');
            } else {
                dot.classList.add('completed');
            }
            dotsContainer.appendChild(dot);
        });
        cell.appendChild(dotsContainer);
    } else {
        // Colore o fundo de toda a célula correspondente ao serviço selecionado no filtro
        const log = limpezasUnit.find(l => l.tipo_limpeza === selectedFilter);
        const srvClass = getServiceColorClass(selectedFilter);
        cell.classList.add(srvClass);

        if (!log) {
            cell.classList.add('not-started-fill');
        } else if (log.data_conclusao === null) {
            cell.classList.add('in-progress-fill');
        } else {
            cell.classList.add('completed-fill');
        }
    }

    return cell;
}

function openUnitDetailsModal(unidadeId) {
    loadFromStorage();
    const uni = db.unidades.find(u => u.id === unidadeId);
    if (!uni) return;

    const obra = db.obras.find(o => o.id === uni.obra_id);
    const limpezasUnit = db.limpezas.filter(l => l.unidade_id === uni.id);

    document.getElementById('modal-unit-title').innerText = uni.unidade_nome;
    document.getElementById('modal-unit-subtitle').innerText = `${obra ? obra.nome : ''} - ${uni.torre} - ${uni.pavimento}º Pavimento`;

    const contentDiv = document.getElementById('modal-unit-content');
    contentDiv.innerHTML = '';

    if (db.servicos.length === 0) {
        contentDiv.innerHTML = '<div style="color: var(--text-muted); font-style: italic; padding: 20px 0; text-align: center;">Nenhum serviço cadastrado no sistema.</div>';
    } else {
        const listContainer = document.createElement('div');
        listContainer.style = "display: flex; flex-direction: column; gap: 14px; margin-top: 10px;";

        db.servicos.forEach(srv => {
            const log = limpezasUnit.find(l => l.tipo_limpeza === srv.chave);
            const row = document.createElement('div');
            row.style = "background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px;";
            
            let statusBadge = '';
            let detailsHTML = '';

            if (!log) {
                statusBadge = '<span class="prod-badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border-color);">NÃO INICIADO</span>';
                detailsHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic;">Nenhum registro de atividade.</div>';
            } else if (log.data_conclusao === null) {
                statusBadge = '<span class="prod-badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3);">EM ANDAMENTO</span>';
                const startStr = new Date(log.data_inicio).toLocaleString('pt-BR');
                const worker = db.users.find(u => u.id === log.usuario_id);
                detailsHTML = `
                    <div style="font-size: 11px; color: var(--text-secondary);">Início: <strong>${startStr}</strong></div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Por: <strong>${worker ? worker.nome : 'Colaborador'}</strong></div>
                `;
            } else {
                statusBadge = '<span class="prod-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3);">CONCLUÍDO</span>';
                const startStr = new Date(log.data_inicio).toLocaleString('pt-BR');
                const endStr = new Date(log.data_conclusao).toLocaleString('pt-BR');
                const worker = db.users.find(u => u.id === log.usuario_id);
                const obs = log.observacao_canteiro ? log.observacao_canteiro : 'Nenhuma';
                detailsHTML = `
                    <div style="font-size: 11px; color: var(--text-secondary);">Início: <strong>${startStr}</strong></div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Fim: <strong>${endStr}</strong></div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Por: <strong>${worker ? worker.nome : 'Colaborador'}</strong></div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 4px;">Obs: <em>"${obs}"</em></div>
                `;
            }

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 6px; margin-bottom: 4px;">
                    <span style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid ${srv.icon || 'fa-broom'}" style="color: var(--primary-light);"></i>
                        ${srv.label}
                    </span>
                    ${statusBadge}
                </div>
                ${detailsHTML}
            `;
            listContainer.appendChild(row);
        });
        contentDiv.appendChild(listContainer);
    }

    document.getElementById('unit-details-modal').style.display = 'flex';
}

function closeUnitDetailsModal() {
    document.getElementById('unit-details-modal').style.display = 'none';
}

// Fecha o modal de detalhes se clicar fora da caixa do modal
window.addEventListener('click', function(event) {
    const modal = document.getElementById('unit-details-modal');
    if (event.target === modal) {
        closeUnitDetailsModal();
    }
});

