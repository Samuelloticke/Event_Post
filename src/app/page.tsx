// src/app/page.tsx
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useAppSettings } from '@/context/app-settings-context';
import { UploadCloud, Download, Zap, Image as ImageIcon } from 'lucide-react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_TEMPLATE_WIDTH = 1080;
const DEFAULT_TEMPLATE_HEIGHT = 1350;

export default function HomePage() {
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { translate } = useLanguage();
  const { settings } = useAppSettings();
  const [templateError, setTemplateError] = useState(false);


  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        setUserPhoto(file);
        setUserPhotoPreview(URL.createObjectURL(file));
      } else {
        toast({
          title: translate('errorPhotoUpload'),
          description: translate('errorPhotoUpload'),
          variant: 'destructive',
        });
      }
    }
  };

  const generateImage = async (event: FormEvent) => {
    event.preventDefault();
    if (!userPhoto) {
      toast({ title: translate('errorPhotoRequired'), variant: 'destructive' });
      return;
    }
    if (!firstName.trim()) {
      toast({ title: translate('errorNameRequired'), variant: 'destructive' });
      return;
    }
    if (!settings.templateUrl) {
      toast({ title: translate('errorTemplateRequired'), description: "Admin needs to upload a template.", variant: 'destructive'});
      setTemplateError(true);
      return;
    }
    setTemplateError(false);

    setIsGenerating(true);
    setGeneratedImage(null); // Clear previous image

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const templateImg = new window.Image();
    templateImg.crossOrigin = "anonymous"; // Important for tainted canvas if template is from different origin
    templateImg.src = settings.templateUrl;

    templateImg.onload = () => {
      canvas.width = templateImg.naturalWidth || DEFAULT_TEMPLATE_WIDTH;
      canvas.height = templateImg.naturalHeight || DEFAULT_TEMPLATE_HEIGHT;

      // Draw template
      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

      const userImg = new window.Image();
      userImg.src = URL.createObjectURL(userPhoto);
      userImg.onload = () => {
        // Draw user photo
        const photoX = settings.photoX / 100 * canvas.width;
        const photoY = settings.photoY / 100 * canvas.height;
        const photoWidth = settings.photoWidth / 100 * canvas.width;
        const photoHeight = settings.photoHeight / 100 * canvas.height;
        ctx.drawImage(userImg, photoX, photoY, photoWidth, photoHeight);

        // Draw overlay text
        if (settings.overlayText) {
            const overlayFontSize = Math.min(canvas.width, canvas.height) * 0.03; // Example responsive font size
            ctx.font = `bold ${overlayFontSize}px sans-serif`;
            ctx.fillStyle = '#FFFFFF'; // White text, consider making this configurable
            ctx.textAlign = 'center';
            // Position overlay text - example: bottom center
            ctx.fillText(settings.overlayText, canvas.width / 2, canvas.height * 0.9);
        }

        // Draw user's name
        const nameFontSize = (settings.nameSize / 100) * Math.min(canvas.width, canvas.height) * 0.1; // Relative to canvas size
        ctx.font = `bold ${nameFontSize}px 'Arial', sans-serif`; // Make font configurable?
        ctx.fillStyle = '#FFFFFF'; // White text, make configurable?
        ctx.textAlign = 'center'; // Make configurable?
        const nameX = settings.nameX / 100 * canvas.width;
        const nameY = settings.nameY / 100 * canvas.height;
        ctx.fillText(firstName, nameX, nameY);
        
        setGeneratedImage(canvas.toDataURL('image/png'));
        setIsGenerating(false);
        toast({ title: translate('imageGeneratedSuccessTitle', {defaultValue: "Image Generated!"}), description: translate('imageGeneratedSuccessDesc', {defaultValue: "Your image is ready to download."}) });
      };
      userImg.onerror = () => {
        setIsGenerating(false);
        toast({ title: translate('errorPhotoUpload'), variant: 'destructive' });
      };
    };
    templateImg.onerror = () => {
        setIsGenerating(false);
        setTemplateError(true);
        toast({ title: translate('errorTemplateRequired'), description: "Failed to load the event template. Please check admin settings.", variant: 'destructive' });
    };
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `JosiasEvent_${firstName.replace(/\s+/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <div className="container mx-auto p-4 md:p-8 flex-grow">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 text-primary">{translate('appTitle')}</h1>
        <p className="text-lg text-center mb-8 text-muted-foreground">{translate('appSubtitle')}</p>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center"><Zap className="mr-2 h-6 w-6 text-primary" />{translate('generateImageButton')}</CardTitle>
              <CardDescription>{translate('appSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generateImage} className="space-y-6">
                <div>
                  <Label htmlFor="photoUpload" className="text-lg font-medium">{translate('uploadPhotoLabel')}</Label>
                  <div className="mt-2 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-input hover:border-primary transition-colors">
                    <div className="space-y-1 text-center">
                      {userPhotoPreview ? (
                        <Image 
                          src={userPhotoPreview} 
                          alt="User photo preview" 
                          width={128} 
                          height={128} 
                          className="mx-auto h-32 w-32 object-cover rounded-md shadow-md"
                          data-ai-hint="user uploaded image"
                        />
                      ) : (
                        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                      )}
                      <div className="flex text-sm text-muted-foreground">
                        <Label
                          htmlFor="photoUpload"
                          className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                        >
                          <span>{translate('uploadPhotoPlaceholder')}</span>
                          <Input id="photoUpload" name="photoUpload" type="file" className="sr-only" accept="image/jpeg, image/png" onChange={handlePhotoUpload} />
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">JPEG, PNG up to 5MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="firstName" className="text-lg font-medium">{translate('firstNameLabel')}</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={translate('firstNamePlaceholder')}
                    className="mt-2 bg-input text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {translate('generatingImage')}
                    </>
                  ) : (
                    <>{translate('generateImageButton')}</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-6 w-6 text-primary" />{translate('imagePreviewAlt')}</CardTitle>
              <CardDescription>{translate('imagePreviewDescription', {defaultValue: 'Your personalized image will appear here.'})}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <canvas ref={canvasRef} className="hidden" aria-hidden="true"></canvas>
              {isGenerating && (
                <div className="w-full aspect-[1080/1350] bg-muted rounded-lg flex items-center justify-center">
                   <Skeleton className="w-full h-full rounded-lg" />
                </div>
              )}
              {!isGenerating && generatedImage && (
                <Image 
                  src={generatedImage} 
                  alt={translate('imagePreviewAlt')} 
                  width={settings.templateWidth || DEFAULT_TEMPLATE_WIDTH} 
                  height={settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT}
                  className="rounded-lg shadow-lg max-w-full h-auto border-2 border-primary"
                  data-ai-hint="event poster social media"
                />
              )}
              {!isGenerating && !generatedImage && (
                 <div className="w-full aspect-[1080/1350] bg-muted/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-input">
                    <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{translate('noImageGenerated', { defaultValue: 'Your generated image will appear here.'})}</p>
                    {templateError && <p className="text-destructive mt-2 text-sm">{translate('errorTemplateRequired')}</p>}
                 </div>
              )}
              {generatedImage && !isGenerating && (
                <Button onClick={downloadImage} className="mt-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
                  <Download className="mr-2 h-5 w-5" />
                  {translate('downloadImageButton')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
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
