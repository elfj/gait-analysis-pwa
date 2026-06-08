const QR_VERSION = 8;
const QR_SIZE = 17 + QR_VERSION * 4;
const DATA_CODEWORDS = 194;
const EC_CODEWORDS_PER_BLOCK = 24;
const DATA_BLOCKS = 2;
const DATA_CODEWORDS_PER_BLOCK = DATA_CODEWORDS / DATA_BLOCKS;
const FORMAT_POLYNOMIAL = 0x537;
const FORMAT_MASK = 0x5412;
const VERSION_POLYNOMIAL = 0x1f25;
const BYTE_MODE_INDICATOR = 0b0100;
const PAD_CODEWORDS = [0xec, 0x11] as const;

/** Boolean QR module matrix where true means dark. */
export type QrMatrix = boolean[][];

/** Generate a QR Code matrix for a URL using version 8, error correction level L. */
export function generateQrCodeMatrix(value: string): QrMatrix {
  const data = encodePayload(value);
  const blocks = splitDataBlocks(data);
  const errorCorrectionBlocks = blocks.map((block) =>
    computeReedSolomonRemainder(block, EC_CODEWORDS_PER_BLOCK),
  );
  const codewords = interleaveBlocks(blocks, errorCorrectionBlocks);
  const codewordBits = codewords.flatMap((codeword) => bitsFromNumber(codeword, 8));
  const base = createBaseMatrix();
  const candidates = Array.from({ length: 8 }, (_, mask) => {
    const matrix = cloneMatrix(base.modules);
    placeDataBits(matrix, base.functionModules, codewordBits, mask);
    drawFormatBits(matrix, mask);
    return { mask, matrix, penalty: computePenaltyScore(matrix) };
  });
  const best = candidates.reduce((lowest, candidate) =>
    candidate.penalty < lowest.penalty ? candidate : lowest,
  );

  return finalizeMatrix(best.matrix);
}

/** Convert a QR matrix into compact SVG path data. */
export function createQrSvgPath(matrix: QrMatrix): string {
  const commands: string[] = [];

  matrix.forEach((row, y) => {
    row.forEach((isDark, x) => {
      if (isDark) {
        commands.push(`M${String(x)} ${String(y)}h1v1h-1z`);
      }
    });
  });

  return commands.join('');
}

function encodePayload(value: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(value));

  if (bytes.length > DATA_CODEWORDS - 2) {
    throw new Error('QR payload is too long for the built-in IMU link QR code.');
  }

  const bits = [
    ...bitsFromNumber(BYTE_MODE_INDICATOR, 4),
    ...bitsFromNumber(bytes.length, 8),
    ...bytes.flatMap((byte) => bitsFromNumber(byte, 8)),
  ];
  const terminatorLength = Math.min(4, DATA_CODEWORDS * 8 - bits.length);
  bits.push(...new Array<number>(terminatorLength).fill(0));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const data = bitsToCodewords(bits);
  let padIndex = 0;

  while (data.length < DATA_CODEWORDS) {
    data.push(getArrayItem(PAD_CODEWORDS, padIndex % PAD_CODEWORDS.length));
    padIndex += 1;
  }

  return data;
}

function splitDataBlocks(data: number[]): number[][] {
  return Array.from({ length: DATA_BLOCKS }, (_, blockIndex) =>
    data.slice(
      blockIndex * DATA_CODEWORDS_PER_BLOCK,
      (blockIndex + 1) * DATA_CODEWORDS_PER_BLOCK,
    ),
  );
}

function interleaveBlocks(dataBlocks: number[][], ecBlocks: number[][]): number[] {
  const codewords: number[] = [];

  for (let index = 0; index < DATA_CODEWORDS_PER_BLOCK; index += 1) {
    for (const block of dataBlocks) {
      codewords.push(block[index] ?? 0);
    }
  }

  for (let index = 0; index < EC_CODEWORDS_PER_BLOCK; index += 1) {
    for (const block of ecBlocks) {
      codewords.push(block[index] ?? 0);
    }
  }

  return codewords;
}

