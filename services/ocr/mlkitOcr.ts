import TextRecognition from "@react-native-ml-kit/text-recognition";

/**
 * Thin, file-based wrapper around `@react-native-ml-kit/text-recognition`.
 *
 * ML Kit only accepts an image **file URI** (not a camera Frame), which is why
 * the pipeline captures/enhances a file first and only then calls this.  The
 * OCR runs fully on-device (offline).
 *
 * Some ML Kit builds are picky about the `file://` prefix, so we try both the
 * prefixed and raw path.
 */
export async function recognizeText(path: string): Promise<string> {
  const candidates = path.startsWith("file://")
    ? [path, path.replace(/^file:\/\//, "")]
    : ["file://" + path, path];

  for (const uri of candidates) {
    try {
      const result = await TextRecognition.recognize(uri);
      const text = result.text.trim();
      if (text) return text;
    } catch {
      continue;
    }
  }

  return "";
}
