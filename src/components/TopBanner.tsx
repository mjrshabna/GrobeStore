import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopBanner() {
  const { settings } = useSettings();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
  // Migration logic
  const banners = settings.ui.topBanner?.banners?.length 
    ? settings.ui.topBanner.banners 
    : (settings.ui.topBanner?.imageUrl ? [{
        imageUrl: settings.ui.topBanner.imageUrl,
        linkUrl: settings.ui.topBanner.linkUrl || ''
      }] : []);

  if (!settings.ui.topBanner?.enabled || banners.length === 0) {
    return null;
  }

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, settings.ui.topBanner?.autoChangeInterval || 5000);

    return () => clearInterval(interval);
  }, [banners.length, settings.ui.topBanner?.autoChangeInterval]);

  return (
    <div className="w-full mt-16 lg:mt-20 px-4 lg:px-8 max-w-[1920px] mx-auto pt-4 relative group">
      <div className="w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-slate-100 grid relative" style={{ aspectRatio: '1080/278' }}>
        {banners.map((banner, index) => {
          const isActive = currentBannerIndex === index;
          const ImgBlock = (
            <motion.img 
              initial={false}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              src={banner.imageUrl} 
              alt="Advertisement Banner" 
              className="w-full h-full object-contain absolute inset-0"
              referrerPolicy="no-referrer"
            />
          );

          if (banner.linkUrl) {
            return (
              <a 
                key={`banner-${index}`}
                href={banner.linkUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="col-start-1 row-start-1 block w-full h-full relative"
                style={{ 
                  zIndex: isActive ? 10 : 0,
                  pointerEvents: isActive ? 'auto' : 'none'
                }}
              >
                {ImgBlock}
              </a>
            );
          }

          return (
            <div 
                key={`banner-${index}`}
                className="col-start-1 row-start-1 block w-full h-full relative"
                style={{ 
                  zIndex: isActive ? 10 : 0,
                  pointerEvents: isActive ? 'auto' : 'none'
                }}
            >
                {ImgBlock}
            </div>
          );
        })}
      </div>
    </div>
  );
}
