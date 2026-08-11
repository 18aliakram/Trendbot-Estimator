const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res) => {
  if (!res.ok) {
    let message = 'Request failed.';
    try {
      const err = await res.json();
      message = err.message || message;
    } catch (e) {
      try {
        const text = await res.text();
        message = text || message;
      } catch (_) {}
    }
    throw new Error(message);
  }
  
  try {
    return await res.json();
  } catch (e) {
    return { success: true };
  }
};

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async updateSettings(data) {
    const res = await fetch(`${API_BASE}/auth/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Projects
  async getProjects() {
    const res = await fetch(`${API_BASE}/projects`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getProject(id) {
    const res = await fetch(`${API_BASE}/projects/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createProject(data) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateProject(id, data) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteProject(id) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async duplicateProject(id) {
    const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },


  // Upload plans with specifications metadata
  async uploadPlans(projectId, file, metadata) {
    const formData = new FormData();
    formData.append('plan', file);
    if (metadata) {
      formData.append('bedrooms', metadata.bedrooms || '');
      formData.append('bathrooms', metadata.bathrooms || '');
      formData.append('notes', metadata.notes || '');
      formData.append('qualityStandard', metadata.qualityStandard || 'Standard');
    }

    const token = localStorage.getItem('token');
    
    const res = await fetch(`${API_BASE}/projects/${projectId}/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    return handleResponse(res);
  },

  // Takeoff
  async getTakeoff(projectId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/takeoff`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async updateTakeoffItem(projectId, itemId, data) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/takeoff/items/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async addTakeoffItem(projectId, data) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/takeoff/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteTakeoffItem(projectId, itemId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/takeoff/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Estimate
  async getEstimate(projectId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/estimate`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async updateEstimateSettings(projectId, data) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/estimate/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async approveEstimate(projectId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/estimate/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async explainEstimate(projectId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/explain`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async saveEstimateVersion(projectId, note) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/estimate/save-version`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ note })
    });
    return handleResponse(res);
  },

  async getEstimateVersions(projectId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/estimate/versions`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Pricing
  async getPricing() {
    const res = await fetch(`${API_BASE}/pricing`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createPricingItem(data) {
    const res = await fetch(`${API_BASE}/pricing`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updatePricingItem(id, data) {
    const res = await fetch(`${API_BASE}/pricing/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getPricingHistory(id) {
    const res = await fetch(`${API_BASE}/pricing/${id}/history`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getLaborRates() {
    const res = await fetch(`${API_BASE}/pricing/labor`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async updateLaborRate(id, rate) {
    const res = await fetch(`${API_BASE}/pricing/labor/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ rate })
    });
    return handleResponse(res);
  },

  // Audit Log
  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit-logs`, { headers: getHeaders() });
    return handleResponse(res);
  }
};
