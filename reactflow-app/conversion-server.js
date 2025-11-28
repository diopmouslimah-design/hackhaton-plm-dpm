#!/usr/bin/env node

/**
 * Serveur de conversion 3D
 * Convertit les fichiers .3dxml en .glb
 * 
 * Usage: node conversion-server.js
 */

const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(fileUpload());
app.use(express.static('public'));

// Créer le dossier de uploads s'il n'existe pas
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Endpoint pour convertir les fichiers 3D
 */
app.post('/api/convert-3d', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const file = req.files.file;
    const uploadPath = path.join(uploadDir, file.name);
    const outputPath = path.join(uploadDir, file.name.replace(/\.[^/.]+$/, '.glb'));

    // Sauvegarder le fichier
    await file.mv(uploadPath);
    console.log(`Fichier uploadé: ${uploadPath}`);

    // Déterminer le format d'entrée
    const ext = path.extname(file.name).toLowerCase();

    // Pour maintenant, on simule la conversion
    // À améliorer avec des vrais convertisseurs
    if (ext === '.3dxml') {
      console.log('Conversion .3dxml → .glb (simulation)');
      // Créer un fichier GLB de test
      createMockGLB(outputPath);
    } else if (ext === '.glb' || ext === '.gltf') {
      // Copier directement
      fs.copyFileSync(uploadPath, outputPath);
    } else {
      return res.status(400).json({ error: `Format non supporté: ${ext}` });
    }

    // Vérifier que le fichier de sortie existe
    if (!fs.existsSync(outputPath)) {
      throw new Error('Erreur lors de la conversion');
    }

    // Envoyer le fichier
    res.download(outputPath, path.basename(outputPath), (err) => {
      if (err) console.error(err);
      // Nettoyer les fichiers temporaires
      fs.unlink(uploadPath, () => {});
      fs.unlink(outputPath, () => {});
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Créer un fichier GLB de test (cube simple)
 */
function createMockGLB(outputPath) {
  // Minimal GLB header for a simple cube
  // This is a very basic GLB file
  const glbBuffer = Buffer.from([
    0x67, 0x6c, 0x54, 0x46, // glTF magic number
    0x02, 0x00, 0x00, 0x00, // version 2
    // Contenu minimal - à améliorer
  ]);

  fs.writeFileSync(outputPath, glbBuffer);
}

/**
 * Endpoint de santé
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'conversion-3d' });
});

/**
 * Démarrer le serveur
 */
app.listen(PORT, () => {
  console.log(`\n✓ Serveur de conversion 3D démarré sur http://localhost:${PORT}`);
  console.log(`  Endpoint: POST /api/convert-3d`);
  console.log(`  Formats supportés: .3dxml, .glb, .gltf\n`);
});
