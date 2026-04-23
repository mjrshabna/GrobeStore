import React, { createContext, useContext, useState, useEffect } from 'react';
import { Settings, getSettings } from '../services/db';

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>({
    shopName: 'GROBE',
    contactEmail: '',
    maintenanceMode: false,
    profitMargin: 0,
    upiId: '',
    geminiApiKey: '',
    zohoEmail: '',
    zohoPassword: '',
    ui: {
      primaryColor: '#2563eb',
      secondaryColor: '#4f46e5',
      backgroundColor: '#f8fafc',
      headingFont: 'Inter',
      bodyFont: 'Inter',
      borderRadius: 12,
      cardPadding: 16,
      showTrendingNow: true,
      showFlashDeals: true,
      showCategories: true,
      showBlog: true,
      pageLayout: '',
      animationSpeed: 'normal',
      heroSection: {
        enableMultipleImages: false,
        images: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2070'],
        autoChangeInterval: 5000,
      },
      topBanner: {
        enabled: false,
        banners: [],
        autoChangeInterval: 5000,
        imageUrl: '',
        linkUrl: ''
      }
    }
  });
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const fetchedSettings = await getSettings();
      if (fetchedSettings) {
        setSettings(fetchedSettings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  useEffect(() => {
    if (!loading && settings.ui) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', settings.ui.primaryColor);
      root.style.setProperty('--secondary-color', settings.ui.secondaryColor);
      root.style.setProperty('--bg-color', settings.ui.backgroundColor);
      root.style.setProperty('--heading-font', settings.ui.headingFont);
      root.style.setProperty('--body-font', settings.ui.bodyFont);
      root.style.setProperty('--border-radius', `${settings.ui.borderRadius}px`);
      root.style.setProperty('--card-padding', `${settings.ui.cardPadding}px`);
      
      const speedMap = {
        'fast': '0.15s',
        'normal': '0.3s',
        'slow': '0.6s'
      };
      root.style.setProperty('--animation-speed', speedMap[settings.ui.animationSpeed || 'normal']);
    }
  }, [settings.ui, loading]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
