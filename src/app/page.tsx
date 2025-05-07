// src/app/page.tsx
"use client";

import type { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useAppSettings } from '@/context/app-settings-context';
import { UploadCloud, Download, Zap, Image as ImageIconLucide, User, TextCursorInput, ZoomIn, Move, Loader2 } from 'lucide-react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_TEMPLATE_WIDTH = 1080;
const DEFAULT_TEMPLATE_HEIGHT = 1350;

interface UserPhotoState {
  x: number; // percentage
  y: number; // percentage
  scale: number; // multiplier, 1 = 100% of original photo size within bounds
  widthPx: number; // original width of user photo in pixels
  heightPx: number; // original height of user photo in pixels
}

export default function HomePage() {
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUserPhotoDetailsLoading, setIsUserPhotoDetailsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const userImageRef = useRef<HTMLImageElement>(null);

  const { toast } = useToast();
  const { translate } = useLanguage();
  const { settings } = useAppSettings();
  const [templateError, setTemplateError] = useState(false);

  const [currentTemplateOpacity, setCurrentTemplateOpacity] = useState(settings.eventImageTemplate.opacityOnIdle);

  const [userPhotoState, setUserPhotoState] = useState<UserPhotoState>({
    x: settings.photoX,
    y: settings.photoY,
    scale: 0.1, // Initial scale set to min as per previous request
    widthPx: 0,
    heightPx: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });


  useEffect(() => {
    setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnIdle);
  }, [settings.eventImageTemplate.opacityOnIdle]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && (settings.templateWidth || settings.templateHeight)) {
        canvas.width = settings.templateWidth || DEFAULT_TEMPLATE_WIDTH;
        canvas.height = settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT;
    }
  }, [settings.templateWidth, settings.templateHeight]);

  const resetUserPhotoState = useCallback((imgWidth: number, imgHeight: number) => {
    setUserPhotoState({
      x: settings.photoX,
      y: settings.photoY,
      scale: 0.1, // Reset scale to min
      widthPx: imgWidth,
      heightPx: imgHeight,
    });
  }, [settings.photoX, settings.photoY]);

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const targetInput = event.target;
    if (targetInput.files && targetInput.files[0]) {
      const file = targetInput.files[0];
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        setIsUserPhotoDetailsLoading(true);
        setUserPhoto(file);
        const previewUrl = URL.createObjectURL(file);
        setUserPhotoPreview(previewUrl);
        
        const img = new window.Image();
        img.onload = () => {
          resetUserPhotoState(img.naturalWidth, img.naturalHeight);
          setIsUserPhotoDetailsLoading(false);
        };
        img.onerror = () => {
            toast({
                title: translate('errorPhotoLoad'),
                description: translate('errorPhotoLoadGeneric', {defaultValue: "Could not load the selected image for preview."}),
                variant: 'destructive',
            });
            setUserPhoto(null);
            setUserPhotoPreview(null);
            setIsUserPhotoDetailsLoading(false);
            if (targetInput) targetInput.value = ''; // Clear input value
        };
        img.src = previewUrl;

        handleInteractionStart();
      } else {
        toast({
          title: translate('errorPhotoUpload'),
          description: translate('errorPhotoUploadInvalidType', {defaultValue: "Please upload a JPEG or PNG image."}),
          variant: 'destructive',
        });
        if (targetInput) targetInput.value = ''; // Clear input value
      }
    } else {
        if (targetInput) targetInput.value = ''; // Clear input value if no file selected
    }
  };

  const handleInteractionStart = () => {
    setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnDrag);
  };

  const handleInteractionEnd = () => {
    if (settings.eventImageTemplate.interaction.resetOpacityOnMouseLeave && !isDragging) {
      setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnIdle);
    }
    setIsDragging(false);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!userPhotoPreview || !previewContainerRef.current) return;
    e.preventDefault(); 
    setIsDragging(true);
    handleInteractionStart();
    
    const containerRect = previewContainerRef.current.getBoundingClientRect();
    const clickXPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const clickYPercent = ((e.clientY - containerRect.top) / containerRect.height) * 100;

    setDragStart({
      x: clickXPercent - userPhotoState.x,
      y: clickYPercent - userPhotoState.y,
    });
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || !userPhotoPreview || !previewContainerRef.current) return;
    e.preventDefault();
    
    const containerRect = previewContainerRef.current.getBoundingClientRect();
    const currentXPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const currentYPercent = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    let newX = currentXPercent - dragStart.x;
    let newY = currentYPercent - dragStart.y;

    setUserPhotoState(prev => ({ ...prev, x: newX, y: newY }));
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDragging) {
       e.preventDefault();
       setIsDragging(false);
       if (settings.eventImageTemplate.interaction.resetOpacityOnMouseLeave) {
         setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnIdle);
       }
    }
  };
  
  const handleScaleChange = (newScale: number[]) => {
    if (!userPhotoPreview) return;
    handleInteractionStart();
    setUserPhotoState(prev => ({ ...prev, scale: newScale[0] }));
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

    if (userPhotoState.widthPx === 0 || userPhotoState.heightPx === 0) {
        toast({ title: translate('errorProcessingPhotoTitle', {defaultValue: "Photo Processing"}), description: translate('errorProcessingPhotoDesc', {defaultValue: "Please wait for the photo to be fully processed before generating."}), variant: 'default' });
        return;
    }

    setTemplateError(false);
    setCurrentTemplateOpacity(settings.eventImageTemplate.opacityOnIdle); 

    setIsGenerating(true);
    setGeneratedImage(null);

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsGenerating(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
       setIsGenerating(false);
       return;
    }

    const templateImg = new window.Image();
    templateImg.crossOrigin = "anonymous";
    templateImg.src = settings.eventImageTemplate.url;

    templateImg.onload = () => {
      canvas.width = templateImg.naturalWidth || settings.templateWidth || DEFAULT_TEMPLATE_WIDTH;
      canvas.height = templateImg.naturalHeight || settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT;

      const userImg = new window.Image();
      userImg.src = userPhotoPreview!; 
      userImg.onload = () => {
        const userPhotoAspectRatio = userPhotoState.widthPx / userPhotoState.heightPx;
        
        let basePhotoDisplayWidth = (settings.photoWidth / 100) * canvas.width;
        let basePhotoDisplayHeight = (settings.photoHeight / 100) * canvas.height;

        // Defaulting to user photo's natural aspect ratio for calculations if keepAspectRatio is true
        // If not keeping aspect ratio, photoWidth/Height settings from admin dictate dimensions directly
        let finalPhotoWidthPx = basePhotoDisplayWidth * userPhotoState.scale;
        let finalPhotoHeightPx = basePhotoDisplayHeight * userPhotoState.scale;

        if (settings.eventImageTemplate.transformControls.keepAspectRatio) {
          if (userPhotoAspectRatio > (basePhotoDisplayWidth / basePhotoDisplayHeight)) {
              finalPhotoHeightPx = (basePhotoDisplayWidth / userPhotoAspectRatio) * userPhotoState.scale;
          } else {
              finalPhotoWidthPx = (basePhotoDisplayHeight * userPhotoAspectRatio) * userPhotoState.scale;
          }
        }
        

        const photoDrawX = (userPhotoState.x / 100) * canvas.width - (finalPhotoWidthPx / 2); 
        const photoDrawY = (userPhotoState.y / 100) * canvas.height - (finalPhotoHeightPx / 2);


        if (settings.eventImageTemplate.layering.userImageBelow) {
            ctx.drawImage(userImg, photoDrawX, photoDrawY, finalPhotoWidthPx, finalPhotoHeightPx);
        }

        if (settings.eventImageTemplate.layering.templateOnTop) {
            ctx.globalAlpha = settings.eventImageTemplate.opacityOnIdle; 
            ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0; 
        }
        
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

  const previewUserImageStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${userPhotoState.x}%`,
    top: `${userPhotoState.y}%`,
    width: settings.eventImageTemplate.transformControls.keepAspectRatio 
      ? `${(userPhotoState.widthPx / (settings.templateWidth || DEFAULT_TEMPLATE_WIDTH)) * 100 * userPhotoState.scale}%`
      : `${(settings.photoWidth / 100) * 100 * userPhotoState.scale}%`, // Width relative to container based on admin settings
    height: settings.eventImageTemplate.transformControls.keepAspectRatio 
      ? 'auto' // Maintain aspect ratio if width is set
      : `${(settings.photoHeight / 100) * 100 * userPhotoState.scale}%`, // Height relative to container based on admin settings
    aspectRatio: settings.eventImageTemplate.transformControls.keepAspectRatio 
      ? `${userPhotoState.widthPx || 1} / ${userPhotoState.heightPx || 1}` 
      : 'auto',
    transform: 'translate(-50%, -50%)', 
    maxWidth: 'none', 
    touchAction: 'none', 
    cursor: isDragging ? 'grabbing' : 'grab',
    objectFit: 'contain', 
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
                  <Label htmlFor="photoUploadTrigger" className="text-lg font-medium flex items-center text-foreground">
                    <User className="mr-2 h-5 w-5" /> {translate('uploadPhotoLabel')}
                  </Label>
                  <Input id="photoUploadInput" name="photoUpload" type="file" className="sr-only" accept="image/jpeg, image/png" onChange={handlePhotoUpload} />
                  <div 
                    id="photoUploadTrigger"
                    className="mt-2 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-input hover:border-primary transition-colors cursor-pointer"
                    onClick={() => document.getElementById('photoUploadInput')?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('photoUploadInput')?.click();}}
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
                        <span className="font-medium text-primary hover:text-primary/80">
                          {translate('uploadPhotoPlaceholder')}
                        </span>
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
                  />
                </div>

                {userPhotoPreview && settings.eventImageTemplate.transformControls.scalable && (
                  <div className="space-y-2">
                    <Label htmlFor="photoScale" className="text-lg font-medium flex items-center text-foreground">
                      <ZoomIn className="mr-2 h-5 w-5" /> {translate('scalePhotoLabel', { defaultValue: 'Scale Photo' })}
                    </Label>
                    <Slider
                      id="photoScale"
                      min={0.01} // Allow scaling down to almost invisible
                      max={2}
                      step={0.01}
                      value={[userPhotoState.scale]}
                      onValueChange={handleScaleChange}
                      onPointerUp={handleInteractionEnd} 
                      className="w-full"
                    />
                  </div>
                )}


                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3" disabled={isGenerating || isUserPhotoDetailsLoading}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {translate('generatingImage')}
                    </>
                  ) : isUserPhotoDetailsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {translate('processingPhotoMessage', { defaultValue: 'Processing photo...' })}
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
              <CardDescription className="text-muted-foreground">
                {userPhotoPreview ? translate('imagePreviewHintDragScale', { defaultValue: 'Drag your photo to position it. Use the slider to scale.' }) : translate('imagePreviewDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <canvas ref={canvasRef} className="hidden" aria-hidden="true"></canvas>
              
              <div 
                ref={previewContainerRef}
                className="relative w-full overflow-hidden bg-muted/10 rounded-lg shadow-lg border-2 border-dashed border-input" 
                style={{ 
                    aspectRatio: (settings.templateWidth || DEFAULT_TEMPLATE_WIDTH) / (settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT),
                    maxWidth: `${settings.templateWidth || DEFAULT_TEMPLATE_WIDTH}px`,
                    cursor: userPhotoPreview && settings.eventImageTemplate.transformControls.draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
                onPointerDown={settings.eventImageTemplate.transformControls.draggable ? handlePointerDown : undefined}
                onPointerMove={settings.eventImageTemplate.transformControls.draggable ? handlePointerMove : undefined}
                onPointerUp={settings.eventImageTemplate.transformControls.draggable ? handlePointerUp : undefined}
                onPointerLeave={settings.eventImageTemplate.transformControls.draggable ? handlePointerUp : undefined} 
              >
                {(isGenerating || isUserPhotoDetailsLoading) && !generatedImage && (
                  <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center z-30">
                    <Skeleton className="w-full h-full rounded-lg" />
                  </div>
                )}

                {userPhotoPreview && userPhotoState.widthPx > 0 && userPhotoState.heightPx > 0 && (
                  <Image
                    ref={userImageRef}
                    src={userPhotoPreview}
                    alt="User photo"
                    width={userPhotoState.widthPx} 
                    height={userPhotoState.heightPx}
                    style={previewUserImageStyle}
                    className="object-contain" // Changed from object-cover for better scaling
                    draggable={false} 
                    data-ai-hint="user uploaded interactive"
                    priority // Load user photo quickly for interaction
                  />
                )}

                {settings.eventImageTemplate.url && (
                   <Image
                    src={settings.eventImageTemplate.url}
                    alt={translate('templatePreviewAlt', {defaultValue: 'Template Preview'})}
                    width={settings.templateWidth || DEFAULT_TEMPLATE_WIDTH}
                    height={settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 transition-opacity duration-200"
                    style={{ opacity: currentTemplateOpacity }}
                    data-ai-hint="event poster template overlay"
                    priority 
                  />
                )}
                
                {!isGenerating && generatedImage && (
                  <Image 
                    src={generatedImage} 
                    alt={translate('imagePreviewAlt')} 
                    width={settings.templateWidth || DEFAULT_TEMPLATE_WIDTH} 
                    height={settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT}
                    className="absolute inset-0 rounded-lg shadow-lg w-full h-auto border-2 border-primary object-contain z-20"
                    data-ai-hint="event poster customized final"
                  />
                )}

                {!isGenerating && !generatedImage && !settings.eventImageTemplate.url && (
                    <div 
                        className="w-full h-full bg-muted/30 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-input"
                        style={{ 
                            aspectRatio: (settings.templateWidth || DEFAULT_TEMPLATE_WIDTH) / (settings.templateHeight || DEFAULT_TEMPLATE_HEIGHT),
                        }}
                    >
                        <ImageIconLucide className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mt-2">{templateError ? translate('errorTemplateLoad') : translate('noImageGenerated')}</p>
                    </div>
                )}
                {userPhotoPreview && !generatedImage && settings.eventImageTemplate.transformControls.draggable && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 p-1 px-2 bg-black/50 text-white text-xs rounded-md z-20 pointer-events-none flex items-center">
                       <Move size={12} className="mr-1" /> {translate('dragToMoveHint', {defaultValue: 'Drag to move'})}
                    </div>
                )}
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
    translate(key: keyof typeof import('@/locales/fr.json'), params?: Record<string, string | number>): string;
    translate(key: keyof typeof import('@/locales/en.json'), params?: Record<string, string | number>): string;
  }
}

