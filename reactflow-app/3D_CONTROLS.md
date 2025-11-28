# 🎮 Contrôles Viewer 3D

## Vue d'ensemble

La vue 3D offre une visualisation interactive des modèles 3D avec les contrôles suivants :

## Contrôles de souris

| Action | Contrôle |
|--------|----------|
| **Rotation** | Clic gauche + Glisser |
| **Zoom** | Molette de souris vers le haut/bas |
| **Pan** | Clic droit + Glisser (futur) |
| **Reset** | Double-clic (futur) |

## Contrôles clavier

| Touche | Action |
|--------|--------|
| **R** | Réinitialiser la vue (futur) |
| **S** | Sauvegarder une capture (futur) |
| **+** | Zoom avant |
| **-** | Zoom arrière |

## Éclairage

- **Lumière ambiante**: Uniforme (0.8 intensité)
- **Lumière directionnelle**: De haut (0.6 intensité)
- **Pas d'ombres**: Optimisé pour la performance

## Arrière-plan

- **Couleur**: Gris clair (#f5f5f5)
- **Responsive**: S'adapte à la taille de la fenêtre

## Performance

- **Réactif**: 60 FPS sur GPU moderne
- **Optimisé**: Rendu WebGL 2.0
- **Responsif**: Redimensionnement automatique

## Formats supportés

### ✅ Natif (recommandé)
- `.glb` - glTF Binary Format
- `.gltf` - glTF Text Format

### ⚠️ Avec conversion
- `.3dxml` - Dassault Systèmes (conversion nécessaire)
- `.obj` - Wavefront OBJ (conversion nécessaire)
- `.fbx` - Autodesk FBX (conversion nécessaire)

## Erreurs courantes

**"Modèle ne s'affiche pas"**
- Vérifier le format du fichier
- Vérifier la taille du fichier (< 100 MB recommandé)
- Vérifier la console pour les erreurs

**"Écran noir"**
- Attendre quelques secondes (chargement en cours)
- Rafraîchir la page (F5)
- Vérifier la connexion au serveur 3D

**"Chargement très lent"**
- Le modèle est peut-être très volumineux
- Optim issé le modèle avant import

## Limitations actuelles

- Pas d'interaction avec le modèle (click, sélection)
- Pas de textures/matériaux complexes
- Pas d'animations
- Pas de PhysX/collision

## Améliorations prévues

- [ ] Sélection d'objets dans le modèle
- [ ] Animation 3D
- [ ] Textures haute qualité
- [ ] Export du modèle
- [ ] Mesure de distances
- [ ] Mode VR

---

**Version actuelle**: 1.0.0
**Dernière mise à jour**: 2025-11-27
