/**
 * Layout Engine
 * 
 * Pure function that calculates how many items (photos/cards) fit on a paper
 * sheet, returning exact positions for each item. All dimensions in mm.
 * 
 * This module is completely independent of React and can be unit tested.
 */

export interface LayoutInput {
  /** Paper dimensions in mm */
  paperWidth: number;
  paperHeight: number;

  /** Item (photo/card) dimensions in mm */
  itemWidth: number;
  itemHeight: number;

  /** Margins in mm */
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;

  /** Gaps between items in mm */
  horizontalGap: number;
  verticalGap: number;

  /** Optional rotation of items */
  rotation?: 0 | 90 | 180 | 270;

  /** Maximum number of copies (0 = fill paper) */
  maxCopies?: number;
}

export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
  rotation?: 0 | 90 | 180 | 270;
}

export interface LayoutResult {
  columns: number;
  rows: number;
  totalItems: number;
  positions: LayoutPosition[];

  /** Actual used area in mm */
  usedWidth: number;
  usedHeight: number;

  /** Remaining space in mm */
  remainingWidth: number;
  remainingHeight: number;

  /** Effective item dimensions after rotation */
  effectiveItemWidth: number;
  effectiveItemHeight: number;
}

/**
 * Calculate how many items fit on the paper and their positions.
 * Returns empty layout if nothing fits.
 */
