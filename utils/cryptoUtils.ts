
/**
 * Generates a SHA-256 hash for a given string or ArrayBuffer.
 * Uses the Web Crypto API for secure, client-side hashing.
 * @param input The string or ArrayBuffer to hash.
 * @returns A promise that resolves to the SHA-256 hash as a hex string.
 */
export const generateSha256Hash = async (input: string | ArrayBuffer): Promise<string> => {
  let data: BufferSource;
  if (typeof input === 'string') {
    const encoder = new TextEncoder();
    data = encoder.encode(input);
  } else {
    data = input;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
