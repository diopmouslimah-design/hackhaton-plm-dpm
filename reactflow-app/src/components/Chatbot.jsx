import { useState, useRef, useEffect } from "react";

// Simple markdown formatter
const formatMarkdown = (text) => {
  if (!text) return "";
  
  let html = text
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; color: inherit;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="margin: 14px 0 10px 0; font-size: 18px; font-weight: bold; color: inherit;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="margin: 16px 0 12px 0; font-size: 20px; font-weight: bold; color: inherit;">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold; color: inherit;">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="font-style: italic; color: inherit;">$1</em>')
    // Code blocks
    .replace(/```(.*?)```/gs, '<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 8px 0; color: #333;"><code>$1</code></pre>')
    // Inline code
    .replace(/`(.+?)`/g, '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px; color: #d63384;">$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2196F3; text-decoration: underline;">$1</a>')
    // Unordered lists
    .replace(/^\- (.+)$/gim, '<li style="margin-left: 20px; color: inherit;">$1</li>')
    .replace(/(<li.*<\/li>)/s, '<ul style="margin: 8px 0; padding-left: 0; color: inherit;">$1</ul>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gim, '<li style="margin-left: 20px; color: inherit;">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  
  return html;
};

function Chatbot({ graphData, kpis, issues }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Bonjour! Je suis votre assistant IA pour l'analyse de production. Posez-moi des questions sur vos KPIs, les goulets d'étranglement, ou les problèmes détectés.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem("mistral_api_key") || "");
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem("mistral_api_key"));
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("mistral_api_key", apiKey.trim());
      setShowApiKeyInput(false);
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem("mistral_api_key");
    setApiKey("");
    setShowApiKeyInput(true);
  };

  const buildContext = () => {
    let context = "Contexte de production:\n\n";
    
    if (kpis) {
      context += `KPIs globaux:\n`;
      context += `- Lead Time Prévu: ${kpis.leadtime_prev_global_min} min\n`;
      context += `- Lead Time Réel: ${kpis.leadtime_real_global_min} min\n`;
      context += `- Écart Lead Time: ${kpis.delta_leadtime_global_min} min\n`;
      context += `- WIP Index Baseline: ${kpis.wip_index_baseline}\n`;
      context += `- WIP Index Scénario: ${kpis.wip_index_scenario}\n`;
      context += `- Delta WIP: ${kpis.delta_wip_index}\n\n`;
      
      if (kpis.top_macro_bottlenecks) {
        context += `Top goulets d'étranglement:\n`;
        kpis.top_macro_bottlenecks.forEach((b, i) => {
          context += `${i + 1}. ${b.macro_step}: +${b.delta_leadtime_total_min} min\n`;
        });
        context += "\n";
      }
    }
    
    if (issues && issues.length > 0) {
      context += `Issues détectés (${issues.length} total):\n`;
      issues.slice(0, 5).forEach((issue, i) => {
        context += `${i + 1}. ${issue.poste_id} (${issue.macro_step}):\n`;
        context += `   - ${issue.summary}\n`;
        context += `   - Δ Cycle: ${issue.delta_cycle_min} min\n`;
        context += `   - Criticité: ${issue.criticite_max}\n`;
        context += `   - Pièces: ${issue.nb_pieces}\n`;
      });
      if (issues.length > 5) {
        context += `... et ${issues.length - 5} autres issues\n`;
      }
      context += "\n";
    }
    
    if (graphData) {
      if (graphData.macro) {
        context += `Étapes macro (${graphData.macro.nodes.length} postes):\n`;
        graphData.macro.nodes.forEach((node) => {
          context += `- ${node.label}: LT=${node.kpi.leadtime} min, Δ=${node.kpi.delta} min\n`;
        });
        context += "\n";
      }
      
      if (graphData.detail) {
        context += `Postes détaillés (${graphData.detail.nodes.length} total):\n`;
        graphData.detail.nodes.slice(0, 10).forEach((node) => {
          context += `- ${node.label} (${node.macro}): Prévu=${node.kpi.cycle_prev.toFixed(1)} min, `;
          context += `Réel=${node.kpi.cycle_real.toFixed(1)} min, Δ=${node.kpi.delta_cycle.toFixed(1)} min\n`;
        });
        if (graphData.detail.nodes.length > 10) {
          context += `... et ${graphData.detail.nodes.length - 10} autres postes\n`;
        }
      }
    }
    
    return context;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (!apiKey) {
      alert("Veuillez configurer votre clé API Mistral");
      setShowApiKeyInput(true);
      return;
    }

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const context = buildContext();
      const systemMessage = {
        role: "system",
        content: `Tu es un assistant expert en analyse de production industrielle. Utilise les données suivantes pour répondre aux questions de l'utilisateur de manière précise et actionnable:\n\n${context}\n\nRéponds en français, de manière concise et professionnelle. Si tu identifies des problèmes ou opportunités d'amélioration, mentionne-les.`,
      };

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [systemMessage, ...messages.slice(-5), userMessage],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur API: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = {
        role: "assistant",
        content: data.choices[0].message.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erreur Mistral:", error);
      const errorMessage = {
        role: "assistant",
        content: `❌ Erreur: ${error.message}. Vérifiez votre clé API dans les paramètres.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "Quels sont les principaux goulets d'étranglement?",
    "Résume les KPIs les plus critiques",
    "Quelles actions recommandes-tu pour améliorer le lead time?",
    "Analyse les issues les plus urgentes",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* Header */}
      <div style={{
        padding: "20px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        borderBottom: "1px solid #e0e0e0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <h2 style={{ margin: "0 0 5px 0", fontSize: "20px" }}>🤖 Assistant IA Mistral</h2>
          <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>
            Analysez vos données de production avec l'IA
          </p>
        </div>
        <button
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          style={{
            padding: "8px 16px",
            background: "rgba(255,255,255,0.2)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          ⚙️ API Key
        </button>
      </div>

      {/* API Key Configuration */}
      {showApiKeyInput && (
        <div style={{
          padding: "15px",
          background: "#fff3cd",
          borderBottom: "1px solid #ffc107",
        }}>
          <div style={{ marginBottom: "10px", fontSize: "13px", color: "#856404" }}>
            <strong>Configuration Mistral API</strong>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Entrez votre clé API Mistral"
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            />
            <button
              onClick={saveApiKey}
              style={{
                padding: "8px 16px",
                background: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
              }}
            >
              Enregistrer
            </button>
            {localStorage.getItem("mistral_api_key") && (
              <button
                onClick={clearApiKey}
                style={{
                  padding: "8px 16px",
                  background: "#f44336",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Effacer
              </button>
            )}
          </div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: "#856404" }}>
            Obtenez votre clé API sur{" "}
            <a
              href="https://console.mistral.ai/api-keys/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0066cc" }}
            >
              console.mistral.ai
            </a>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px",
        background: "#f5f5f5",
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: "15px",
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: msg.role === "user" ? "#667eea" : "#fff",
                color: msg.role === "user" ? "#fff" : "#333",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
            />
          </div>
        ))}
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "15px" }}>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#fff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ display: "flex", gap: "5px" }}>
                <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>●</span>
                <span style={{ animation: "pulse 1.5s ease-in-out 0.2s infinite" }}>●</span>
                <span style={{ animation: "pulse 1.5s ease-in-out 0.4s infinite" }}>●</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && !isLoading && (
        <div style={{
          padding: "15px 20px",
          borderTop: "1px solid #e0e0e0",
          background: "#fff",
        }}>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px", fontWeight: "600" }}>
            Questions suggérées:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setInput(q)}
                style={{
                  padding: "8px 12px",
                  background: "#f5f5f5",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  textAlign: "left",
                  transition: "all 0.2s",
                  color: "#333",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "#e3f2fd";
                  e.target.style.borderColor = "#2196F3";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "#f5f5f5";
                  e.target.style.borderColor = "#e0e0e0";
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: "20px",
        borderTop: "1px solid #e0e0e0",
        background: "#fff",
      }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Posez une question sur vos données de production..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
              resize: "none",
              height: "60px",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              padding: "12px 24px",
              background: isLoading || !input.trim() ? "#ccc" : "#667eea",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "14px",
              transition: "all 0.3s",
            }}
          >
            {isLoading ? "..." : "Envoyer"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        .markdown-content ul {
          list-style-type: disc;
          padding-left: 20px;
        }
        
        .markdown-content ol {
          list-style-type: decimal;
          padding-left: 20px;
        }
        
        .markdown-content li {
          margin: 4px 0;
        }
        
        .markdown-content p {
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
}

export default Chatbot;
