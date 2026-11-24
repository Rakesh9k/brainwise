/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import zlib from 'node:zlib';
import type {
  PrintBleedSpec,
  CmykColorProfile,
  PrepressExportOptions,
} from '../types/brandStudio';

/**
 * Standard Total Area Coverage (TAC) maximum ink limits
 */
export const COLOR_PROFILE_TAC_LIMITS: Record<CmykColorProfile, { name: string; maxTacPercent: number; standard: string }> = {
  FOGRA39: {
    name: 'ISO Coated v2 (ECI) / Fogra39',
    maxTacPercent: 300,
    standard: 'ISO 12647-2 (India & European Sheetfed Lithography)',
  },
  GRACOL_2013: {
    name: 'GRACoL 2013 (CGATS 21-2)',
    maxTacPercent: 320,
    standard: 'ANSI/CGATS (North American Commercial Sheetfed)',
  },
  SWOP_V2: {
    name: 'US Web Coated SWOP v2',
    maxTacPercent: 300,
    standard: 'ANSI/CGATS (Publication & High-Speed Web Offset)',
  },
  FOGRA47: {
    name: 'PSO Uncoated ISO 12647-2 / Fogra47',
    maxTacPercent: 260,
    standard: 'ISO 12647-2 (Letterheads, Kraft Paper, Uncoated Stocks)',
  },
};

export class PrintPrepressEngine {
  /**
   * 1. Returns default physical print bleed tolerances by substrate category
   */
  public getDefaultBleedSpec(
    substrateType: PrintBleedSpec['substrateType'] = 'FOLDING_CARTON',
    trimDimensions?: { widthMm: number; heightMm: number }
  ): PrintBleedSpec {
    const widthMm = trimDimensions?.widthMm || (substrateType === 'COMMERCIAL_STATIONERY' ? 210 : 80);
    const heightMm = trimDimensions?.heightMm || (substrateType === 'COMMERCIAL_STATIONERY' ? 297 : 160);

    switch (substrateType) {
      case 'CORRUGATED_HEAVY_BOARD':
        return {
          bleedMm: 5.0,
          safeMarginMm: 8.0,
          trimWidthMm: widthMm,
          trimHeightMm: heightMm,
          substrateType,
          includeCropMarks: true,
          includeColorBars: true,
          includeRegistrationTargets: true,
        };
      case 'COMMERCIAL_STATIONERY':
        return {
          bleedMm: 3.0,
          safeMarginMm: 5.0,
          trimWidthMm: widthMm,
          trimHeightMm: heightMm,
          substrateType,
          includeCropMarks: true,
          includeColorBars: true,
          includeRegistrationTargets: true,
        };
      case 'LABEL_STICKER':
        return {
          bleedMm: 2.0,
          safeMarginMm: 3.0,
          trimWidthMm: widthMm,
          trimHeightMm: heightMm,
          substrateType,
          includeCropMarks: true,
          includeColorBars: false,
          includeRegistrationTargets: true,
        };
      case 'FOLDING_CARTON':
      default:
        return {
          bleedMm: 3.0,
          safeMarginMm: 5.0,
          trimWidthMm: widthMm,
          trimHeightMm: heightMm,
          substrateType: 'FOLDING_CARTON',
          includeCropMarks: true,
          includeColorBars: true,
          includeRegistrationTargets: true,
        };
    }
  }

