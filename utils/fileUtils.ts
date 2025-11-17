/**
 * Converts a File object to a base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 string (without the data URL prefix).
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // The result includes the data URL prefix (e.g., "data:image/png;base64,"),
        // which needs to be stripped for the Gemini API.
        const base64String = reader.result.split(',')[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error('Could not extract base64 string from file.'));
        }
      } else {
        reject(new Error('Failed to read file as a data URL.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};