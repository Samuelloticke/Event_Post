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
  overlayText: string;
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
  overlayText: "J'y serai à Le Règne des Josias!",
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

  const prepareSettingsForStorage = (currentSettings: AppSettings): AppSettings => {
    const settingsForStorage = JSON.parse(JSON.stringify(currentSettings)); // Deep clone
    if (settingsForStorage.eventImageTemplate.url &&
        typeof settingsForStorage.eventImageTemplate.url === 'string' &&
        settingsForStorage.eventImageTemplate.url.startsWith('data:image/')) {
      settingsForStorage.eventImageTemplate.url = null; // Omit large data URL
    }
    return settingsForStorage;
  };

  useEffect(() => {
    if (!isMounted) return;
    setLoading(true);
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Ensure all nested structures are present by merging with initialSettings
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
        setAppSettingsState(completeSettings);
      } else {
        setAppSettingsState(initialSettings);
        // Persist initial settings (cleaned)
        const initialSettingsForStorage = prepareSettingsForStorage(initialSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(initialSettingsForStorage));
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      setAppSettingsState(initialSettings); // Fallback to initial settings
    } finally {
      setLoading(false);
    }
  }, [isMounted]);

  const updateSettingsAndPersist = useCallback((newSettings: AppSettings) => {
    setAppSettingsState(newSettings); // Update React state with potentially full data URL

    if (isMounted) {
      const settingsForStorage = prepareSettingsForStorage(newSettings);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsForStorage));
      } catch (e) {
        console.error("LocalStorage setItem quota error or other issue in updateSettingsAndPersist:", e);
        // Consider user notification (e.g., via toast) if quota is exceeded
      }
    }
  }, [isMounted, setAppSettingsState]);


  const uploadTemplate = async (file: File): Promise<string | null> => {
    if (!isMounted) return null;
    setLoading(true);
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const newSettingsWithDataUrl = {
            ...settings, // current settings from state
            eventImageTemplate: {
              ...settings.eventImageTemplate,
              url: dataUrl,
            },
          };
          updateSettingsAndPersist(newSettingsWithDataUrl); // Use centralized update and persist
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
      updateSettingsAndPersist(settingsToSave); // settingsToSave may contain new data URL from admin form
    } catch (error) {
      console.error("Error in saveSettingsAdmin operation:", error);
      // Re-throw if the calling component (AdminPage) needs to handle it (e.g., for toasts)
      // However, localStorage errors are caught within updateSettingsAndPersist
      // This catch is more for errors *before* calling updateSettingsAndPersist if any existed.
      // For now, we assume AdminPage handles its own toasts based on success/failure of this promise.
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