  /**
   * 2. Accurate CMYK conversion with Total Area Coverage (TAC) ink-limit clamping
   */
  public convertHexToCmyk(
    hex: string,
    profile: CmykColorProfile = 'FOGRA39'
  ): {
    c: number;
    m: number;
    y: number;
    k: number;
    totalAreaCoverage: number;
    profileName: string;
    standard: string;
  } {
    const cleanHex = hex.replace('#', '').trim();
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const k = 1 - Math.max(r, g, b);
    const c = (1 - r - k) / (1 - k) || 0;
    const m = (1 - g - k) / (1 - k) || 0;
    const y = (1 - b - k) / (1 - k) || 0;

    let cPct = Math.round(c * 100);
    let mPct = Math.round(m * 100);
    let yPct = Math.round(y * 100);
    const kPct = Math.round(k * 100);

    let rawTac = cPct + mPct + yPct + kPct;
    const tacLimit = COLOR_PROFILE_TAC_LIMITS[profile] || COLOR_PROFILE_TAC_LIMITS.FOGRA39;

    // Enforce TAC clamping if ink sum exceeds substrate ceiling
    if (rawTac > tacLimit.maxTacPercent) {
      const reductionRatio = (tacLimit.maxTacPercent - kPct) / (cPct + mPct + yPct || 1);
      cPct = Math.round(cPct * reductionRatio);
      mPct = Math.round(mPct * reductionRatio);
      yPct = Math.round(yPct * reductionRatio);
      rawTac = cPct + mPct + yPct + kPct;
    }

    return {
      c: cPct,
      m: mPct,
      y: yPct,
      k: kPct,
      totalAreaCoverage: rawTac,
      profileName: tacLimit.name,
      standard: tacLimit.standard,
    };
  }

