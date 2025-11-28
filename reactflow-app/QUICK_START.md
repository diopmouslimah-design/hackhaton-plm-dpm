# 🚀 Démarrage de l'Application

## ✅ Installation vérifiée

L'application est entièrement configurée et prête à démarrer !

## 🎯 Comment démarrer

### **Option 1 : Windows (Facile)**
Double-cliquez sur `START.bat`

Cela démarrera automatiquement :
- ✓ L'application React sur http://localhost:5173
- ✓ Le serveur de conversion 3D sur http://localhost:5000

### **Option 2 : Ligne de commande (Deux terminaux)**

**Terminal 1 - Application:**
```bash
npm run dev
```

**Terminal 2 - Serveur 3D:**
```bash
npm run conversion-server
```

### **Option 3 : En une seule commande**
```bash
npm install concurrently
npm start
```

## 📱 Accéder à l'application

Une fois démarrée, ouvrez votre navigateur :
- **Application**: http://localhost:5173
- **Serveur API 3D**: http://localhost:5000

## 🎨 Nouvelles fonctionnalités 3D

### Vue "🚁 Modèle 3D"
1. Cliquez sur le bouton **"📦 Importer 3D"** dans la barre latérale
2. Sélectionnez un fichier 3D:
   - `.3dxml` (Dassault Systèmes) ✨
   - `.glb` (glTF Binary) - Standard web
   - `.gltf` (glTF Text)
   - `.obj` (Wavefront OBJ)
   - `.fbx` (Autodesk FBX)

3. Le modèle s'affiche dans la vue 3D interactive

### Contrôles 3D
- **Rotation**: Clic + Glisser
- **Zoom**: Molette de souris
- **Pan**: Clic droit + Glisser

## 📊 Fonctionnalités existantes

✅ **5 Vue du Dashboard:**
- 🔷 Vue Macro (graphique de haut niveau)
- 🔹 Vue Détail (nodes individuels)
- 📊 KPIs (indicateurs clés)
- ⚠️ Issues (alertes)
- 📈 Analyse (graphiques avancés)

✅ **Import Excel dynamique:**
- 📤 Bouton d'import Excel
- Traitement automatique des données
- Calcul des KPIs
- Génération d'issues

✅ **Visualization 3D:**
- 🚁 Vue modèle 3D
- Support multi-formats
- Conversion automatique
- Rotation/Zoom interactif

## 🔧 Architecture

```
Application (Vite + React)
        ↓
Dashboard Components
    ├── ReactFlow (graphes)
    ├── Charts (Recharts)
    ├── Analytics
    └── Viewer3D (Three.js) ← NEW!
        ↓
    Serveur Express (5000)
        ├── /api/convert-3d
        └── /api/health
```

## 🚨 Troubleshooting

**Port 5173 occupé ?**
- Vite choisira un autre port automatiquement

**Port 5000 occupé ?**
- Modifier dans `conversion-server.js` ligne 10: `const PORT = 5001;`

**Le modèle ne s'affiche pas ?**
- Vérifier la console (F12) pour les erreurs
- Vérifier que le fichier est un format supporté
- Vérifier que le serveur 5000 tourne

**CORS errors ?**
- Le CORS est activé côté serveur
- Vérifier que les deux services tournent

## 📚 Documentation

- `3D_USAGE_GUIDE.md` - Guide complet des fonctionnalités 3D
- `API_SPECIFICATION.md` - Spécification de l'API backend
- `README.md` - Présentation générale

## 🎯 Prochaines étapes

1. **Tester les imports Excel** avec vos données
2. **Tester l'import 3D** avec votre fichier `.3dxml`
3. **Explorer les vues** pour comprendre les données
4. **Optimiser** selon vos besoins

---

**🟢 Tout est prêt ! Bon développement ! 🚀**
