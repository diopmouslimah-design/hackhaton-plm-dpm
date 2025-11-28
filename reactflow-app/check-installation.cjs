#!/usr/bin/env node

/**
 * Script de vérification de l'installation
 * Vérifie que tous les prérequis sont en place
 */

const fs = require('fs');
const path = require('path');

console.log('\n📋 Vérification de l\'installation...\n');

let allOk = true;

// Vérifier Node.js
try {
  const version = process.version;
  console.log(`✓ Node.js: ${version}`);
} catch (e) {
  console.log('✗ Node.js: NON DÉTECTÉ');
  allOk = false;
}

// Vérifier npm
try {
  const { execSync } = require('child_process');
  const version = execSync('npm --version').toString().trim();
  console.log(`✓ npm: ${version}`);
} catch (e) {
  console.log('✗ npm: NON DÉTECTÉ');
  allOk = false;
}

// Vérifier package.json
if (fs.existsSync('package.json')) {
  console.log('✓ package.json: présent');
  const pkg = JSON.parse(fs.readFileSync('package.json'));
  
  // Vérifier les dépendances principales
  const requiredDeps = ['react', 'react-dom', 'reactflow', 'three', 'express'];
  console.log('\n📦 Dépendances:');
  requiredDeps.forEach(dep => {
    if (pkg.dependencies[dep]) {
      console.log(`  ✓ ${dep}: ${pkg.dependencies[dep]}`);
    } else {
      console.log(`  ✗ ${dep}: MANQUANT`);
      allOk = false;
    }
  });
} else {
  console.log('✗ package.json: NON TROUVÉ');
  allOk = false;
}

// Vérifier node_modules
if (fs.existsSync('node_modules')) {
  console.log('\n✓ node_modules: présent');
} else {
  console.log('\n⚠ node_modules: NON TROUVÉ (ejecutar: npm install)');
}

// Vérifier les fichiers sources
console.log('\n📁 Fichiers sources:');
const requiredFiles = [
  'src/App.jsx',
  'src/components/Dashboard.jsx',
  'src/components/Analytics.jsx',
  'src/components/Viewer3D.jsx',
  'src/api/apiService.js',
  'src/api/styleUtils.js',
  'conversion-server.js',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file}: NON TROUVÉ`);
    allOk = false;
  }
});

// Résumé
console.log('\n' + '='.repeat(50));
if (allOk) {
  console.log('✅ Installation OK! Prêt à démarrer.');
  console.log('\nPour démarrer l\'application:');
  console.log('  Windows: double-cliquez sur START.bat');
  console.log('  ou: npm run dev (+ npm run conversion-server en séparé)');
  console.log('\nApplication: http://localhost:5173');
  console.log('Serveur 3D : http://localhost:5000\n');
  process.exit(0);
} else {
  console.log('❌ Erreurs détectées. Veuillez exécuter: npm install\n');
  process.exit(1);
}
