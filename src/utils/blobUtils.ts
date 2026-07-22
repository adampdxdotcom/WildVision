/**
 * Converts a base64 string (with or without data URL header) into a JS Blob object.
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
  let cleanBase64 = base64;
  
  if (base64.includes(';base64,')) {
    cleanBase64 = base64.split(';base64,')[1];
  }
  
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