function createBaseMatrix(): {
  modules: (boolean | null)[][];
  functionModules: boolean[][];
} {
  const modules = createEmptyMatrix<boolean | null>(null);
  const functionModules = createEmptyMatrix(false);
  const setFunctionModule = (row: number, column: number, isDark: boolean): void => {
    if (row < 0 || column < 0 || row >= QR_SIZE || column >= QR_SIZE) {
      return;
    }

    setCell(modules, row, column, isDark);
    setCell(functionModules, row, column, true);
  };

  drawFinderPattern(setFunctionModule, 0, 0);
  drawFinderPattern(setFunctionModule, 0, QR_SIZE - 7);
  drawFinderPattern(setFunctionModule, QR_SIZE - 7, 0);
  drawTimingPatterns(setFunctionModule);
  drawAlignmentPatterns(setFunctionModule);
  drawVersionInfo(setFunctionModule);
  drawFormatPlaceholders(setFunctionModule);
  setFunctionModule(4 * QR_VERSION + 9, 8, true);

  return { functionModules, modules };
}

function drawFinderPattern(
  setFunctionModule: (row: number, column: number, isDark: boolean) => void,
  top: number,
  left: number,
): void {
  for (let row = -1; row <= 7; row += 1) {
    for (let column = -1; column <= 7; column += 1) {
      const y = top + row;
      const x = left + column;
      const isInside = row >= 0 && row <= 6 && column >= 0 && column <= 6;
      const isDark =
        isInside &&
        (row === 0 ||
          row === 6 ||
          column === 0 ||
          column === 6 ||
          (row >= 2 && row <= 4 && column >= 2 && column <= 4));
      setFunctionModule(y, x, isDark);
    }
  }
}

function drawTimingPatterns(
  setFunctionModule: (row: number, column: number, isDark: boolean) => void,
): void {
  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    const isDark = index % 2 === 0;
    setFunctionModule(6, index, isDark);
    setFunctionModule(index, 6, isDark);
  }
}

function drawAlignmentPatterns(
  setFunctionModule: (row: number, column: number, isDark: boolean) => void,
): void {
  const positions = [6, 24, 42];

  for (const row of positions) {
    for (const column of positions) {
      const overlapsFinder =
        (row === 6 && column === 6) ||
        (row === 6 && column === QR_SIZE - 7) ||
        (row === QR_SIZE - 7 && column === 6);

      if (!overlapsFinder) {
        drawAlignmentPattern(setFunctionModule, row, column);
      }
    }
  }
}

function drawAlignmentPattern(
  setFunctionModule: (row: number, column: number, isDark: boolean) => void,
  centerRow: number,
  centerColumn: number,
): void {
  for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
    for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
      const isDark =
        Math.max(Math.abs(rowOffset), Math.abs(columnOffset)) !== 1;
      setFunctionModule(centerRow + rowOffset, centerColumn + columnOffset, isDark);
    }
  }
}

function drawVersionInfo(
  setFunctionModule: (row: number, column: number, isDark: boolean) => void,
): void {
  let remainder = QR_VERSION;

  for (let index = 0; index < 12; index += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 11) & 1) * VERSION_POLYNOMIAL);
  }

  const bits = (QR_VERSION << 12) | remainder;

  for (let index = 0; index < 18; index += 1) {
    const isDark = ((bits >>> index) & 1) !== 0;
    const offsetRow = Math.floor(index / 3);
    const offsetColumn = QR_SIZE - 11 + (index % 3);
    setFunctionModule(offsetRow, offsetColumn, isDark);
    setFunctionModule(offsetColumn, offsetRow, isDark);
  }
}

function drawFormatPlaceholders(
  setFunctionModule: (row: number, column: number, isDark: boolean) => void,
): void {
  for (let index = 0; index < 15; index += 1) {
    const [first, second] = getFormatCoordinates(index);
    setFunctionModule(first.row, first.column, false);
    setFunctionModule(second.row, second.column, false);
  }
}

function placeDataBits(
  matrix: (boolean | null)[][],
  functionModules: boolean[][],
  bits: number[],
  mask: number,
): void {
  let bitIndex = 0;
  let upward = true;

  for (let rightColumn = QR_SIZE - 1; rightColumn >= 1; rightColumn -= 2) {
    if (rightColumn === 6) {
      rightColumn -= 1;
    }

    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const row = upward ? QR_SIZE - 1 - vertical : vertical;

      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const column = rightColumn - columnOffset;

        if (getCell(functionModules, row, column)) {
          continue;
        }

        if (bitIndex >= bits.length) {
          throw new Error('QR payload exceeded available data modules.');
        }

        const rawBit = bits[bitIndex] === 1;
        setCell(matrix, row, column, rawBit !== isMaskDark(mask, row, column));
        bitIndex += 1;
      }
    }

    upward = !upward;
  }

  if (bitIndex !== bits.length) {
    throw new Error('QR payload did not fill the expected data modules.');
  }
}

