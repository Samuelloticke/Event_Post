// src/app/admin/page.tsx
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useAppSettings } from '@/context/app-settings-context';
import { UploadCloud, Save, Settings, Image as ImageIconLucide, Palette, Ratio, Loader2 } from 'lucide-react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';

const DEFAULT_TEMPLATE_WIDTH = 1080;
const DEFAULT_TEMPLATE_HEIGHT = 1350;

export default function AdminPage() {
  const { toast } = useToast();
  const { translate } = useLanguage();
  const { settings, setSettings, uploadTemplate, saveSettings: saveContextSettings, loading: settingsLoading } = useAppSettings();

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  // const [templatePreview, setTemplatePreview] = useState<string | null>(settings.eventImageTemplate.url || null);
  
  const [templatePreview, setTemplatePreview] = useState<string>( settings.eventImageTemplate.url || '/default-template.png' );

  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    const currentContextSettings = JSON.parse(JSON.stringify(settings));
    if ('overlayText' in currentContextSettings) {
      delete currentContextSettings.overlayText;
    }
    setLocalSettings(currentContextSettings); 

    if (settings.eventImageTemplate.url) {
      setTemplatePreview(settings.eventImageTemplate.url);
    } else {
      setTemplatePreview('/default-template.png');
    }
  }, [settings]);


  const handleTemplateUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const targetInput = event.target;
    if (targetInput.files && targetInput.files[0]) {
      const file = targetInput.files[0];
      if (file.type === 'image/png') {
        setTemplateFile(file);
        setTemplatePreview(URL.createObjectURL(file));
      } else {
        toast({
          title: translate('errorInvalidFileType', {defaultValue: "Invalid File Type"}),
          description: translate('errorUploadPngOnly', {defaultValue: "Please upload a PNG image."}),
          variant: 'destructive',
        });
        if (targetInput) targetInput.value = ''; 
      }
    } else {
         if (targetInput) targetInput.value = ''; 
    }
  };

  const handleSettingChange = (event: ChangeEvent<HTMLInputElement>) => { 
    const { name, value, type } = event.target;
    const keys = name.split('.');
    
    setLocalSettings(prev => {
      const newSettings = JSON.parse(JSON.stringify(prev)); 
      let currentLevel = newSettings;
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          if (type === 'number') {
            currentLevel[key] = parseFloat(value) || 0;
          } else if (type === 'checkbox') {
             currentLevel[key] = (event.target as HTMLInputElement).checked;
          }
          else {
            currentLevel[key] = value;
          }
        } else {
          if (!currentLevel[key]) currentLevel[key] = {};
          currentLevel = currentLevel[key];
        }
      });
      return newSettings;
    });
  };


  const handleSaveConfiguration = async (event: FormEvent) => {
    event.preventDefault();
    
    let newTemplateUrl = settings.eventImageTemplate.url;
    if (templateFile) {
      try {
        newTemplateUrl = await uploadTemplate(templateFile);
        if(!newTemplateUrl) throw new Error("Template URL not returned");
        setTemplateFile(null); // Clear file after successful processing
        const templateInput = document.getElementById('templateUploadInput') as HTMLInputElement;
        if (templateInput) templateInput.value = ''; // Clear the file input
        toast({ title: translate('templateUploadSuccess') });
      } catch (error) {
        console.error("Error uploading template:", error);
        toast({ title: translate('errorUploadingTemplate'), variant: 'destructive' });
        return;
      }
    }
    
    if (!newTemplateUrl && !settings.eventImageTemplate.url && !templateFile) {
        toast({ title: translate('errorTemplateRequired'), description: translate('errorAdminTemplateUpload', { defaultValue: "Please upload a template image before saving."}), variant: 'destructive'});
        return;
    }

    try {
      const settingsToSave = { 
        ...localSettings, 
        eventImageTemplate: {
          ...localSettings.eventImageTemplate,
          url: newTemplateUrl || settings.eventImageTemplate.url,
        }
      };
      if ('overlayText' in settingsToSave) {
        delete (settingsToSave as any).overlayText;
      }

      await saveContextSettings(settingsToSave);
      toast({ title: translate('configSavedSuccess') });
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({ title: translate('errorSavingConfig'), variant: 'destructive' });
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-primary">{translate('adminPageTitle')}</h1>

        <form onSubmit={handleSaveConfiguration} className="space-y-8">
          <Card className="shadow-xl bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="flex items-center text-primary"><ImageIconLucide className="mr-2 h-6 w-6" />{translate('templateUploadSectionTitle')}</CardTitle>
              <CardDescription className="text-muted-foreground">{translate('adminTemplateUploadDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="templateUploadTrigger" className="text-lg font-medium text-foreground">{translate('adminTemplateUploadLabel')}</Label>
                <Input id="templateUploadInput" name="templateUploadInput" type="file" className="sr-only" accept="image/png" onChange={handleTemplateUpload} />
                <div className="mt-2 flex items-center space-x-4">
                    <div 
                      id="templateUploadTrigger"
                      className="flex-grow flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-input hover:border-primary transition-colors cursor-pointer"
                      onClick={() => document.getElementById('templateUploadInput')?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('templateUploadInput')?.click();}}
                    >
                      <div className="space-y-1 text-center">
                          <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                          <div className="flex text-sm text-muted-foreground">
                            <span className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                              {translate('uploadFileButton', {defaultValue: 'Upload a file'})}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{translate('pngOnlyHint', {defaultValue: 'PNG only.'})} {translate('recommendedSizeHint', {defaultValue: 'Recommended:'})} {localSettings.templateWidth || DEFAULT_TEMPLATE_WIDTH}x{localSettings.templateHeight || DEFAULT_TEMPLATE_HEIGHT}px</p>
                      </div>
                    </div>
                    {templatePreview && (
                        <div className="w-1/3">
                            <p className="text-sm font-medium text-muted-foreground mb-1">{translate('currentTemplate')}:</p>
                            <Image src={templatePreview} alt="Template Preview" width={150} height={187.5} className="rounded-md border border-border shadow-md object-contain" data-ai-hint="event template poster"/>
                        </div>
                    )}
                    {!templatePreview && (
                        <div className="w-1/3 flex items-center justify-center h-[187.5px] bg-muted/30 rounded-md border border-dashed border-input">
                             <p className="text-sm text-muted-foreground">{translate('noTemplateUploaded')}</p>
                        </div>
                    )}
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="templateWidth" className="text-foreground">{translate('adminTemplateWidthLabel')}</Label>
                    <Input id="templateWidth" name="templateWidth" type="number" value={localSettings.templateWidth || ''} onChange={handleSettingChange} placeholder={`${DEFAULT_TEMPLATE_WIDTH}`} className="mt-1 bg-input text-foreground" />
                </div>
                <div>
                    <Label htmlFor="templateHeight" className="text-foreground">{translate('adminTemplateHeightLabel')}</Label>
                    <Input id="templateHeight" name="templateHeight" type="number" value={localSettings.templateHeight || ''} onChange={handleSettingChange} placeholder={`${DEFAULT_TEMPLATE_HEIGHT}`} className="mt-1 bg-input text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="flex items-center text-primary"><Palette className="mr-2 h-6 w-6" />{translate('adminUiThemeTitle', {defaultValue: 'UI Theme Configuration'})}</CardTitle>
              <CardDescription className="text-muted-foreground">{translate('adminUiThemeDescription', {defaultValue: 'Customize the look and feel of the application.'})}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="uiTheme.backgroundColor" className="text-foreground">{translate('adminBackgroundColorLabel', {defaultValue: 'Background Color'})}</Label>
                    <Input id="uiTheme.backgroundColor" name="uiTheme.backgroundColor" type="text" value={localSettings.uiTheme.backgroundColor} onChange={handleSettingChange} placeholder="#D6E5FF" className="mt-1 bg-input text-foreground" />
                </div>
                <div>
                    <Label htmlFor="uiTheme.primaryColor" className="text-foreground">{translate('adminPrimaryColorLabel', {defaultValue: 'Primary Text Color'})}</Label>
                    <Input id="uiTheme.primaryColor" name="uiTheme.primaryColor" type="text" value={localSettings.uiTheme.primaryColor} onChange={handleSettingChange} placeholder="#FFFFFF" className="mt-1 bg-input text-foreground" />
                </div>
              </div>
               <div className="flex items-center space-x-2">
                <Input type="checkbox" id="uiTheme.secondaryColorAuto" name="uiTheme.secondaryColorAuto" checked={localSettings.uiTheme.secondaryColorAuto} onChange={handleSettingChange} className="h-4 w-4 accent-primary"/>
                <Label htmlFor="uiTheme.secondaryColorAuto" className="text-sm font-medium text-foreground">
                  {translate('adminSecondaryColorAutoLabel', { defaultValue: 'Automatically set secondary color from template dominant color' })}
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl bg-card text-card-foreground">
             <CardHeader>
                <CardTitle className="flex items-center text-primary"><Ratio className="mr-2 h-6 w-6"/>{translate('adminTemplateInteractionTitle', {defaultValue: 'Template Interaction'})}</CardTitle>
                <CardDescription className="text-muted-foreground">{translate('adminTemplateInteractionDesc', {defaultValue: 'Settings for how users interact with the template and their photo.'})}</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="eventImageTemplate.opacityOnDrag" className="text-foreground">{translate('adminOpacityOnDragLabel', {defaultValue: 'Opacity on Drag/Interact (%)'})}</Label>
                        <Input id="eventImageTemplate.opacityOnDrag" name="eventImageTemplate.opacityOnDrag" type="number" min="0" max="1" step="0.01" value={localSettings.eventImageTemplate.opacityOnDrag} onChange={handleSettingChange} placeholder="0.7" className="mt-1 bg-input text-foreground" />
                    </div>
                    <div>
                        <Label htmlFor="eventImageTemplate.opacityOnIdle" className="text-foreground">{translate('adminOpacityOnIdleLabel', {defaultValue: 'Opacity on Idle (%)'})}</Label>
                        <Input id="eventImageTemplate.opacityOnIdle" name="eventImageTemplate.opacityOnIdle" type="number" min="0" max="1" step="0.01" value={localSettings.eventImageTemplate.opacityOnIdle} onChange={handleSettingChange} placeholder="1.0" className="mt-1 bg-input text-foreground" />
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                    <Input type="checkbox" id="eventImageTemplate.interaction.resetOpacityOnMouseLeave" name="eventImageTemplate.interaction.resetOpacityOnMouseLeave" checked={localSettings.eventImageTemplate.interaction.resetOpacityOnMouseLeave} onChange={handleSettingChange} className="h-4 w-4 accent-primary" />
                    <Label htmlFor="eventImageTemplate.interaction.resetOpacityOnMouseLeave" className="text-sm font-medium text-foreground">
                      {translate('adminResetOpacityOnLeaveLabel', { defaultValue: 'Reset opacity to idle when mouse leaves interactive area' })}
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Input type="checkbox" id="eventImageTemplate.transformControls.keepAspectRatio" name="eventImageTemplate.transformControls.keepAspectRatio" checked={localSettings.eventImageTemplate.transformControls.keepAspectRatio} onChange={handleSettingChange} className="h-4 w-4 accent-primary"/>
                    <Label htmlFor="eventImageTemplate.transformControls.keepAspectRatio" className="text-sm font-medium text-foreground">
                      {translate('adminKeepUserPhotoAspectRatioLabel', { defaultValue: "Lock user photo's aspect ratio during resize" })}
                    </Label>
                </div>
             </CardContent>
          </Card>


          <Card className="shadow-xl bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="flex items-center text-primary"><Settings className="mr-2 h-6 w-6" />{translate('configSectionTitle')}</CardTitle>
              <CardDescription className="text-muted-foreground">{translate('adminConfigDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground border-b border-border pb-2">{translate('photoSettingsTitle')}</h3>
                <p className="text-sm text-muted-foreground">{translate('adminPhotoSettingsDescription', {defaultValue: "Define the initial position and size of the user's photo. Users can adjust this on the main page."})}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="photoX" className="text-foreground">{translate('adminPhotoXLabel')} (%)</Label>
                    <Input id="photoX" name="photoX" type="number" value={localSettings.photoX || ''} onChange={handleSettingChange} placeholder="50" className="mt-1 bg-input text-foreground" />
                  </div>
                  <div> 
                    <Label htmlFor="photoY" className="text-foreground">{translate('adminPhotoYLabel')} (%)</Label>
                    <Input id="photoY" name="photoY" type="number" value={localSettings.photoY || ''} onChange={handleSettingChange} placeholder="32" className="mt-1 bg-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="photoWidth" className="text-foreground">{translate('adminPhotoWidthLabel')} (%)</Label>
                    <Input id="photoWidth" name="photoWidth" type="number" value={localSettings.photoWidth || ''} onChange={handleSettingChange} placeholder="400" className="mt-1 bg-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="photoHeight" className="text-foreground">{translate('adminPhotoHeightLabel')} (%)</Label>
                    <Input id="photoHeight" name="photoHeight" type="number" value={localSettings.photoHeight || ''} onChange={handleSettingChange} placeholder="400" className="mt-1 bg-input text-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground border-b border-border pb-2">{translate('nameSettingsTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="nameX" className="text-foreground">{translate('adminNameXLabel')} (%)</Label>
                    <Input id="nameX" name="nameX" type="number" value={localSettings.nameX || ''} onChange={handleSettingChange} placeholder="50" className="mt-1 bg-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="nameY" className="text-foreground">{translate('adminNameYLabel')} (%)</Label>
                    <Input id="nameY" name="nameY" type="number" value={localSettings.nameY || ''} onChange={handleSettingChange} placeholder="80" className="mt-1 bg-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="nameSize" className="text-foreground">{translate('adminNameSizeLabel')} (%)</Label>
                    <Input id="nameSize" name="nameSize" type="number" value={localSettings.nameSize || ''} onChange={handleSettingChange} placeholder="5" className="mt-1 bg-input text-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3" disabled={settingsLoading}>
            {settingsLoading ? (
               <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {translate('savingConfig')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {translate('adminSaveConfigButton')}
              </>
            )}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}

declare module '@/context/language-context' {
  interface LanguageContextType {
    translate(key: string, params?: Record<string, string | number>): string;
    translate(key: keyof typeof import('@/locales/fr.json'), params?: Record<string, string | number>): string;
    translate(key: keyof typeof import('@/locales/en.json'), params?: Record<string, string | number>): string;
    translate(key: keyof typeof import('@/locales/en.json'), params?: Record<string, string | number>): string;
  }
}