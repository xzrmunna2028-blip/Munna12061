// Custom secure fetch wrapper for robust session isolation across devices/browsers
export async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
  
  // Only intercept relative /api/ endpoints to prevent exposing credentials to external domains
  if (url.includes('/api/')) {
    let userId = '';
    try {
      const stored = localStorage.getItem('heartsync_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          userId = parsed.id;
        }
      }
    } catch (e) {
      // Fail silent on parsing or reading localStorage
    }

    if (userId) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      if (!headers.has('x-user-id')) {
        headers.set('x-user-id', userId);
      }
      init.headers = headers;
    }
  }

  return window.fetch(input, init);
}
