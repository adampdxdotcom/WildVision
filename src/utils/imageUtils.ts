import exifr from 'exifr';

export async function processUploadedImage(file: File): Promise<{ base64: string; focalLength: number | null }> {
  // 1. Parse EXIF metadata for focal length
  let focalLength: number | null = null;
  try {
    const output = await exifr.parse(file, ['FocalLengthIn35mmFilm', 'FocalLength']);
    if (output) {
      const mm = output.FocalLengthIn35mmFilm || output.FocalLength;
      if (typeof mm === 'number' && !isNaN(mm)) {
        console.log(`Extracted Focal Length: ${mm}mm`);
        focalLength = mm;
      }
    }
  } catch (err) {
    console.warn('Error reading EXIF data:', err);
  }

  // 2. Create temporary object URL and load image inside a Promise
  const tempUrl = URL.createObjectURL(file);
  
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const img = new window.Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to initialize canvas context for photo compression.'));
            return;
          }
          
          // Calculate downscaled dimensions to fit inside a 1024x1024 box
          const maxDim = 1024;
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export style as lightweight base64
          let compressedBase64 = '';
          try {
            compressedBase64 = canvas.toDataURL('image/webp', 0.8);
            if (!compressedBase64.startsWith('data:image/webp')) {
              // fallback to jpeg
              compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            }
          } catch (err) {
            compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          }
          
          resolve(compressedBase64);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load the selected image file. Please verify it is a valid image.'));
      };
      
      img.src = tempUrl;
    });

    return { base64, focalLength };
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}

export async function processSurfaceSlab(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds the 10MB limit.');
  }

  const tempUrl = URL.createObjectURL(file);

  try {
    return await new Promise<{ blob: Blob; dataUrl: string }>((resolve, reject) => {
      const img = new window.Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to initialize canvas context.'));
            return;
          }

          const maxDim = 2048;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Get Data URL
          let dataUrl = canvas.toDataURL('image/webp', 0.8);
          let mimeType = 'image/webp';
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            mimeType = 'image/jpeg';
          }

          // Get Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, dataUrl });
              } else {
                reject(new Error('Failed to create blob from canvas.'));
              }
            },
            mimeType,
            0.8
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image file.'));
      };

      img.src = tempUrl;
    });
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}

export async function downloadImageSecurely(imageUrl: string, filename: string): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    
    // Ensure filename ends with .jpg or .png or similar
    let finalFilename = filename;
    const lowerFn = finalFilename.toLowerCase();
    if (!lowerFn.endsWith('.jpg') && !lowerFn.endsWith('.jpeg') && !lowerFn.endsWith('.png')) {
      finalFilename = `${finalFilename}.jpg`;
    }
    link.download = finalFilename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error during secure image download:', error);
  }
}


export const mathCropElevationImage = (dataUrl: string, w3D: number, h3D: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // The Orthographic camera has a fixed vertical frustum of 6 units
      const pixelsPerUnit = img.height / 6; 
      
      const cropW = w3D * pixelsPerUnit;
      const cropH = h3D * pixelsPerUnit;
      
      const sx = (img.width - cropW) / 2;
      const sy = (img.height - cropH) / 2;
      
      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      
      // Solid white background to prevent transparent-to-black conversion
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cropW, cropH);
      
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};