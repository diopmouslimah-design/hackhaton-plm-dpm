# 📋 Spécification API - ReactFlow

## 🎯 Vue d'ensemble

L'équipe ReactFlow doit consommer 3 endpoints pour afficher :
- 🔷 Vue macro : 6 nœuds principaux
- 🔹 Vue détail : 56 postes d'assemblage
- ⚠️ Liste des issues/alertes

---

## 📡 Endpoints

### 1️⃣ **GET /graph**

Retourne les données de graphe en deux niveaux de détail.

**Réponse :**
```json
{
  "macro": {
    "nodes": [
      {
        "id": "M1",
        "label": "Pré-assemblage",
        "kpi": {
          "leadtime": 120,
          "delta": 30
        }
      }
    ],
    "edges": [
      { "source": "M1", "target": "M2" }
    ]
  },
  "detail": {
    "nodes": [
      {
        "id": "P1",
        "label": "Poste 1",
        "macro": "Pré-assemblage",
        "kpi": {
          "cycle_prev": 25,
          "cycle_real": 32.75,
          "delta_cycle": 7.75,
          "criticite": "Critique",
          "nb_pieces": 8
        }
      }
    ],
    "edges": [
      { "source": "P1", "target": "P2" }
    ]
  }
}
```

**Champs des nœuds macro :**
| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (M1-M6) |
| `label` | string | Nom de l'étape |
| `kpi.leadtime` | number | Lead time en minutes |
| `kpi.delta` | number | Écart en minutes |

**Champs des nœuds détail :**
| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (P1-P56) |
| `label` | string | Nom du poste |
| `macro` | string | Étape macro (pour swimlanes) |
| `kpi.cycle_prev` | number | Cycle prévu (min) |
| `kpi.cycle_real` | number | Cycle réel (min) |
| `kpi.delta_cycle` | number | Écart cycle (min) |
| `kpi.criticite` | string | "Critique" \| "Majeure" \| "Mineure" |
| `kpi.nb_pieces` | number | Nombre de pièces |

---

### 2️⃣ **GET /kpis**

Retourne les indicateurs clés de performance globaux.

**Réponse :**
```json
{
  "leadtime_prev_global_min": 980,
  "leadtime_real_global_min": 1280,
  "delta_leadtime_global_min": 300,
  "wip_index_baseline": 18400,
  "wip_index_scenario": 15200,
  "delta_wip_index": 3200,
  "top_macro_bottlenecks": [
    {
      "macro_step": "Assemblage Fuselage",
      "delta_leadtime_total_min": 75
    }
  ]
}
```

**Champs :**
| Champ | Type | Description |
|-------|------|-------------|
| `leadtime_prev_global_min` | number | Lead time prévu total (min) |
| `leadtime_real_global_min` | number | Lead time réel total (min) |
| `delta_leadtime_global_min` | number | Écart global (min) |
| `wip_index_baseline` | number | WIP de référence |
| `wip_index_scenario` | number | WIP du scénario |
| `delta_wip_index` | number | Écart WIP |
| `top_macro_bottlenecks` | array | Top 3 goulets (macro_step + delta) |

---

### 3️⃣ **GET /issues**

Retourne la liste des problèmes détectés par priorité.

**Réponse :**
```json
[
  {
    "id": "issue_27",
    "level": "poste",
    "poste_id": "P27",
    "macro_step": "Assemblage Réacteurs",
    "issue_type": ["bottleneck", "high_risk_part"],
    "delta_cycle_min": 17.25,
    "nb_pieces": 11,
    "criticite_max": "Critique",
    "cout_total_pieces": 3000000,
    "niveau_experience": "Débutant",
    "type_alea": "machine",
    "summary": "Poste 27 = goulet majeur sur pièces critiques..."
  }
]
```

**Champs :**
| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique |
| `level` | string | "poste" \| "macro" |
| `poste_id` | string | ID du poste affecté |
| `macro_step` | string | Étape macro affectée |
| `issue_type` | array | ["bottleneck"] \| ["high_risk_part"] \| [...] |
| `delta_cycle_min` | number | Écart détecté (min) |
| `nb_pieces` | number | Nombre de pièces affectées |
| `criticite_max` | string | Niveau critique max |
| `cout_total_pieces` | number | Coût total estimé |
| `niveau_experience` | string | Compétence opérateur |
| `type_alea` | string | Type d'anomalie |
| `summary` | string | Résumé du problème |

---

## 🎨 Mapping Couleurs (Frontend)

### Delta → Couleur (Heatmap)
```
Delta ≤ 20%   → 🟢 Vert (#4CAF50)
Delta ≤ 40%   → 🟡 Jaune (#FFC107)
Delta ≤ 60%   → 🟠 Orange (#FF9800)
Delta > 60%   → 🔴 Rouge (#F44336)
```

### Criticité → Icône
```
Critique → ⚠️ Rouge
Majeure  → ⚡ Orange
Mineure  → ℹ️ Jaune
```

---

## 🚀 Utilisation Frontend

### Charger le graph
```javascript
import { apiService } from './api/apiService';

const data = await apiService.getGraph();
// data.macro.nodes, data.macro.edges
// data.detail.nodes, data.detail.edges
```

### Charger les KPIs
```javascript
const kpis = await apiService.getKPIs();
// Afficher dans un dashboard
```

### Charger les issues
```javascript
const issues = await apiService.getIssues();
// Afficher en liste, filtrer par risque
// Highlight les nœuds concernés dans le graph
```

---

## 🔄 Changement d'environnement

**Développement (Mocks) :**
```javascript
const API_BASE = "/mock";
```

**Production (Backend réel) :**
```javascript
const API_BASE = "http://localhost:8000"; // ou votre domaine
```

> ✅ Le code ne change pas, seulement la valeur de `API_BASE`.

---

## 📦 Contrat des Nœuds ReactFlow

### Macro Node
```javascript
{
  id: "M1",
  label: "Pré-assemblage",
  position: { x: 0, y: 0 },
  data: {
    label: "Pré-assemblage",
    delta: 30,
    leadtime: 120
  },
  style: {
    background: getDeltaColor(30),
    // ...
  }
}
```

### Detail Node
```javascript
{
  id: "P1",
  label: "Poste 1",
  position: { x: 0, y: 0 },
  data: {
    label: "Poste 1",
    macro: "Pré-assemblage",
    cycle_prev: 25,
    cycle_real: 32.75,
    delta_cycle: 7.75,
    criticite: "Critique",
    nb_pieces: 8
  },
  style: {
    background: getDeltaColor(7.75),
    border: `3px solid ${getCriticityColor("Critique")}`
  }
}
```

---

## ✅ Checklist Frontend

- [ ] Charger `/graph` au démarrage
- [ ] Afficher le macro-flow (6 nœuds)
- [ ] Afficher le detail-flow (56 nœuds)
- [ ] Colorier les nœuds selon `delta`
- [ ] Afficher les swimlanes par `macro` step
- [ ] Ajouter des tooltips avec KPIs
- [ ] Charger `/issues` et afficher la liste
- [ ] Permettre de cliquer sur une issue pour highlight le nœud
- [ ] Charger `/kpis` et afficher le dashboard
- [ ] Permettre de basculer entre macro/detail view

---

## 🔗 Intégration Backend

Quand le backend sera prêt :

1. Remplacer `API_BASE` par l'URL réelle
2. Adapter les endpoints si besoin (ex: `/graph` → `/api/graph`)
3. Ajouter authentification si nécessaire
4. Tester avec données réelles (56 postes)

Aucun autre changement dans le frontend n'est nécessaire !
