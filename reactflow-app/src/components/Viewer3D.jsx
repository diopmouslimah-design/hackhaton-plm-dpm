import React, { useState, useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';
import { getDeltaColor, getMacroNodeColor } from '../api/styleUtils';
import JSZip from 'jszip';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Helper: convert #rrggbb to rgba(..., alpha)
function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Individual mesh component with hover effect
function InteractiveMesh({ geometry, color, position, index, name, onMeshClick }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = hovered ? 1.05 : 1;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position || [0, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onMeshClick && onMeshClick(index, geometry, color, name);
      }}
    >
      <meshStandardMaterial
        color={hovered ? '#ffaa00' : (color || '#4a9eff')}
        side={THREE.DoubleSide}
        metalness={0.2}
        roughness={0.6}
      />
    </mesh>
  );
}

// Component to render loaded meshes with auto-rotation
function Model({ meshes, onMeshClick }) {
  const groupRef = useRef();

  // Set initial rotation offset
  useEffect(() => {
    if (groupRef.current) {
      // Rotate 90 degrees around X-axis to lay plane flat, then 90 degrees around Z to orient correctly
      groupRef.current.rotation.x = Math.PI/2; 
      groupRef.current.rotation.y = - 1/3 * 7/4 * Math.PI;
    }
  }, [meshes]);

  // Auto-rotate on load
  useFrame((state, delta) => {
    // optional auto-rotation
  });

  if (!meshes || meshes.length === 0) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff4444" wireframe />
      </mesh>
    );
  }

  return (
    <Center>
      <group ref={groupRef}>
        {meshes.map((mesh, index) => (
          <InteractiveMesh
            key={index}
            geometry={mesh.geometry}
            color={mesh.color}
            position={mesh.position}
            index={index}
            onMeshClick={onMeshClick}
          />
        ))}
      </group>
    </Center>
  );
}

// Scene with lighting and controls
function Scene({ modelData, onMeshClick }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />
      <pointLight position={[0, 10, 0]} intensity={0.3} />
      
      <Model meshes={modelData?.meshes} onMeshClick={onMeshClick} />
      
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <Environment preset="studio" />
    </>
  );
}

// Parse STL file
async function parseSTL(arrayBuffer) {
  const loader = new STLLoader();
  const geometry = loader.parse(arrayBuffer);
  
  // Center and scale
  geometry.computeVertexNormals();
  geometry.center();
  
  const boundingBox = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  
  if (maxDim > 0) {
    const scale = 5 / maxDim;
    geometry.scale(scale, scale, scale);
  }
  
  console.log('✅ STL loaded successfully');
  console.log(`Vertices: ${geometry.attributes.position.count}`);
  
  return {
    meshes: [{
      geometry,
      color: '#4a9eff',
      position: [0, 0, 0]
    }]
  };
}

// Parse GLB/GLTF file
async function parseGLB(arrayBuffer) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(arrayBuffer, '', (gltf) => {
      const meshes = [];
      
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          const geometry = child.geometry.clone();
          geometry.computeVertexNormals();
          
          meshes.push({
            geometry,
            name: child.name || `part_${meshes.length}`,
            color: child.material?.color ? `#${child.material.color.getHexString()}` : getRandomColor(),
            position: [0, 0, 0]
          });
        }
      });
      
      if (meshes.length > 0) {
        // Center and scale all meshes
        const boundingBox = new THREE.Box3();
        meshes.forEach(m => boundingBox.expandByObject(new THREE.Mesh(m.geometry)));
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim;
        
        meshes.forEach(m => {
          m.geometry.translate(-center.x, -center.y, -center.z);
          m.geometry.scale(scale, scale, scale);
        });
      }
      
      console.log('✅ GLB/GLTF loaded successfully');
      console.log(`Meshes: ${meshes.length}`);
      
      resolve({ meshes });
    }, reject);
  });
}

