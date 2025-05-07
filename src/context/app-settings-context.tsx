// src/context/app-settings-context.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SETTINGS_KEY = 'josiasEventSettings';
// const TEMPLATE_STORAGE_PATH = 'eventTemplates/josias_template.png'; // Example path, not used in localStorage version

const DEFAULT_TEMPLATE_WIDTH = 1080;
const DEFAULT_TEMPLATE_HEIGHT = 1350;

export interface AppSettings {
  eventImageTemplate: {
    url: string | null;
    opacityOnDrag: number;
    opacityOnIdle: number;
    preserveAspectRatio: boolean; // For the template itself, user photo aspect ratio is handled separately
    layering: {
      templateOnTop: boolean;
      userImageBelow: boolean;
    };
    transformControls: { // These would be for direct manipulation if implemented
      enabled: boolean;
      draggable: boolean;
      scalable: boolean;
      keepAspectRatio: boolean; // For user photo manipulation
    };
    interaction: {
      resetOpacityOnMouseLeave: boolean;
    };
  };
  uiTheme: {
    style: string;
    reference: string;
    backgroundColor: string;
    primaryColor: string; // Interpreted as text color on primary elements
    secondaryColorAuto: boolean; // For dynamic button/highlight color
    // dominantTemplateColor: string | null; // To store extracted color
  };
  overlayText: string;
  photoX: number; // Percentage
  photoY: number; // Percentage
  photoWidth: number; // Percentage
  photoHeight: number; // Percentage
  nameX: number; // Percentage
  nameY: number; // Percentage
  nameSize: number; // Percentage relative to min(canvasWidth, canvasHeight) * 0.1
  templateWidth: number; // pixels, for canvas dimensions if template loaded
  templateHeight: number; // pixels, for canvas dimensions if template loaded
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
      enabled: true, // Placeholder for future direct manipulation feature
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
    primaryColor: "#FFFFFF", // Text on primary buttons/elements
    secondaryColorAuto: true, // Placeholder, actual color needs to be in globals.css or dynamic
    // dominantTemplateColor: null,
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
  // extractDominantColor: (imageUrl: string) => Promise<string | null>; // For dynamic secondary color
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setAppSettingsState] = useState<AppSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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
        setAppSettingsState(completeSettings);
      } else {
        setAppSettingsState(initialSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(initialSettings));
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      setAppSettingsState(initialSettings);
    } finally {
      setLoading(false);
    }
  }, [isMounted]);

  const setSettings = useCallback((newSettings: AppSettings) => {
    setAppSettingsState(newSettings);
     if (isMounted) {
       localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
     }
  }, [isMounted]);

  const uploadTemplate = async (file: File): Promise<string | null> => {
    if (!isMounted) return null;
    setLoading(true);
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setAppSettingsState(prev => {
            const newSettings = {
              ...prev,
              eventImageTemplate: {
                ...prev.eventImageTemplate,
                url: dataUrl,
              },
            };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
          });
          setLoading(false);
          resolve(dataUrl); 
        };
        reader.onerror = (error) => {
          setLoading(false);
          reject(error);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Error uploading template (simulated):", error);
      setLoading(false);
      return null;
    }
  };
  
  const saveSettings = async (settingsToSave: AppSettings) => {
    if (!isMounted) return;
    setLoading(true);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
      setAppSettingsState(settingsToSave);
    } catch (error) {
      console.error("Error saving settings (simulated):", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Placeholder for dominant color extraction - requires a library or complex canvas logic
  // const extractDominantColor = async (imageUrl: string): Promise<string | null> => {
  //   // Implementation would go here (e.g., using ColorThief.js or canvas API)
  //   console.warn("extractDominantColor not implemented yet. imageUrl:", imageUrl);
  //   return null; 
  // };

  // useEffect(() => {
  //   if (isMounted && settings.uiTheme.secondaryColorAuto && settings.eventImageTemplate.url) {
  //     extractDominantColor(settings.eventImageTemplate.url).then(color => {
  //       if (color) {
  //         setAppSettingsState(prev => ({
  //           ...prev,
  //           uiTheme: { ...prev.uiTheme, dominantTemplateColor: color }
  //         }));
  //         // Here you would also update a CSS variable, e.g.,
  //         // document.documentElement.style.setProperty('--primary-dynamic', color);
  //       }
  //     });
  //   }
  // }, [isMounted, settings.uiTheme.secondaryColorAuto, settings.eventImageTemplate.url]);


  return (
    <AppSettingsContext.Provider value={{ settings, setSettings, uploadTemplate, saveSettings, loading }}>
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
