// Formatter
const formatMoney = (val) => 'R$ ' + val.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

// -------------------------------------------------------------
// CENTRAL DATA STATE
// -------------------------------------------------------------
const names = ['Ana Paula', 'Thiago Silva', 'João Carlos', 'Lucas Moura', 'Maria Fernanda', 'Pedro Henrique', 'Camila Santos', 'Rafael Costa', 'Juliana Alves', 'Diego Martins', 'Fernanda Lima', 'Bruno Gomes', 'Marcos Oliveira', 'Patricia Souza', 'Rodrigo Pereira', 'Amanda Castro', 'Leandro Rodrigues', 'Vanessa Barbosa', 'Felipe Santos', 'Gabriela Silva', 'Ricardo Almeida', 'Carla Mendes', 'Paulo Vitor', 'Luana Costa', 'Marcelo Souza', 'Renata Garcia', 'Anderson Silva'];
const mockSellerGroups = ['G1', 'G2', 'G3', 'Nenhum'];

// Generate Base Core Mocks
const sellerBaseStats = names.map(name => {
    const id = name.split(' ')[0].toLowerCase();
    const grupo = mockSellerGroups[Math.floor(Math.random() * mockSellerGroups.length)];

    const callsExpected = Math.floor(800 + Math.random() * 1200);
    const callsInatExpected = Math.floor(200 + Math.random() * 400);
    const meta = Math.floor(500000 + Math.random() * 1500000);

    const callsMade = Math.floor(callsExpected * (0.6 + Math.random() * 0.5)); 
    const callsInatMade = Math.floor(callsInatExpected * (0.4 + Math.random() * 0.6)); 

    const totalAssignedCallsContext = callsMade + callsInatMade;
    const closedSales = Math.floor(totalAssignedCallsContext * (0.05 + Math.random() * 0.1)); 
    const lostSales = Math.floor(totalAssignedCallsContext * (0.1 + Math.random() * 0.15)); 
    const leadsAberto = Math.floor(totalAssignedCallsContext * (0.2 + Math.random() * 0.2)); 
    const leadsSemContato = Math.floor(totalAssignedCallsContext * (0.1 + Math.random() * 0.2)); 
    
    const leadsTotaisGerais = Math.floor(totalAssignedCallsContext * (1.1 + Math.random() * 0.2)); 

    const revenueClosed = closedSales * (2000 + Math.random() * 5000); 
    const revenueLost = lostSales * (1500 + Math.random() * 4000); 

    const convAtivos = 15 + Math.random() * 15; 
    const convOpor = 5 + Math.random() * 15; 
    const clientesReativados = Math.floor(callsInatMade * (0.05 + Math.random() * 0.15)); 
    const clientesNovos = Math.floor(Math.random() * 50 + 5);
    const clientesDesativados = Math.floor(Math.random() * 20 + 2);

    const clientesRisco = Math.floor(Math.random() * 30 + 5);
    const riscoReal = clientesRisco * (1500 + Math.random() * 4000);
    const riscoHistPercent = (2 + Math.random() * 10).toFixed(1); 
    
    // Explicit opportunity value tied physically to the seller metric
    const oportunidadePotencial = callsInatExpected * 3500;

    return {
        id, name, grupo,
        callsExpected, callsInatExpected, meta, callsMade, callsInatMade,
        leadsTotaisGerais, lostSales, closedSales, leadsAberto, leadsSemContato,
        revenueClosed, revenueLost, convAtivos, convOpor,
        clientesReativados, clientesRisco, riscoReal, riscoHistPercent,
        clientesNovos, clientesDesativados, oportunidadePotencial
    };
});