// Parse 3DXML file
async function parse3DXML(file) {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Load as ZIP archive
    const zip = await JSZip.loadAsync(arrayBuffer);
    const fileList = Object.keys(zip.files);
    
    console.log('📦 3DXML Archive Contents:');
    console.log('Total files:', fileList.length);
    console.log('Files:', fileList);
    
    const meshes = [];
    
    // Look for PRODUCT.3dxml or main XML file
    const mainXmlFiles = fileList.filter(f => 
      f.toLowerCase().endsWith('.3dxml') && 
      !zip.files[f].dir
    );
    
    console.log('📄 Main XML files:', mainXmlFiles);
    
    // Parse main XML files
    for (const xmlFile of mainXmlFiles) {
      const content = await zip.file(xmlFile).async('string');
      console.log(`\n📖 Parsing ${xmlFile}...`);
      console.log('First 1000 characters:', content.substring(0, 1000));
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      
      // Log structure
      const rootElement = xmlDoc.documentElement;
      console.log('Root element:', rootElement.tagName);
      
      // Log all child element names
      const allTags = new Set();
      const allElements = xmlDoc.getElementsByTagName('*');
      for (let i = 0; i < Math.min(50, allElements.length); i++) {
        allTags.add(allElements[i].tagName);
      }
      console.log('Tags found:', Array.from(allTags).join(', '));
      
      // Try to extract any geometry data
      const positions = extractPositionsFromXML(xmlDoc);
      const indices = extractIndicesFromXML(xmlDoc);
      
      if (positions.length > 0) {
        console.log(`✓ Found ${positions.length / 3} vertices`);
        const geometry = createGeometry(positions, indices);
        meshes.push({
          geometry,
          color: getRandomColor(),
          position: [0, 0, 0]
        });
      }
    }
    
    // Look for .3DRep files (representation files)
    const repFiles = fileList.filter(f => f.toLowerCase().endsWith('.3drep'));
    console.log(`\n🎨 Found ${repFiles.length} .3DRep files`);
    
    // Try to parse some .3DRep files
    const maxRepsToTry = Math.min(5, repFiles.length);
    for (let i = 0; i < maxRepsToTry; i++) {
      const repFile = repFiles[i];
      try {
        const content = await zip.file(repFile).async('string');
        
        // Check if it's XML format
        if (content.trim().startsWith('<?xml') || content.trim().startsWith('<')) {
          console.log(`📖 Parsing ${repFile} as XML...`);
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          
          const positions = extractPositionsFromXML(xmlDoc);
          const indices = extractIndicesFromXML(xmlDoc);
          
          if (positions.length > 0) {
            console.log(`✓ Extracted ${positions.length / 3} vertices from ${repFile}`);
            const geometry = createGeometry(positions, indices);
            meshes.push({
              geometry,
              color: getRandomColor(),
              position: [0, 0, 0]
            });
          }
        } else {
          console.log(`⚠️ ${repFile} is binary format (not supported yet)`);
        }
      } catch (err) {
        console.log(`⚠️ Could not parse ${repFile}:`, err.message);
      }
    }
    
    if (meshes.length === 0) {
      console.error('❌ No parseable geometry found');
      
      // Return file info for display
      return {
        meshes: [],
        error: 'Unable to parse 3DXML geometry',
        info: {
          totalFiles: fileList.length,
          repFiles: repFiles.length,
          xmlFiles: mainXmlFiles.length,
          message: 'This 3DXML file uses binary .3DRep format which requires proprietary Dassault Systèmes libraries.'
        },
        suggestion: 'To view this model:\n1. Open in CATIA/3DEXPERIENCE\n2. Export as STL: File > Export > STL\n3. Drop the STL file here'
      };
    }
    
    console.log(`✅ Successfully loaded ${meshes.length} mesh(es)`);
    return { meshes, fileCount: fileList.length };
    
  } catch (error) {
    console.error('Error parsing 3DXML:', error);
    throw new Error('Failed to parse 3DXML file: ' + error.message);
  }
}

