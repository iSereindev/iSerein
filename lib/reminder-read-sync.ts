export const READ_SYNC_BATCH_SIZE = 250;

export function validReadSyncIds(value: unknown): value is number[] {
  return Array.isArray(value) && value.length <= READ_SYNC_BATCH_SIZE &&
    value.every(id => typeof id === "number" && Number.isSafeInteger(id) && id > 0);
}
