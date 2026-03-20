import { Directory, File, Paths } from 'expo-file-system';

const modelsDir = new Directory(Paths.document, 'models');

const MODEL_FILES = {
  whisper: 'ggml-tiny.bin',
  llama: 'tinyllama-1.1b-chat.Q4_K_M.gguf',
} as const;

const MODEL_URLS = {
  whisper:
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  llama:
    'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
} as const;

const MODEL_SIZES = {
  whisper: 77_700_000, // ~77 MB
  llama: 636_000_000, // ~636 MB
} as const;

type ModelType = keyof typeof MODEL_FILES;

function ensureModelsDir(): void {
  if (!modelsDir.exists) {
    modelsDir.create();
  }
}

function getModelFile(type: ModelType): File {
  return new File(modelsDir, MODEL_FILES[type]);
}

export function getModelPath(type: ModelType): string {
  return getModelFile(type).uri;
}

export function isModelDownloaded(type: ModelType): boolean {
  const file = getModelFile(type);
  return file.exists && file.size > 0;
}

export function getModelSize(type: ModelType): number {
  return MODEL_SIZES[type];
}

export async function downloadModel(
  type: ModelType,
  onProgress?: (progress: number) => void,
): Promise<string> {
  ensureModelsDir();
  const url = MODEL_URLS[type];
  const expectedSize = MODEL_SIZES[type];

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${type} model: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error(`No response body for ${type} model download`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (onProgress) {
      const total =
        Number(response.headers.get('content-length')) || expectedSize;
      onProgress(Math.round((received / total) * 100));
    }
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const file = getModelFile(type);
  file.create({ intermediates: true });
  file.write(merged);

  return file.uri;
}

export function deleteModel(type: ModelType): void {
  const file = getModelFile(type);
  if (file.exists) {
    file.delete();
  }
}

export function getModelStatus(): Record<
  ModelType,
  { downloaded: boolean; path: string; sizeMB: number }
> {
  return {
    whisper: {
      downloaded: isModelDownloaded('whisper'),
      path: getModelPath('whisper'),
      sizeMB: Math.round(MODEL_SIZES.whisper / 1_000_000),
    },
    llama: {
      downloaded: isModelDownloaded('llama'),
      path: getModelPath('llama'),
      sizeMB: Math.round(MODEL_SIZES.llama / 1_000_000),
    },
  };
}
