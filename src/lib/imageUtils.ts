export function compressBase64Image(
  dataUrl: string,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image') || dataUrl.includes('image/svg+xml')) {
      resolve(dataUrl || '');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl.length < dataUrl.length ? compressedDataUrl : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function compressUserPhotos<T extends { avatar?: string; photos?: string[] }>(data: T): Promise<T> {
  const copy = { ...data };
  if (copy.avatar && typeof copy.avatar === 'string' && copy.avatar.startsWith('data:image')) {
    copy.avatar = await compressBase64Image(copy.avatar, 600, 600, 0.7);
  }
  if (copy.photos && Array.isArray(copy.photos)) {
    const compressedPhotos = await Promise.all(
      copy.photos.slice(0, 6).map((p) =>
        typeof p === 'string' && p.startsWith('data:image') ? compressBase64Image(p, 600, 600, 0.7) : p
      )
    );
    copy.photos = compressedPhotos;
  }
  return copy;
}
