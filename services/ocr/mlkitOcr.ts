import TextRecognition from "@react-native-ml-kit/text-recognition";

// ML Kit only accepts a file URI (not a camera Frame), which is why the
// pipeline saves a snapshot first.  Some builds are picky about `file://`.
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
