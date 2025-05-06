// src/app/admin/page.tsx
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useAppSettings } from '@/context/app-settings-context';
import { UploadCloud, Save, Settings, Image as ImageIcon } from 'lucide-react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
// Firebase imports - these would be used if directly integrating Firebase here
// For now, Firebase interaction is abstracted via AppSettingsContext
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
// import firebaseApp from "@/lib/firebase"; // Assuming firebase.ts setup

const DEFAULT_TEMPLATE_WIDTH = 1080;
const DEFAULT_TEMPLATE_HEIGHT = 1350;


export default function AdminPage() {
  const { toast } = useToast();
  const { translate } = useLanguage();
  const { settings, setSettings, uploadTemplate, saveSettings: saveContextSettings, loading: settingsLoading } = useAppSettings();

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(settings.templateUrl || null);
  
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
    if (settings.templateUrl) {
      setTemplatePreview(settings.templateUrl);
    }
  }, [settings]);


  const handleTemplateUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'image/png') {
        setTemplateFile(file);
        setTemplatePreview(URL.createObjectURL(file));
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PNG image.",
          variant: 'destructive',
        });
      }
    }
  };

  const handleSettingChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setLocalSettings(prev => ({ ...prev, [name]: name.includes('X') || name.includes('Y') || name.includes('Size') || name.includes('Width') || name.includes('Height') ? parseFloat(value) || 0 : value }));
  };

  const handleSaveConfiguration = async (event: FormEvent) => {
    event.preventDefault();
    
    let newTemplateUrl = settings.templateUrl;
    if (templateFile) {
      try {
        newTemplateUrl = await uploadTemplate(templateFile);
        if(!newTemplateUrl) throw new Error("Template URL not returned");
        setTemplateFile(null); // Clear after successful upload
        toast({ title: translate('templateUploadSuccess') });
      } catch (error) {
        console.error("Error uploading template:", error);
        toast({ title: translate('errorUploadingTemplate'), variant: 'destructive' });
        return; // Stop if template upload fails
      }
    }
    
    // If newTemplateUrl is still null/undefined and there was no existing settings.templateUrl, and no file was uploaded
    if (!newTemplateUrl && !settings.templateUrl && !templateFile) {
        toast({ title: translate('errorTemplateRequired'), description: "Please upload a template image before saving.", variant: 'destructive'});
        return;
    }

    try {
      // Update settings with the potentially new template URL
      const settingsToSave = { ...localSettings, templateUrl: newTemplateUrl || settings.templateUrl };
      await saveContextSettings(settingsToSave);
      // setSettings will be called by the context, which updates localSettings via useEffect
      toast({ title: translate('configSavedSuccess') });
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({ title: translate('errorSavingConfig'), variant: 'destructive' });
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <div className="container mx-auto p-4 md:p-8 flex-grow">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-primary">{translate('adminPageTitle')}</h1>

        <form onSubmit={handleSaveConfiguration} className="space-y-8">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-6 w-6 text-primary" />{translate('templateUploadSectionTitle')}</CardTitle>
              <CardDescription>{translate('adminTemplateUploadDescription', { defaultValue: 'Upload the base design template for the event image.'})}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="templateUpload" className="text-lg font-medium">{translate('adminTemplateUploadLabel')}</Label>
                <div className="mt-2 flex items-center space-x-4">
                    <div className="flex-grow flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-input hover:border-primary transition-colors">
                    <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                        <div className="flex text-sm text-muted-foreground">
                        <Label
                            htmlFor="templateUploadInput"
                            className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                        >
                            <span>{translate('uploadPhotoPlaceholder')}</span>
                            <Input id="templateUploadInput" name="templateUploadInput" type="file" className="sr-only" accept="image/png" onChange={handleTemplateUpload} />
                        </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">PNG only. Recommended size: {settings.templateWidth || DEFAULT_TEMPLATE_WIDTH}x{settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT}px</p>
                    </div>
                    </div>
                    {templatePreview && (
                        <div className="w-1/3">
                            <p className="text-sm font-medium text-muted-foreground mb-1">{translate('currentTemplate')}:</p>
                            <Image src={templatePreview} alt="Template Preview" width={150} height={187.5} className="rounded-md border border-border shadow-md object-contain" data-ai-hint="event template poster" />
                        </div>
                    )}
                    {!templatePreview && (
                        <div className="w-1/3 flex items-center justify-center h-[187.5px] bg-muted/50 rounded-md border border-dashed border-input">
                             <p className="text-sm text-muted-foreground">{translate('noTemplateUploaded')}</p>
                        </div>
                    )}
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="templateWidth">{translate('adminTemplateWidthLabel', { defaultValue: 'Template Width (px)'})}</Label>
                    <Input id="templateWidth" name="templateWidth" type="number" value={localSettings.templateWidth || ''} onChange={handleSettingChange} placeholder={`${DEFAULT_TEMPLATE_WIDTH}`} className="mt-1 bg-input" />
                </div>
                <div>
                    <Label htmlFor="templateHeight">{translate('adminTemplateHeightLabel', {defaultValue: 'Template Height (px)'})}</Label>
                    <Input id="templateHeight" name="templateHeight" type="number" value={localSettings.templateHeight || ''} onChange={handleSettingChange} placeholder={`${DEFAULT_TEMPLATE_HEIGHT}`} className="mt-1 bg-input" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center"><Settings className="mr-2 h-6 w-6 text-primary" />{translate('configSectionTitle')}</CardTitle>
              <CardDescription>{translate('adminConfigDescription', { defaultValue: 'Configure how user content is overlaid on the template.'})}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="overlayText" className="text-lg font-medium">{translate('adminOverlayTextLabel')}</Label>
                <Textarea
                  id="overlayText"
                  name="overlayText"
                  value={localSettings.overlayText || ''}
                  onChange={handleSettingChange}
                  placeholder={translate('adminOverlayTextPlaceholder')}
                  className="mt-2 bg-input"
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground border-b border-border pb-2">{translate('photoSettingsTitle')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="photoX">{translate('adminPhotoXLabel')} (%)</Label>
                    <Input id="photoX" name="photoX" type="number" value={localSettings.photoX || ''} onChange={handleSettingChange} placeholder="10" className="mt-1 bg-input" />
                  </div>
                  <div>
                    <Label htmlFor="photoY">{translate('adminPhotoYLabel')} (%)</Label>
                    <Input id="photoY" name="photoY" type="number" value={localSettings.photoY || ''} onChange={handleSettingChange} placeholder="10" className="mt-1 bg-input" />
                  </div>
                  <div>
                    <Label htmlFor="photoWidth">{translate('adminPhotoWidthLabel')} (%)</Label>
                    <Input id="photoWidth" name="photoWidth" type="number" value={localSettings.photoWidth || ''} onChange={handleSettingChange} placeholder="30" className="mt-1 bg-input" />
                  </div>
                  <div>
                    <Label htmlFor="photoHeight">{translate('adminPhotoHeightLabel')} (%)</Label>
                    <Input id="photoHeight" name="photoHeight" type="number" value={localSettings.photoHeight || ''} onChange={handleSettingChange} placeholder="40" className="mt-1 bg-input" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground border-b border-border pb-2">{translate('nameSettingsTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="nameX">{translate('adminNameXLabel')} (%)</Label>
                    <Input id="nameX" name="nameX" type="number" value={localSettings.nameX || ''} onChange={handleSettingChange} placeholder="50" className="mt-1 bg-input" />
                  </div>
                  <div>
                    <Label htmlFor="nameY">{translate('adminNameYLabel')} (%)</Label>
                    <Input id="nameY" name="nameY" type="number" value={localSettings.nameY || ''} onChange={handleSettingChange} placeholder="80" className="mt-1 bg-input" />
                  </div>
                  <div>
                    <Label htmlFor="nameSize">{translate('adminNameSizeLabel')} (%)</Label>
                    <Input id="nameSize" name="nameSize" type="number" value={localSettings.nameSize || ''} onChange={handleSettingChange} placeholder="5" className="mt-1 bg-input" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3" disabled={settingsLoading}>
            {settingsLoading ? (
               <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {translate('savingConfig', {defaultValue: 'Saving...'})}
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {translate('adminSaveConfigButton')}
              </>
            )}
          </Button>
        </form>
      </div>
      <Footer />
    </div>
  );
}

// Helper for translations that might not exist yet
declare module '@/context/language-context' {
  export interface LanguageContextType {
    translate(key: string, params?: Record<string, string | number>): string;
    translate(key: keyof typeof import('@/locales/fr.json'), params?: Record<string, string | number>): string;
  }
}