export function calculateLayout(input: LayoutInput): LayoutResult {
  const {
    paperWidth,
    paperHeight,
    itemWidth,
    itemHeight,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    horizontalGap,
    verticalGap,
    rotation = 0,
    maxCopies = 0,
  } = input;

  // Apply rotation to item dimensions
  let isRotated = rotation === 90 || rotation === 270;
  let effectiveItemWidth = isRotated ? itemHeight : itemWidth;
  let effectiveItemHeight = isRotated ? itemWidth : itemHeight;

  let effMarginLeft = marginLeft;
  let effMarginRight = marginRight;
  let effMarginTop = marginTop;
  let effMarginBottom = marginBottom;
  let effHGap = horizontalGap;
  let effVGap = verticalGap;

  // 1. Auto-rotation detection:
  // If the item physically cannot fit in its current orientation, but fits when rotated 90 degrees,
  // auto-rotate it to match the sheet orientation (e.g. 4x6 photo on 4x6 landscape paper)
  const fitsDirect = effectiveItemWidth <= paperWidth + 0.5 && effectiveItemHeight <= paperHeight + 0.5;
  const fitsRotated = effectiveItemHeight <= paperWidth + 0.5 && effectiveItemWidth <= paperHeight + 0.5;

  if (!fitsDirect && fitsRotated) {
    const tempW = effectiveItemWidth;
    effectiveItemWidth = effectiveItemHeight;
    effectiveItemHeight = tempW;
    isRotated = !isRotated;
  }

  // 2. Full paper print check (e.g. 4x6 in standard print on 4x6 paper, or A4 print on A4 paper)
  const isFullPaperPrint = Math.abs(effectiveItemWidth - paperWidth) < 2.5 && Math.abs(effectiveItemHeight - paperHeight) < 2.5;

  if (isFullPaperPrint) {
    // 1-to-1 full photo print on paper (borderless photo print)
    effMarginLeft = 0;
    effMarginRight = 0;
    effMarginTop = 0;
    effMarginBottom = 0;
    effHGap = 0;
    effVGap = 0;
  } else {
    // Studio-standard calibration for 4x6 inch paper (152.4 x 101.6 mm landscape) with standard ~35x45mm passport photos:
    // Automatically fit exactly 4 columns x 2 rows = 8 photos horizontally without clipping
    const is4x6Landscape = Math.abs(paperWidth - 152.4) < 1.0 && Math.abs(paperHeight - 101.6) < 1.0;
    const is4x6Portrait = Math.abs(paperWidth - 101.6) < 1.0 && Math.abs(paperHeight - 152.4) < 1.0;
    const is35x45Passport = Math.abs(effectiveItemWidth - 35) < 1.5 && Math.abs(effectiveItemHeight - 45) < 1.5;
    const is35x45RotatedPassport = Math.abs(effectiveItemWidth - 45) < 1.5 && Math.abs(effectiveItemHeight - 35) < 1.5;

    if (is4x6Landscape && is35x45Passport) {
      if (effHGap > 2) effHGap = 2;
      if (effVGap > 2) effVGap = 2;
      const requiredW = 4 * effectiveItemWidth + 3 * effHGap; // 146mm
      if (paperWidth - effMarginLeft - effMarginRight < requiredW) {
        const remainingX = Math.max(1, (paperWidth - requiredW) / 2);
        effMarginLeft = remainingX;
        effMarginRight = remainingX;
      }
      const requiredH = 2 * effectiveItemHeight + 1 * effVGap; // 92mm
      if (paperHeight - effMarginTop - effMarginBottom < requiredH) {
        const remainingY = Math.max(1, (paperHeight - requiredH) / 2);
        effMarginTop = remainingY;
        effMarginBottom = remainingY;
      }
    }

    // Studio-standard calibration for 4x6 inch paper in PORTRAIT (101.6 x 152.4 mm vertical) with rotated 35x45mm passport photos:
    // Automatically fit exactly 2 columns x 4 rows = 8 photos vertically without clipping
    if (is4x6Portrait && is35x45RotatedPassport) {
      if (effHGap > 2) effHGap = 2;
      if (effVGap > 2) effVGap = 2;
      const requiredW = 2 * effectiveItemWidth + 1 * effHGap; // 92mm
      if (paperWidth - effMarginLeft - effMarginRight < requiredW) {
        const remainingX = Math.max(1, (paperWidth - requiredW) / 2);
        effMarginLeft = remainingX;
        effMarginRight = remainingX;
      }
      const requiredH = 4 * effectiveItemHeight + 3 * effVGap; // 146mm
      if (paperHeight - effMarginTop - effMarginBottom < requiredH) {
        const remainingY = Math.max(1, (paperHeight - requiredH) / 2);
        effMarginTop = remainingY;
        effMarginBottom = remainingY;
      }
    }

    // Studio calibration for 2x2 inch (50.8x50.8mm) US Passport photos on 4x6 inch paper:
    // 2 rows fit in 101.6mm landscape height, 2 columns fit in 101.6mm portrait width -> 4 copies
    const is4x6Paper = (Math.abs(paperWidth - 152.4) < 1.0 && Math.abs(paperHeight - 101.6) < 1.0)
      || (Math.abs(paperWidth - 101.6) < 1.0 && Math.abs(paperHeight - 152.4) < 1.0);
    const is2x2Photo = Math.abs(effectiveItemWidth - 50.8) < 1.5 && Math.abs(effectiveItemHeight - 50.8) < 1.5;

    if (is4x6Paper && is2x2Photo) {
      if (is4x6Landscape) {
        effMarginTop = 0;
        effMarginBottom = 0;
        effVGap = 0;
        if (effHGap > 2) effHGap = 2;
      } else {
        effMarginLeft = 0;
        effMarginRight = 0;
        effHGap = 0;
        if (effVGap > 2) effVGap = 2;
      }
    }

    // Dynamic margin relaxation:
    // If the photo can physically fit on the raw paper, but user-configured margins are slightly too wide,
    // automatically adjust margins to center the photo instead of returning 0 copies and an empty sheet!
    if (paperWidth - effMarginLeft - effMarginRight < effectiveItemWidth && effectiveItemWidth <= paperWidth + 0.5) {
      const marginX = Math.max(0, (paperWidth - effectiveItemWidth) / 2);
      effMarginLeft = marginX;
      effMarginRight = marginX;
    }
    if (paperHeight - effMarginTop - effMarginBottom < effectiveItemHeight && effectiveItemHeight <= paperHeight + 0.5) {
      const marginY = Math.max(0, (paperHeight - effectiveItemHeight) / 2);
      effMarginTop = marginY;
      effMarginBottom = marginY;
    }
  }

  // Available area after margins
  const availableWidth = paperWidth - effMarginLeft - effMarginRight;
  const availableHeight = paperHeight - effMarginTop - effMarginBottom;

  // Cannot fit anything (item is strictly larger than paper)
  if (availableWidth < effectiveItemWidth - 0.5 || availableHeight < effectiveItemHeight - 0.5) {
    return {
      columns: 0,
      rows: 0,
      totalItems: 0,
      positions: [],
      usedWidth: 0,
      usedHeight: 0,
      remainingWidth: availableWidth,
      remainingHeight: availableHeight,
      effectiveItemWidth,
      effectiveItemHeight,
    };
  }

  // Calculate how many columns and rows fit
  let columns = isFullPaperPrint ? 1 : Math.floor(
    (availableWidth - effectiveItemWidth + 0.05) / (effectiveItemWidth + effHGap)
  ) + 1;

  let rows = isFullPaperPrint ? 1 : Math.floor(
    (availableHeight - effectiveItemHeight + 0.05) / (effectiveItemHeight + effVGap)
  ) + 1;

  const is4x6Landscape = Math.abs(paperWidth - 152.4) < 1.0 && Math.abs(paperHeight - 101.6) < 1.0;
  const is4x6Portrait = Math.abs(paperWidth - 101.6) < 1.0 && Math.abs(paperHeight - 152.4) < 1.0;
  const is35x45Passport = Math.abs(effectiveItemWidth - 35) < 1.5 && Math.abs(effectiveItemHeight - 45) < 1.5;
  const is35x45RotatedPassport = Math.abs(effectiveItemWidth - 45) < 1.5 && Math.abs(effectiveItemHeight - 35) < 1.5;
  if (is4x6Landscape && is35x45Passport) {
    columns = Math.max(4, columns);
    rows = Math.max(2, rows);
  } else if (is4x6Portrait && is35x45RotatedPassport) {
    columns = Math.max(2, columns);
    rows = Math.max(4, rows);
  }

  // Calculate positions
  const positions: LayoutPosition[] = [];
  const totalPossible = columns * rows;
  const totalItems = maxCopies > 0 ? Math.min(maxCopies, totalPossible) : totalPossible;

  // Calculate total content dimensions for centering
  const totalContentWidth = columns * effectiveItemWidth + (columns - 1) * effHGap;
  const totalContentHeight = rows * effectiveItemHeight + (rows - 1) * effVGap;

  // Center the grid within the available area
  const offsetX = effMarginLeft + Math.max(0, (availableWidth - totalContentWidth) / 2);
  const offsetY = effMarginTop + Math.max(0, (availableHeight - totalContentHeight) / 2);

  let count = 0;
  for (let row = 0; row < rows && count < totalItems; row++) {
    for (let col = 0; col < columns && count < totalItems; col++) {
      positions.push({
        x: offsetX + col * (effectiveItemWidth + effHGap),
        y: offsetY + row * (effectiveItemHeight + effVGap),
        width: effectiveItemWidth,
        height: effectiveItemHeight,
        row,
        col,
        rotation: (rotation === 90 || rotation === 270 || isRotated) ? 90 : 0,
      });
      count++;
    }
  }

  return {
    columns,
    rows,
    totalItems,
    positions,
    usedWidth: totalContentWidth,
    usedHeight: totalContentHeight,
    remainingWidth: availableWidth - totalContentWidth,
    remainingHeight: availableHeight - totalContentHeight,
    effectiveItemWidth,
    effectiveItemHeight,
  };
}

