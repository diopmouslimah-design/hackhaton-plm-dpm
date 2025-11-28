# Guide d'utilisation du Modèle 3D

## Installation et démarrage

### 1. Installer les dépendances
```bash
npm install
```

### 2. Démarrer l'application

**Option A : Avec le serveur de conversion (Recommandé)**
```bash
npm install concurrently  # Une seule fois
npm start
```
Cela démarre à la fois :
- L'application Vite sur `http://localhost:5173`
- Le serveur de conversion sur `http://localhost:5000`

**Option B : Seulement l'application**
```bash
npm run dev
```

**Option C : Seulement le serveur de conversion**
```bash
npm run conversion-server
```

## Utiliser la fonctionnalité 3D

### Importer un modèle 3D

1. **Ouvrir l'application** → http://localhost:5173
2. **Cliquer sur "📦 Importer 3D"** dans la barre latérale
3. **Sélectionner un fichier** (formats supportés):
   - `.3dxml` (Dassault Systèmes)
   - `.glb` (glTF binary)
   - `.gltf` (glTF text)
   - `.obj` (Wavefront OBJ)
   - `.fbx` (Autodesk FBX)

4. **Le modèle s'affiche** dans la vue "🚁 Modèle 3D"

### Contrôler le modèle 3D

- **Rotation** : Clic + Glisser
- **Zoom** : Molette de souris
- **Pan** : Clic droit + Glisser

## Architecture

```
src/
├── components/
│   └── Viewer3D.jsx          # Composant Three.js
├── api/
│   └── conversionService.js  # Service de conversion
└── ...

conversion-server.js          # Serveur Express pour conversion
```

## Formats 3D supportés

| Format | Extension | Support | Note |
|--------|-----------|---------|------|
| glTF Binary | .glb | ✅ Natif | Format web standard |
| glTF Text | .gltf | ✅ Natif | Format JSON |
| 3D XML | .3dxml | ⚠️ Limité | Conversion nécessaire |
| Wavefront | .obj | ⚠️ En dev | Conversion nécessaire |
| Autodesk | .fbx | ⚠️ En dev | Conversion nécessaire |

## Conversion .3dxml → .glb

Pour convertir manuellement avant upload :
1. **Blender** (gratuit): File → Open → .3dxml → File → Export → .glb
2. **FreeCAD** (gratuit): File → Open → .3dxml → File → Export → .glb
3. **Online**: CloudConvert, AnyConv, etc.

## Troubleshooting

**Le modèle ne s'affiche pas ?**
- Vérifier que le fichier est un format supporté
- Vérifier la console (F12) pour les erreurs

**Port 5000 déjà utilisé ?**
- Modifier dans `conversion-server.js`: `const PORT = 5001;`

**Problèmes CORS ?**
- Le CORS est activé dans le serveur
- Vérifier que le serveur tourne sur http://localhost:5000

## Développement futur

- [ ] Vrai support de conversion .3dxml via assimp
- [ ] Animations 3D
- [ ] Export du modèle visualisé
- [ ] Annotation sur le modèle 3D
- [ ] Interaction avec les nœuds du graphe
- [ ] Texture et matériaux avancés

