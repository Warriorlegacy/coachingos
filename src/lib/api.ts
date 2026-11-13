// src/lib/api.ts - Standard API Client
let activeCsrfToken = '';

export function setCsrfToken(token: string) {
  activeCsrfToken = token;
}

export function getCsrfToken() {
  return activeCsrfToken;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Include CSRF token for mutating requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && activeCsrfToken) {
    headers.set('x-csrf-token', activeCsrfToken);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    let code = 'HTTP_ERROR';
    try {
      if (contentType.includes('application/json')) {
        const errJson = await res.json();
        errorMsg = errJson.error || errorMsg;
        code = errJson.code || code;
      } else {
        errorMsg = await res.text();
      }
    } catch { /* ignored */ }
    const err = new Error(errorMsg) as any;
    err.status = res.status;
    err.code = code;
    throw err;
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }
  return (await res.text()) as any;
}

export function formatCurrency(cents: number, currency = 'INR'): string {
  const amount = cents / 100;
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
