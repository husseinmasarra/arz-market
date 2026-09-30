import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { 
  Camera, Upload, X, RefreshCw, Sparkles, Check, 
  Search, Image as ImageIcon, ShoppingCart, Eye, Tag, AlertCircle, ArrowLeft, ArrowRight
} from 'lucide-react';
import BlurImage from './BlurImage';
import { 
  SAMPLE_SEARCH_PRESETS, 
  analyzeImageForVisualSearch, 
  calculateVisualMatchScore 
} from '../utils/visualSearch';

export default function VisualSearchModal({ isOpen, onClose, onSelectProduct, onApplySearchFilter }) {
  const { lang, t, formatPrice, apiHost } = useApp();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload'
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const apiBase = apiHost ? `${apiHost}/api` : '/api';

  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera helper
  const startCamera = useCallback(async (facing = facingMode) => {
    stopCameraStream();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported by browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraError(lang === 'ar' ? 'تعذر فتح الكاميرا، يرجى السماح بالإذن أو رفع صورة من جهازك.' : 'Could not access camera. Please allow permission or upload an image.');
    }
  }, [facingMode, lang, stopCameraStream]);

  // Handle Tab Switch
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !imagePreview) {
      startCamera();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab, imagePreview, startCamera, stopCameraStream]);

  // Listen to clipboard paste (Ctrl+V) anywhere while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageSelected(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Execute Search from Visual Features
  const executeVisualQuery = async (features, fallbackKeywords = '') => {
    setIsAnalyzing(true);
    setHasSearched(true);
    try {
      const keywords = [
        ...(features.detectedKeywordsAr || []),
        ...(features.detectedKeywordsEn || [])
      ].slice(0, 15);

      const res = await fetch(`${apiBase}/products/visual-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          color: features.color,
          limit: 30
        })
      });

      if (res.ok) {
        const data = await res.json();
        const prods = Array.isArray(data.products) ? data.products : [];
        // Compute visual match score for each product
        const scoredProds = prods.map(p => ({
          ...p,
          visualMatchScore: calculateVisualMatchScore(p, features)
        })).sort((a, b) => b.visualMatchScore - a.visualMatchScore);

        setSearchResults(scoredProds);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Visual query error:', err);
      setSearchResults([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Process Selected Image (File / Captured / Preset)
  const handleImageSelected = async (imageFileOrUrl) => {
    setIsAnalyzing(true);
    stopCameraStream();

    let previewUrl = '';
    if (typeof imageFileOrUrl === 'string') {
      previewUrl = imageFileOrUrl;
    } else if (imageFileOrUrl instanceof Blob || imageFileOrUrl instanceof File) {
      previewUrl = URL.createObjectURL(imageFileOrUrl);
    }
    setImagePreview(previewUrl);

    // Analyze Image
    const features = await analyzeImageForVisualSearch(imageFileOrUrl);
    setAnalysisResult(features);

    // Query backend
    await executeVisualQuery(features);
  };

  // Capture current frame from Video Stream
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        handleImageSelected(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  // Switch between front/back camera
  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Reset search and start fresh
  const handleReset = () => {
    setImagePreview(null);
    setAnalysisResult(null);
    setSearchResults([]);
    setHasSearched(false);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelected(e.dataTransfer.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCameraStream();
          onClose();
        }
      }}
    >
      <div 
        className="animate-scale"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Camera size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {t('visual_search_title')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-light)' }}>
                {t('visual_search_desc')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-light)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Interaction Area: If no image preview, show Camera / Upload inputs */}
          {!imagePreview ? (
            <>
              {/* Tabs Switcher */}
              <div style={{
                display: 'flex',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '12px',
                padding: '4px',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('camera');
                    startCamera();
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: activeTab === 'camera' ? 'var(--bg-primary)' : 'transparent',
                    color: activeTab === 'camera' ? 'var(--text-primary)' : 'var(--text-light)',
                    boxShadow: activeTab === 'camera' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Camera size={18} color="#3b82f6" />
                  <span>{t('visual_search_camera')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    stopCameraStream();
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: activeTab === 'upload' ? 'var(--bg-primary)' : 'transparent',
                    color: activeTab === 'upload' ? 'var(--text-primary)' : 'var(--text-light)',
                    boxShadow: activeTab === 'upload' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Upload size={18} color="#10b981" />
                  <span>{t('visual_search_upload')}</span>
                </button>
              </div>

              {/* Camera Tab Viewfinder */}
              {activeTab === 'camera' && (
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '340px',
                  backgroundColor: '#000000',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--border-color)'
                }}>
                  {cameraError ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#ef4444' }}>
                      <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>{cameraError}</p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        style={{
                          marginTop: '16px',
                          padding: '8px 18px',
                          backgroundColor: '#3b82f6',
                          color: '#fff',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        {t('visual_search_upload')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />

                      {/* Camera Viewfinder Overlay Lines */}
                      <div style={{
                        position: 'absolute',
                        top: '15%',
                        left: '15%',
                        right: '15%',
                        bottom: '15%',
                        border: '2px dashed rgba(255,255,255,0.7)',
                        borderRadius: '16px',
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)'
                      }} />

                      {/* Camera Controls Bar */}
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '0',
                        right: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        zIndex: 10
                      }}>
                        {/* Flip Camera Button */}
                        <button
                          type="button"
                          onClick={handleFlipCamera}
                          title={lang === 'ar' ? 'تبديل الكاميرا' : 'Switch Camera'}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <RefreshCw size={18} />
                        </button>

                        {/* Capture Shutter Button */}
                        <button
                          type="button"
                          onClick={handleCapturePhoto}
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            border: '4px solid #3b82f6',
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.1s ease'
                          }}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                        </button>

                        {/* Open Gallery/File button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          title={lang === 'ar' ? 'اختيار من الاستوديو' : 'Choose from gallery'}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <ImageIcon size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Upload & Drag Drop Tab */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    height: '240px',
                    borderRadius: '16px',
                    border: `2px dashed ${isDragging ? '#3b82f6' : 'var(--border-color)'}`,
                    backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.06)' : 'var(--bg-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    padding: '20px'
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6'
                  }}>
                    <Upload size={28} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {t('visual_search_drop')}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      {t('visual_search_paste_hint')}
                    </p>
                  </div>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageSelected(e.target.files[0]);
                  }
                }}
              />

              {/* Preset Sample Images for Instant 1-Click Testing */}
              <div>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: 'var(--text-light)',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Sparkles size={14} color="#f59e0b" />
                  <span>{t('visual_search_samples')}</span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '10px'
                }}>
                  {SAMPLE_SEARCH_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleImageSelected(preset.imageUrl)}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <img
                        src={preset.imageUrl}
                        alt={preset.titleEn}
                        style={{
                          width: '100%',
                          height: '70px',
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {lang === 'ar' ? preset.titleAr : preset.titleEn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Analysis & Results View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Image Preview & Visual Features Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '14px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden' }}>
                    <img
                      src={imagePreview}
                      alt="Query"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {isAnalyzing && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(59, 130, 246, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <RefreshCw size={16} color="#fff" className="animate-spin" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {isAnalyzing ? t('visual_search_analyzing') : t('visual_search_results')}
                    </div>
                    {analysisResult && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {analysisResult.color && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-light)' }}>
                            <span style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: analysisResult.color,
                              border: '1px solid #ffffff'
                            }} />
                            <span>{analysisResult.color}</span>
                          </div>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>•</span>
                        <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700' }}>
                          {searchResults.length} {lang === 'ar' ? 'منتج مطابق' : 'matched products'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>{t('visual_search_retake')}</span>
                </button>
              </div>

              {/* Matched Products Grid */}
              {isAnalyzing ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <RefreshCw size={36} color="#3b82f6" className="animate-spin" />
                  <p style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)' }}>
                    {t('visual_search_analyzing')}
                  </p>
                </div>
              ) : searchResults.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '14px',
                  maxHeight: '420px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {searchResults.map((product) => {
                    const prodName = (lang === 'ar' ? product.name_ar : product.name_en) || product.name_ar || product.name_en || 'Product';
                    const score = product.visualMatchScore || 85;

                    return (
                      <div
                        key={product.id}
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }}
                      >
                        {/* Visual Match Badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: lang === 'ar' ? 'auto' : '8px',
                          left: lang === 'ar' ? '8px' : 'auto',
                          zIndex: 5,
                          backgroundColor: score >= 90 ? 'rgba(16, 185, 129, 0.95)' : 'rgba(59, 130, 246, 0.95)',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                        }}>
                          <Sparkles size={11} />
                          <span>{score}% {t('visual_search_match_score')}</span>
                        </div>

                        {/* Image */}
                        <div 
                          onClick={() => {
                            stopCameraStream();
                            onClose();
                            if (onSelectProduct) onSelectProduct(product);
                          }}
                          style={{
                            width: '100%',
                            height: '140px',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <BlurImage
                            src={product.image_url}
                            blurhash={product.blurhash}
                            alt={prodName}
                            productName={prodName}
                            categoryName={product.category_name_ar || product.category_name_en}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
                          />
                        </div>

                        {/* Card Info */}
                        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          <h5 
                            onClick={() => {
                              stopCameraStream();
                              onClose();
                              if (onSelectProduct) onSelectProduct(product);
                            }}
                            style={{
                              margin: 0,
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer'
                            }}
                            title={prodName}
                          >
                            {prodName}
                          </h5>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent-blue)' }}>
                              {formatPrice(product.price)}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, 1);
                              }}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'var(--accent-blue)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title={t('add_to_cart')}
                            >
                              <ShoppingCart size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <AlertCircle size={32} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {t('visual_search_no_results')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
