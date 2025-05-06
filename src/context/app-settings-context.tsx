// src/context/app-settings-context.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Firebase SDK stubs if not fully integrating Firebase in this step
// These would be replaced by actual Firebase SDK imports and initialization
// e.g. import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
// e.g. import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
// e.g. import firebaseApp from "@/lib/firebase"; // Your firebase init file

// const storage = getStorage(firebaseApp);
// const db = getFirestore(firebaseApp);
const SETTINGS_KEY = 'josiasEventSettings';
const TEMPLATE_STORAGE_PATH = 'eventTemplates/josias_template.png'; // Example path

const DEFAULT_TEMPLATE_WIDTH = 1080;
const DEFAULT_TEMPLATE_HEIGHT = 1350;

export interface AppSettings {
  templateUrl: string | null;
  overlayText: string;
  photoX: number; // Percentage
  photoY: number; // Percentage
  photoWidth: number; // Percentage
  photoHeight: number; // Percentage
  nameX: number; // Percentage
  nameY: number; // Percentage
  nameSize: number; // Percentage relative to min(canvasWidth, canvasHeight) * 0.1
  templateWidth: number; // pixels
  templateHeight: number; // pixels
}

const initialSettings: AppSettings = {
  templateUrl: '/default-template.png', // Fallback to a public local template
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
  setSettings: (settings: AppSettings) => void; // Direct set for local updates
  uploadTemplate: (file: File) => Promise<string | null>; // Returns new URL or null
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

  // Load settings from localStorage (simulating Firestore)
  useEffect(() => {
    if (!isMounted) return;
    setLoading(true);
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Ensure all keys from initialSettings are present, providing defaults if not
        const completeSettings = { ...initialSettings, ...parsedSettings };
        setAppSettingsState(completeSettings);
      } else {
        // If nothing in localStorage, ensure initialSettings (with default template) are used.
        setAppSettingsState(initialSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(initialSettings)); // Save initial if not present
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      setAppSettingsState(initialSettings); // Fallback to initial if error
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
      // Simulate Firebase Storage upload
      // In a real Firebase app:
      // const templateRef = storageRef(storage, TEMPLATE_STORAGE_PATH);
      // await uploadBytes(templateRef, file);
      // const downloadURL = await getDownloadURL(templateRef);
      
      // For localStorage simulation, we'll use a data URL.
      // This is not ideal for large files but works for demonstration.
      // A real app MUST use Firebase Storage or similar.
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // To simulate "storing" it, we can update settings with this dataUrl
          // In a real app, this URL comes from Firebase.
          setAppSettingsState(prev => ({...prev, templateUrl: dataUrl})); 
          localStorage.setItem(SETTINGS_KEY, JSON.stringify({...settings, templateUrl: dataUrl}));
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
      // Simulate saving to Firestore
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
      setAppSettingsState(settingsToSave); // Update state after "saving"
    } catch (error) {
      console.error("Error saving settings (simulated):", error);
      throw error; // Re-throw to be caught by caller
    } finally {
      setLoading(false);
    }
  };


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