  /**
   * 3. Wraps an SVG artwork with print prepress marks (crop lines, bleed margins, registration targets, CMYK swatches)
   */
  public wrapSvgWithPrepressMarks(
    innerSvg: string,
    options: PrepressExportOptions = {},
    jobMetadata: { brandName?: string; jobTitle?: string } = {}
  ): string {
    const bleedSpec = this.getDefaultBleedSpec(
      options.bleedSpec?.substrateType || 'FOLDING_CARTON',
      {
        widthMm: options.bleedSpec?.trimWidthMm || 80,
        heightMm: options.bleedSpec?.trimHeightMm || 160,
      }
    );

    const bleedMm = options.bleedSpec?.bleedMm ?? bleedSpec.bleedMm;
    const safeMarginMm = options.bleedSpec?.safeMarginMm ?? bleedSpec.safeMarginMm;
    const profile = options.colorProfile || 'FOGRA39';
    const profileMeta = COLOR_PROFILE_TAC_LIMITS[profile];

    // Convert mm to SVG points (1 mm ≈ 2.83465 pt)
    const MM_TO_PT = 2.83465;
    const trimW = bleedSpec.trimWidthMm * MM_TO_PT;
    const trimH = bleedSpec.trimHeightMm * MM_TO_PT;
    const bleedPt = bleedMm * MM_TO_PT;
    const safePt = safeMarginMm * MM_TO_PT;

    const marginPt = 60; // 60pt border for printer marks outside bleed
    const canvasW = trimW + 2 * (bleedPt + marginPt);
    const canvasH = trimH + 2 * (bleedPt + marginPt);

    const artX = marginPt + bleedPt;
    const artY = marginPt + bleedPt;

    const brand = jobMetadata.brandName || 'BrainWise Production';
    const job = jobMetadata.jobTitle || 'Packaging Collateral';
    const dateStr = new Date().toISOString().split('T')[0];

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(canvasW)} ${Math.round(canvasH)}" width="${Math.round(canvasW)}" height="${Math.round(canvasH)}">
  <defs>
    <!-- Registration Color Definition -->
    <style>
      .reg-mark { stroke: #000000; stroke-width: 0.75; fill: none; }
      .crop-mark { stroke: #000000; stroke-width: 0.5; }
      .bleed-box { stroke: #FF3366; stroke-width: 0.5; stroke-dasharray: 4,4; fill: none; }
      .safe-box { stroke: #00CC66; stroke-width: 0.5; stroke-dasharray: 2,2; fill: none; }
      .prepress-text { font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 8px; fill: #333333; }
    </style>
  </defs>

  <!-- Prepress Background -->
  <rect width="${Math.round(canvasW)}" height="${Math.round(canvasH)}" fill="#FFFFFF"/>

  <!-- Top Metadata Legend -->
  <text x="${artX}" y="${marginPt - 25}" class="prepress-text" font-weight="700">${brand.toUpperCase()} — ${job.toUpperCase()}</text>
  <text x="${artX}" y="${marginPt - 12}" class="prepress-text">COLOR PROFILE: ${profileMeta.name} | BLEED: ${bleedMm}mm | SAFE: ${safeMarginMm}mm | DATE: ${dateStr}</text>

  <!-- CMYK Calibration Color Bars -->
  <g id="cmyk_color_bars" transform="translate(${artX + trimW - 140}, ${marginPt - 25})">
    <rect x="0" y="0" width="16" height="12" fill="#00FFFF"/><text x="8" y="9" font-size="6" fill="#000" text-anchor="middle">C</text>
    <rect x="18" y="0" width="16" height="12" fill="#FF00FF"/><text x="26" y="9" font-size="6" fill="#FFF" text-anchor="middle">M</text>
    <rect x="36" y="0" width="16" height="12" fill="#FFFF00"/><text x="44" y="9" font-size="6" fill="#000" text-anchor="middle">Y</text>
    <rect x="54" y="0" width="16" height="12" fill="#000000"/><text x="62" y="9" font-size="6" fill="#FFF" text-anchor="middle">K</text>
    <rect x="72" y="0" width="16" height="12" fill="#808080"/><text x="80" y="9" font-size="6" fill="#FFF" text-anchor="middle">50%</text>
    <rect x="90" y="0" width="16" height="12" fill="#C0C0C0"/><text x="98" y="9" font-size="6" fill="#000" text-anchor="middle">25%</text>
    <rect x="108" y="0" width="16" height="12" fill="#E8E8E8"/><text x="116" y="9" font-size="6" fill="#000" text-anchor="middle">10%</text>
  </g>

  <!-- Corner Crop Marks (Trim Lines) -->
  <!-- Top-Left -->
  <line x1="${artX - 20}" y1="${artY}" x2="${artX - 4}" y2="${artY}" class="crop-mark"/>
  <line x1="${artX}" y1="${artY - 20}" x2="${artX}" y2="${artY - 4}" class="crop-mark"/>
  <!-- Top-Right -->
  <line x1="${artX + trimW + 4}" y1="${artY}" x2="${artX + trimW + 20}" y2="${artY}" class="crop-mark"/>
  <line x1="${artX + trimW}" y1="${artY - 20}" x2="${artX + trimW}" y2="${artY - 4}" class="crop-mark"/>
  <!-- Bottom-Left -->
  <line x1="${artX - 20}" y1="${artY + trimH}" x2="${artX - 4}" y2="${artY + trimH}" class="crop-mark"/>
  <line x1="${artX}" y1="${artY + trimH + 4}" x2="${artX}" y2="${artY + trimH + 20}" class="crop-mark"/>
  <!-- Bottom-Right -->
  <line x1="${artX + trimW + 4}" y1="${artY + trimH}" x2="${artX + trimW + 20}" y2="${artY + trimH}" class="crop-mark"/>
  <line x1="${artX + trimW}" y1="${artY + trimH + 4}" x2="${artX + trimW}" y2="${artY + trimH + 20}" class="crop-mark"/>

  <!-- Registration Targets (Crosshairs) -->
  <g id="reg_top" transform="translate(${artX + trimW / 2}, ${marginPt - 12})">
    <circle cx="0" cy="0" r="6" class="reg-mark"/>
    <circle cx="0" cy="0" r="3" class="reg-mark"/>
    <line x1="-9" y1="0" x2="9" y2="0" class="reg-mark"/>
    <line x1="0" y1="-9" x2="0" y2="9" class="reg-mark"/>
  </g>
  <g id="reg_bottom" transform="translate(${artX + trimW / 2}, ${artY + trimH + bleedPt + 25})">
    <circle cx="0" cy="0" r="6" class="reg-mark"/>
    <circle cx="0" cy="0" r="3" class="reg-mark"/>
    <line x1="-9" y1="0" x2="9" y2="0" class="reg-mark"/>
    <line x1="0" y1="-9" x2="0" y2="9" class="reg-mark"/>
  </g>

  <!-- Bleed Box (Pink dashed) -->
  <rect x="${artX - bleedPt}" y="${artY - bleedPt}" width="${trimW + 2 * bleedPt}" height="${trimH + 2 * bleedPt}" class="bleed-box"/>

  <!-- Safe Area Box (Green dashed) -->
  <rect x="${artX + safePt}" y="${artY + safePt}" width="${trimW - 2 * safePt}" height="${trimH - 2 * safePt}" class="safe-box"/>

  <!-- Core Content Artwork Group -->
  <g id="artwork_content" transform="translate(${artX}, ${artY})">
    ${innerSvg.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
</svg>`;
  }

  /**
   * 4. Generates binary-compliant 300 DPI CMYK TIFF buffer with standard tags & IFD headers
   */
  public generate300DpiCmykTiffBuffer(
    widthPx: number = 300,
    heightPx: number = 300,
    cmykColor: [number, number, number, number] = [0, 68, 91, 0] // CMYK equivalent of accent orange
  ): Buffer {
    // Basic TIFF Header: Little Endian ('II' = 0x4949, 42 = 0x002A)
    const header = Buffer.alloc(8);
    header.write('II', 0, 'ascii');
    header.writeUInt16LE(42, 2);
    header.writeUInt32LE(8, 4); // Offset to first IFD (immediately after header)

    const [c, m, y, k] = cmykColor;
    const bytesPerPixel = 4; // C, M, Y, K
    const rawDataLen = widthPx * heightPx * bytesPerPixel;
    const rawData = Buffer.alloc(rawDataLen);

    for (let i = 0; i < rawDataLen; i += bytesPerPixel) {
      rawData[i] = c;
      rawData[i + 1] = m;
      rawData[i + 2] = y;
      rawData[i + 3] = k;
    }

    // Compress raw raster with standard Deflate/Packbits for compact transmission
    const compressedData = zlib.deflateSync(rawData);

    // Image File Directory (IFD): Number of directory entries
    const numEntries = 12;
    const ifdOffset = 8;
    const ifdSize = 2 + numEntries * 12 + 4;
    const dataOffset = ifdOffset + ifdSize + 32; // Reserve 32 bytes for rational values

    const ifd = Buffer.alloc(ifdSize);
    let pos = 0;
    ifd.writeUInt16LE(numEntries, pos);
    pos += 2;

    const writeTag = (
      tag: number,
      type: number,
      count: number,
      valueOrOffset: number
    ) => {
      ifd.writeUInt16LE(tag, pos);
      ifd.writeUInt16LE(type, pos + 2);
      ifd.writeUInt32LE(count, pos + 4);
      ifd.writeUInt32LE(valueOrOffset, pos + 8);
      pos += 12;
    };

    // Standard Prepress TIFF Tags
    writeTag(256, 4, 1, widthPx);                     // Tag 256: ImageWidth
    writeTag(257, 4, 1, heightPx);                    // Tag 257: ImageLength
    writeTag(258, 3, 4, ifdOffset + ifdSize);         // Tag 258: BitsPerSample (Points to 8,8,8,8)
    writeTag(259, 3, 1, 8);                           // Tag 259: Compression (8 = Deflate / Adobe ZIP)
    writeTag(262, 3, 1, 5);                           // Tag 262: PhotometricInterpretation (5 = CMYK / Separated)
    writeTag(273, 4, 1, dataOffset);                  // Tag 273: StripOffsets
    writeTag(277, 3, 1, 4);                           // Tag 277: SamplesPerPixel (4 = CMYK)
    writeTag(278, 4, 1, heightPx);                    // Tag 278: RowsPerStrip
    writeTag(279, 4, 1, compressedData.length);       // Tag 279: StripByteCounts
    writeTag(282, 5, 1, ifdOffset + ifdSize + 8);     // Tag 282: XResolution (300/1 DPI)
    writeTag(283, 5, 1, ifdOffset + ifdSize + 16);    // Tag 283: YResolution (300/1 DPI)
    writeTag(296, 3, 1, 2);                           // Tag 296: ResolutionUnit (2 = Inches)

    ifd.writeUInt32LE(0, pos); // Next IFD offset (0 = none)

    // Extra Data Buffer (BitsPerSample values + Rational 300/1 values)
    const extraData = Buffer.alloc(32);
    // BitsPerSample: 8, 8, 8, 8
    extraData.writeUInt16LE(8, 0);
    extraData.writeUInt16LE(8, 2);
    extraData.writeUInt16LE(8, 4);
    extraData.writeUInt16LE(8, 6);
    // XResolution Rational: 300, 1
    extraData.writeUInt32LE(300, 8);
    extraData.writeUInt32LE(1, 12);
    // YResolution Rational: 300, 1
    extraData.writeUInt32LE(300, 16);
    extraData.writeUInt32LE(1, 20);

    return Buffer.concat([header, ifd, extraData, compressedData]);
  }

  /**
   * 5. Generates 8× Ultra-HD (4096px) raster PNG buffer with verified 32-bit RGBA signature
   */
  public generate8xUltraHdPngBuffer(
    width: number = 4096,
    height: number = 4096,
    pixelColorFn?: (x: number, y: number) => [number, number, number, number]
  ): Buffer {
    // Generate valid uncompressed scanlines with filter byte 0
    const bytesPerPixel = 4;
    const stride = width * bytesPerPixel;
    const rawScanlines = Buffer.alloc((stride + 1) * height);

    for (let y = 0; y < height; y++) {
      const lineStart = y * (stride + 1);
      rawScanlines[lineStart] = 0; // Filter None

      for (let x = 0; x < width; x++) {
        const offset = lineStart + 1 + x * bytesPerPixel;
        let color: [number, number, number, number];

        if (pixelColorFn) {
          color = pixelColorFn(x, y);
        } else {
          // Default: High-contrast center circular seal with genuine 0x00 alpha margin
          const dx = x - width / 2;
          const dy = y - height / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < width * 0.35) {
            color = [23, 23, 23, 255]; // Obsidian
          } else if (dist >= width * 0.35 && dist < width * 0.38) {
            color = [255, 116, 23, 255]; // Accent Amber Orange
          } else {
            color = [0, 0, 0, 0]; // 100% True 0x00 Alpha Transparency
          }
        }

        rawScanlines[offset] = color[0];
        rawScanlines[offset + 1] = color[1];
        rawScanlines[offset + 2] = color[2];
        rawScanlines[offset + 3] = color[3];
      }
    }

    const compressed = zlib.deflateSync(rawScanlines);

    // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // IHDR Chunk
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0); // Length
    ihdr.write('IHDR', 4, 'ascii');
    ihdr.writeUInt32BE(width, 8);
    ihdr.writeUInt32BE(height, 12);
    ihdr.writeUInt8(8, 16); // Bit depth
    ihdr.writeUInt8(6, 17); // ColorType 6 = RGBA with alpha
    ihdr.writeUInt8(0, 18); // Compression
    ihdr.writeUInt8(0, 19); // Filter
    ihdr.writeUInt8(0, 20); // Interlace
    const ihdrCrc = this.calculateCrc32(ihdr.subarray(4, 21));
    ihdr.writeUInt32BE(ihdrCrc, 21);

    // IDAT Chunk
    const idat = Buffer.alloc(12 + compressed.length);
    idat.writeUInt32BE(compressed.length, 0);
    idat.write('IDAT', 4, 'ascii');
    compressed.copy(idat, 8);
    const idatCrc = this.calculateCrc32(idat.subarray(4, 8 + compressed.length));
    idat.writeUInt32BE(idatCrc, 8 + compressed.length);

    // IEND Chunk
    const iend = Buffer.from([
      0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82,
    ]);

    return Buffer.concat([sig, ihdr, idat, iend]);
  }

  private calculateCrc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}

export const printPrepressEngine = new PrintPrepressEngine();
