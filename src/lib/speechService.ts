import { SpeechServiceConfig } from "@/types";

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class SpeechService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private config: SpeechServiceConfig;
  private isListening = false;
  private onResultCallback?: (result: string) => void;
  private onErrorCallback?: (error: string) => void;
  private onEndCallback?: () => void;
  private microphonePermission: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';

  constructor(config?: Partial<SpeechServiceConfig>) {
    this.config = {
      language: 'en-US',
      rate: 1,
      pitch: 1,
      volume: 1,
      ...config
    };

    if (typeof window !== 'undefined') {
      this.initializeServices();
      this.checkMicrophonePermission();
    }
  }

   private async checkMicrophonePermission() {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        this.microphonePermission = permission.state;
        
        permission.addEventListener('change', () => {
          this.microphonePermission = permission.state;
        });
      }
    } catch (error) {
      console.warn('Could not check microphone permission:', error);
    }
  }

  private initializeServices() {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.config.language;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      this.recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        console.log('Speech recognition result:', result);
        this.onResultCallback?.(result);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech was detected. Please try speaking clearly and try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone was found. Please check your microphone connection and try again.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow access.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your internet connection and try again.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please try refreshing the page.';
            break;
          case 'bad-grammar':
            errorMessage = 'Speech recognition grammar error. Please try again.';
            break;
          case 'language-not-supported':
            errorMessage = 'Language not supported. Trying with default language.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
        }
        
        this.onErrorCallback?.(errorMessage);
      };

      this.recognition.onend = () => {
        console.log('Speech recognition ended');
        this.isListening = false;
        this.onEndCallback?.();
      };
    }

    // Initialize Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return !!(this.recognition && this.synthesis);
  }

   public async requestMicrophonePermission(): Promise<boolean> {
    try {
      // Try to get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      this.microphonePermission = 'granted';
      return true;
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      this.microphonePermission = 'denied';
      return false;
    }
  }

  public async startListening(
    onResult: (result: string) => void,
    onError?: (error: string) => void,
    onEnd?: () => void
  ): Promise<boolean> {
    if (!this.recognition || this.isListening) {
      onError?.('Speech recognition is not available or already listening');
      return false;
    }

    // Check if microphone permission is explicitly denied
    if (this.microphonePermission === 'denied') {
      onError?.('Microphone access is denied. Please allow microphone access in your browser settings and refresh the page.');
      return false;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;

    try {
      // Request microphone permission if not already granted
      if (this.microphonePermission !== 'granted') {
        const hasPermission = await this.requestMicrophonePermission();
        if (!hasPermission) {
          onError?.('Microphone access denied. Please allow microphone access and try again.');
          return false;
        }
      }

      console.log('Starting speech recognition...');
      this.isListening = true;
      this.recognition.start();
      return true;
    } catch (error: any) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
      
      let errorMessage = 'Failed to start speech recognition';
      if (error.name === 'InvalidStateError') {
        errorMessage = 'Speech recognition is already running. Please wait and try again.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Speech recognition is not supported in this browser.';
      }
      
      onError?.(errorMessage);
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        const error = 'Speech synthesis not supported';
        onError?.(error);
        reject(new Error(error));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.config.rate;
      utterance.pitch = this.config.pitch;
      utterance.volume = this.config.volume;
      utterance.lang = this.config.language;

      // Try to use a more natural voice if available
      const voices = this.synthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Natural'))
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      } else if (this.config.voiceURI) {
        const voice = voices.find(v => v.voiceURI === this.config.voiceURI);
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        onEnd?.();
        resolve();
      };

      utterance.onerror = (event: any) => {
        const error = `Speech synthesis error: ${event.error}`;
        onError?.(error);
        reject(new Error(error));
      };

      this.synthesis.speak(utterance);
    });
  }

  public stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

   public updateConfig(newConfig: Partial<SpeechServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getMicrophonePermission(): 'granted' | 'denied' | 'prompt' | 'unknown' {
    return this.microphonePermission;
  }

  public getBrowserCompatibility(): {
    hasSpeechRecognition: boolean;
    hasSpeechSynthesis: boolean;
    hasMediaDevices: boolean;
    browserInfo: string;
    isHTTPS: boolean;
  } {
    const userAgent = navigator.userAgent;
    let browserInfo = 'Unknown browser';
    
    if (userAgent.includes('Chrome')) {
      browserInfo = 'Google Chrome';
    } else if (userAgent.includes('Firefox')) {
      browserInfo = 'Mozilla Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserInfo = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browserInfo = 'Microsoft Edge';
    }

    return {
      hasSpeechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      hasSpeechSynthesis: 'speechSynthesis' in window,
      hasMediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      browserInfo,
      isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost'
    };
  }

  public async testMicrophone(): Promise<{
    success: boolean;
    error?: string;
    details: string;
  }> {
    try {
      const compatibility = this.getBrowserCompatibility();
      
      if (!compatibility.hasSpeechRecognition) {
        return {
          success: false,
          error: 'Speech recognition not supported',
          details: `Your browser (${compatibility.browserInfo}) doesn't support speech recognition. Please use Chrome, Edge, or Safari.`
        };
      }

      if (!compatibility.isHTTPS) {
        return {
          success: false,
          error: 'HTTPS required',
          details: 'Speech recognition requires HTTPS. Please access this page through a secure connection.'
        };
      }

      if (!compatibility.hasMediaDevices) {
        return {
          success: false,
          error: 'MediaDevices not supported',
          details: 'Your browser doesn\'t support microphone access APIs.'
        };
      }

      // Test actual microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
        return {
          success: true,
          details: `Microphone access successful in ${compatibility.browserInfo}`
        };
      } catch (micError: any) {
        let errorDetails = 'Unknown microphone error';
        
        if (micError.name === 'NotAllowedError') {
          errorDetails = 'Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow access.';
        } else if (micError.name === 'NotFoundError') {
          errorDetails = 'No microphone found. Please connect a microphone and try again.';
        } else if (micError.name === 'NotReadableError') {
          errorDetails = 'Microphone is being used by another application. Please close other apps using the microphone.';
        } else if (micError.name === 'OverconstrainedError') {
          errorDetails = 'Microphone constraints not supported.';
        }

        return {
          success: false,
          error: micError.name,
          details: errorDetails
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: 'Test failed',
        details: `Microphone test failed: ${error.message}`
      };
    }
  }
}

// Global instance
let speechServiceInstance: SpeechService | null = null;

export const getSpeechService = (config?: Partial<SpeechServiceConfig>): SpeechService => {
  if (!speechServiceInstance) {
    speechServiceInstance = new SpeechService(config);
  }
  return speechServiceInstance;
};