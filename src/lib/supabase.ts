const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export function validateAnnotationImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return '仅支持 JPG、PNG、WebP、GIF 图片';
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return '单张图片不能超过 2MB';
  }

  return null;
}

export async function uploadAnnotationImage(file: File): Promise<string | null> {
  const validationError = validateAnnotationImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export async function deleteAnnotationImage(url: string): Promise<boolean> {
  return Boolean(url);
}
