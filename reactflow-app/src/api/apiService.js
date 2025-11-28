/**
 * API Service
 * Fetch data from backend or mocks
 * Can be easily switched to real backend endpoints when ready
 */

const API_BASE = "/mock"; // Change to http://localhost:8000 when backend is ready

export const apiService = {
  /**
   * Fetch graph data (macro and detail flows)
   * @returns {Promise<{macro: {nodes, edges}, detail: {nodes, edges}}>}
   */
  async getGraph() {
    try {
      const response = await fetch(`${API_BASE}/graph.json`);
      if (!response.ok) throw new Error("Failed to fetch graph");
      return await response.json();
    } catch (error) {
      console.error("Error fetching graph:", error);
      throw error;
    }
  },

  /**
   * Fetch KPIs data
   * @returns {Promise<{leadtime_prev_global_min, leadtime_real_global_min, ...}>}
   */
  async getKPIs() {
    try {
      const response = await fetch(`${API_BASE}/kpis.json`);
      if (!response.ok) throw new Error("Failed to fetch KPIs");
      return await response.json();
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      throw error;
    }
  },

  /**
   * Fetch issues data
   * @returns {Promise<Array>}
   */
  async getIssues() {
    try {
      const response = await fetch(`${API_BASE}/issues.json`);
      if (!response.ok) throw new Error("Failed to fetch issues");
      return await response.json();
    } catch (error) {
      console.error("Error fetching issues:", error);
      throw error;
    }
  },
};
