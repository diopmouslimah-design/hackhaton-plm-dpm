import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import "reactflow/dist/style.css";
import { apiService } from "./api/apiService";
import Dashboard from "./components/Dashboard";

function App() {
  const [graphData, setGraphData] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [issues, setIssues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Load mock data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const graphData = await apiService.getGraph();
        const kpisData = await apiService.getKPIs();
        const issuesData = await apiService.getIssues();
        
        setGraphData(graphData);
        setKpis(kpisData);
        setIssues(issuesData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadMacroView = (data) => {
    const macroNodes = data.macro.nodes.map((node, index) => ({
      id: node.id,
      position: { x: index * 300, y: 100 },
      data: {
        label: (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold" }}>{node.label}</div>
            <div style={{ fontSize: "11px", marginTop: "5px" }}>
              Δ: {node.kpi.delta} min
            </div>
            <div style={{ fontSize: "10px" }}>
              LT: {node.kpi.leadtime} min
            </div>
          </div>
        ),
      },
      style: {
        background: getMacroNodeColor(node.kpi.delta),
        border: "2px solid #333",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "150px",
        color: "#fff",
        fontSize: "12px",
      },
    }));

    setNodes(macroNodes);
    setEdges(data.macro.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      animated: true,
    })));
  };

  const loadDetailView = (data) => {
    // Group nodes by macro step for swimlanes
    const groupedByMacro = {};
    data.detail.nodes.forEach((node) => {
      const macro = node.macro || "Unknown";
      if (!groupedByMacro[macro]) {
        groupedByMacro[macro] = [];
      }
      groupedByMacro[macro].push(node);
    });

    const detailNodes = [];
    let xOffset = 50;

    Object.entries(groupedByMacro).forEach(([macro, nodes]) => {
      nodes.forEach((node, index) => {
        detailNodes.push({
          id: node.id,
          position: { x: xOffset, y: 50 + index * 100 },
          data: {
            label: (
              <div style={{ fontSize: "10px" }}>
                <div><strong>{node.label}</strong></div>
                <div>Prévu: {node.kpi.cycle_prev.toFixed(1)} min</div>
                <div>Réel: {node.kpi.cycle_real.toFixed(2)} min</div>
                <div style={{ marginTop: "3px", color: "#666" }}>
                  Δ: {node.kpi.delta_cycle.toFixed(2)} min
                </div>
                <div style={{ marginTop: "3px" }}>
                  {node.kpi.nb_pieces} pièces
                </div>
              </div>
            ),
          },
          style: {
            background: getDeltaColor(node.kpi.delta_cycle, 20),
            border: `3px solid ${getCriticityColor(node.kpi.criticite)}`,
            borderRadius: "5px",
            padding: "8px",
            minWidth: "180px",
            fontSize: "10px",
          },
        });
      });
      xOffset += 250;
    });

    setNodes(detailNodes);
    setEdges(data.detail.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      animated: true,
    })));
  };

  const handleViewChange = (newView) => {
    setView(newView);
    if (newView === "macro" && graphData) {
      loadMacroView(graphData);
    } else if (newView === "detail" && graphData) {
      loadDetailView(graphData);
    }
  };

  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Process Excel data to create graph, kpis, and issues
        const processedData = processExcelData(jsonData);
        
        setGraphData(processedData.graphData);
        setKpis(processedData.kpis);
        setIssues(processedData.issues);
        
        console.log("Excel data loaded successfully:", jsonData.length, "rows");
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        alert("Erreur lors de la lecture du fichier Excel");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processExcelData = (rows) => {
    console.log("Processing Excel data, first row:", rows[0]);
    console.log("Row keys:", Object.keys(rows[0] || {}));

    // Helper function to parse time HH:MM:SS to minutes
    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const timeString = timeStr.toString().trim();
      
      // Handle decimal format (Excel serial time)
      if (!isNaN(timeString) && timeString.indexOf(":") === -1) {
        // Excel stores time as decimal fraction of a day
        const decimalTime = parseFloat(timeString);
        return decimalTime * 24 * 60; // Convert to minutes
      }
      
      // Handle HH:MM:SS format
      const parts = timeString.split(":");
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 60 + minutes + seconds / 60;
    };

    // Group by Nom (poste name)
    const groupedByPoste = {};
    const posteMap = {}; // Map poste name to macro step
    let posteCounter = 1;

    rows.forEach((row) => {
      const posteName = row["Nom"] || row.Nom || "Unknown";
      if (!groupedByPoste[posteName]) {
        groupedByPoste[posteName] = [];
        posteMap[posteName] = `P${posteCounter}`;
        posteCounter++;
      }
      groupedByPoste[posteName].push(row);
    });

    // Create detail nodes
    const detailNodes = [];
    const issues = [];
    let totalPrevLeadtime = 0;
    let totalRealLeadtime = 0;
    let nodeIndex = 1;

    Object.entries(groupedByPoste).forEach(([posteName, rows]) => {
      // Calculate averages for this poste
      const prevTimes = rows.map(row => parseTimeToMinutes(row["Temps Prévu"] || row.Temps_Prévu || row["Temps Pr\u00e9vu"]));
      const realTimes = rows.map(row => parseTimeToMinutes(row["Temps Réel"] || row.Temps_Réel || row["Temps R\u00e9el"]));
      
      const prevAvg = prevTimes.reduce((a, b) => a + b, 0) / rows.length || 0;
      const realAvg = realTimes.reduce((a, b) => a + b, 0) / rows.length || 0;
      const delta = realAvg - prevAvg;

      const macroStep = rows[0]["Poste"] || rows[0].Poste || "Unknown";
      const nbPieces = rows.length;
      const criticite = delta > 10 ? "Critique" : delta > 5 ? "Majeure" : "Mineure";

      console.log(`Poste: ${posteName}, Prev: ${prevAvg.toFixed(2)}, Real: ${realAvg.toFixed(2)}, Delta: ${delta.toFixed(2)}`);

      detailNodes.push({
        id: `P${nodeIndex}`,
        label: posteName,
        macro: macroStep,
        kpi: {
          cycle_prev: prevAvg,
          cycle_real: realAvg,
          delta_cycle: delta,
          criticite: criticite,
          nb_pieces: nbPieces,
        },
      });

      // Create issues if delta is significant
      if (delta > 5) {
        const alea = rows[0]["Aléas Industriels"] || rows[0].Aléas_Industriels || "Non spécifié";
        const cause = rows[0]["Cause Potentielle"] || rows[0].Cause_Potentielle || "Non spécifié";
        
        issues.push({
          id: `issue_${nodeIndex}`,
          level: "poste",
          poste_id: `P${nodeIndex}`,
          macro_step: macroStep,
          issue_type: delta > 10 ? ["bottleneck"] : ["high_risk_part"],
          delta_cycle_min: delta,
          nb_pieces: nbPieces,
          criticite_max: criticite,
          cout_total_pieces: nbPieces * 50000,
          niveau_experience: "Opérateur",
          type_alea: alea,
          summary: `${posteName} : ${alea} - ${cause}`,
        });
      }

      totalPrevLeadtime += prevAvg * nbPieces;
      totalRealLeadtime += realAvg * nbPieces;
      nodeIndex++;
    });

    // Group nodes by macro step
    const groupedByMacro = {};
    detailNodes.forEach((node) => {
      const macro = node.macro;
      if (!groupedByMacro[macro]) {
        groupedByMacro[macro] = [];
      }
      groupedByMacro[macro].push(node);
    });

    // Create macro nodes
    const macroNodes = Object.entries(groupedByMacro).map(([macroName], index) => ({
      id: `M${index + 1}`,
      label: macroName,
      kpi: {
        leadtime: totalRealLeadtime / detailNodes.length,
        delta: Math.abs(totalRealLeadtime - totalPrevLeadtime) / detailNodes.length,
      },
    }));

    // Create edges
    const detailEdges = detailNodes.slice(0, -1).map((node, index) => ({
      source: node.id,
      target: detailNodes[index + 1].id,
    }));

    const macroEdges = macroNodes.slice(0, -1).map((node, index) => ({
      source: node.id,
      target: macroNodes[index + 1].id,
    }));

    const graphData = {
      macro: {
        nodes: macroNodes,
        edges: macroEdges,
      },
      detail: {
        nodes: detailNodes,
        edges: detailEdges,
      },
    };

    const kpis = {
      leadtime_prev_global_min: Math.round(totalPrevLeadtime),
      leadtime_real_global_min: Math.round(totalRealLeadtime),
      delta_leadtime_global_min: Math.round(totalRealLeadtime - totalPrevLeadtime),
      wip_index_baseline: 18400,
      wip_index_scenario: 15200,
      delta_wip_index: 3200,
      top_macro_bottlenecks: Object.entries(groupedByMacro)
        .map(([macro, nodes]) => ({
          macro_step: macro,
          delta_leadtime_total_min: Math.round(
            nodes.reduce((sum, n) => sum + n.kpi.delta_cycle, 0)
          ),
        }))
        .sort((a, b) => b.delta_leadtime_total_min - a.delta_leadtime_total_min)
        .slice(0, 3),
    };

    return { graphData, kpis, issues };
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.name.endsWith(".csv")
      ) {
        parseExcelFile(file);
      } else {
        alert("Veuillez déposer un fichier Excel (.xlsx, .xls) ou CSV");
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  };

  if (loading) {
    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        color: "#666",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚙️</div>
          <div>Chargement des données...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ width: "100vw", height: "100vh" }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileInput}
        style={{ display: "none" }}
      />
      <Dashboard
        graphData={graphData}
        kpis={kpis}
        issues={issues}
        onUploadClick={handleUploadClick}
      />
    </div>
  );
}

export default App;
