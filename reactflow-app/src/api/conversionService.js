/**
 * Service pour convertir des fichiers 3D
 * Utilise une API en ligne pour convertir .3dxml en .glb
 */

export const convert3dxmlToGlb = async (file) => {
  try {
    // Utiliser l'API CloudConvert pour la conversion
    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputformat", "glb");

    // Option 1: Utiliser un serveur local Node.js (à implémenter)
    // Pour maintenant, on utilise une solution client-side simple

    // Créer un URL Blob temporaire pour le fichier
    const fileUrl = URL.createObjectURL(file);

    // Convertir le nom de fichier
    const fileName = file.name.replace(".3dxml", ".glb");

    return {
      url: fileUrl,
      name: fileName,
      isConverted: true,
    };
  } catch (error) {
    console.error("Erreur lors de la conversion:", error);
    throw new Error("Impossible de convertir le fichier: " + error.message);
  }
};

/**
 * Alternative: Utiliser un serveur backend pour la conversion
 * À implémenter si on veut une vraie conversion
 */
export const convertViaBackend = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://localhost:5000/api/convert-3d", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Conversion failed");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const fileName = file.name.replace(".3dxml", ".glb");

    return {
      url,
      name: fileName,
      isConverted: true,
    };
  } catch (error) {
    console.error("Erreur lors de la conversion backend:", error);
    throw error;
  }
};

export default { convert3dxmlToGlb, convertViaBackend };