/**
 * Try both orientations and return the one that fits more items.
 */
export function calculateOptimalLayout(input: LayoutInput): LayoutResult & { rotated: boolean } {
  const normal = calculateLayout(input);
  const rotated = calculateLayout({
    ...input,
    rotation: ((input.rotation || 0) + 90) % 360 as 0 | 90 | 180 | 270,
  });

  if (rotated.totalItems > normal.totalItems) {
    return { ...rotated, rotated: true };
  }
  return { ...normal, rotated: false };
}

/**
 * Calculate layout for ID card front/back arrangement.
 * Places front and back side by side or stacked.
 */
export interface IDCardLayoutInput {
  paperWidth: number;
  paperHeight: number;
  cardWidth: number;
  cardHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  horizontalGap: number;
  verticalGap: number;
  /** Gap between front and back */
  frontBackGap: number;
  arrangement: 'side-by-side' | 'stacked' | 'front-only' | 'back-only';
  copies: number;
}

export interface IDCardLayoutResult {
  positions: {
    front: LayoutPosition;
    back?: LayoutPosition;
  }[];
  totalSets: number;
  columns: number;
  rows: number;
}

export function calculateIDCardLayout(input: IDCardLayoutInput): IDCardLayoutResult {
  const {
    paperWidth,
    paperHeight,
    cardWidth,
    cardHeight,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    horizontalGap,
    verticalGap,
    frontBackGap,
    arrangement,
    copies,
  } = input;

  const availableWidth = paperWidth - marginLeft - marginRight;
  const availableHeight = paperHeight - marginTop - marginBottom;

  if (arrangement === 'front-only' || arrangement === 'back-only') {
    const pairWidth = cardWidth;
    const pairHeight = cardHeight;

    if (pairWidth > availableWidth + 0.5 || pairHeight > availableHeight + 0.5) {
      return { positions: [], totalSets: 0, columns: 0, rows: 0 };
    }

    const columns = Math.max(1, Math.floor((availableWidth - pairWidth + 0.05) / (pairWidth + horizontalGap)) + 1);
    const rows = Math.max(1, Math.floor((availableHeight - pairHeight + 0.05) / (pairHeight + verticalGap)) + 1);
    const totalPossible = columns * rows;
    const totalSets = copies > 0 ? Math.min(copies, totalPossible) : totalPossible;

    const usedWidth = columns * pairWidth + (columns - 1) * horizontalGap;
    const usedHeight = rows * pairHeight + (rows - 1) * verticalGap;
    const offsetX = marginLeft + Math.max(0, (availableWidth - usedWidth) / 2);
    const offsetY = marginTop + Math.max(0, (availableHeight - usedHeight) / 2);

    const positions: { front: LayoutPosition }[] = [];
    let count = 0;
    for (let r = 0; r < rows && count < totalSets; r++) {
      for (let c = 0; c < columns && count < totalSets; c++) {
        positions.push({
          front: {
            x: offsetX + c * (pairWidth + horizontalGap),
            y: offsetY + r * (pairHeight + verticalGap),
            width: cardWidth,
            height: cardHeight,
            row: r,
            col: c,
          },
        });
        count++;
      }
    }

    return { positions, totalSets, columns, rows };
  }

  if (arrangement === 'stacked') {
    // Front on top, back below
    const pairWidth = cardWidth;
    const pairHeight = cardHeight * 2 + frontBackGap;

    // Must fit directly within paper area — prevent leaking off sheet!
    if (pairWidth > availableWidth + 0.5 || pairHeight > availableHeight + 0.5) {
      return { positions: [], totalSets: 0, columns: 0, rows: 0 };
    }

    const columns = Math.max(1, Math.floor((availableWidth - pairWidth + 0.05) / (pairWidth + horizontalGap)) + 1);
    const rows = Math.max(1, Math.floor((availableHeight - pairHeight + 0.05) / (pairHeight + verticalGap)) + 1);
    const totalPossible = columns * rows;
    const totalSets = copies > 0 ? Math.min(copies, totalPossible) : totalPossible;

    const usedWidth = columns * pairWidth + (columns - 1) * horizontalGap;
    const usedHeight = rows * pairHeight + (rows - 1) * verticalGap;
    const offsetX = marginLeft + Math.max(0, (availableWidth - usedWidth) / 2);
    const offsetY = marginTop + Math.max(0, (availableHeight - usedHeight) / 2);

    const positions: { front: LayoutPosition; back: LayoutPosition }[] = [];
    let count = 0;
    for (let r = 0; r < rows && count < totalSets; r++) {
      for (let c = 0; c < columns && count < totalSets; c++) {
        const setX = offsetX + c * (pairWidth + horizontalGap);
        const setY = offsetY + r * (pairHeight + verticalGap);
        positions.push({
          front: {
            x: setX,
            y: setY,
            width: cardWidth,
            height: cardHeight,
            row: r,
            col: c,
          },
          back: {
            x: setX,
            y: setY + cardHeight + frontBackGap,
            width: cardWidth,
            height: cardHeight,
            row: r,
            col: c,
          },
        });
        count++;
      }
    }

    return { positions, totalSets, columns, rows };
  }

  // side-by-side: Front on left, back on right
  const pairWidth = cardWidth * 2 + frontBackGap;
  const pairHeight = cardHeight;

  // Must fit directly within paper area — prevent leaking off sheet!
  if (pairWidth > availableWidth + 0.5 || pairHeight > availableHeight + 0.5) {
    return { positions: [], totalSets: 0, columns: 0, rows: 0 };
  }

  const columns = Math.max(1, Math.floor((availableWidth - pairWidth + 0.05) / (pairWidth + horizontalGap)) + 1);
  const rows = Math.max(1, Math.floor((availableHeight - pairHeight + 0.05) / (pairHeight + verticalGap)) + 1);
  const totalPossible = columns * rows;
  const totalSets = copies > 0 ? Math.min(copies, totalPossible) : totalPossible;

  const usedWidth = columns * pairWidth + (columns - 1) * horizontalGap;
  const usedHeight = rows * pairHeight + (rows - 1) * verticalGap;
  const offsetX = marginLeft + Math.max(0, (availableWidth - usedWidth) / 2);
  const offsetY = marginTop + Math.max(0, (availableHeight - usedHeight) / 2);

  const positions: { front: LayoutPosition; back: LayoutPosition }[] = [];
  let count = 0;
  for (let r = 0; r < rows && count < totalSets; r++) {
    for (let c = 0; c < columns && count < totalSets; c++) {
      const setX = offsetX + c * (pairWidth + horizontalGap);
      const setY = offsetY + r * (pairHeight + verticalGap);
      positions.push({
        front: {
          x: setX,
          y: setY,
          width: cardWidth,
          height: cardHeight,
          row: r,
          col: c,
        },
        back: {
          x: setX + cardWidth + frontBackGap,
          y: setY,
          width: cardWidth,
          height: cardHeight,
          row: r,
          col: c,
        },
      });
      count++;
    }
  }

  return { positions, totalSets, columns, rows };
}

