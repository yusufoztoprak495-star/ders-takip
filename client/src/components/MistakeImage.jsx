import { useEffect, useState } from 'react';
import { getImageStore } from '../data/images.js';

// Görsel deposundaki fotoğrafı gösterir. Blob için geçici bir adres (blob:) açılır, öğe kalkınca bırakılır.
export default function MistakeImage({ imageId, alt, className, onClick }) {
  const [url, setUrl] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    getImageStore()
      .get(imageId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setMissing(true);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (missing) return <div className={`${className ?? ''} image-missing`}>Fotoğraf bulunamadı</div>;
  if (!url) return <div className={`${className ?? ''} image-loading`} aria-hidden="true" />;
  const img = <img src={url} alt={alt} className={className} loading="lazy" decoding="async" />;
  return onClick ? (
    <button type="button" className="image-button" onClick={() => onClick(url)} aria-label={`${alt}: büyüt`}>
      {img}
    </button>
  ) : (
    img
  );
}
