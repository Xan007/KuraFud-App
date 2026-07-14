function luhnChecksum(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = digits[i];
    const weight = (digits.length - i) % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }
  return (10 - (sum % 10)) % 10;
}

function validateGS1Checksum(code: string): boolean {
  const digits = code.split("").map(Number);
  if (digits.length < 2) return false;
  const checkDigit = digits[digits.length - 1];
  const calculatedCheckDigit = luhnChecksum(digits.slice(0, -1));
  return checkDigit === calculatedCheckDigit;
}

export function isValidBarcode(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;

  const length = code.length;
  const isValidLength = [6, 8, 12, 13].includes(length);
  if (!isValidLength) return false;


  return true;
}
