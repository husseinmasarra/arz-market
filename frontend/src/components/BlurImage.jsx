import React, { useState, useEffect, useRef, useMemo } from 'react';
import { blurHashToDataURL, isBlurHashValid, DEFAULT_BLURHASH } from '../utils/blurhash';
import { handleImageError as defaultHandleImageError } from '../utils/imageHelper';

/**
 * BlurImage Component
 * High-performance progressive image loader with BlurHash placeholder & smooth fade-in transition.
 */
export default function BlurImage({
  src,
  alt = '',
  blurhash,
  className = '',
  style = {},
  imgStyle = {},
  objectFit = 'contain',
  aspectRatio,
  onError,
  onLoad,
  onClick,
  onMouseEnter,
  onMouseLeave,
  loading = 'lazy',
  decoding = 'async',
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);

  // Generate BlurHash placeholder data URL
  const placeholderUrl = useMemo(() => {
    const validHash = isBlurHashValid(blurhash) ? blurhash : DEFAULT_BLURHASH;
    return blurHashToDataURL(validHash, 32, 32);
  }, [blurhash]);

  // IntersectionObserver for lazy triggering if needed
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle image load
  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  // Handle image error
  const handleError = (e) => {
    setHasError(true);
    setIsLoaded(true);
    if (onError) {
      onError(e);
    } else {
      defaultHandleImageError(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`blur-image-container ${className}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: aspectRatio || undefined,
        backgroundColor: 'var(--bg-tertiary, #f8fafc)',
        ...style
      }}
      {...props}
    >
      {/* 1. BlurHash Placeholder Layer */}
      {placeholderUrl && !hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${placeholderUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(16px)',
            transform: 'scale(1.15)', // prevents blurred edges
            opacity: isLoaded ? 0 : 1,
            transition: 'opacity 0.45s ease-out',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
      )}

      {/* 2. Loading Shimmer Overlay */}
      {!isLoaded && !hasError && (
        <div
          className="blur-shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0) 100%)',
            animation: 'shimmer 1.5s infinite',
            zIndex: 2,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* 3. Actual High-Resolution Image */}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding={decoding}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: objectFit,
            opacity: isLoaded ? 1 : 0,
            transform: isLoaded ? 'scale(1)' : 'scale(1.02)',
            transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-out',
            position: 'relative',
            zIndex: 3,
            display: 'block',
            ...imgStyle
          }}
        />
      )}
    </div>
  );
}
