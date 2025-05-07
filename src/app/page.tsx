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
import { UploadCloud, Download, Zap, Image as ImageIconLucide, User, TextCursorInput } from 'lucide-react'; // Renamed ImageIcon to avoid conflict
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

  const [currentTemplateOpacity, setCurrentTemplateOpacity] = useState(settings.eventImageTemplate.opacityOnIdle);

  useEffect(() => {
    setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnIdle);
  }, [settings.eventImageTemplate.opacityOnIdle]);
  
  // Update canvas size when template dimensions from settings change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && (settings.templateWidth || settings.templateHeight)) {
        canvas.width = settings.templateWidth || DEFAULT_TEMPLATE_WIDTH;
        canvas.height = settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT;
    }
  }, [settings.templateWidth, settings.templateHeight]);


  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        setUserPhoto(file);
        setUserPhotoPreview(URL.createObjectURL(file));
        setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnDrag); // Change opacity on new photo
      } else {
        toast({
          title: translate('errorPhotoUpload'),
          description: translate('errorPhotoUploadInvalidType', {defaultValue: "Please upload a JPEG or PNG image."}),
          variant: 'destructive',
        });
      }
    }
  };

  const handleInteractionStart = () => {
    setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnDrag);
  };

  const handleInteractionEnd = () => {
    if (settings.eventImageTemplate.interaction.resetOpacityOnMouseLeave) {
      setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnIdle);
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
    if (!settings.eventImageTemplate.url) {
      toast({ title: translate('errorTemplateRequired'), description: translate('errorAdminTemplateUpload', {defaultValue: "Admin needs to upload a template."}), variant: 'destructive'});
      setTemplateError(true);
      return;
    }
    setTemplateError(false);
    setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnIdle); // Ensure full opacity for final generation

    setIsGenerating(true);
    setGeneratedImage(null);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const templateImg = new window.Image();
    templateImg.crossOrigin = "anonymous";
    templateImg.src = settings.eventImageTemplate.url;

    templateImg.onload = () => {
      canvas.width = templateImg.naturalWidth || settings.templateWidth || DEFAULT_TEMPLATE_WIDTH;
      canvas.height = templateImg.naturalHeight || settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT;

      const userImg = new window.Image();
      userImg.src = URL.createObjectURL(userPhoto);
      userImg.onload = () => {
        // Layering: Draw user photo first if it's below the template
        if (settings.eventImageTemplate.layering.userImageBelow) {
            const photoX = (settings.photoX / 100) * canvas.width;
            const photoY = (settings.photoY / 100) * canvas.height;
            let photoWidth = (settings.photoWidth / 100) * canvas.width;
            let photoHeight = (settings.photoHeight / 100) * canvas.height;

            // Maintain aspect ratio of user photo, fitting within the defined % area
            // This logic makes the photo cover the area, might need adjustment based on "hole" vs "area"
            const userImgAspectRatio = userImg.naturalWidth / userImg.naturalHeight;
            const areaAspectRatio = photoWidth / photoHeight;

            if (settings.eventImageTemplate.transformControls.keepAspectRatio) {
                if (userImgAspectRatio > areaAspectRatio) { // User image is wider than area
                    photoHeight = photoWidth / userImgAspectRatio;
                } else { // User image is taller or same aspect ratio
                    photoWidth = photoHeight * userImgAspectRatio;
                }
            }
            // TODO: Implement draggable/scalable user photo positioning logic if enabled.
            // For now, it uses the admin-defined X, Y, Width, Height.
            ctx.drawImage(userImg, photoX, photoY, photoWidth, photoHeight);
        }

        // Draw template
        if (settings.eventImageTemplate.layering.templateOnTop) {
            ctx.globalAlpha = settings.eventImageTemplate.opacityOnIdle; // Use final opacity for generation
            ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0; // Reset globalAlpha
        }

        // Draw overlay text (if any)
        if (settings.overlayText) {
            const overlayFontSize = Math.min(canvas.width, canvas.height) * 0.03;
            ctx.font = `bold ${overlayFontSize}px sans-serif`;
            ctx.fillStyle = settings.uiTheme.primaryColor || '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(settings.overlayText, canvas.width / 2, canvas.height * 0.9);
        }

        // Draw user's name
        const nameFontSize = (settings.nameSize / 100) * Math.min(canvas.width, canvas.height) * 0.1;
        ctx.font = `bold ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
        ctx.fillStyle = settings.uiTheme.primaryColor || '#FFFFFF';
        ctx.textAlign = 'center';
        const nameX = (settings.nameX / 100) * canvas.width;
        const nameY = (settings.nameY / 100) * canvas.height;
        ctx.fillText(firstName, nameX, nameY);
        
        setGeneratedImage(canvas.toDataURL('image/png'));
        setIsGenerating(false);
        toast({ title: translate('imageGeneratedSuccessTitle'), description: translate('imageGeneratedSuccessDesc') });
      };
      userImg.onerror = () => {
        setIsGenerating(false);
        toast({ title: translate('errorPhotoLoad'), variant: 'destructive' });
      };
    };
    templateImg.onerror = () => {
        setIsGenerating(false);
        setTemplateError(true);
        toast({ title: translate('errorTemplateLoad'), description: translate('errorTemplateLoadAdmin', {defaultValue: "Failed to load the event template. Please check admin settings."}), variant: 'destructive' });
    };
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `LeRegneDesJosias_${firstName.replace(/\s+/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: settings.uiTheme.backgroundColor, color: settings.uiTheme.primaryColor }}>
      <Header />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2" style={{ color: settings.uiTheme.primaryColor }}>{translate('appTitle')}</h1>
        <p className="text-lg text-center mb-8" style={{ color: settings.uiTheme.primaryColor, opacity: 0.8 }}>{translate('appSubtitle')}</p>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="shadow-xl bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="flex items-center text-primary"><Zap className="mr-2 h-6 w-6" />{translate('generateImageButton')}</CardTitle>
              <CardDescription className="text-muted-foreground">{translate('appSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generateImage} className="space-y-6">
                <div>
                  <Label htmlFor="photoUpload" className="text-lg font-medium flex items-center text-foreground">
                    <User className="mr-2 h-5 w-5" /> {translate('uploadPhotoLabel')}
                  </Label>
                  <div 
                    className="mt-2 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-input hover:border-primary transition-colors cursor-pointer"
                    onClick={() => document.getElementById('photoUploadInput')?.click()}
                    onMouseDown={handleInteractionStart}
                    onMouseUp={handleInteractionEnd}
                    onMouseLeave={handleInteractionEnd}
                    onTouchStart={handleInteractionStart}
                    onTouchEnd={handleInteractionEnd}
                  >
                    <div className="space-y-1 text-center">
                      {userPhotoPreview ? (
                        <Image 
                          src={userPhotoPreview} 
                          alt="User photo preview" 
                          width={128} 
                          height={128} 
                          className="mx-auto h-32 w-32 object-cover rounded-full shadow-md border-2 border-primary"
                          data-ai-hint="user uploaded portrait"
                        />
                      ) : (
                        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                      )}
                      <div className="flex text-sm text-muted-foreground">
                        <Label
                          htmlFor="photoUploadInput" // Match with the input id
                          className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                        >
                          <span>{translate('uploadPhotoPlaceholder')}</span>
                          <Input id="photoUploadInput" name="photoUpload" type="file" className="sr-only" accept="image/jpeg, image/png" onChange={handlePhotoUpload} />
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">{translate('photoUploadHint', { defaultValue: 'JPEG, PNG up to 5MB. Click/Tap to change.'})}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="firstName" className="text-lg font-medium flex items-center text-foreground">
                     <TextCursorInput className="mr-2 h-5 w-5" /> {translate('firstNameLabel')}
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={translate('firstNamePlaceholder')}
                    className="mt-2 bg-input text-foreground placeholder:text-muted-foreground"
                    required
                    onFocus={handleInteractionStart}
                    onBlur={handleInteractionEnd}
                  />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

          <Card className="shadow-xl bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="flex items-center text-primary"><ImageIconLucide className="mr-2 h-6 w-6" />{translate('imagePreviewAlt')}</CardTitle>
              <CardDescription className="text-muted-foreground">{translate('imagePreviewDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              {/* Canvas is used for generation, final image is displayed as <img> */}
              <canvas ref={canvasRef} className="hidden" aria-hidden="true"></canvas>
              
              <div 
                className="relative w-full" 
                style={{ 
                    aspectRatio: (settings.templateWidth || DEFAULT_TEMPLATE_WIDTH) / (settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT),
                    maxWidth: `${settings.templateWidth || DEFAULT_TEMPLATE_WIDTH}px` 
                }}
                onMouseDown={handleInteractionStart}
                onMouseUp={handleInteractionEnd}
                onMouseLeave={handleInteractionEnd}
                onTouchStart={handleInteractionStart}
                onTouchEnd={handleInteractionEnd}
              >
                {isGenerating && (
                  <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center">
                    <Skeleton className="w-full h-full rounded-lg" />
                  </div>
                )}
                {!isGenerating && generatedImage && (
                  <Image 
                    src={generatedImage} 
                    alt={translate('imagePreviewAlt')} 
                    width={settings.templateWidth || DEFAULT_TEMPLATE_WIDTH} 
                    height={settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT}
                    className="rounded-lg shadow-lg w-full h-auto border-2 border-primary object-contain"
                    data-ai-hint="event poster customized"
                  />
                )}
                {!isGenerating && !generatedImage && (
                    <div 
                        className="w-full h-full bg-muted/30 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-input"
                        style={{ 
                            aspectRatio: (settings.templateWidth || DEFAULT_TEMPLATE_WIDTH) / (settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT),
                        }}
                    >
                        {settings.eventImageTemplate.url ? (
                            <Image
                                src={settings.eventImageTemplate.url}
                                alt={translate('templatePreviewAlt', {defaultValue: 'Template Preview'})}
                                width={settings.templateWidth || DEFAULT_TEMPLATE_WIDTH}
                                height={settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT}
                                className="opacity-50 w-full h-auto object-contain"
                                data-ai-hint="event poster template"
                            />
                        ) : (
                            <ImageIconLucide className="h-16 w-16 text-muted-foreground mb-4" />
                        )}
                        <p className="text-muted-foreground mt-2">{templateError ? translate('errorTemplateLoad') : translate('noImageGenerated')}</p>
                    </div>
                )}
                 {/* Interactive preview if needed (more complex) could go here */}
              </div>

              {generatedImage && !isGenerating && (
                <Button onClick={downloadImage} className="mt-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
                  <Download className="mr-2 h-5 w-5" />
                  {translate('downloadImageButton')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
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
  }
}
