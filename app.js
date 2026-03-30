// Helper Formatters
const formatMoneyFull = (val) => 'R$ ' + val.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

// -------------------------------------------------------------
// CENTRAL DATA STATE
// -------------------------------------------------------------
let vepData = [];
let atribuicaoChartInstance = null;

// Extracted Constants
const mockCompanies = ['IESA VEICULOS', 'ALLIANZ SEGUROS', 'MULTI PEÇAS S/A', 'LOGISTICA CARGAS BR', 'OFICINA MEGA', 'SUPERMERCADO DIA', 'TECH DATA SYS', 'GRUPO VAMOS', 'LOCALIZA RENT', 'MERCADO LIVRE LTDA', 'CONSTRUTORA TENDA'];
const curvas = ['A', 'A', 'B', 'B', 'B', 'C', 'C', 'C', 'C'];
const cnaes = ['AUTOPECAS', 'SEGURADORA', 'FROTISTA', 'CONCESSIONARIA', 'SEM CADASTRO', 'OFICINA ESPECIALIZADA', 'TRANSPORTE', 'GOVERNO'];
const mockSellersMap = [
    {id: 'ana', name: 'Ana Paula'}, 
    {id: 'joao', name: 'João Carlos'}, 
    {id: 'lucas', name: 'Lucas Moura'}, 
    {id: 'thiago', name: 'Thiago Silva'},
    {id: 'maria', name: 'Maria Fernanda'}
];
const mockGrupos = ['G1', 'G2', 'G3', 'Nenhum'];

function generateVepData() {
    const data = [];
    const syncTotal = parseInt(localStorage.getItem('muvstok_carteira_total') || '22227', 10);
    
    for(let i=0; i<syncTotal; i++) {
        let rn = Math.random();
        let lastPurchaseDays;
        
        // Timeline Base Dist
        if (rn < 0.45) lastPurchaseDays = Math.floor(Math.random() * 61); // 0-60
        else if (rn < 0.65) lastPurchaseDays = Math.floor(Math.random() * 24) + 61; // 61-84
        else if (rn < 0.8) lastPurchaseDays = Math.floor(Math.random() * 6) + 85; // 85-90
        else lastPurchaseDays = Math.floor(Math.random() * 200) + 91; // 91+
        
        let hasSeller = Math.random() > 0.20; 
        
        // Business Rules
        if (lastPurchaseDays > 90) {
            hasSeller = false; // Inativos não tem dono
        } else if (lastPurchaseDays >= 85 && lastPurchaseDays <= 90) {
            hasSeller = true; // Risco precisa ter dono
        }

        const isNaCarteira = hasSeller ? Math.random() > 0.35 : false; 
        const isNovo = (lastPurchaseDays <= 30) ? (Math.random() > 0.8) : false;
        
        const curva = curvas[Math.floor(Math.random() * curvas.length)];
        const cnae = cnaes[Math.floor(Math.random() * cnaes.length)];
        const grupo = mockGrupos[Math.floor(Math.random() * mockGrupos.length)];
        
        let sellerObj = mockSellersMap[Math.floor(Math.random() * mockSellersMap.length)];
        const sellerId = hasSeller ? sellerObj.id : 'none';
        const sellerName = hasSeller ? sellerObj.name : 'Sem Dono';
        
        const ticketMedio = Math.random() * 1500 + 300;
        const ultimaCompra = ticketMedio * (0.2 + Math.random() * 1.5); 
        const histRevenue = ticketMedio * (1 + Math.random() * 6);
        
        // Name mocking
        let clientName = mockCompanies[Math.floor(Math.random() * mockCompanies.length)] + ' ' + (i+1);
        if (i < mockCompanies.length) clientName = mockCompanies[i]; 
        
        const totalContatos = Math.floor(Math.random() * 15);

        data.push({
            id: `CLI_VEP_${i}`,
            companyName: clientName,
            curva, cnae, grupo,
            sellerId, sellerName, hasSeller, isNaCarteira, isNovo,
            lastPurchaseDays, histRevenue, ticketMedio, ultimaCompra, totalContatos
        });
    }
    return data;
}