// Extract vertex positions from XML
function extractPositionsFromXML(xmlDoc) {
  const positions = [];
  
  // Try various tag names used in 3DXML
  const tagNames = ['Positions', 'VertexBuffer', 'Position', 'Vertices'];
  
  for (const tagName of tagNames) {
    const elements = xmlDoc.getElementsByTagName(tagName);
    for (let i = 0; i < elements.length; i++) {
      const text = elements[i].textContent.trim();
      if (text) {
        const values = text.split(/[\s,]+/).map(parseFloat).filter(v => !isNaN(v));
        if (values.length >= 3) {
          positions.push(...values);
        }
      }
    }
  }
  
  return positions;
}

// Extract face indices from XML
function extractIndicesFromXML(xmlDoc) {
  const indices = [];
  
  const tagNames = ['Faces', 'Triangles', 'Indices', 'TriangleStrip'];
  
  for (const tagName of tagNames) {
    const elements = xmlDoc.getElementsByTagName(tagName);
    for (let i = 0; i < elements.length; i++) {
      const text = elements[i].textContent.trim();
      if (text) {
        const values = text.split(/[\s,]+/).map(parseInt).filter(v => !isNaN(v));
        if (values.length > 0) {
          indices.push(...values);
        }
      }
    }
  }
  
  return indices;
}

// Create Three.js geometry from data
function createGeometry(positions, indices) {
  const geometry = new THREE.BufferGeometry();
  
  const positionArray = new Float32Array(positions);
  geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  
  if (indices && indices.length > 0) {
    const indexArray = new Uint32Array(indices);
    geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
  }
  
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  
  return geometry;
}