// -------------------------------------------------------------
// FILTER PIPELINE BI LOGIC
// -------------------------------------------------------------
function applyLeadsFilters() {
    const qGlobal = document.getElementById('globalEmpresa') ? document.getElementById('globalEmpresa').value.toLowerCase() : '';
    const vGrupo = document.getElementById('globalGrupo').value;
    const vVendedor = document.getElementById('globalVendedor').value; // Matches predefined mock select tags ('ana', 'thiago')
    const vPeriodo = document.getElementById('globalPeriodo').value;

    let scaler = 1.0;
    if (vPeriodo === 'mes') scaler = 0.15; // Simulate a single month of operational volume
    if (vPeriodo === '3m') scaler = 0.45; // Simulate quarter
    if (vPeriodo === '6m') scaler = 0.70; // Simulate half-year

    let filteredParams = sellerBaseStats.filter(s => {
        let m = true;
        if(qGlobal) m = m && s.name.toLowerCase().includes(qGlobal);
        if(vGrupo !== 'all') m = m && s.grupo === vGrupo; // Not explicitly coded to match selects, acts as dummy visual interaction
        if(vVendedor !== 'all') m = m && s.id === vVendedor;
        return m;
    });

    // Translate temporal scaling mapping logic creating a decoupled reactive copy
    const reactiveDataset = filteredParams.map(s => ({
        ...s,
        callsExpected: Math.round(s.callsExpected * scaler),
        callsInatExpected: Math.round(s.callsInatExpected * scaler),
        meta: s.meta * scaler,
        callsMade: Math.round(s.callsMade * scaler),
        callsInatMade: Math.round(s.callsInatMade * scaler),
        leadsTotaisGerais: Math.round(s.leadsTotaisGerais * scaler),
        lostSales: Math.round(s.lostSales * scaler),
        closedSales: Math.round(s.closedSales * scaler),
        leadsAberto: Math.round(s.leadsAberto * scaler),
        leadsSemContato: Math.round(s.leadsSemContato * scaler),
        revenueClosed: s.revenueClosed * scaler,
        revenueLost: s.revenueLost * scaler,
        clientesReativados: Math.round(s.clientesReativados * scaler),
        clientesNovos: Math.round(s.clientesNovos * scaler),
        clientesDesativados: Math.round(s.clientesDesativados * scaler),
        clientesRisco: Math.max(0, Math.round(s.clientesRisco * scaler)),
        riscoReal: s.riscoReal * scaler,
        oportunidadePotencial: s.oportunidadePotencial * scaler
    }));

    // Rank Engine Sorting Strategy
    reactiveDataset.sort((a,b) => (b.revenueClosed/b.meta) - (a.revenueClosed/a.meta));

    updateLeadsDashboardViews(reactiveDataset);
}

function updateLeadsDashboardViews(dataset) {
    if(dataset.length === 0) {
        document.getElementById('rankingTbody').innerHTML = '<tr><td colspan="7" class="text-center" style="padding:40px; color:var(--text-muted)">Nenhum operador encontrado com os filtros atuais.</td></tr>';
        return; // Zero out logic gracefully bypassed
    }
    renderKPIs(dataset);
    renderGamificationTable(dataset);
}

