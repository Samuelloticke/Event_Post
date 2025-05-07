// src/context/app-settings-context.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SETTINGS_KEY = 'josiasEventSettings';

const DEFAULT_TEMPLATE_WIDTH = 1080;
const DEFAULT_TEMPLATE_HEIGHT = 1350;

export interface AppSettings {
  eventImageTemplate: {
    url: string | null;
    opacityOnDrag: number;
    opacityOnIdle: number;
    preserveAspectRatio: boolean; 
    layering: {
      templateOnTop: boolean;
      userImageBelow: boolean;
    };
    transformControls: { 
      enabled: boolean;
      draggable: boolean;
      scalable: boolean;
      keepAspectRatio: boolean; 
    };
    interaction: {
      resetOpacityOnMouseLeave: boolean;
    };
  };
  uiTheme: {
    style: string;
    reference: string;
    backgroundColor: string;
    primaryColor: string; 
    secondaryColorAuto: boolean; 
  };
  // overlayText: string; // Removed
  photoX: number; 
  photoY: number; 
  photoWidth: number; 
  photoHeight: number; 
  nameX: number; 
  nameY: number; 
  nameSize: number; 
  templateWidth: number; 
  templateHeight: number; 
}

const initialSettings: AppSettings = {
  eventImageTemplate: {
    url: null,
    opacityOnDrag: 0.7,
    opacityOnIdle: 1.0,
    preserveAspectRatio: true,
    layering: {
      templateOnTop: true,
      userImageBelow: true,
    },
    transformControls: {
      enabled: true, 
      draggable: true,
      scalable: true,
      keepAspectRatio: true,
    },
    interaction: {
      resetOpacityOnMouseLeave: true,
    },
  },
  uiTheme: {
    style: "minimal",
    reference: "Apple",
    backgroundColor: "#D6E5FF",
    primaryColor: "#FFFFFF", 
    secondaryColorAuto: true, 
  },
  // overlayText: "J'y serai à Le Règne des Josias!", // Removed
  photoX: 10,
  photoY: 10,
  photoWidth: 30,
  photoHeight: 40,
  nameX: 50,
  nameY: 80,
  nameSize: 5,
  templateWidth: DEFAULT_TEMPLATE_WIDTH,
  templateHeight: DEFAULT_TEMPLATE_HEIGHT,
};

interface AppSettingsContextType {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  uploadTemplate: (file: File) => Promise<string | null>;
  saveSettings: (settingsToSave: AppSettings) => Promise<void>;
  loading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setAppSettingsState] = useState<AppSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const prepareSettingsForStorage = useCallback((currentSettings: AppSettings): AppSettings => {
    const settingsForStorage = JSON.parse(JSON.stringify(currentSettings)); // Deep clone
    // Remove potentially large data URL for template if present, as it's mainly for live preview
    // The actual URL from Firebase/storage should be used if re-fetching, 
    // but for localStorage, this prevents quota issues.
    // If template.url is a data URI, it means it was just uploaded or is being previewed.
    // We only want to store the persistent URL (e.g., Firebase URL) or null if not set.
    // However, the current uploadTemplate logic directly saves the data URI for simplicity.
    // For now, we'll let it save, but be mindful of localStorage limits.
    // A better approach might be to *not* store template data URLs in localStorage
    // and re-fetch if 'settings.eventImageTemplate.url' is a persistent URL on load.
    // For this iteration, we clean it if it's a data URI to avoid quota errors.
    if (settingsForStorage.eventImageTemplate.url &&
        typeof settingsForStorage.eventImageTemplate.url === 'string' &&
        settingsForStorage.eventImageTemplate.url.startsWith('data:image/')) {
       // Keep data URL for now as per current logic, but this is where it could be stripped for storage.
       // console.log("Data URI detected for template, be mindful of localStorage quota.");
    }
    return settingsForStorage;
  }, []);


  useEffect(() => {
    if (!isMounted) return;
    setLoading(true);
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        const completeSettings = {
          ...initialSettings,
          ...parsedSettings,
          eventImageTemplate: {
            ...initialSettings.eventImageTemplate,
            ...(parsedSettings.eventImageTemplate || {}),
          },
          uiTheme: {
            ...initialSettings.uiTheme,
            ...(parsedSettings.uiTheme || {}),
          }
        };
        // Ensure overlayText is removed if it exists in old stored settings
        if ('overlayText' in completeSettings) {
          delete (completeSettings as any).overlayText;
        }
        setAppSettingsState(completeSettings);
      } else {
        // If no stored settings, persist initial settings (cleaned of overlayText)
        const initialToStore = { ...initialSettings };
         if ('overlayText' in initialToStore) {
          delete (initialToStore as any).overlayText;
        }
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(prepareSettingsForStorage(initialToStore)));
        setAppSettingsState(initialToStore);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      setAppSettingsState(initialSettings); 
    } finally {
      setLoading(false);
    }
  }, [isMounted, prepareSettingsForStorage]);

  const updateSettingsAndPersist = useCallback((newSettings: AppSettings) => {
    // Ensure overlayText is not part of the new settings being saved
    const settingsToSave = { ...newSettings };
    if ('overlayText' in settingsToSave) {
      delete (settingsToSave as any).overlayText;
    }
    
    setAppSettingsState(settingsToSave); 

    if (isMounted) {
      const storableSettings = prepareSettingsForStorage(settingsToSave);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(storableSettings));
      } catch (e) {
        console.error("LocalStorage setItem quota error or other issue in updateSettingsAndPersist:", e);
      }
    }
  }, [isMounted, prepareSettingsForStorage]);


  const uploadTemplate = async (file: File): Promise<string | null> => {
    if (!isMounted) return null;
    setLoading(true);
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Update settings state with the new dataUrl for immediate preview
          setAppSettingsState(prevSettings => {
            const newSettingsWithDataUrl = {
              ...prevSettings,
              eventImageTemplate: {
                ...prevSettings.eventImageTemplate,
                url: dataUrl,
              },
            };
            // Persist these settings (including the potentially large data URL for now)
            updateSettingsAndPersist(newSettingsWithDataUrl);
            return newSettingsWithDataUrl;
          });
          setLoading(false);
          resolve(dataUrl);
        };
        reader.onerror = (error) => {
          setLoading(false);
          console.error("Error reading file for template upload:", error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Error processing template upload:", error);
      setLoading(false);
      return null;
    }
  };
  
  const saveSettingsAdmin = async (settingsToSave: AppSettings) => {
    if (!isMounted) return;
    setLoading(true);
    try {
      // The settingsToSave from admin might include a new template URL (data URI or persistent)
      // updateSettingsAndPersist will handle storing it.
      updateSettingsAndPersist(settingsToSave); 
    } catch (error) {
      console.error("Error in saveSettingsAdmin operation:", error);
      throw error; 
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppSettingsContext.Provider value={{ settings, setSettings: updateSettingsAndPersist, uploadTemplate, saveSettings: saveSettingsAdmin, loading }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