// -------------------------------------------------------------
// FILTER PIPELINE & BI REACTIVITY
// -------------------------------------------------------------
function applyFilters() {
    // Collect specific inputs from unified sources
    const qGlobal = document.getElementById('globalEmpresa') ? document.getElementById('globalEmpresa').value.toLowerCase() : '';
    const qLocal = document.getElementById('searchEmpresa') ? document.getElementById('searchEmpresa').value.toLowerCase() : '';
    const query = qLocal || qGlobal;

    const vGrupo = document.getElementById('globalGrupo').value;
    const vVendedor = document.getElementById('globalVendedor').value;
    const vPeriodo = document.getElementById('globalPeriodo').value;
    const vCategoria = document.getElementById('filterCategoria').value;
    const vSemDono = document.getElementById('filterSemDono') ? document.getElementById('filterSemDono').value : 'all';

    let globalFiltered = vepData.filter(c => {
        let m = true;
        if(qGlobal) m = m && (c.companyName.toLowerCase().includes(qGlobal) || c.cnae.toLowerCase().includes(qGlobal));
        if(vGrupo !== 'all') m = m && c.grupo === vGrupo;
        if(vVendedor !== 'all') m = m && c.sellerId === vVendedor;
        
        if(vPeriodo === 'mes') m = m && (c.lastPurchaseDays <= 30 || c.lastPurchaseDays > 90);
        if(vPeriodo === '3m') m = m && (c.lastPurchaseDays <= 90 || c.lastPurchaseDays > 90);
        if(vPeriodo === '6m') m = m && (c.lastPurchaseDays <= 180 || c.lastPurchaseDays > 90);
        return m;
    });

    updateDashboardViews(globalFiltered);
}

function updateDashboardViews(dataset) {
    if(dataset.length === 0) {
        document.getElementById('empresasList').innerHTML = '<div style="color:var(--text-muted); padding:20px; font-size:10px;">Zero resultados na intersecção de filtros globais.</div>';
        // Null out numeric displays but keep layouts
    }
    
    renderKPIs(dataset);
    renderRecencyTable(dataset);
    renderAtribuicaoChart(dataset);
    window.globalDatasetCache = dataset;
    applyLocalFilters();
}

function applyLocalFilters() {
    renderEnterprises(window.globalDatasetCache || vepData);
}

// -------------------------------------------------------------
// RENDERERS (REACTIVE TO DATASET STATE)
// -------------------------------------------------------------
function renderKPIs(dataset) {
    if(!dataset) return;
    const totalClients = dataset.length;
    
    // Saúde Carteira
    const ativos = dataset.filter(c => c.lastPurchaseDays <= 90);
    const inativos = dataset.filter(c => c.lastPurchaseDays > 90);
    const novosAtivos = ativos.filter(c => c.isNovo);
    const saudePct = totalClients > 0 ? ((ativos.length / totalClients) * 100).toFixed(1) : 0;
    
    // Cobertura B2B
    const atribuidos = dataset.filter(c => c.hasSeller);
    const orfaos = dataset.filter(c => !c.hasSeller);
    const cobPct = totalClients > 0 ? ((atribuidos.length / totalClients) * 100).toFixed(1) : 0;
    
    // Financeiro
    const receitaTotal = dataset.reduce((sum, c) => sum + c.histRevenue, 0);
    const riscoTotal = inativos.reduce((sum, c) => sum + c.histRevenue, 0);

    // Dom Update
    document.getElementById('kpi-total').textContent = totalClients;
    document.getElementById('kpi-ativos').textContent = ativos.length;
    if(document.getElementById('kpi-ativos-novos')) {
        document.getElementById('kpi-ativos-novos').textContent = `+${novosAtivos.length} novos`;
    }
    document.getElementById('kpi-saude-pct').textContent = saudePct + '%';
    document.getElementById('kpi-inativos').textContent = inativos.length;
    
    document.getElementById('kpi-atribuidos').textContent = atribuidos.length;
    document.getElementById('kpi-cob-pct').textContent = cobPct + '%';
    document.getElementById('kpi-orfaos').textContent = orfaos.length;

    document.getElementById('kpi-receita-total').textContent = formatMoneyFull(receitaTotal);
    document.getElementById('kpi-risco').textContent = formatMoneyFull(riscoTotal);

    if(document.getElementById('kpi-receita-progresso')) {
        const pctProgresso = receitaTotal > 0 ? Math.min(100, (receitaTotal / (receitaTotal * 1.15)) * 100).toFixed(1) : 0;
        document.getElementById('kpi-receita-progresso').style.width = pctProgresso + '%';
        
        let colorClass = 'ok';
        if(pctProgresso < 70) colorClass = 'danger';
        else if(pctProgresso < 90) colorClass = 'warning';
        document.getElementById('kpi-receita-progresso').className = `progress-fill ${colorClass}`;
        if(document.getElementById('kpi-receita-pct')) document.getElementById('kpi-receita-pct').textContent = pctProgresso + '%';
    }
}

