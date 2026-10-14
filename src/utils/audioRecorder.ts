/**
 * Helper to record audio from user microphone and convert to base64
 */

export interface RecordedAudio {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationSeconds: number;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;

  async start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Seu navegador não possui suporte para gravação de áudio.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Choose supported MIME type
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else {
        mimeType = '';
      }
    }

    this.audioChunks = [];
    this.mediaRecorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(250);
  }

  async stop(): Promise<RecordedAudio> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Nenhuma gravação ativa.'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

          // Stop mic tracks
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }

          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            // extract base64 data after comma
            const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
            resolve({
              blob,
              base64,
              mimeType: mimeType.split(';')[0], // clean mimeType
              durationSeconds,
            });
          };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(blob);
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}
