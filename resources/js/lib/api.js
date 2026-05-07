const API_BASE = '/api';

async function apiRequest(path, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = payload?.message || 'Request failed.';
        throw new Error(message);
    }

    return payload;
}

export function loginWithPassword(credentials) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: credentials,
    });
}

export function requestOtp(phone) {
    return apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { phone },
    });
}

export function signupWithOtp(data) {
    return apiRequest('/auth/signup', {
        method: 'POST',
        body: data,
    });
}

export function createProject(token, project) {
    return apiRequest('/projects', {
        method: 'POST',
        token,
        body: project,
    });
}

export function getProjects(token, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
        }
    });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/projects${suffix}`, { token });
}

export function getProject(token, projectId) {
    return apiRequest(`/projects/${projectId}`, { token });
}

export function updateProject(token, projectId, payload) {
    return apiRequest(`/projects/${projectId}`, {
        method: 'PATCH',
        token,
        body: payload,
    });
}

export function deleteProject(token, projectId) {
    return apiRequest(`/projects/${projectId}`, {
        method: 'DELETE',
        token,
    });
}

export function bulkProjectAction(token, payload) {
    return apiRequest('/projects/bulk', {
        method: 'POST',
        token,
        body: payload,
    });
}

export function getDashboardSummary(token) {
    return apiRequest('/dashboard/summary', { token });
}

export function verifyFreelancerUpgrade(token) {
    return apiRequest('/billing/subscription/verify', { token });
}

export function getSubscriptionStatus(token) {
    return apiRequest('/billing/subscription/status', { token });
}

export function updateProfile(token, body) {
    return apiRequest('/me', {
        method: 'PATCH',
        token,
        body,
    });
}

export function getBillingHistory(token) {
    return apiRequest('/billing/history', { token });
}

export function checkoutFreelancerSubscription(token, payload) {
    return apiRequest('/billing/subscription/checkout', {
        method: 'POST',
        token,
        body: payload,
    });
}

export function saveScratchLayout(token, projectId, layout) {
    return apiRequest(`/projects/${projectId}/editor/scratch`, {
        method: 'POST',
        token,
        body: { layout },
    });
}

export function getSplitPreview(token, projectId) {
    return apiRequest(`/projects/${projectId}/editor/split-preview`, { token });
}

export function createGeneration(token, projectId, prompt) {
    return apiRequest(`/projects/${projectId}/generations`, {
        method: 'POST',
        token,
        body: { prompt },
    });
}

export function checkoutDownload(token, projectId, payment) {
    return apiRequest(`/projects/${projectId}/downloads/checkout`, {
        method: 'POST',
        token,
        body: payment,
    });
}

export function getDownloadAccess(token, projectId) {
    return apiRequest(`/projects/${projectId}/downloads/access`, { token });
}

export function downloadHighRes(token, projectId, payload) {
    return apiRequest(`/projects/${projectId}/downloads/high-res`, {
        method: 'POST',
        token,
        body: payload,
    });
}

export function getFactoryOrders(token) {
    return apiRequest('/factory/orders', { token });
}

export function getMatchingFactories(token, params = {}) {
    const qs = new URLSearchParams();
    if (params.project_id != null && params.project_id !== '') {
        qs.set('project_id', String(params.project_id));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/factories/matching${suffix}`, { token });
}

export function createDraftOrder(token, projectId, body) {
    return apiRequest(`/projects/${projectId}/orders/draft`, {
        method: 'POST',
        token,
        body,
    });
}

export function getMyOrders(token) {
    return apiRequest('/orders', { token });
}

export function submitProductionOrder(token, orderId, payload = { channel: 'billplz' }) {
    return apiRequest(`/orders/${orderId}/submit-production`, {
        method: 'POST',
        token,
        body: payload,
    });
}

export function getFactoryPricing(token) {
    return apiRequest('/factory/pricing', { token });
}

export function putFactoryPricing(token, payload) {
    return apiRequest('/factory/pricing', {
        method: 'PUT',
        token,
        body: payload,
    });
}