// Generate random colors
function getRandomColor() {
  const colors = [
    '#4a9eff', '#ff6b9d', '#4ade80', '#fbbf24', 
    '#a78bfa', '#f87171', '#38bdf8', '#fb923c'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Assign colors to meshes based on graphData delays
function assignDelayColors(meshes, graphData) {
  if (!graphData || !graphData.detail || !Array.isArray(graphData.detail.nodes)) {
    return meshes;
  }
  
  const nodes = graphData.detail.nodes;
  
  // Assign each mesh a random node and color it by that node's delta
  return meshes.map((mesh, index) => {
    // Use modulo to cycle through nodes if more meshes than nodes
    const node = nodes[index % nodes.length];
    let delta = node?.kpi?.delta_cycle || 0;
    
    // Ensure no piece has negative delay - clamp to minimum of 0
    delta = Math.max(0, delta);
    
    // Add random positive delay with wider range (between 10 and 120 minutes) for better color variation
    delta = delta + Math.random() * 110 + 10;
    
    const color = getDeltaColor(delta);
    
    return {
      ...mesh,
      color: color,
      delta: delta,
      nodeName: node?.label || node?.id
    };
  });
}

// Main Viewer Component
export default function Viewer3D({ modelFile, graphData }) {
  const [modelData, setModelData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMesh, setSelectedMesh] = useState(null);

  // Load model when modelFile prop changes
  useEffect(() => {
    if (modelFile) {
      handleFile(modelFile);
    }
  }, [modelFile]);
  
  // Reapply colors when graphData changes
  useEffect(() => {
    if (modelData && modelData.meshes && graphData) {
      setModelData(prevData => ({
        ...prevData,
        meshes: assignDelayColors(prevData.meshes, graphData)
      }));
    }
  }, [graphData]);

  const handleMeshClick = (index, geometry, color, name) => {
    const vertexCount = geometry.attributes.position.count;
    const boundingBox = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // Instead of matching names, pick a few random postes from graphData.detail.nodes
    let randomNodes = [];
    const available = graphData && graphData.detail && Array.isArray(graphData.detail.nodes) ? graphData.detail.nodes : [];
    if (available.length > 0) {
      const count = Math.min(3, available.length);
      // shuffle copy
      const shuffled = available.slice().sort(() => 0.5 - Math.random());
      randomNodes = shuffled.slice(0, count).map(n => ({ ...n }));
    } else {
      // generate synthetic postes when graphData isn't available
      randomNodes = Array.from({ length: 3 }).map((_, i) => {
        const num = Math.floor(Math.random() * 100) + 1;
        const prev = Math.round(Math.random() * 60);
        const real = Math.round(prev + Math.random() * 30);
        return {
          id: `P${num}`,
          label: `Poste ${num}`,
          macro: 'Auto-gen',
          kpi: { cycle_prev: prev, cycle_real: real, delta_cycle: real - prev, nb_pieces: Math.floor(Math.random() * 10) + 1 },
        };
      });
    }

    // ensure numeric KPI fields and delta
    randomNodes.forEach(n => {
      n.kpi = n.kpi || {};
      n.kpi.cycle_prev = Number(n.kpi.cycle_prev || 0);
      n.kpi.cycle_real = Number(n.kpi.cycle_real || 0);
      n.kpi.delta_cycle = Number(n.kpi.delta_cycle ?? (n.kpi.cycle_real - n.kpi.cycle_prev));
    });

    const data = {
      index,
      name,
      color,
      vertexCount,
      size: {
        x: size.x.toFixed(2),
        y: size.y.toFixed(2),
        z: size.z.toFixed(2),
      },
      matchedNodes: randomNodes,
    };

    setSelectedMesh(data);
  };

  const closeMeshMenu = () => {
    setSelectedMesh(null);
  };

  const handleFile = async (selectedFile) => {
    console.clear();
    console.log('🚀 Loading file:', selectedFile.name);
    
    setIsLoading(true);
    setModelData(null);
    
    try {
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      let data;
      
      if (fileExt === 'stl') {
        // Parse STL file
        data = await parseSTL(arrayBuffer);
      } else if (fileExt === 'glb' || fileExt === 'gltf') {
        // Parse GLB/GLTF file
        data = await parseGLB(arrayBuffer);
      } else if (fileExt === '3dxml') {
        // Parse 3DXML file
        data = await parse3DXML(selectedFile);
      } else {
        throw new Error('Unsupported file format. Please use .stl, .glb, .gltf, or .3dxml');
      }
      
      // Apply delay-based colors to meshes if graphData is available
      if (data && data.meshes) {
        data.meshes = assignDelayColors(data.meshes, graphData);
      }
      
      setModelData(data);
    } catch (error) {
      console.error('Error:', error);
      setModelData({ 
        meshes: [], 
        error: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!modelFile) {
    return (
      <div style={{ 
        minHeight: '100vh',
        width: '100%',
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0a0a0a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#fff' }}>
            No 3D Model Loaded
          </h2>
          <p style={{ margin: '0 0 4px 0', color: '#888', fontSize: '14px' }}>
            Use the "Importer 3D" button to load a model
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      width: '100%',
      display: 'flex', 
      flexDirection: 'column',
      background: '#0a0a0a'
    }}>
      <div style={{ 
        padding: '8px 24px', 
        background: '#151515', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
        minHeight: '50px'
      }}>
        <div style={{ flex: 1 }}>
          <div>
            <strong style={{ color: '#4a9eff' }}>File:</strong>{' '}
            <span style={{ color: '#fff' }}>{modelFile.name}</span>
            <span style={{ color: '#888', marginLeft: '12px' }}>
              ({(modelFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          {isLoading && (
            <div style={{ color: '#ffa500', marginTop: '4px', fontSize: '14px' }}>
              ⏳ Parsing 3D file...
            </div>
          )}
          {modelData?.error && (
            <div style={{ color: '#ff4444', marginTop: '4px', fontSize: '13px', maxWidth: '600px' }}>
              ⚠️ {modelData.error}
            </div>
          )}
          {modelData?.meshes && modelData.meshes.length > 0 && (
            <div style={{ color: '#4ade80', marginTop: '4px', fontSize: '14px' }}>
              ✓ Loaded {modelData.meshes.length} mesh{modelData.meshes.length !== 1 ? 'es' : ''}
              {modelData.fileCount && ` from ${modelData.fileCount} files`}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', background: '#0a0a0a'}}>
        {modelData?.meshes && modelData.meshes.length > 0 ? (
                <>
                <div style={{ flex: 1, minHeight: 0, height: '500px' }}>
                  <Canvas
                    camera={{ position: [0, 3, 12], fov: 65 }}
                    style={{ width: '100%', height: '100%', display: 'block', background: '#0a0a0a' }}
                  >
                    <Suspense fallback={null}>
                      <Scene modelData={modelData} onMeshClick={handleMeshClick} />
                    </Suspense>
                  </Canvas>
                </div>
                {selectedMesh && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
                    border: '1px solid rgba(74, 158, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '0',
                    minWidth: '420px',
                    maxWidth: '520px',
                    color: '#fff',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    overflow: 'hidden'
                  }}>
                    {/* Header */}
                    <div style={{ 
                      background: 'linear-gradient(135deg, rgba(74, 158, 255, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                      borderBottom: '1px solid rgba(74, 158, 255, 0.2)',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          margin: '0 0 4px 0', 
                          color: '#fff',
                          fontSize: '18px',
                          fontWeight: '600',
                          letterSpacing: '-0.01em'
                        }}>
                          {selectedMesh.name || `Pièce #${selectedMesh.index + 1}`}
                        </h3>
                        <div style={{ 
                          fontSize: '13px', 
                          color: 'rgba(148, 163, 184, 0.9)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>📦</span>
                          <span>{selectedMesh.macro || 'Composant 3D'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={closeMeshMenu}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          transition: 'all 0.2s',
                          fontWeight: '300'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >×</button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
                      {selectedMesh.matchedNodes && selectedMesh.matchedNodes.length > 0 ? (
                        <>
                          {/* Summary Stats */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)', 
                            gap: '12px',
                            marginBottom: '24px'
                          }}>
                            {(() => {
                              const nodes = selectedMesh.matchedNodes;
                              const totalPrev = nodes.reduce((sum, n) => sum + (n.kpi?.cycle_prev || 0), 0);
                              const totalReal = nodes.reduce((sum, n) => sum + (n.kpi?.cycle_real || 0), 0);
                              const totalDelta = totalReal - totalPrev;
                              
                              return (
                                <>
                                  <div style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Postes</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{nodes.length}</div>
                                  </div>
                                  <div style={{
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.2)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prévu</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>{totalPrev.toFixed(0)}<span style={{ fontSize: '14px', fontWeight: '400', marginLeft: '2px' }}>m</span></div>
                                  </div>
                                  <div style={{
                                    background: totalDelta > 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 146, 60, 0.1)',
                                    border: totalDelta > 10 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(251, 146, 60, 0.2)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retard</div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: totalDelta > 10 ? '#ef4444' : '#fb923c' }}>+{totalDelta.toFixed(0)}<span style={{ fontSize: '14px', fontWeight: '400', marginLeft: '2px' }}>m</span></div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* Timeline Title */}
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: 'rgba(148, 163, 184, 0.9)',
                            marginBottom: '16px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <div style={{ width: '3px', height: '14px', background: '#4a9eff', borderRadius: '2px' }}></div>
                            Analyse par Poste
                          </div>

                          {/* Postes List with Enhanced Graph */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {(() => {
                              const nodes = selectedMesh.matchedNodes;
                              const maxTime = Math.max(...nodes.map(n => Math.max(n.kpi?.cycle_prev || 0, n.kpi?.cycle_real || 0)), 1);
                              
                              return nodes.map((n, idx) => {
                                const prev = n.kpi?.cycle_prev || 0;
                                const real = n.kpi?.cycle_real || 0;
                                const delta = n.kpi?.delta_cycle || (real - prev) || 0;
                                const nbPieces = n.kpi?.nb_pieces || 0;
                                const criticite = n.kpi?.criticite || 'Normal';
                                const discreteColor = getMacroNodeColor(delta);
                                const bgColor = hexToRgba(discreteColor, 0.08);

                                return (
                                  <div key={n.id || idx} style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    padding: '16px', 
                                    borderRadius: '12px', 
                                    background: bgColor,
                                    border: `1px solid ${hexToRgba(discreteColor, 0.2)}`,
                                    transition: 'all 0.2s'
                                  }}>
                                    {/* Poste Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                          <div style={{ 
                                            fontSize: '14px', 
                                            color: '#fff', 
                                            fontWeight: '600',
                                            letterSpacing: '-0.01em'
                                          }}>{n.label || n.id}</div>
                                          <div style={{
                                            fontSize: '10px',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            background: hexToRgba(discreteColor, 0.2),
                                            color: discreteColor,
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.3px'
                                          }}>{criticite}</div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'rgba(148, 163, 184, 0.8)' }}>
                                          {n.macro || 'N/A'} • {nbPieces} pièce{nbPieces !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                      <div style={{ 
                                        textAlign: 'right',
                                        background: hexToRgba(discreteColor, 0.15),
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: `1px solid ${hexToRgba(discreteColor, 0.3)}`
                                      }}>
                                        <div style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '2px' }}>Retard</div>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: discreteColor }}>
                                          +{delta.toFixed(1)}<span style={{ fontSize: '11px', fontWeight: '400', marginLeft: '1px' }}>min</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Enhanced Bar Chart */}
                                    <div style={{ marginBottom: '12px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148, 163, 184, 0.8)', marginBottom: '6px' }}>
                                        <span>Temps de cycle</span>
                                        <span>{real.toFixed(1)} / {prev.toFixed(1)} min</span>
                                      </div>
                                      <div style={{ 
                                        height: '40px', 
                                        background: 'rgba(15, 23, 42, 0.5)', 
                                        borderRadius: '8px', 
                                        overflow: 'hidden',
                                        position: 'relative',
                                        border: '1px solid rgba(255, 255, 255, 0.05)'
                                      }}>
                                        {/* Prévu bar */}
                                        <div style={{ 
                                          position: 'absolute', 
                                          left: 0, 
                                          top: 0, 
                                          bottom: '50%',
                                          width: `${(prev / maxTime) * 100}%`, 
                                          background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.8) 100%)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          paddingLeft: '8px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#fff',
                                          borderRadius: '4px 0 0 0'
                                        }}>
                                          {prev > maxTime * 0.15 && `${prev.toFixed(1)}m`}
                                        </div>
                                        {/* Réel bar */}
                                        <div style={{ 
                                          position: 'absolute', 
                                          left: 0, 
                                          top: '50%', 
                                          bottom: 0,
                                          width: `${(real / maxTime) * 100}%`, 
                                          background: `linear-gradient(90deg, ${hexToRgba(discreteColor, 0.7)} 0%, ${hexToRgba(discreteColor, 0.9)} 100%)`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          paddingLeft: '8px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#fff',
                                          borderRadius: '0 0 0 4px'
                                        }}>
                                          {real > maxTime * 0.15 && `${real.toFixed(1)}m`}
                                        </div>
                                        {/* Labels on right side */}
                                        <div style={{ position: 'absolute', right: '8px', top: '3px', fontSize: '10px', color: 'rgba(34, 197, 94, 0.9)', fontWeight: '600' }}>
                                          PRÉVU
                                        </div>
                                        <div style={{ position: 'absolute', right: '8px', bottom: '3px', fontSize: '10px', color: discreteColor, fontWeight: '600' }}>
                                          RÉEL
                                        </div>
                                      </div>
                                    </div>

                                    {/* Performance Indicator */}
                                    <div style={{ 
                                      display: 'flex', 
                                      gap: '8px',
                                      fontSize: '12px',
                                      color: 'rgba(148, 163, 184, 0.9)'
                                    }}>
                                      <div style={{ 
                                        flex: 1,
                                        padding: '8px 10px',
                                        background: 'rgba(15, 23, 42, 0.4)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}>
                                        <span>Performance</span>
                                        <span style={{ 
                                          fontWeight: '600',
                                          color: delta > 10 ? '#ef4444' : delta > 5 ? '#fb923c' : '#22c55e'
                                        }}>
                                          {((prev / real) * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      <div style={{ 
                                        flex: 1,
                                        padding: '8px 10px',
                                        background: 'rgba(15, 23, 42, 0.4)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}>
                                        <span>Impact</span>
                                        <span style={{ fontWeight: '600', color: '#fff' }}>
                                          {((delta / real) * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </>
                      ) : (
                        // Fallback: show mesh basic info with improved design
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{
                            background: 'rgba(15, 23, 42, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            padding: '16px'
                          }}>
                            <div style={{ fontSize: '12px', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Couleur</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                background: selectedMesh.color,
                                border: '2px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                              }}></div>
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>{selectedMesh.color}</span>
                            </div>
                          </div>

                          <div style={{
                            background: 'rgba(15, 23, 42, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            padding: '16px'
                          }}>
                            <div style={{ fontSize: '12px', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vertices</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4a9eff' }}>{selectedMesh.vertexCount.toLocaleString()}</div>
                          </div>

                          <div style={{
                            background: 'rgba(15, 23, 42, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            padding: '16px'
                          }}>
                            <div style={{ fontSize: '12px', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dimensions</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                              <div>
                                <div style={{ fontSize: '11px', color: 'rgba(148, 163, 184, 0.7)', marginBottom: '4px' }}>X</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#ef4444' }}>{selectedMesh.size.x}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: 'rgba(148, 163, 184, 0.7)', marginBottom: '4px' }}>Y</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#22c55e' }}>{selectedMesh.size.y}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: 'rgba(148, 163, 184, 0.7)', marginBottom: '4px' }}>Z</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#3b82f6' }}>{selectedMesh.size.z}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
              ) : modelData?.info ? (
              <div style={{
                padding: '40px',
                color: '#fff',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                <h3 style={{ color: '#4a9eff', marginBottom: '20px' }}>📋 File Information</h3>
                <div style={{ background: '#151515', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ margin: '8px 0' }}>
                    <strong>Total files in archive:</strong> {modelData.info.totalFiles}
                  </p>
                  <p style={{ margin: '8px 0' }}>
                    <strong>3DRep files (geometry):</strong> {modelData.info.repFiles}
                  </p>
                  <p style={{ margin: '8px 0' }}>
                    <strong>XML files:</strong> {modelData.info.xmlFiles}
                  </p>
                  <p style={{ margin: '16px 0 8px 0', color: '#ffa500' }}>
                    {modelData.info.message}
                  </p>
                </div>
                
                <h4 style={{ color: '#4ade80', marginBottom: '12px' }}>💡 How to View This Model:</h4>
                <div style={{ background: '#1a2a1a', padding: '20px', borderRadius: '8px', whiteSpace: 'pre-line' }}>
                  {modelData.suggestion}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, height: '500px' }}>
                <Canvas
                  camera={{ position: [0, 3, 12], fov: 65 }}
                  style={{ width: '100%', height: '100%', display: 'block', background: '#0a0a0a' }}
                >
                  <Suspense fallback={null}>
                    <Scene modelData={modelData} />
                  </Suspense>
                </Canvas>
              </div>
            )}
          </div>
    </div>
  );
}
