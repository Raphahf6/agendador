const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_MAX_HEIGHT = 1600;
const DEFAULT_QUALITY = 0.82;
const OUTPUT_TYPE = 'image/webp';

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Nao foi possivel ler a imagem.'));
    };
    image.src = url;
  });
}

async function readImage(file) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        close: () => bitmap.close?.(),
      };
    } catch {
      // Safari and a few mobile browsers can fail on some JPEG profiles. The img fallback handles them.
    }
  }

  const image = await loadImageElement(file);
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
    close: () => {},
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Nao foi possivel comprimir a imagem.'));
    }, type, quality);
  });
}

function targetSize(width, height, maxWidth, maxHeight) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function compressImageForUpload(file, options = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('Envie apenas arquivos de imagem.');
  if (file.type === 'image/svg+xml') throw new Error('SVG nao e aceito para upload. Envie JPG, PNG ou WebP.');

  const maxWidth = Number(options.maxWidth || DEFAULT_MAX_WIDTH);
  const maxHeight = Number(options.maxHeight || DEFAULT_MAX_HEIGHT);
  const quality = Number(options.quality || DEFAULT_QUALITY);
  const source = await readImage(file);

  try {
    const size = targetSize(source.width, source.height, maxWidth, maxHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Seu navegador nao permitiu comprimir a imagem.');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);
    source.draw(context, size.width, size.height);

    const blob = await canvasToBlob(canvas, OUTPUT_TYPE, quality);
    const baseName = String(file.name || 'imagem').replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'imagem';
    const compressed = new File([blob], `${baseName}.webp`, {
      type: OUTPUT_TYPE,
      lastModified: Date.now(),
    });

    return {
      file: compressed,
      originalSize: file.size || 0,
      compressedSize: compressed.size || 0,
      width: size.width,
      height: size.height,
      originalWidth: source.width,
      originalHeight: source.height,
    };
  } finally {
    source.close();
  }
}

