import { useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { getDeltaColor, getMacroNodeColor, getCriticityColor } from "../api/styleUtils";
import Analytics from "./Analytics";
import Viewer3D from "./Viewer3D";
import Chatbot from "./Chatbot";
import { useEffect } from "react";

// Add animation styles
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeOut {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
`;
document.head.appendChild(style);

function Dashboard({ graphData, kpis, issues, onUploadClick }) {
  const [view, setView] = useState("macro");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [model3dFile, setModel3dFile] = useState(null);
  const [model3dName, setModel3dName] = useState(null);

  // Update views when data changes
  useEffect(() => {
    if (graphData) {
      setLastUpdate(new Date().toLocaleTimeString());
      if (view === "macro") {
        loadMacroView();
      } else if (view === "detail") {
        loadDetailView();
      }
    }
  }, [graphData]);

  const onConnect = (params) => {
    setEdges((eds) => addEdge(params, eds));
  };

  // Load views
  const loadMacroView = () => {
    if (!graphData) return;
    const macroNodes = graphData.macro.nodes.map((node, index) => ({
      id: node.id,
      position: { x: index * 300, y: 100 },
      data: {
        label: (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{node.label}</div>
            <div style={{ fontSize: "11px", marginBottom: "4px" }}>
              Δ: {node.kpi.delta} min
            </div>
            <div style={{ fontSize: "10px", opacity: 0.8 }}>
              LT: {node.kpi.leadtime} min
            </div>
          </div>
        ),
      },
      style: {
        background: getMacroNodeColor(node.kpi.delta),
        border: "2px solid #333",
        borderRadius: "8px",
        padding: "12px",
        minWidth: "160px",
        color: "#fff",
        fontSize: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      },
    }));

    setNodes(macroNodes);
    setEdges(
      graphData.macro.edges.map((edge) => ({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        animated: true,
      }))
    );
  };

  const loadDetailView = () => {
    if (!graphData) return;
    const groupedByMacro = {};
    graphData.detail.nodes.forEach((node) => {
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
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{node.label}</div>
                <div>Prévu: {node.kpi.cycle_prev.toFixed(1)} min</div>
                <div>Réel: {node.kpi.cycle_real.toFixed(2)} min</div>
                <div style={{ marginTop: "4px", color: "#555", fontSize: "9px" }}>
                  Δ: {node.kpi.delta_cycle.toFixed(2)} min
                </div>
                <div style={{ marginTop: "4px", fontSize: "9px" }}>
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
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          },
        });
      });
      xOffset += 250;
    });

    setNodes(detailNodes);
    setEdges(
      graphData.detail.edges.map((edge) => ({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        animated: true,
      }))
    );
  };

  const handleViewChange = (newView) => {
    setView(newView);
    if (newView === "macro") {
      loadMacroView();
    } else if (newView === "detail") {
      loadDetailView();
    }
  };

  const handle3dUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".3dxml,.glb,.gltf,.obj,.fbx";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handle3dFile(file);
      }
    };
    input.click();
  };

  const handle3dFile = async (file) => {
    try {
      setModel3dFile(file);
      setModel3dName(file.name);
      setView("model3d");
      
      console.log("Fichier 3D chargé:", file.name);
    } catch (error) {
      console.error("Erreur lors du chargement du fichier 3D:", error);
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f5f5f5" }}>
      {/* Sidebar Navigation */}
      <div
        style={{
          width: "280px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          padding: "20px",
          boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ fontSize: "24px", margin: "0 0 5px 0", fontWeight: "bold", color: "#fff" }}>
            ⚙️ Production
          </h1>
          <p style={{ fontSize: "12px", margin: "0", opacity: 0.9, color: "#fff" }}>
            Tableau de bord analytique
          </p>
        </div>

        {/* Navigation Buttons */}
        <div style={{ marginBottom: "30px" }}>
          <p style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "10px", opacity: 0.9, color: "#fff", letterSpacing: "1px" }}>
            Graphes
          </p>
          <button
            onClick={() => handleViewChange("macro")}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: view === "macro" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              marginBottom: "10px",
              transition: "all 0.3s",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              if (view !== "macro") e.target.style.background = "rgba(255,255,255,0.15)";
            }}
            onMouseOut={(e) => {
              if (view !== "macro") e.target.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            🔷 Vue Macro
          </button>
          <button
            onClick={() => handleViewChange("detail")}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: view === "detail" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              marginBottom: "10px",
              transition: "all 0.3s",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              if (view !== "detail") e.target.style.background = "rgba(255,255,255,0.15)";
            }}
            onMouseOut={(e) => {
              if (view !== "detail") e.target.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            🔹 Vue Détail
          </button>
          <button
            onClick={() => handleViewChange("kpis")}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: view === "kpis" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              marginBottom: "10px",
              transition: "all 0.3s",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              if (view !== "kpis") e.target.style.background = "rgba(255,255,255,0.15)";
            }}
            onMouseOut={(e) => {
              if (view !== "kpis") e.target.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            📊 KPIs
          </button>
          <button
            onClick={() => handleViewChange("issues")}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: view === "issues" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              marginBottom: "10px",
              transition: "all 0.3s",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              if (view !== "issues") e.target.style.background = "rgba(255,255,255,0.15)";
            }}
            onMouseOut={(e) => {
              if (view !== "issues") e.target.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            ⚠️ Issues
          </button>
          <button
            onClick={() => handleViewChange("analytics")}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: view === "analytics" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              if (view !== "analytics") e.target.style.background = "rgba(255,255,255,0.15)";
            }}
            onMouseOut={(e) => {
              if (view !== "analytics") e.target.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            📈 Analyse
          </button>
          <button
            onClick={() => handleViewChange("model3d")}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: view === "model3d" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              marginTop: "10px",
              transition: "all 0.3s",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              if (view !== "model3d") e.target.style.background = "rgba(255,255,255,0.15)";
            }}
            onMouseOut={(e) => {
              if (view !== "model3d") e.target.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            🚁 Modèle 3D
          </button>
          <button
            onClick={() => handleViewChange("chatbot")}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: view === "chatbot" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              marginTop: "10px",
              transition: "all 0.3s",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              if (view !== "chatbot") e.target.style.background = "rgba(255,255,255,0.15)";
            }}
            onMouseOut={(e) => {
              if (view !== "chatbot") e.target.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            🤖 Assistant IA
          </button>
        </div>

        {/* Upload Button */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "20px" }}>
          <button
            onClick={onUploadClick}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(76, 175, 80, 0.9)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
              transition: "all 0.3s",
              marginBottom: "10px",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(76, 175, 80, 1)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(76,175,80,0.3)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(76, 175, 80, 0.9)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            📤 Importer Excel
          </button>
          <button
            onClick={handle3dUpload}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(100, 181, 246, 0.9)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
              transition: "all 0.3s",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(100, 181, 246, 1)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(100,181,246,0.3)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(100, 181, 246, 0.9)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            📦 Importer 3D
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff" }}>
        {/* Top Bar with Stats */}
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid #e0e0e0",
            padding: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            position: "relative",
          }}
        >
          {lastUpdate && (
            <div style={{
              position: "absolute",
              top: "8px",
              right: "20px",
              fontSize: "11px",
              color: "#4CAF50",
              fontWeight: "bold",
              animation: "fadeOut 3s ease-in-out",
            }}>
              ✓ Mise à jour: {lastUpdate}
            </div>
          )}
          <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#333", marginBottom: "5px", fontWeight: "600" }}>Lead Time Prévu</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2196F3" }}>
              {kpis?.leadtime_prev_global_min || 0} min
            </div>
          </div>
          <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#333", marginBottom: "5px", fontWeight: "600" }}>Lead Time Réel</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FF9800" }}>
              {kpis?.leadtime_real_global_min || 0} min
            </div>
          </div>
          <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#333", marginBottom: "5px", fontWeight: "600" }}>Écart Global</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#F44336" }}>
              {kpis?.delta_leadtime_global_min || 0} min
            </div>
          </div>
          <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#333", marginBottom: "5px", fontWeight: "600" }}>Issues Actifs</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#9C27B0" }}>
              {issues?.length || 0}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {view === "macro" && (
            <ReactFlow
              nodes={nodes.length === 0 ? (loadMacroView(), []) : nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          )}

          {view === "detail" && (
            <ReactFlow
              nodes={nodes.length === 0 ? (loadDetailView(), []) : nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          )}

          {view === "kpis" && (
            <div style={{ padding: "30px", overflowY: "auto", height: "100%" }}>
              <h2 style={{ marginTop: 0, color: "#333" }}>📊 Indicateurs Clés de Performance</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
                <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px" }}>
                  <h3 style={{ color: "#333", marginTop: 0 }}>Lead Time</h3>
                  <p style={{ color: "#333" }}>
                    <strong>Prévu:</strong> {kpis?.leadtime_prev_global_min || 0} min
                  </p>
                  <p style={{ color: "#333" }}>
                    <strong>Réel:</strong> {kpis?.leadtime_real_global_min || 0} min
                  </p>
                  <p style={{ color: "#333" }}>
                    <strong>Écart:</strong> <span style={{ color: "#F44336" }}>+{kpis?.delta_leadtime_global_min || 0} min</span>
                  </p>
                </div>
                <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px" }}>
                  <h3 style={{ color: "#333", marginTop: 0 }}>WIP Index</h3>
                  <p style={{ color: "#333" }}>
                    <strong>Baseline:</strong> {kpis?.wip_index_baseline || 0}
                  </p>
                  <p style={{ color: "#333" }}>
                    <strong>Scénario:</strong> {kpis?.wip_index_scenario || 0}
                  </p>
                  <p style={{ color: "#333" }}>
                    <strong>Gain:</strong> <span style={{ color: "#4CAF50" }}>-{kpis?.delta_wip_index || 0}</span>
                  </p>
                </div>
              </div>
              <h3 style={{ marginTop: "30px", color: "#333" }}>🔴 Top Goulets (Macro)</h3>
              <div style={{ display: "grid", gap: "10px" }}>
                {kpis?.top_macro_bottlenecks?.map((bottleneck, idx) => (
                  <div key={idx} style={{ background: "#fff3e0", padding: "15px", borderRadius: "6px", borderLeft: "4px solid #FF9800" }}>
                    <strong style={{ color: "#333" }}>{bottleneck.macro_step}</strong>
                    <p style={{ margin: "5px 0 0 0", color: "#666" }}>
                      Δ Lead Time: {bottleneck.delta_leadtime_total_min} min
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "issues" && (
            <div style={{ padding: "30px", overflowY: "auto", height: "100%" }}>
              <h2 style={{ marginTop: 0, color: "#333" }}>⚠️ Issues et Alertes</h2>
              <div style={{ display: "grid", gap: "15px" }}>
                {issues?.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    style={{
                      background: selectedIssue?.id === issue.id ? "#e3f2fd" : "#fff",
                      border: selectedIssue?.id === issue.id ? "2px solid #2196F3" : "1px solid #e0e0e0",
                      padding: "15px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
                      <div>
                        <h4 style={{ margin: "0 0 5px 0", color: "#333" }}>{issue.poste_id}</h4>
                        <p style={{ margin: "0", fontSize: "12px", color: "#666" }}>
                          {issue.macro_step}
                        </p>
                      </div>
                      <div style={{ background: "#F44336", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                        {issue.criticite_max}
                      </div>
                    </div>
                    <p style={{ margin: "8px 0", fontSize: "13px", color: "#333" }}>
                      {issue.summary}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginTop: "10px" }}>
                      <div style={{ fontSize: "12px", color: "#333" }}>
                        <strong>Δ Cycle:</strong> {issue.delta_cycle_min} min
                      </div>
                      <div style={{ fontSize: "12px", color: "#333" }}>
                        <strong>Pièces:</strong> {issue.nb_pieces}
                      </div>
                      <div style={{ fontSize: "12px", color: "#333" }}>
                        <strong>Type:</strong> {issue.type_alea}
                      </div>
                      <div style={{ fontSize: "12px", color: "#333" }}>
                        <strong>Coût:</strong> {(issue.cout_total_pieces / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "analytics" && (
            <Analytics graphData={graphData} kpis={kpis} />
          )}

          {view === "model3d" && (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "15px", background: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
                <h3 style={{ margin: "0", color: "#333" }}>
                  🚁 Modèle 3D {model3dName && `- ${model3dName}`}
                </h3>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                {model3dFile ? (
                  <Viewer3D modelFile={model3dFile} graphData={graphData} />
                ) : (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    background: "#f5f5f5",
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ color: "#999", fontSize: "16px", marginBottom: "20px" }}>
                        Aucun modèle 3D chargé
                      </p>
                      <button
                        onClick={handle3dUpload}
                        style={{
                          padding: "12px 24px",
                          background: "#667eea",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        📦 Charger un modèle 3D
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "chatbot" && (
            <Chatbot graphData={graphData} kpis={kpis} issues={issues} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
