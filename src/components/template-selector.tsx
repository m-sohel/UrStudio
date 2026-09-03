'use client';

import React from 'react';
import {
  User, CreditCard, Stamp, Image, Square, Car, Vote, IdCard
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/editor-store';
import { useTemplateStore } from '@/store/template-store';
import {
  PHOTO_TEMPLATES, ID_CARD_TEMPLATES,
  formatTemplateDimensions,
  type PhotoTemplate, type IDCardTemplate,
} from '@/lib/templates';

const iconMap: Record<string, React.ReactNode> = {
  'user': <User className="w-5 h-5" />,
  'credit-card': <CreditCard className="w-5 h-5" />,
  'stamp': <Stamp className="w-5 h-5" />,
  'image': <Image className="w-5 h-5" />,
  'square': <Square className="w-5 h-5" />,
  'car': <Car className="w-5 h-5" />,
  'vote': <Vote className="w-5 h-5" />,
  'id-card': <IdCard className="w-5 h-5" />,
};

function PhotoTemplateCard({
  template,
  isSelected,
  onClick,
}: {
  template: PhotoTemplate;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 rounded-lg border transition-all
        ${isSelected
          ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
          : 'border-border hover:border-primary/40 hover:bg-muted/50'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
        `}>
          {iconMap[template.icon || 'image'] || <Image className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatTemplateDimensions(template)}
          </p>
        </div>
        {!template.builtIn && (
          <Badge variant="outline" className="text-[10px] flex-shrink-0">Custom</Badge>
        )}
      </div>
    </button>
  );
}

function IDCardTemplateCard({
  template,
  isSelected,
  onClick,
}: {
  template: IDCardTemplate;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 rounded-lg border transition-all
        ${isSelected
          ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
          : 'border-border hover:border-primary/40 hover:bg-muted/50'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
        `}>
          {iconMap[template.icon || 'credit-card'] || <CreditCard className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatTemplateDimensions(template)}
          </p>
          {template.hasBackSide && (
            <p className="text-[10px] text-muted-foreground/70">Front & Back</p>
          )}
        </div>
        {!template.builtIn && (
          <Badge variant="outline" className="text-[10px] flex-shrink-0">Custom</Badge>
        )}
      </div>
    </button>
  );
}

export function TemplateSelector() {
  const { selectedTemplateId, setSelectedTemplate, setStep, setMode, setCopies } = useEditorStore();
  const { customPhotoTemplates, customIDCardTemplates } = useTemplateStore();

  const allPhotoTemplates = [...PHOTO_TEMPLATES, ...customPhotoTemplates];
  const allIDCardTemplates = [...ID_CARD_TEMPLATES, ...customIDCardTemplates];

  const handleSelectPhoto = (template: PhotoTemplate) => {
    setSelectedTemplate(template.id, 'photo');
    setMode('photo');
    if (template.defaultCopies) setCopies(template.defaultCopies);
    setStep('crop');
  };

  const handleSelectIDCard = (template: IDCardTemplate) => {
    setSelectedTemplate(template.id, 'id-card');
    setMode('id-card');
    setStep('crop');
  };

  return (
    <Tabs defaultValue="photos" className="flex flex-col h-full">
      <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2">
        <TabsTrigger value="photos" className="text-xs">Photos</TabsTrigger>
        <TabsTrigger value="id-cards" className="text-xs">ID Cards</TabsTrigger>
      </TabsList>

      <TabsContent value="photos" className="flex-1 overflow-hidden mt-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
            {allPhotoTemplates.map((template) => (
              <PhotoTemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onClick={() => handleSelectPhoto(template)}
              />
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="id-cards" className="flex-1 overflow-hidden mt-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
            {allIDCardTemplates.map((template) => (
              <IDCardTemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onClick={() => handleSelectIDCard(template)}
              />
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
