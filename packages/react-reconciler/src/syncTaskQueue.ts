let syncQueue: Array<(...args: any[]) => void> | null = null
let isFlushingSyncQueue = false

export function scheduleSyncCallback(callback: (...args: any[]) => void) {
  if (syncQueue === null) {
    syncQueue = [callback]
  } else {
    syncQueue.push(callback)
  }
}

export function flushSyncCallbacks() {
  if (!isFlushingSyncQueue && syncQueue) {
    isFlushingSyncQueue = true
    try {
      syncQueue.forEach((callback) => callback())
    } catch (e) {
      if (__DEV__) {
        console.warn("(flushSyncCallbacks)", "同步任务队列执行错误", e)
      }
    } finally {
      syncQueue = null
      isFlushingSyncQueue = false
    }
  }
}
