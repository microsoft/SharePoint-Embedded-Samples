import type { AuthProvider } from './auth.js';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class GraphClient {
  constructor(private auth: AuthProvider) {}

  private async authHeader(): Promise<string> {
    return `Bearer ${await this.auth.getToken()}`;
  }

  private url(path: string): string {
    return path.startsWith('http') ? path : `${GRAPH_BASE}${path}`;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const response = await fetch(this.url(path), {
      headers: {
        Authorization: await this.authHeader(),
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GET ${path} failed (${response.status}): ${body}`);
    }
    return response.json() as Promise<T>;
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), {
      method: 'POST',
      headers: {
        Authorization: await this.authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`POST ${path} failed (${response.status}): ${text}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), {
      method: 'PATCH',
      headers: {
        Authorization: await this.authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PATCH ${path} failed (${response.status}): ${text}`);
    }
    return response.json() as Promise<T>;
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(this.url(path), {
      method: 'DELETE',
      headers: { Authorization: await this.authHeader() },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DELETE ${path} failed (${response.status}): ${text}`);
    }
  }

  async upload(path: string, content: ArrayBuffer, contentType: string): Promise<unknown> {
    const response = await fetch(this.url(path), {
      method: 'PUT',
      headers: {
        Authorization: await this.authHeader(),
        'Content-Type': contentType,
      },
      body: content,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PUT ${path} failed (${response.status}): ${text}`);
    }
    return response.json();
  }

  async download(path: string): Promise<ArrayBuffer> {
    const response = await fetch(this.url(path), {
      headers: { Authorization: await this.authHeader() },
      redirect: 'follow',
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GET (download) ${path} failed (${response.status}): ${text}`);
    }
    return response.arrayBuffer();
  }

  // For async operations that return 202 + Location header (e.g. copy)
  async postAsync(path: string, body: unknown): Promise<{ operationUrl?: string; [key: string]: unknown }> {
    const response = await fetch(this.url(path), {
      method: 'POST',
      headers: {
        Authorization: await this.authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`POST ${path} failed (${response.status}): ${text}`);
    }
    const location = response.headers.get('Location');
    if (response.status === 202 && location) {
      return { operationUrl: location };
    }
    return response.json() as Promise<{ operationUrl?: string; [key: string]: unknown }>;
  }
}
