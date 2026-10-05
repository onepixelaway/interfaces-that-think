// Earlier builds saved a primary API key under the prototype's original name.
// Delete that entry without reading or migrating the secret into this session.
export function removeLegacyKey() {
  try {
    globalThis.localStorage.removeItem('smart-writer.openai-api-key');
    return true;
  } catch {
    return false;
  }
}
