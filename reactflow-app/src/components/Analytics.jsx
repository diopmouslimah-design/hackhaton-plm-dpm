import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";

function Analytics({ graphData, kpis }) {
  // Préparer les données pour le graphique Prévu vs Réel
  const cycleData = graphData?.detail?.nodes?.map((node) => ({
    name: node.label,
    prévu: node.kpi.cycle_prev,
    réel: node.kpi.cycle_real,
    delta: node.kpi.delta_cycle,
    poste: node.macro, // Stocker le poste macro pour le tooltip
  })) || [];

  // Préparer les données pour le graphique macro - CORRECTED
  // Grouper par macro et calculer le lead time total (somme des cycles)
  const macroDataMap = {};
  graphData?.detail?.nodes?.forEach((node) => {
    const macro = node.macro;
    if (!macroDataMap[macro]) {
      macroDataMap[macro] = { leadtime: 0, deltaTot: 0 };
    }
    macroDataMap[macro].leadtime += node.kpi.cycle_real;
    macroDataMap[macro].deltaTot += node.kpi.delta_cycle;
  });

  const macroData = Object.entries(macroDataMap).map(([name, data]) => ({
    name: name,
    leadtime: data.leadtime,
    delta: data.deltaTot,
  })) || [];

  // Préparer les données pour le Gantt (simplifié avec scatter)
  const ganttData = graphData?.detail?.nodes?.map((node, index) => ({
    name: node.label,
    start: index * 50, // Position simulée
    duration: node.kpi.cycle_real,
    x: index,
    y: node.kpi.cycle_real,
  })) || [];

  // Préparer les données pour la criticité
  const criticityData = graphData?.detail?.nodes?.reduce((acc, node) => {
    const crit = node.kpi.criticite;
    const existing = acc.find((item) => item.name === crit);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: crit, count: 1 });
    }
    return acc;
  }, []) || [];

  // ===== Budget calculations =====
  // hourly salary (gross) in euros
  const HOURLY_GROSS = 38.53;

  // For each node, compute potential time saving (minutes) and euro saving
  // We consider the potential saving as the amount of time that could be
  // recovered if the real duration was reduced to the planned duration.
  // savedMinutes = max(0, real - prévu)  => positive when real > prévu
  const budgetDataNodes = graphData?.detail?.nodes?.map((node) => {
    const prev = Number(node.kpi.cycle_prev) || 0;
    const real = Number(node.kpi.cycle_real) || 0;
    const savedMin = Math.max(0, real - prev);
    const savedEuros = (savedMin / 60) * HOURLY_GROSS;
    return {
      name: node.label,
      macro: node.macro,
      prévu: prev,
      réel: real,
      savedMin,
      savedEuros,
    };
  }) || [];

  const totalSavedMinutes = budgetDataNodes.reduce((s, n) => s + n.savedMin, 0);
  const totalSavedEuros = budgetDataNodes.reduce((s, n) => s + n.savedEuros, 0);
  const avgSavedEuros = budgetDataNodes.length ? totalSavedEuros / budgetDataNodes.length : 0;
  const maxSavedEuros = budgetDataNodes.length ? Math.max(...budgetDataNodes.map((n) => n.savedEuros)) : 0;

  // Group savings by macro
  const macroBudgetMap = {};
  budgetDataNodes.forEach((n) => {
    const m = n.macro || 'Autres';
    if (!macroBudgetMap[m]) macroBudgetMap[m] = { savedMin: 0, savedEuros: 0 };
    macroBudgetMap[m].savedMin += n.savedMin;
    macroBudgetMap[m].savedEuros += n.savedEuros;
  });

  const macroBudgetData = Object.entries(macroBudgetMap).map(([name, d]) => ({ name, ...d }));


  return (
    <div style={{ padding: "30px", overflowY: "auto", height: "100%" }}>
      <h1 style={{ color: "#333", marginTop: 0 }}>📈 Analyse Détaillée</h1>

      {/* Budget Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #43a047' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>Taux horaire (brut)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32', marginTop: '8px' }}>€ {HOURLY_GROSS.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #fb8c00' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>Économie Totale Potentielle</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef6c00', marginTop: '8px' }}>€ {totalSavedEuros.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>{totalSavedMinutes.toFixed(0)} min</div>
          </div>
          <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #1976d2' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>Économie Moyenne par Poste</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1565c0', marginTop: '8px' }}>€ {avgSavedEuros.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fce4ec', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #d81b60' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>Max économie poste</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c2185b', marginTop: '8px' }}>€ {maxSavedEuros.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>💶 Économies potentielles par Poste (Top 10)</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={budgetDataNodes.slice().sort((a,b)=>b.savedEuros-a.savedEuros).slice(0,10)} layout="vertical" margin={{left: 10, right:10}}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={150} />
              <Tooltip formatter={(value) => `€ ${value.toFixed(2)}`} />
              <Bar dataKey="savedEuros" fill="#4caf50" name="€ économisés" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid de graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px" }}>
        {/* Graphique 1: Temps Prévu vs Réel par Poste */}
        <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ color: "#333", marginTop: 0 }}>⏱️ Durée Prévu vs Réel (par Poste)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={cycleData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
              <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: "#fff",
                        padding: "10px",
                        border: "2px solid #333",
                        borderRadius: "4px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      }}>
                        <p style={{ margin: "0 0 5px 0", fontWeight: "bold", color: "#333" }}>
                          {data.name}
                        </p>
                        <p style={{ margin: "2px 0", color: "#555", fontSize: "12px" }}>
                          <strong>Poste Macro:</strong> {data.poste}
                        </p>
                        <p style={{ margin: "2px 0", color: "#4CAF50", fontSize: "12px" }}>
                          <strong>Prévu:</strong> {data.prévu?.toFixed(2) || 0} min
                        </p>
                        <p style={{ margin: "2px 0", color: "#FF9800", fontSize: "12px" }}>
                          <strong>Réel:</strong> {data.réel?.toFixed(2) || 0} min
                        </p>
                        <p style={{ margin: "2px 0", color: "#F44336", fontSize: "12px" }}>
                          <strong>Écart:</strong> {data.delta?.toFixed(2) || 0} min
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="prévu" fill="#4CAF50" name="Temps Prévu" />
              <Bar dataKey="réel" fill="#FF9800" name="Temps Réel" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique 2: Écart par Poste */}
        <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ color: "#333", marginTop: 0 }}>📊 Écart de Cycle (Delta)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={cycleData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
              <YAxis label={{ value: "Écart (min)", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="delta"
                stroke="#F44336"
                strokeWidth={2}
                name="Écart"
                dot={{ fill: "#F44336", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deuxième ligne de graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px" }}>
        {/* Graphique 3: Macro Lead Times */}
        <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ color: "#333", marginTop: 0 }}>🔷 Lead Time par Étape Macro</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={macroData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
              <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="leadtime" fill="#2196F3" name="Lead Time" />
              <Bar dataKey="delta" fill="#FF5252" name="Écart" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique 4: Répartition de Criticité */}
        <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h3 style={{ color: "#333", marginTop: 0 }}>⚠️ Répartition des Criticités</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={criticityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: "Nombre de Postes", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#9C27B0" name="Nombre de Postes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gantt-like visualization */}
      <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h3 style={{ color: "#333", marginTop: 0 }}>📅 Timeline des Postes (Temps Réel)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="Ordre Postes" label={{ value: "Numéro du Poste", position: "insideBottom", offset: -5 }} />
            <YAxis dataKey="y" name="Durée (min)" label={{ value: "Durée (minutes)", angle: -90, position: "insideLeft" }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="Durée Réelle" dataKey="y" data={ganttData} fill="#FF9800" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Statistiques textuelles */}
      <div style={{ marginTop: "30px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
        <div style={{ background: "#e3f2fd", padding: "20px", borderRadius: "8px", borderLeft: "4px solid #2196F3" }}>
          <div style={{ fontSize: "12px", color: "#555" }}>Nombre Total de Postes</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2196F3", marginTop: "10px" }}>
            {graphData?.detail?.nodes?.length || 0}
          </div>
        </div>
        <div style={{ background: "#fff3e0", padding: "20px", borderRadius: "8px", borderLeft: "4px solid #FF9800" }}>
          <div style={{ fontSize: "12px", color: "#555" }}>Écart Moyen</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FF9800", marginTop: "10px" }}>
            {cycleData.length > 0
              ? (cycleData.reduce((sum, item) => sum + item.delta, 0) / cycleData.length).toFixed(2)
              : 0}{" "}
            min
          </div>
        </div>
        <div style={{ background: "#f3e5f5", padding: "20px", borderRadius: "8px", borderLeft: "4px solid #9C27B0" }}>
          <div style={{ fontSize: "12px", color: "#555" }}>Écart Maximum</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#9C27B0", marginTop: "10px" }}>
            {cycleData.length > 0 ? Math.max(...cycleData.map((item) => item.delta)).toFixed(2) : 0} min
          </div>
        </div>
        <div style={{ background: "#f1f8e9", padding: "20px", borderRadius: "8px", borderLeft: "4px solid #4CAF50" }}>
          <div style={{ fontSize: "12px", color: "#555" }}>Lead Time Total</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4CAF50", marginTop: "10px" }}>
            {kpis?.leadtime_real_global_min || 0} min
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
