'use client'

/**
 * JAPA Core ERP — Offline-First IndexedDB Transaction Queue
 * Conforms to Section 4.1 & 4.2 of the Multi-Branch Architecture Plan.
 */

export interface QueuedTransaction {
  queue_id: string
  created_at: string
  branch_id: string
  cashier_id: string
  payload: {
    order_number: string
    items: Array<{
      product_id: string
      qty: number
      unit_price: number
      item_name?: string
    }>
    total_amount: number
    payment_method: string
    customer_name?: string
  }
  sync_status: 'pending_upload' | 'syncing' | 'synced' | 'failed'
  retry_count: number
}

const DB_NAME = 'japa_erp_offline_db'
const STORE_NAME = 'pending_transactions_queue'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'queue_id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Enqueue a transaction when offline or network drops during POS checkout
 */
export async function enqueueOfflineTransaction(
  branchId: string,
  cashierId: string,
  payload: QueuedTransaction['payload']
): Promise<QueuedTransaction> {
  const db = await openDB()
  const queueItem: QueuedTransaction = {
    queue_id: `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    created_at: new Date().toISOString(),
    branch_id: branchId,
    cashier_id: cashierId,
    payload,
    sync_status: 'pending_upload',
    retry_count: 0,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(queueItem)

    request.onsuccess = () => resolve(queueItem)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all queued transactions awaiting cloud synchronization
 */
export async function getPendingTransactions(): Promise<QueuedTransaction[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

/**
 * Remove an item from the queue after successful upload to Supabase
 */
export async function removeOfflineTransaction(queueId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(queueId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Process and synchronize all queued offline transactions back to Supabase
 */
export async function syncOfflineQueue(
  uploadHandler: (item: QueuedTransaction) => Promise<boolean>
): Promise<{ succeeded: number; failed: number }> {
  const pending = await getPendingTransactions()
  let succeeded = 0
  let failed = 0

  for (const item of pending) {
    try {
      const success = await uploadHandler(item)
      if (success) {
        await removeOfflineTransaction(item.queue_id)
        succeeded++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { succeeded, failed }
}
