export interface OwnershipRecordDto {
  handle: string;
  certificate_id: string;
  current_owner_phone: string;
  current_owner_name: string;
  current_owner_email: string;
}

export interface ITransferService {
  /**
   * Retrieves an existing ownership record by handle.
   */
  getOwnershipRecord(handle: string, correlationId: string): Promise<OwnershipRecordDto | null>;

  /**
   * Creates a new ownership record (POST).
   * Maps to /admin/transfers in the transfer-service.
   */
  createOwnership(payload: Record<string, any>, correlationId: string): Promise<void>;

  /**
   * Updates an existing ownership record (PUT).
   * Maps to /admin/transfers/:handle in the transfer-service.
   */
  updateOwnership(handle: string, payload: Record<string, any>, correlationId: string): Promise<void>;
}
