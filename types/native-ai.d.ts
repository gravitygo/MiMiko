declare module 'whisper.rn' {
  export interface TranscribeResult {
    result: string;
    segments: Array<{
      text: string;
      t0: number;
      t1: number;
    }>;
    isAborted: boolean;
  }

  export interface TranscribeRealtimeEvent {
    contextId: number;
    jobId: number;
    isCapturing: boolean;
    isStoppedByAction?: boolean;
    code: number;
    data?: TranscribeResult;
    error?: string;
    processTime: number;
    recordingTime: number;
    slices?: Array<{
      code: number;
      error?: string;
      data?: TranscribeResult;
      processTime: number;
      recordingTime: number;
    }>;
  }

  export interface TranscribeRealtimeOptions {
    language?: string;
    maxLen?: number;
    realtimeAudioSec?: number;
    realtimeAudioSliceSec?: number;
    realtimeAudioMinSec?: number;
    audioOutputPath?: string;
    useVad?: boolean;
    vadMs?: number;
    vadThold?: number;
    vadFreqThold?: number;
    audioSessionOnStartIos?: {
      category: string;
      options?: string[];
      mode?: string;
    };
    audioSessionOnStopIos?: string | object;
  }

  export interface ContextOptions {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    useCoreMLIos?: boolean;
    useFlashAttn?: boolean;
  }

  export class WhisperContext {
    id: number;
    gpu: boolean;
    reasonNoGPU: string;
    transcribeRealtime(
      options?: TranscribeRealtimeOptions,
    ): Promise<{
      stop: () => Promise<void>;
      subscribe: (callback: (event: TranscribeRealtimeEvent) => void) => void;
    }>;
    release(): Promise<void>;
  }

  export function initWhisper(options: ContextOptions): Promise<WhisperContext>;
  export function releaseAllWhisper(): Promise<void>;
}

declare module 'llama.rn' {
  export interface ContextParams {
    model: string;
    is_model_asset?: boolean;
    n_ctx?: number;
    n_batch?: number;
    n_threads?: number;
    n_gpu_layers?: number;
    use_mlock?: boolean;
    use_mmap?: boolean;
    flash_attn?: boolean;
  }

  export interface CompletionParams {
    prompt?: string;
    n_predict?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stop?: string[];
    grammar?: string;
  }

  export interface NativeCompletionResult {
    text: string;
    content: string;
    reasoning_content: string;
    tokens_predicted: number;
    tokens_evaluated: number;
    truncated: boolean;
    stopped_eos: boolean;
    stopped_word: string;
    stopped_limit: number;
    stopping_word: string;
  }

  export interface TokenData {
    token: string;
  }

  export class LlamaContext {
    id: number;
    gpu: boolean;
    reasonNoGPU: string;
    completion(
      params: CompletionParams,
      callback?: (data: TokenData) => void,
    ): Promise<NativeCompletionResult>;
    stopCompletion(): Promise<void>;
    release(): Promise<void>;
  }

  export function initLlama(
    params: ContextParams,
    onProgress?: (progress: number) => void,
  ): Promise<LlamaContext>;
  export function releaseAllLlama(): Promise<void>;
}