// -------------------------------------------------------------
// RENDERERS (REACTIVE TO SCALED DATASET STATE)
// -------------------------------------------------------------
function renderKPIs(dataset) {
    const totalSucesso = dataset.reduce((sum, s) => sum + s.closedSales, 0);
    const totalPerdido = dataset.reduce((sum, s) => sum + s.lostSales, 0);
    const totalAberto = dataset.reduce((sum, s) => sum + s.leadsAberto, 0);
    const totalSemContato = dataset.reduce((sum, s) => sum + s.leadsSemContato, 0);
    
    const totalContatosCVenda = totalSucesso;
    const totalContatosSVenda = totalPerdido;
    const totalContatosPendentes = totalAberto + totalSemContato;
    let baseGeralTotal = totalContatosCVenda + totalContatosSVenda + totalContatosPendentes;

    // Sync POC Ecosystem context
    localStorage.setItem('muvstok_carteira_total', baseGeralTotal.toString());

    const totalValVendido = dataset.reduce((sum, s) => sum + s.revenueClosed, 0);
    const totalMetaGlobal = dataset.reduce((sum, s) => sum + s.meta, 0);
    const totalRiscoValor = dataset.reduce((sum, s) => sum + s.riscoReal, 0);

    const baseInativosMockPipeline = dataset.reduce((sum, s) => sum + s.callsInatExpected, 0);
    // Explicit cohesion: The top card directly sums the individual seller details preserving native mathematical coherence
    const oportunidadesGanhoReais = dataset.reduce((sum, s) => sum + s.oportunidadePotencial, 0);

    // Card 1
    const novosClientesGeral = dataset.reduce((sum, s) => sum + s.clientesNovos, 0);
    document.getElementById('kpi-total-geral').textContent = baseGeralTotal.toLocaleString('pt-BR');
    document.getElementById('kpi-novos-geral').textContent = `+${novosClientesGeral.toLocaleString('pt-BR')} novos`;
    document.getElementById('kpi-total-contatos').textContent = totalContatosCVenda.toLocaleString('pt-BR');
    document.getElementById('kpi-vend-perd-funil').textContent = totalContatosSVenda.toLocaleString('pt-BR');
    if(document.getElementById('kpi-pendentes-funil')) document.getElementById('kpi-pendentes-funil').textContent = totalContatosPendentes.toLocaleString('pt-BR');
    
    const pctConvMaster = baseGeralTotal > 0 ? ((totalContatosCVenda/baseGeralTotal)*100).toFixed(1) : 0;
    document.getElementById('kpi-tx-conv').textContent = pctConvMaster + '%';

    // Card 2
    const vAuto = Math.floor(baseGeralTotal * 0.40);
    const vGeral = Math.floor(baseGeralTotal * 0.20);
    const vWhats = Math.floor(baseGeralTotal * 0.15);
    const vMont = Math.floor(baseGeralTotal * 0.15);
    const vReag = baseGeralTotal - (vAuto + vGeral + vWhats + vMont);

    if(document.getElementById('kpi-orig-auto')) {
        document.getElementById('kpi-orig-auto').textContent = `${vAuto.toLocaleString('pt-BR')} (40%)`;
        document.getElementById('kpi-orig-geral').textContent = `${vGeral.toLocaleString('pt-BR')} (20%)`;
        document.getElementById('kpi-orig-whats').textContent = `${vWhats.toLocaleString('pt-BR')} (15%)`;
        document.getElementById('kpi-orig-mont').textContent = `${vMont.toLocaleString('pt-BR')} (15%)`;
        document.getElementById('kpi-orig-reag').textContent = `${vReag.toLocaleString('pt-BR')} (10%)`;
    }

    // Card 3
    const pctMeta = totalMetaGlobal > 0 ? Math.min(100, (totalValVendido / totalMetaGlobal)*100).toFixed(1) : 0;
    document.getElementById('kpi-rf-val-suc').textContent = formatMoney(totalValVendido);
    document.getElementById('kpi-rf-qtd-suc').textContent = `(${totalSucesso.toLocaleString('pt-BR')} vendas)`;
    if(document.getElementById('kpi-rf-progresso')) {
        document.getElementById('kpi-rf-progresso').style.width = pctMeta + '%';
        let colorClass = 'ok';
        if(pctMeta < 70) colorClass = 'danger';
        else if(pctMeta < 90) colorClass = 'warning';
        document.getElementById('kpi-rf-progresso').className = `progress-fill ${colorClass}`;
        document.getElementById('kpi-rf-pct').textContent = pctMeta + '%';
    }
    const metaValEl = document.getElementById('kpi-rf-meta-val');
    if(metaValEl) metaValEl.textContent = 'Meta Global: ' + formatMoney(totalMetaGlobal);

    // Card 4
    document.getElementById('kpi-opor-rs').textContent = formatMoney(oportunidadesGanhoReais);
    document.getElementById('kpi-opor-qtd').textContent = `(${baseInativosMockPipeline.toLocaleString('pt-BR')} clientes)`;
    document.getElementById('kpi-risco-rs-card').textContent = formatMoney(totalRiscoValor); 
    const avgHist = (dataset.reduce((sum, s) => sum + parseFloat(s.riscoHistPercent), 0) / dataset.length).toFixed(1);
    document.getElementById('kpi-risco-pct-card').textContent = `(${avgHist}% Base Histórica)`;
}

