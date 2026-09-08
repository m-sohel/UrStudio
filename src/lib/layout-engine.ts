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
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveItemWidth = isRotated ? itemHeight : itemWidth;
  const effectiveItemHeight = isRotated ? itemWidth : itemHeight;

  // Studio-standard calibration for 4x6 inch paper (152.4 x 101.6 mm landscape) with standard ~35x45mm passport photos:
  // Automatically fit exactly 4 columns x 2 rows = 8 photos horizontally without clipping
  let effMarginLeft = marginLeft;
  let effMarginRight = marginRight;
  let effMarginTop = marginTop;
  let effMarginBottom = marginBottom;
  let effHGap = horizontalGap;
  let effVGap = verticalGap;

  const is4x6Landscape = Math.abs(paperWidth - 152.4) < 1.0 && Math.abs(paperHeight - 101.6) < 1.0;
  const is35x45Passport = Math.abs(effectiveItemWidth - 35) < 1.5 && Math.abs(effectiveItemHeight - 45) < 1.5;

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

  // Available area after margins
  const availableWidth = paperWidth - effMarginLeft - effMarginRight;
  const availableHeight = paperHeight - effMarginTop - effMarginBottom;

  // Cannot fit anything
  if (availableWidth < effectiveItemWidth || availableHeight < effectiveItemHeight) {
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
  // First item takes full width, subsequent items need gap + width
  let columns = Math.floor(
    (availableWidth - effectiveItemWidth + 0.1) / (effectiveItemWidth + effHGap)
  ) + 1;

  let rows = Math.floor(
    (availableHeight - effectiveItemHeight + 0.1) / (effectiveItemHeight + effVGap)
  ) + 1;

  if (is4x6Landscape && is35x45Passport) {
    columns = Math.max(4, columns);
    rows = Math.max(2, rows);
  }

  // Calculate positions
  const positions: LayoutPosition[] = [];
  const totalPossible = columns * rows;
  const totalItems = maxCopies > 0 ? Math.min(maxCopies, totalPossible) : totalPossible;

  // Calculate total content dimensions for centering
  const totalContentWidth = columns * effectiveItemWidth + (columns - 1) * effHGap;
  const totalContentHeight = rows * effectiveItemHeight + (rows - 1) * effVGap;

  // Center the grid within the available area
  const offsetX = effMarginLeft + (availableWidth - totalContentWidth) / 2;
  const offsetY = effMarginTop + (availableHeight - totalContentHeight) / 2;

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

  if (arrangement === 'front-only' || arrangement === 'back-only') {
    // Single side mode for PVC card printing
    const layout = calculateLayout({
      paperWidth,
      paperHeight,
      itemWidth: cardWidth,
      itemHeight: cardHeight,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      horizontalGap,
      verticalGap,
      maxCopies: copies,
    });

    return {
      positions: layout.positions.map(pos => ({
        front: pos,
      })),
      totalSets: layout.totalItems,
      columns: layout.columns,
      rows: layout.rows,
    };
  }

  if (arrangement === 'stacked') {
    // Front on top, back below
    const pairHeight = cardHeight * 2 + frontBackGap;
    const layout = calculateLayout({
      paperWidth,
      paperHeight,
      itemWidth: cardWidth,
      itemHeight: pairHeight,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      horizontalGap,
      verticalGap,
      maxCopies: copies,
    });

    return {
      positions: layout.positions.map(pos => ({
        front: {
          ...pos,
          height: cardHeight,
        },
        back: {
          ...pos,
          y: pos.y + cardHeight + frontBackGap,
          height: cardHeight,
        },
      })),
      totalSets: layout.totalItems,
      columns: layout.columns,
      rows: layout.rows,
    };
  }

  // side-by-side
  const pairWidth = cardWidth * 2 + frontBackGap;
  const layout = calculateLayout({
    paperWidth,
    paperHeight,
    itemWidth: pairWidth,
    itemHeight: cardHeight,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    horizontalGap,
    verticalGap,
    maxCopies: copies,
  });

  return {
    positions: layout.positions.map(pos => ({
      front: {
        ...pos,
        width: cardWidth,
      },
      back: {
        ...pos,
        x: pos.x + cardWidth + frontBackGap,
        width: cardWidth,
      },
    })),
    totalSets: layout.totalItems,
    columns: layout.columns,
    rows: layout.rows,
  };
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