function drawFormatBits(matrix: (boolean | null)[][], mask: number): void {
  const bits = computeFormatBits(mask);

  for (let index = 0; index < 15; index += 1) {
    const bit = getArrayItem(bits, index);
    const [first, second] = getFormatCoordinates(index);
    setCell(matrix, first.row, first.column, bit);
    setCell(matrix, second.row, second.column, bit);
  }

  setCell(matrix, QR_SIZE - 8, 8, true);
}

function getFormatCoordinates(index: number): [
  { row: number; column: number },
  { row: number; column: number },
] {
  const first =
    index < 6
      ? { column: index, row: 8 }
      : index === 6
        ? { column: 7, row: 8 }
        : index === 7
          ? { column: 8, row: 8 }
          : index === 8
            ? { column: 8, row: 7 }
            : { column: 8, row: 14 - index };
  const second =
    index < 7
      ? { column: 8, row: QR_SIZE - 1 - index }
      : { column: QR_SIZE - 15 + index, row: 8 };

  return [first, second];
}

function computeFormatBits(mask: number): boolean[] {
  const data = (1 << 3) | mask;
  let remainder = data << 10;

  for (let shift = 14; shift >= 10; shift -= 1) {
    if (((remainder >>> shift) & 1) !== 0) {
      remainder ^= FORMAT_POLYNOMIAL << (shift - 10);
    }
  }

  const encoded = ((data << 10) | remainder) ^ FORMAT_MASK;
  return Array.from({ length: 15 }, (_, index) => ((encoded >>> index) & 1) !== 0);
}

function computePenaltyScore(matrix: (boolean | null)[][]): number {
  const booleanMatrix = matrix.map((row) => row.map((module) => module === true));
  return (
    computeRunPenalty(booleanMatrix) +
    computeBlockPenalty(booleanMatrix) +
    computeFinderLikePenalty(booleanMatrix) +
    computeBalancePenalty(booleanMatrix)
  );
}

function computeRunPenalty(matrix: boolean[][]): number {
  let penalty = 0;

  for (let index = 0; index < QR_SIZE; index += 1) {
    penalty += computeLineRunPenalty(getArrayItem(matrix, index));
    penalty += computeLineRunPenalty(
      matrix.map((row) => getArrayItem(row, index)),
    );
  }

  return penalty;
}

function computeLineRunPenalty(line: boolean[]): number {
  let penalty = 0;
  let runColor = line[0];
  let runLength = 1;

  for (let index = 1; index < line.length; index += 1) {
    if (line[index] === runColor) {
      runLength += 1;
    } else {
      if (runLength >= 5) {
        penalty += runLength - 2;
      }

      runColor = line[index];
      runLength = 1;
    }
  }

  return runLength >= 5 ? penalty + runLength - 2 : penalty;
}

