import React, { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
}

export default function ImageZoomModal({ isOpen, onClose, image }: ImageZoomModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full" onClick={onClose}>
        <X className="w-8 h-8" />
      </button>
      <div className="max-w-4xl max-h-[90vh] overflow-auto cursor-zoom-in">
        <img src={image} alt="Zoomed" className="max-w-full h-auto rounded-lg" referrerPolicy="no-referrer" />
      </div>
    </div>
  );
}
