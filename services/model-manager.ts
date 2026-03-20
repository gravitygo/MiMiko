import * as FileSystem from 'expo-file-system';

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

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

async function ensureModelsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }
}

export function getModelPath(type: ModelType): string {
  return `${MODELS_DIR}${MODEL_FILES[type]}`;
}

export async function isModelDownloaded(type: ModelType): Promise<boolean> {
  const path = getModelPath(type);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists && info.size > 0;
}

export function getModelSize(type: ModelType): number {
  return MODEL_SIZES[type];
}

export async function downloadModel(
  type: ModelType,
  onProgress?: (progress: number) => void,
): Promise<string> {
  await ensureModelsDir();
  const filePath = getModelPath(type);
  const url = MODEL_URLS[type];

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    filePath,
    {},
    (downloadProgress) => {
      if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        onProgress(Math.round(progress * 100));
      }
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) {
    throw new Error(`Failed to download ${type} model`);
  }

  return result.uri;
}

export async function deleteModel(type: ModelType): Promise<void> {
  const path = getModelPath(type);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path);
  }
}

export async function getModelStatus(): Promise<
  Record<ModelType, { downloaded: boolean; path: string; sizeMB: number }>
> {
  const whisperDownloaded = await isModelDownloaded('whisper');
  const llamaDownloaded = await isModelDownloaded('llama');

  return {
    whisper: {
      downloaded: whisperDownloaded,
      path: getModelPath('whisper'),
      sizeMB: Math.round(MODEL_SIZES.whisper / 1_000_000),
    },
    llama: {
      downloaded: llamaDownloaded,
      path: getModelPath('llama'),
      sizeMB: Math.round(MODEL_SIZES.llama / 1_000_000),
    },
  };
}
