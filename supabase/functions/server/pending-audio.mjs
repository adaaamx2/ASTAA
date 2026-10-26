/** A durable outbox in the project index survives Storage failures and Edge restarts.
 * Never clear it until both the file and its recovery metadata are persisted.
 */
export async function persistPendingAudio(store, key, generate, persist) {
  const pendingKey = `${key}:pending`
  let pending = await store.get(pendingKey)
  const recovered = Boolean(pending)
  if (!pending) {
    pending = await generate()
    await store.set(pendingKey, pending)
  }
  const record = await persist(pending)
  try {
    await store.remove(pendingKey)
  } catch {}
  return { record, recovered }
}

/** Once provider audio exists, a persistence failure must not hide its bytes. */
export async function deliverGeneratedAudio(record, base64, persist) {
  try {
    return await persist()
  } catch {
    return {
      ...record,
      url: `data:audio/mpeg;base64,${base64}`,
      cacheHit: record.cacheHit === true,
      persistencePending: true,
    }
  }
}
