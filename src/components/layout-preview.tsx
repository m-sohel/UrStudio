'use client';

import React, { useMemo } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { getPaperSize, getEffectivePaperDimensions, getPhotoTemplate, getIDCardTemplate } from '@/lib/templates';
import { mapMultiCustomerSlots, type MultiCustomerPhotoItem } from '@/lib/layout-engine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Split, Plus, Minus, Shuffle } from 'lucide-react';

/**
 * Visual layout preview showing the paper with photo positions.
 * Supports single photo repeat or multi-customer Mix & Match runs.
 */
export function LayoutPreview() {
  const {
    croppedImageUrl,
    images,
    layoutResult,
    paperSettings,
    selectedTemplateId,
    selectedTemplateType,
    mixMatchMode,
    setMixMatchMode,
    setImageCopies,
    slotOverrides,
    setSlotOverride,
    resetSlotOverrides,
  } = useEditorStore();

  const paper = getPaperSize(paperSettings.paperId);

  const template = useMemo(() => {
    if (!selectedTemplateId) return null;
    return selectedTemplateType === 'photo'
      ? getPhotoTemplate(selectedTemplateId)
      : getIDCardTemplate(selectedTemplateId);
  }, [selectedTemplateId, selectedTemplateType]);

  // Candidates for multi-customer sheet
  const customerItems: MultiCustomerPhotoItem[] = useMemo(() => {
    return images
      .filter((img) => img.croppedImageUrl || img.objectUrl)
      .map((img, idx) => ({
        id: img.id,
        name: img.name.replace(/\.[^/.]+$/, ''),
        imageUrl: img.croppedImageUrl || img.objectUrl,
        copies: img.copies || 4,
      }));
  }, [images]);

  // Map slots if in mix-match mode and multiple customers exist
  const mappedSlots = useMemo(() => {
    if (!layoutResult || customerItems.length === 0) return [];
    if (!mixMatchMode || customerItems.length <= 1) {
      return layoutResult.positions.map((pos, idx) => ({
        position: pos,
        slotIndex: idx,
        imageId: customerItems[0]?.id || 'default',
        imageName: customerItems[0]?.name || 'Photo',
        imageUrl: croppedImageUrl || customerItems[0]?.imageUrl || '',
        customerIndex: 0,
      }));
    }
    return mapMultiCustomerSlots(layoutResult.positions, customerItems, slotOverrides);
  }, [layoutResult, customerItems, mixMatchMode, croppedImageUrl, slotOverrides]);

  // Distribute slots evenly across customers
  const handleDistributeEvenly = () => {
    if (!layoutResult || customerItems.length === 0) return;
    const totalSlots = layoutResult.totalItems;
    const perCustomer = Math.max(1, Math.floor(totalSlots / customerItems.length));
    customerItems.forEach((c, idx) => {
      setImageCopies(idx, perCustomer);
    });
    resetSlotOverrides();
  };

  // Cycle a slot to next customer on click
  const handleCycleSlot = (slotIdx: number) => {
    if (!mixMatchMode || customerItems.length <= 1) return;
    const current = mappedSlots[slotIdx];
    const currIdx = customerItems.findIndex((c) => c.id === current?.imageId);
    const nextIdx = (currIdx + 1) % customerItems.length;
    setSlotOverride(slotIdx, customerItems[nextIdx].id);
  };

  if (!paper || !layoutResult || !template) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
        <p className="text-sm text-center">
          Select a template and crop an image to see the layout preview
        </p>
      </div>
    );
  }

  const dims = getEffectivePaperDimensions(paper, paperSettings.orientation);

  // Scale to fit the container (use a max width/height approach)
  const maxWidth = 500;
  const maxHeight = 560;
  const scale = Math.min(maxWidth / dims.width, maxHeight / dims.height);

  const paperW = dims.width * scale;
  const paperH = dims.height * scale;

  return (
    <div className="flex-1 flex flex-col items-center p-4 overflow-auto">
      {/* Multi-Customer Mix & Match Toolbar */}
      {images.length > 1 && (
        <div className="w-full max-w-xl bg-card border border-border rounded-lg p-3 mb-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <Label className="text-xs font-semibold cursor-pointer">
                Multi-Customer Mix & Match Sheet
              </Label>
              <Switch
                checked={mixMatchMode}
                onCheckedChange={setMixMatchMode}
              />
            </div>
            {mixMatchMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDistributeEvenly}
                className="text-xs h-6 px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10"
              >
                <Shuffle className="w-3 h-3" />
                Distribute Evenly
              </Button>
            )}
          </div>

          {/* Customer list with copy counters */}
          {mixMatchMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50">
              {customerItems.map((cust, idx) => (
                <div
                  key={cust.id}
                  className="flex items-center justify-between gap-2 p-1.5 bg-muted/40 rounded border border-border text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <img
                      src={cust.imageUrl}
                      alt={cust.name}
                      className="w-6 h-6 rounded object-cover border border-border shrink-0"
                    />
                    <span className="truncate text-xs font-medium">{cust.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setImageCopies(idx, Math.max(1, (cust.copies || 1) - 1))}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-mono text-xs">{cust.copies || 4}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setImageCopies(idx, (cust.copies || 1) + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap justify-center">
        <span>Paper: {paper.name}</span>
        <span>Orientation: {paperSettings.orientation}</span>
        <span>Photo: {template.width}×{template.height}mm</span>
        <span>Copies: {layoutResult.totalItems}</span>
        <span>Grid: {layoutResult.columns}×{layoutResult.rows}</span>
        {mixMatchMode && (
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
            Mix & Match Active
          </Badge>
        )}
      </div>

      {/* Paper preview */}
      <div
        className="relative bg-white rounded shadow-lg border border-gray-200 select-none"
        style={{
          width: `${paperW}px`,
          height: `${paperH}px`,
        }}
      >
        {/* Photo cells */}
        {mappedSlots.map((slot, i) => (
          <div
            key={i}
            onClick={() => handleCycleSlot(i)}
            className={`absolute overflow-hidden border border-gray-300/60 transition-all ${
              mixMatchMode ? 'cursor-pointer hover:ring-2 hover:ring-primary/60' : ''
            }`}
            style={{
              left: `${slot.position.x * scale}px`,
              top: `${slot.position.y * scale}px`,
              width: `${slot.position.width * scale}px`,
              height: `${slot.position.height * scale}px`,
            }}
            title={mixMatchMode ? `Slot ${i + 1}: ${slot.imageName} (Click to swap customer)` : `Copy ${i + 1}`}
          >
            {slot.imageUrl ? (
              <div className="w-full h-full relative">
                <img
                  src={slot.imageUrl}
                  alt={`Copy ${i + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {mixMatchMode && (
                  <span className="absolute top-0.5 left-0.5 bg-black/75 text-white text-[8px] font-bold px-1 rounded shadow-xs">
                    #{slot.customerIndex + 1}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-[8px] text-gray-400">{i + 1}</span>
              </div>
            )}
          </div>
        ))}

        {/* Dimension labels */}
        <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-muted-foreground">
          {dims.width}mm
        </div>
        <div
          className="absolute -right-8 top-0 bottom-0 flex items-center text-[10px] text-muted-foreground"
          style={{ writingMode: 'vertical-rl' }}
        >
          {dims.height}mm
        </div>
      </div>
    </div>
  );
}
