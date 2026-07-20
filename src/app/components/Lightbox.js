"use client";
import { useState, useEffect } from "react";

export default function Lightbox({ mediaList, initialIndex, onClose, onDelete }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, mediaList, onClose]);

  if (!mediaList || mediaList.length === 0) return null;

  // In case deletion makes currentIndex out of bounds
  const safeIndex = currentIndex >= mediaList.length ? mediaList.length - 1 : currentIndex;
  const currentMedia = mediaList[safeIndex];

  const handlePrev = () => {
    if (safeIndex > 0) setCurrentIndex(safeIndex - 1);
  };

  const handleNext = () => {
    if (safeIndex < mediaList.length - 1) setCurrentIndex(safeIndex + 1);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentMedia.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = currentMedia.text || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert("Download failed.");
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this file for both of you?")) {
      if (onDelete) {
        onDelete(currentMedia.id);
        if (mediaList.length === 1) {
          onClose();
        } else if (safeIndex === mediaList.length - 1) {
          setCurrentIndex(safeIndex - 1);
        }
      }
    }
  };

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}
    >
      {/* Top Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        zIndex: 10
      }}>
        <div style={{ color: 'white', fontSize: '0.9rem', opacity: 0.8 }}>
          {safeIndex + 1} of {mediaList.length} • Sent by {currentMedia.sender}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button onClick={handleDownload} style={iconButtonStyle} title="Download">⬇️</button>
          {onDelete && <button onClick={handleDelete} style={iconButtonStyle} title="Delete">🗑️</button>}
          <button onClick={onClose} style={{...iconButtonStyle, fontSize: '2rem'}} title="Close">×</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Prev Button */}
        {safeIndex > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
            style={{ ...navButtonStyle, left: '1.5rem', opacity: hovering ? 1 : 0.5 }}
          >
            ◀
          </button>
        )}

        {/* Media */}
        <div style={{ maxWidth: '90%', maxHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {currentMedia.type === 'image' ? (
            <img src={currentMedia.url} alt="Media" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
          ) : (
            <video src={currentMedia.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '4px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
          )}
        </div>

        {/* Next Button */}
        {safeIndex < mediaList.length - 1 && (
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }} 
            style={{ ...navButtonStyle, right: '1.5rem', opacity: hovering ? 1 : 0.5 }}
          >
            ▶
          </button>
        )}
      </div>
    </div>
  );
}

const iconButtonStyle = {
  background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.25rem',
  padding: '0.5rem', display: 'flex', alignItems: 'center', transition: 'transform 0.1s'
};

const navButtonStyle = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
  fontSize: '1.5rem', width: '3rem', height: '3rem', borderRadius: '50%', cursor: 'pointer',
  transition: 'opacity 0.2s, background 0.2s', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
};