function renderGamificationTable(dataset) {
    const tbody = document.getElementById('rankingTbody');
    let html = '';

    dataset.forEach((s, idx) => {
        let medalHtml = `<span class="rank-badge">${idx + 1}</span>`;
        if(idx === 0) medalHtml = `<span class="rank-badge gold"><i class="fa-solid fa-crown"></i></span>`;
        else if(idx === 1) medalHtml = `<span class="rank-badge silver">${idx+1}</span>`;
        else if(idx === 2) medalHtml = `<span class="rank-badge bronze">${idx+1}</span>`;

        const ligPct = s.callsExpected > 0 ? Math.min(100, Math.round((s.callsMade / s.callsExpected) * 100)) : 0;
        let ligColorClass = ligPct < 80 ? 'danger' : (ligPct >= 100 ? 'ok' : '');

        const fatPct = s.meta > 0 ? Math.round((s.revenueClosed / s.meta) * 100) : 0;
        const fillWidth = Math.min(100, fatPct);
        let fatColorClass = fatPct < 70 ? 'danger' : (fatPct >= 100 ? 'ok' : ''); 

        html += `
            <tr>
                <td>
                    <div class="seller-td">
                        ${medalHtml}
                        <span style="font-weight:700; font-size:11.5px; white-space:nowrap;">${s.name}</span>
                    </div>
                </td>
                
                <td>
                    <div class="progress-container">
                        <div class="progress-labels">
                            <span>Feitas: <strong style="color:var(--text-primary)">${s.callsMade}</strong></span>
                            <span>/ Prev: ${s.callsExpected} (${ligPct}%)</span>
                        </div>
                        <div class="progress-rail">
                            <div class="progress-fill ${ligColorClass}" style="width: ${ligPct}%"></div>
                        </div>
                    </div>
                </td>

                <td class="text-center" style="color:var(--color-ok); font-weight:800; font-size:12px;">
                    ${s.convAtivos.toFixed(1)}%
                </td>

                <td class="text-center">
                    <div style="display:flex; justify-content:center; gap:12px;">
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;">
                            <div style="display:flex; align-items:center; gap:4px; color:var(--color-ok);" title="Produtividade: ${s.callsInatMade} contatos / ${s.clientesReativados} reativações">
                                <i class="fa-solid fa-arrow-turn-up" style="font-size:10px;"></i>
                                <span style="font-size:13px; font-weight:900;">${s.clientesReativados}</span>
                            </div>
                            <span style="font-size:8px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Reativ.</span>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;">
                            <div style="display:flex; align-items:center; gap:4px; color:var(--color-danger);">
                                <i class="fa-solid fa-arrow-turn-down" style="font-size:10px;"></i>
                                <span style="font-size:13px; font-weight:900;">${s.clientesDesativados}</span>
                            </div>
                            <span style="font-size:8px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Inativaram</span>
                        </div>
                    </div>
                </td>

                <td class="text-center" style="font-weight:800; font-size:12px;">
                    <span style="color:var(--text-muted)" title="Potencial de Oportunidades: ${formatMoney(s.oportunidadePotencial)}">${(s.callsInatMade > 0 ? (s.clientesReativados / s.callsInatMade)*100 : 0).toFixed(1)}%</span>
                </td>

                <td class="text-right highlight-col-td" style="padding:14px;">
                    <span style="color:var(--muv-orange); font-weight:800; font-size:12.5px;">${formatMoney(s.riscoReal)}</span><br>
                    <span style="font-size:10px; color:white; font-family:monospace;">${s.clientesRisco} clientes críticos</span>
                    <span style="font-size:8.5px; color:var(--text-muted); display:block; margin-top:2px;">(${s.riscoHistPercent}% da Base Histórica)</span>
                </td>

                <td style="padding-left:14px;">
                    <div class="progress-container">
                        <div class="progress-labels" style="flex-direction:column; align-items:flex-start; gap:2px;">
                            <span style="color:white; font-family:monospace; font-size:11px;">Vendido: ${formatMoney(s.revenueClosed)}</span>
                            <span style="color:var(--text-muted); font-size:9.5px;">Meta: ${formatMoney(s.meta)} (${fatPct}%)</span>
                        </div>
                        <div class="progress-rail" style="height:6px; margin-top:6px;">
                            <div class="progress-fill ${fatColorClass}" style="width: ${fillWidth}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    applyLeadsFilters(); // Implicitly triggers full startup chain scaling to default temporal scope

    const filterRefs = ['globalEmpresa', 'globalGrupo', 'globalVendedor', 'globalPeriodo'];
    filterRefs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', applyLeadsFilters);
            el.addEventListener('change', applyLeadsFilters);
        }
    });
});