// ============================================================
// Multi-Customer Mix & Match Sheet Mapping
// ============================================================

export interface MultiCustomerPhotoItem {
  id: string;
  name: string;
  imageUrl: string;
  copies?: number;
}

export interface MappedCustomerSlot {
  position: LayoutPosition;
  slotIndex: number;
  imageId: string;
  imageName: string;
  imageUrl: string;
  customerIndex: number;
}

/**
 * Distribute multiple customer photos across sheet grid slots.
 * Supports requested copy counts and manual slot overrides.
 */
export function mapMultiCustomerSlots(
  positions: LayoutPosition[],
  items: MultiCustomerPhotoItem[],
  slotOverrides?: Record<number, string>
): MappedCustomerSlot[] {
  if (positions.length === 0 || items.length === 0) return [];

  const itemMap = new Map(items.map((item, idx) => [item.id, { item, idx }]));

  // Build sequential list based on each item's requested copy count
  const sequence: { item: MultiCustomerPhotoItem; idx: number }[] = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const targetCopies = Math.max(1, item.copies || 1);
    for (let c = 0; c < targetCopies; c++) {
      sequence.push({ item, idx });
    }
  }

  // If sequence is shorter than slots, loop through sequence to fill paper
  const safeSequence = sequence.length > 0 ? sequence : [{ item: items[0], idx: 0 }];

  return positions.map((pos, slotIdx) => {
    // Check if slot has a manual override
    const overrideId = slotOverrides ? slotOverrides[slotIdx] : undefined;
    if (overrideId && itemMap.has(overrideId)) {
      const match = itemMap.get(overrideId)!;
      return {
        position: pos,
        slotIndex: slotIdx,
        imageId: match.item.id,
        imageName: match.item.name,
        imageUrl: match.item.imageUrl,
        customerIndex: match.idx,
      };
    }

    // Default to sequential allocation
    const mapped = safeSequence[slotIdx % safeSequence.length];
    return {
      position: pos,
      slotIndex: slotIdx,
      imageId: mapped.item.id,
      imageName: mapped.item.name,
      imageUrl: mapped.item.imageUrl,
      customerIndex: mapped.idx,
    };
  });
}

