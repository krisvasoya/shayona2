import {
  DbCustomer,
  DbBuyer,
  DbInvoice,
  DbInvoiceItem,
  DbPayment,
  DbExpense,
} from '@/src/types/database';

export type SyncStatus = 'SYNCED' | 'PENDING_CREATE' | 'PENDING_UPDATE' | 'PENDING_DELETE';

export type EntityType = 'CUSTOMER' | 'BUYER' | 'INVOICE' | 'INVOICE_ITEM' | 'PAYMENT' | 'EXPENSE';

export interface LocalCustomer extends DbCustomer {
  sync_status: SyncStatus;
  local_updated_at: string;
}

export interface LocalBuyer extends DbBuyer {
  sync_status: SyncStatus;
  local_updated_at: string;
}

export interface LocalInvoice extends DbInvoice {
  sync_status: SyncStatus;
  local_updated_at: string;
}

export interface LocalInvoiceItem extends DbInvoiceItem {
  sync_status: SyncStatus;
  local_updated_at: string;
}

export interface LocalPayment extends DbPayment {
  sync_status: SyncStatus;
  local_updated_at: string;
}

export interface LocalExpense extends DbExpense {
  sync_status: SyncStatus;
  local_updated_at: string;
}

export type QueueOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  user_id: string;
  entity: EntityType;
  entity_id: string;
  operation: QueueOperation;
  payload: Record<string, unknown> | null;
  created_at: string;
  retry_count: number;
  last_error?: string;
}
