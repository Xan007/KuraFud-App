import TextRecognition from "@react-native-ml-kit/text-recognition";

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
