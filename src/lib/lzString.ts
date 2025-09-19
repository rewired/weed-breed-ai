const keyStrBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const baseReverseDictionary: Record<string, Record<string, number>> = {};

const getBaseValue = (alphabet: string, character: string): number | undefined => {
  if (!baseReverseDictionary[alphabet]) {
    baseReverseDictionary[alphabet] = {};
    for (let i = 0; i < alphabet.length; i += 1) {
      baseReverseDictionary[alphabet][alphabet.charAt(i)] = i;
    }
  }
  return baseReverseDictionary[alphabet][character];
};

type CharFromInt = (value: number) => string;

const writeBits = (
  value: number,
  bitCount: number,
  pushBit: (bit: number) => void,
) => {
  let current = value;
  for (let i = 0; i < bitCount; i += 1) {
    pushBit(current & 1);
    current >>= 1;
  }
};

const _compress = (uncompressed: string, bitsPerChar: number, getCharFromInt: CharFromInt): string => {
  if (uncompressed == null) return '';

  const dictionary = new Map<string, number>();
  const dictionaryToCreate = new Map<string, true>();
  let contextW = '';
  let contextEnlargeIn = 2;
  let contextDictSize = 3;
  let contextNumBits = 2;
  const contextData: string[] = [];
  let contextDataVal = 0;
  let contextDataPosition = 0;

  const pushBit = (bit: number) => {
    contextDataVal = (contextDataVal << 1) | bit;
    if (contextDataPosition === bitsPerChar - 1) {
      contextDataPosition = 0;
      contextData.push(getCharFromInt(contextDataVal));
      contextDataVal = 0;
    } else {
      contextDataPosition += 1;
    }
  };

  const handleEnlarge = () => {
    contextEnlargeIn -= 1;
    if (contextEnlargeIn === 0) {
      contextEnlargeIn = 1 << contextNumBits;
      contextNumBits += 1;
    }
  };

  for (let ii = 0; ii < uncompressed.length; ii += 1) {
    const contextC = uncompressed.charAt(ii);
    if (!dictionary.has(contextC)) {
      dictionary.set(contextC, contextDictSize);
      dictionaryToCreate.set(contextC, true);
      contextDictSize += 1;
    }

    const contextWC = contextW + contextC;
    if (dictionary.has(contextWC)) {
      contextW = contextWC;
      continue;
    }

    if (dictionaryToCreate.has(contextW)) {
      const charCode = contextW.charCodeAt(0);
      if (charCode < 256) {
        writeBits(0, contextNumBits, pushBit);
        writeBits(charCode, 8, pushBit);
      } else {
        writeBits(1, contextNumBits, pushBit);
        writeBits(charCode, 16, pushBit);
      }
      dictionaryToCreate.delete(contextW);
    } else {
      const value = dictionary.get(contextW);
      if (value == null) {
        throw new Error(`Failed to locate dictionary entry for \"${contextW}\" during compression.`);
      }
      writeBits(value, contextNumBits, pushBit);
    }

    handleEnlarge();
    dictionary.set(contextWC, contextDictSize);
    contextDictSize += 1;
    contextW = contextC;
  }

  if (contextW !== '') {
    if (dictionaryToCreate.has(contextW)) {
      const charCode = contextW.charCodeAt(0);
      if (charCode < 256) {
        writeBits(0, contextNumBits, pushBit);
        writeBits(charCode, 8, pushBit);
      } else {
        writeBits(1, contextNumBits, pushBit);
        writeBits(charCode, 16, pushBit);
      }
      dictionaryToCreate.delete(contextW);
    } else {
      const value = dictionary.get(contextW);
      if (value == null) {
        throw new Error(`Failed to locate dictionary entry for \"${contextW}\" during compression.`);
      }
      writeBits(value, contextNumBits, pushBit);
    }
    handleEnlarge();
  }

  writeBits(2, contextNumBits, pushBit);

  while (true) {
    contextDataVal <<= 1;
    if (contextDataPosition === bitsPerChar - 1) {
      contextData.push(getCharFromInt(contextDataVal));
      break;
    }
    contextDataPosition += 1;
  }

  return contextData.join('');
};

interface DecompressionContext {
  value: number;
  position: number;
  index: number;
}

const _decompress = (
  length: number,
  resetValue: number,
  getNextValue: (index: number) => number,
): string => {
  if (length === 0) return '';

  const dictionary: string[] = [];
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  const result: string[] = [];

  const context: DecompressionContext = {
    value: getNextValue(0),
    position: resetValue,
    index: 1,
  };

  for (let i = 0; i < 3; i += 1) {
    dictionary[i] = String.fromCharCode(i);
  }

  const readNext = (bitWidth: number): number => {
    let bits = 0;
    let maxPower = 1 << bitWidth;
    let power = 1;

    while (power !== maxPower) {
      const resb = context.value & context.position;
      context.position >>= 1;
      if (context.position === 0) {
        context.value = getNextValue(context.index);
        context.index += 1;
        context.position = resetValue;
      }
      if (resb > 0) bits |= power;
      power <<= 1;
    }

    return bits;
  };

  const consumeEnlarge = () => {
    enlargeIn -= 1;
    if (enlargeIn === 0) {
      enlargeIn = 1 << numBits;
      numBits += 1;
    }
  };

  let next = readNext(2);

  switch (next) {
    case 0: {
      const c = readNext(8);
      dictionary[3] = String.fromCharCode(c);
      next = 3;
      break;
    }
    case 1: {
      const c = readNext(16);
      dictionary[3] = String.fromCharCode(c);
      next = 3;
      break;
    }
    case 2:
      return '';
    default:
      break;
  }

  let w = dictionary[next];
  if (w == null) return '';
  result.push(w);

  while (true) {
    if (context.index > length) {
      return '';
    }

    const c = readNext(numBits);

    let value: string;
    if (c === 0) {
      const charCode = readNext(8);
      dictionary[dictSize] = String.fromCharCode(charCode);
      dictSize += 1;
      consumeEnlarge();
      value = dictionary[dictSize - 1];
    } else if (c === 1) {
      const charCode = readNext(16);
      dictionary[dictSize] = String.fromCharCode(charCode);
      dictSize += 1;
      consumeEnlarge();
      value = dictionary[dictSize - 1];
    } else if (c === 2) {
      return result.join('');
    } else {
      if (c < dictionary.length && dictionary[c] != null) {
        value = dictionary[c];
      } else {
        value = w + w.charAt(0);
      }
    }

    result.push(value);

    dictionary[dictSize] = w + value.charAt(0);
    dictSize += 1;
    consumeEnlarge();

    w = value;
  }
};

export const compressToBase64 = (input: string): string => {
  if (input == null || input === '') return '';
  const compressed = _compress(input, 6, value => keyStrBase64.charAt(value));
  const padding = compressed.length % 4;
  if (padding === 0) return compressed;
  return compressed + '===='.slice(padding);
};

export const decompressFromBase64 = (input: string): string => {
  if (input == null || input === '') return '';
  const sanitized = input.replace(/=+$/, '');
  return _decompress(sanitized.length, 32, index => getBaseValue(keyStrBase64, sanitized.charAt(index)) ?? 0);
};

export const tryDecompressFromBase64 = (input: string): string | null => {
  try {
    return decompressFromBase64(input);
  } catch (error) {
    console.warn('Failed to decompress save data:', error);
    return null;
  }
};

export const tryCompressToBase64 = (input: string): string | null => {
  try {
    return compressToBase64(input);
  } catch (error) {
    console.warn('Failed to compress save data:', error);
    return null;
  }
};

export type SaveCompressionStrategy = 'base64';