function computeBlockPenalty(matrix: boolean[][]): number {
  let penalty = 0;

  for (let row = 0; row < QR_SIZE - 1; row += 1) {
    for (let column = 0; column < QR_SIZE - 1; column += 1) {
      const color = getCell(matrix, row, column);

      if (
        getCell(matrix, row, column + 1) === color &&
        getCell(matrix, row + 1, column) === color &&
        getCell(matrix, row + 1, column + 1) === color
      ) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

function computeFinderLikePenalty(matrix: boolean[][]): number {
  let penalty = 0;
  const pattern = [true, false, true, true, true, false, true];

  for (let index = 0; index < QR_SIZE; index += 1) {
    penalty += countFinderLikePatterns(getArrayItem(matrix, index), pattern) * 40;
    penalty +=
      countFinderLikePatterns(
        matrix.map((row) => getArrayItem(row, index)),
        pattern,
      ) * 40;
  }

  return penalty;
}

function countFinderLikePatterns(line: boolean[], pattern: boolean[]): number {
  let count = 0;

  for (let offset = 0; offset <= line.length - pattern.length; offset += 1) {
    const matches = pattern.every((value, index) => line[offset + index] === value);

    if (!matches) {
      continue;
    }

    const hasLightBefore = line
      .slice(Math.max(0, offset - 4), offset)
      .every((value) => !value);
    const hasLightAfter = line
      .slice(offset + pattern.length, Math.min(line.length, offset + pattern.length + 4))
      .every((value) => !value);

    if (hasLightBefore || hasLightAfter) {
      count += 1;
    }
  }

  return count;
}

function computeBalancePenalty(matrix: boolean[][]): number {
  const darkCount = matrix.flat().filter(Boolean).length;
  const totalCount = QR_SIZE * QR_SIZE;
  const percent = (darkCount * 100) / totalCount;
  return Math.floor(Math.abs(percent - 50) / 5) * 10;
}

function computeReedSolomonRemainder(data: number[], degree: number): number[] {
  const divisor = computeReedSolomonDivisor(degree);
  const result = new Array<number>(degree).fill(0);

  for (const byte of data) {
    const factor = byte ^ getShiftedValue(result);
    result.push(0);

    divisor.forEach((coefficient, index) => {
      result[index] = getArrayItem(result, index) ^ multiplyGalois(coefficient, factor);
    });
  }

  return result;
}

function computeReedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;

  for (let index = 0; index < degree; index += 1) {
    for (let coefficient = 0; coefficient < degree; coefficient += 1) {
      result[coefficient] = multiplyGalois(
        getArrayItem(result, coefficient),
        root,
      );

      if (coefficient + 1 < degree) {
        result[coefficient] =
          getArrayItem(result, coefficient) ^ getArrayItem(result, coefficient + 1);
      }
    }

    root = multiplyGalois(root, 0x02);
  }

  return result;
}

function multiplyGalois(left: number, right: number): number {
  let result = 0;
  let a = left;
  let b = right;

  for (let index = 0; index < 8; index += 1) {
    if ((b & 1) !== 0) {
      result ^= a;
    }

    const carry = (a & 0x80) !== 0;
    a = (a << 1) & 0xff;

    if (carry) {
      a ^= 0x1d;
    }

    b >>>= 1;
  }

  return result;
}

function isMaskDark(mask: number, row: number, column: number): boolean {
  switch (mask) {
    case 0:
      return (row + column) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return column % 3 === 0;
    case 3:
      return (row + column) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0;
    case 5:
      return ((row * column) % 2) + ((row * column) % 3) === 0;
    case 6:
      return (((row * column) % 2) + ((row * column) % 3)) % 2 === 0;
    case 7:
      return (((row + column) % 2) + ((row * column) % 3)) % 2 === 0;
    default:
      throw new Error(`Unsupported QR mask: ${String(mask)}`);
  }
}

function bitsFromNumber(value: number, length: number): number[] {
  return Array.from({ length }, (_, index) => (value >>> (length - 1 - index)) & 1);
}

function bitsToCodewords(bits: number[]): number[] {
  const codewords: number[] = [];

  for (let offset = 0; offset < bits.length; offset += 8) {
    codewords.push(
      bits
        .slice(offset, offset + 8)
        .reduce((value, bit) => (value << 1) | bit, 0),
    );
  }

  return codewords;
}

function createEmptyMatrix<T>(value: T): T[][] {
  return Array.from({ length: QR_SIZE }, () =>
    new Array<T>(QR_SIZE).fill(value),
  );
}

function cloneMatrix<T>(matrix: T[][]): T[][] {
  return matrix.map((row) => [...row]);
}

function finalizeMatrix(matrix: (boolean | null)[][]): QrMatrix {
  return matrix.map((row) => row.map((module) => module === true));
}

function getCell<T>(matrix: T[][], row: number, column: number): T {
  return getArrayItem(getArrayItem(matrix, row), column);
}

function setCell<T>(matrix: T[][], row: number, column: number, value: T): void {
  getArrayItem(matrix, row)[column] = value;
}

function getArrayItem<T>(items: readonly T[], index: number): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`QR internal index out of bounds: ${String(index)}`);
  }

  return item;
}

function getShiftedValue(values: number[]): number {
  const value = values.shift();

  if (value === undefined) {
    throw new Error('QR internal Reed-Solomon state is empty.');
  }

  return value;
}
