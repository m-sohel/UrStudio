'use client';

import React, { useMemo } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { getPaperSize, getEffectivePaperDimensions, getPhotoTemplate, getIDCardTemplate } from '@/lib/templates';

/**
 * Visual layout preview showing the paper with photo positions.
 * Uses CSS mm units scaled for screen display.
 */
export function LayoutPreview() {
  const {
    croppedImageUrl,
    layoutResult,
    paperSettings,
    selectedTemplateId,
    selectedTemplateType,
  } = useEditorStore();

  const paper = getPaperSize(paperSettings.paperId);

  const template = useMemo(() => {
    if (!selectedTemplateId) return null;
    return selectedTemplateType === 'photo'
      ? getPhotoTemplate(selectedTemplateId)
      : getIDCardTemplate(selectedTemplateId);
  }, [selectedTemplateId, selectedTemplateType]);

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
  const maxHeight = 600;
  const scale = Math.min(maxWidth / dims.width, maxHeight / dims.height);

  const paperW = dims.width * scale;
  const paperH = dims.height * scale;

  return (
    <div className="flex-1 flex flex-col items-center p-4 overflow-auto">
      {/* Info bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap justify-center">
        <span>Paper: {paper.name}</span>
        <span>Orientation: {paperSettings.orientation}</span>
        <span>Photo: {template.width}×{template.height}mm</span>
        <span>Copies: {layoutResult.totalItems}</span>
        <span>Grid: {layoutResult.columns}×{layoutResult.rows}</span>
      </div>

      {/* Paper preview */}
      <div
        className="relative bg-white rounded shadow-lg border border-gray-200"
        style={{
          width: `${paperW}px`,
          height: `${paperH}px`,
        }}
      >
        {/* Photo cells */}
        {layoutResult.positions.map((pos, i) => (
          <div
            key={i}
            className="absolute overflow-hidden border border-gray-300/50"
            style={{
              left: `${pos.x * scale}px`,
              top: `${pos.y * scale}px`,
              width: `${pos.width * scale}px`,
              height: `${pos.height * scale}px`,
            }}
          >
            {croppedImageUrl ? (
              <img
                src={croppedImageUrl}
                alt={`Copy ${i + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
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
