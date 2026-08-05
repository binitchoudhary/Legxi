import { ITransferService, OwnershipRecordDto } from '../../../application/ports/ITransferService';
import { logger } from '../../../shared/logger';

export interface HttpTransferServiceConfig {
  baseUrl: string;
  authToken: string;
  timeoutMs: number;
}

export class HttpTransferServiceAdapter implements ITransferService {
  constructor(private readonly config: HttpTransferServiceConfig) {}

  public async getOwnershipRecord(handle: string, correlationId: string): Promise<OwnershipRecordDto | null> {
    const url = `${this.config.baseUrl}/admin/transfers/${handle}`;
    return this.executeRequest<{ transfer: OwnershipRecordDto }>(url, 'GET', undefined, correlationId)
      .then(res => res.transfer)
      .catch(error => {
        if (error.status === 404) return null;
        throw error;
      });
  }

  public async createOwnership(payload: Record<string, any>, correlationId: string): Promise<void> {
    const url = `${this.config.baseUrl}/admin/transfers`;
    await this.executeRequest(url, 'POST', payload, correlationId);
  }

  public async updateOwnership(handle: string, payload: Record<string, any>, correlationId: string): Promise<void> {
    const url = `${this.config.baseUrl}/admin/transfers/${handle}`;
    await this.executeRequest(url, 'PUT', payload, correlationId);
  }

  private async executeRequest<T>(url: string, method: string, payload: any, correlationId: string): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const headers: Record<string, string> = {
        'x-admin-token': this.config.authToken,
        'x-admin-name': 'AuctionPlatform',
        'X-Correlation-ID': correlationId
      };

      if (payload) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return (await response.json()) as T;
      }

      const responseText = await response.text();
      let isTransient = false;

      // Classify error type
      if (response.status >= 500 || response.status === 429) {
        isTransient = true; 
      }
      
      const error: any = new Error(`Transfer service responded with status ${response.status}: ${responseText}`);
      error.isTransient = isTransient;
      error.status = response.status;
      
      throw error;

    } catch (error: any) {
      if (error.name === 'AbortError' || error.type === 'aborted') {
        const timeoutError: any = new Error('Transfer service request timed out');
        timeoutError.isTransient = true;
        throw timeoutError;
      }

      if (!error.status) {
        error.isTransient = true; // Network errors
      }

      throw error;
    }
  }
}
