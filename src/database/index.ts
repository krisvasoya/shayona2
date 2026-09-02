/**
 * Local Database Persistence Layer Placeholder
 * Handles SQLite / offline cache storage.
 */

export interface DatabaseAdapter {
  init(): Promise<void>;
  close(): Promise<void>;
}
