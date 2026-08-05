import { ITransferService, OwnershipRecordDto } from '../../../application/ports/ITransferService';
import { logger } from '../../../shared/logger';

export class MockTransferServiceAdapter implements ITransferService {
  private records: Map<string, OwnershipRecordDto> = new Map();

  public async getOwnershipRecord(handle: string, correlationId: string): Promise<OwnershipRecordDto | null> {
    logger.info({ handle, correlationId, mock: true }, 'Mock transfer service: Get ownership requested');
    await new Promise(resolve => setTimeout(resolve, 10));
    return this.records.get(handle) || null;
  }

  public async createOwnership(payload: Record<string, any>, correlationId: string): Promise<void> {
    logger.info({ payload, correlationId, mock: true }, 'Mock transfer service: Create ownership requested');
    await new Promise(resolve => setTimeout(resolve, 20));
    const handle = String(payload.certificate_id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    this.records.set(handle, {
      handle,
      certificate_id: payload.certificate_id,
      current_owner_phone: payload.owner_phone,
      current_owner_name: payload.owner_name,
      current_owner_email: payload.owner_email
    });
  }

  public async updateOwnership(handle: string, payload: Record<string, any>, correlationId: string): Promise<void> {
    logger.info({ handle, payload, correlationId, mock: true }, 'Mock transfer service: Update ownership requested');
    await new Promise(resolve => setTimeout(resolve, 20));
    const existing = this.records.get(handle);
    if (existing && payload.fields) {
      existing.current_owner_name = payload.fields.current_owner_name || existing.current_owner_name;
      existing.current_owner_phone = payload.fields.current_owner_phone || existing.current_owner_phone;
      existing.current_owner_email = payload.fields.current_owner_email || existing.current_owner_email;
    }
  }
}