function renderRecencyTable(dataset) {
    const tbody = document.getElementById('recenciaTbody');
    const buckets = [
        { label: 'Em Dia (0-60d)', range: [0, 60], color: 'var(--color-ok)' },
        { label: 'Atenção (61-84d)', range: [61, 84], color: '#facc15' },
        { label: 'Risco Extremo (85-90d)', range: [85, 90], color: 'var(--color-warning)' },
        { label: 'Inativo (+91d)', range: [91, 9999], color: 'var(--color-danger)' },
    ];
    
    let html = '';
    const totalClients = dataset.length || 1;

    buckets.forEach(b => {
        const filtered = dataset.filter(c => c.lastPurchaseDays >= b.range[0] && c.lastPurchaseDays <= b.range[1]);
        const qtd = filtered.length;
        const pct = ((qtd / totalClients) * 100).toFixed(1);

        html += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <div style="width:8px; height:8px; border-radius:50%; background-color:${b.color}"></div>
                        ${b.label}
                    </div>
                </td>
                <td style="text-align:right">${qtd}</td>
                <td style="text-align:right">${pct}%</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderAtribuicaoChart(dataset) {
    if (atribuicaoChartInstance) {
        atribuicaoChartInstance.destroy();
    }

    const assigned = dataset.filter(c => c.hasSeller);
    const orphans = dataset.filter(c => !c.hasSeller);
    
    const assignedNaCarteira = assigned.filter(c => c.isNaCarteira);
    const assignedForaCarteira = assigned.filter(c => !c.isNaCarteira);

    const revAssignedNaCarteira = assignedNaCarteira.reduce((sum, c) => sum + c.histRevenue, 0);
    const revAssignedForaCarteira = assignedForaCarteira.reduce((sum, c) => sum + c.histRevenue, 0);
    const revAssigned = assigned.reduce((sum, c) => sum + c.histRevenue, 0);
    const revOrphans = orphans.reduce((sum, c) => sum + c.histRevenue, 0);

    const ctx = document.getElementById('atribuicaoChart').getContext('2d');
    atribuicaoChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Com Dono', 'Órfãos'],
            datasets: [{
                data: [revAssigned, revOrphans],
                backgroundColor: ['#f45b25', 'rgba(245, 158, 11, 0.9)'],
                borderWidth: 0,
                cutout: '65%'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 5 },
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    callbacks: { 
                        label: function(context) { return ' ' + formatMoneyFull(context.parsed || 0); }
                    } 
                }
            }
        }
    });

    const sideLegendEl = document.getElementById('raiox-side-legend');
    sideLegendEl.innerHTML = `
        <div class="raiox-line-item">
            <div class="raiox-dash" style="background:#f45b25;"></div>
            <div class="raiox-info">
                <span>Com Dono <span style="text-transform:none; font-weight:600; font-size:8px;">(${assigned.length} cli)</span></span>
                <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                    <strong style="color:white;">${formatMoneyFull(revAssigned)}</strong>
                    <span style="color:var(--color-ok); font-size:9.5px; font-weight:800;">&uarr; 3.8%</span>
                </div>
                <!-- Nested Split -->
                <div style="font-size:10px; color:var(--text-secondary); margin-top:6px; display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>Dentro <span style="font-size:8.5px">(${assignedNaCarteira.length} cli)</span>: <span style="color:white; font-weight:800;">${formatMoneyFull(revAssignedNaCarteira)}</span></span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>Fora <span style="font-size:8.5px">(${assignedForaCarteira.length} cli)</span>: <span style="color:white; font-weight:800;">${formatMoneyFull(revAssignedForaCarteira)}</span></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="raiox-line-item" style="margin-top:6px;">
            <div class="raiox-dash" style="background:rgba(245, 158, 11, 0.9);"></div>
            <div class="raiox-info">
                <span>Sem Dono (Órfão) <span style="text-transform:none; font-weight:600; font-size:8px;">(${orphans.length} cli)</span></span>
                <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                    <strong style="color:var(--color-warning);">${formatMoneyFull(revOrphans)}</strong>
                    <span style="color:var(--color-danger); font-size:9.5px; font-weight:800;">&darr; 1.5%</span>
                </div>
            </div>
        </div>
    `;
}

