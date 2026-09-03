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

  // Available area after margins
  const availableWidth = paperWidth - marginLeft - marginRight;
  const availableHeight = paperHeight - marginTop - marginBottom;

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
  const columns = Math.floor(
    (availableWidth - effectiveItemWidth) / (effectiveItemWidth + horizontalGap)
  ) + 1;

  const rows = Math.floor(
    (availableHeight - effectiveItemHeight) / (effectiveItemHeight + verticalGap)
  ) + 1;

  // Calculate positions
  const positions: LayoutPosition[] = [];
  const totalPossible = columns * rows;
  const totalItems = maxCopies > 0 ? Math.min(maxCopies, totalPossible) : totalPossible;

  // Calculate total content dimensions for centering
  const totalContentWidth = columns * effectiveItemWidth + (columns - 1) * horizontalGap;
  const totalContentHeight = rows * effectiveItemHeight + (rows - 1) * verticalGap;

  // Center the grid within the available area
  const offsetX = marginLeft + (availableWidth - totalContentWidth) / 2;
  const offsetY = marginTop + (availableHeight - totalContentHeight) / 2;

  let count = 0;
  for (let row = 0; row < rows && count < totalItems; row++) {
    for (let col = 0; col < columns && count < totalItems; col++) {
      positions.push({
        x: offsetX + col * (effectiveItemWidth + horizontalGap),
        y: offsetY + row * (effectiveItemHeight + verticalGap),
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