function renderEnterprises(dataset) {
    const container = document.getElementById('empresasList');
    
    const getCustomVals = (id) => {
        const container = document.getElementById(id);
        if (!container) return ['all'];
        const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        return checked.length > 0 ? checked : ['all'];
    };
    const qLocal = document.getElementById('searchEmpresa') ? document.getElementById('searchEmpresa').value.toLowerCase() : '';
    const vCategoriaList = getCustomVals('filterCategoria');
    const vSemDonoList = getCustomVals('filterSemDono');

    let localFiltered = dataset.filter(c => {
        let m = true;
        if(qLocal) m = m && (c.companyName.toLowerCase().includes(qLocal) || c.cnae.toLowerCase().includes(qLocal));
        
        if(!vCategoriaList.includes('all') && vCategoriaList.length > 0) {
            m = m && vCategoriaList.includes(c.cnae);
        }

        if(!vSemDonoList.includes('all') && vSemDonoList.length > 0) {
            let donoMatch = false;
            if(vSemDonoList.includes('sem_dono') && !c.hasSeller) donoMatch = true;
            if(vSemDonoList.includes('atribuido') && c.hasSeller) donoMatch = true;
            m = m && donoMatch;
        }
        return m;
    });

    const filteredForList = localFiltered.filter(c => c.lastPurchaseDays > 60);

    // Status Percentages Overview Math
    const countTotal = filteredForList.length || 1;
    const countInativo = filteredForList.filter(c => c.lastPurchaseDays > 90).length;
    const countRisco = filteredForList.filter(c => c.lastPurchaseDays >= 85 && c.lastPurchaseDays <= 90).length;
    const countAtencao = filteredForList.filter(c => c.lastPurchaseDays > 60 && c.lastPurchaseDays < 85).length;
    const countEmDia = 0;

    document.getElementById('rankingStatusOverview').innerHTML = `
        <span style="color:#facc15">Atenção: ${((countAtencao / countTotal)*100).toFixed(1)}%</span>
        <span style="color:var(--color-warning)">Risco: ${((countRisco / countTotal)*100).toFixed(1)}%</span>
        <span style="color:var(--color-danger)">Inativos: ${((countInativo / countTotal)*100).toFixed(1)}%</span>
    `;

    // Urgency Score Mapping
    filteredForList.forEach(c => c.urgencyScore = c.histRevenue * c.lastPurchaseDays);
    const sortedComps = [...filteredForList].sort((a,b) => b.urgencyScore - a.urgencyScore);
    
    let html = '';
    sortedComps.slice(0, 50).forEach(c => { 
        let statusText = 'Em Dia';
        let statusColor = 'var(--color-ok)'; // Green
        
        if (c.lastPurchaseDays > 90) {
            statusText = 'Inativo / Oportunidade';
            statusColor = 'var(--color-danger)';
        } else if (c.lastPurchaseDays >= 85) {
            statusText = 'Em Risco Extremo';
            statusColor = 'var(--color-warning)'; // Orange/Amber
        } else if (c.lastPurchaseDays > 60) {
            statusText = 'Atenção';
            statusColor = '#facc15'; // Bright Yellow
        }

        let sellerHtml = `<i class="fa-solid fa-user-astronaut"></i> ${c.sellerName}`;
        if (!c.hasSeller) {
            if (c.lastPurchaseDays > 90) {
                sellerHtml = `<span style="color:var(--text-muted); font-weight:600;"><i class="fa-solid fa-ghost"></i> Sem Vendedor (Inativo)</span>`;
            } else {
                sellerHtml = `<span style="color:var(--color-warning); font-weight:800;"><i class="fa-solid fa-triangle-exclamation"></i> ÓRFÃO (SEM DONO)</span>`;
            }
        }
        
        html += `
            <div class="empresa-item" style="border-left-color: ${statusColor};" title="Produtividade: ${c.totalContatos} Contatos Realizados">
                <div class="em-info">
                    <span class="em-name">${c.companyName}</span>
                    <span class="em-seller" style="margin-top:2px;">${sellerHtml}</span>
                    <div class="em-tags" style="margin-top:4px;">
                        <span class="pill curva" style="font-size:7px;">Curva ${c.curva} | ${c.cnae}</span>
                        <span style="font-size:8px; font-weight:800; color:${statusColor}; margin-left:2px;"><i class="fa-regular fa-clock"></i> ${statusText} (${c.lastPurchaseDays}d)</span>
                    </div>
                </div>
                <div class="em-values-right">
                    <span class="em-val-primary" style="color:${c.ultimaCompra < c.ticketMedio ? 'var(--color-danger)' : 'white'}">${formatMoneyFull(c.ultimaCompra)}</span>
                    <span class="em-val-secondary">Média Hist: ${formatMoneyFull(c.ticketMedio)}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// -------------------------------------------------------------
// INITIALIZATION & LISTENERS
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    vepData = generateVepData();
    updateDashboardViews(vepData);

    // Bind specific filter events
    const filterGlobalRefs = ['globalEmpresa', 'globalGrupo', 'globalVendedor', 'globalPeriodo'];
    filterGlobalRefs.forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.addEventListener('input', applyFilters); el.addEventListener('change', applyFilters); }
    });

    const filterLocalRefs = ['searchEmpresa'];
    filterLocalRefs.forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.addEventListener('input', applyLocalFilters); el.addEventListener('change', applyLocalFilters); }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('active'));
        }
    });
});
