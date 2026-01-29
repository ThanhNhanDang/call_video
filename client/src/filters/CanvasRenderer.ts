/**
 * Canvas Filter Renderer
 * 
 * Render video với filters bằng Canvas API
 * Hỗ trợ: Beauty, Background Blur, AR Glasses
 */

import type { FilterType } from '../types';
import { MediaPipeFilter } from './MediaPipeFilter';

export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private videoElement: HTMLVideoElement;
    private mediaPipe: MediaPipeFilter;

    private currentFilter: FilterType = 'none';
    private animationFrameId: number | null = null;
    private isProcessing = false;

    // Cache cho segmentation mask
    private segmentationMask: ImageData | null = null;
    private faceLandmarks: any[] = [];

    // Glasses image cho AR filter
    private glassesImage: HTMLImageElement | null = null;

    constructor(
        canvas: HTMLCanvasElement,
        videoElement: HTMLVideoElement
    ) {
        this.canvas = canvas;
        this.videoElement = videoElement;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = ctx;

        this.mediaPipe = new MediaPipeFilter();

        // Load glasses image cho AR filter
        this.loadGlassesImage();
    }

    private loadGlassesImage() {
        this.glassesImage = new Image();
        // Sử dụng một simple SVG glasses
        this.glassesImage.src = 'data:image/svg+xml;base64,' + btoa(`
      <svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(0,0,0,0.1);stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Left lens -->
        <ellipse cx="50" cy="40" rx="35" ry="25" fill="url(#glassGrad)" stroke="#333" stroke-width="3"/>
        <!-- Right lens -->
        <ellipse cx="150" cy="40" rx="35" ry="25" fill="url(#glassGrad)" stroke="#333" stroke-width="3"/>
        <!-- Bridge -->
        <line x1="85" y1="40" x2="115" y2="40" stroke="#333" stroke-width="3"/>
        <!-- Left temple -->
        <line x1="15" y1="40" x2="5" y2="45" stroke="#333" stroke-width="3"/>
        <!-- Right temple -->
        <line x1="185" y1="40" x2="195" y2="45" stroke="#333" stroke-width="3"/>
      </svg>
    `);
    }

    async initialize() {
        await this.mediaPipe.initialize();
        console.log('✅ Canvas renderer initialized');
    }

    /**
     * Set filter type
     */
    setFilter(filter: FilterType) {
        this.currentFilter = filter;
        console.log('🎨 Filter changed to:', filter);
    }

    /**
     * Bắt đầu rendering loop
     */
    start() {
        if (this.animationFrameId) return;

        console.log('▶️ Starting canvas rendering');
        this.renderLoop();
    }

    /**
     * Dừng rendering loop
     */
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            console.log('⏸️ Stopped canvas rendering');
        }
    }

    /**
     * Main rendering loop
     */
    private async renderLoop() {
        if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
            // Set canvas size to match video
            if (this.canvas.width !== this.videoElement.videoWidth) {
                this.canvas.width = this.videoElement.videoWidth;
                this.canvas.height = this.videoElement.videoHeight;
            }

            // Process frame based on filter
            await this.processFrame();
        }

        this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
    }

    /**
     * Xử lý frame dựa trên filter hiện tại
     */
    private async processFrame() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            switch (this.currentFilter) {
                case 'none':
                    this.renderNoFilter();
                    break;
                case 'beauty':
                    await this.renderBeautyFilter();
                    break;
                case 'blur':
                    await this.renderBackgroundBlur();
                    break;
                case 'glasses':
                    await this.renderARGlasses();
                    break;
            }
        } catch (error) {
            console.error('Error processing frame:', error);
            this.renderNoFilter(); // Fallback
        }

        this.isProcessing = false;
    }

    /**
     * Render video không có filter
     */
    private renderNoFilter() {
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Beauty Filter - Skin smoothing effect
     */
    private async renderBeautyFilter() {
        // Draw video
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Simple bilateral filter approximation for skin smoothing
        // Áp dụng blur nhẹ
        const blurRadius = 2;
        const original = new Uint8ClampedArray(data);

        for (let y = blurRadius; y < this.canvas.height - blurRadius; y++) {
            for (let x = blurRadius; x < this.canvas.width - blurRadius; x++) {
                let r = 0, g = 0, b = 0, count = 0;

                // Sample pixels trong blur radius
                for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                    for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                        const idx = ((y + dy) * this.canvas.width + (x + dx)) * 4;
                        r += original[idx];
                        g += original[idx + 1];
                        b += original[idx + 2];
                        count++;
                    }
                }

                const idx = (y * this.canvas.width + x) * 4;
                // Mix original với blurred (70% original, 30% blur)
                data[idx] = original[idx] * 0.7 + (r / count) * 0.3;
                data[idx + 1] = original[idx + 1] * 0.7 + (g / count) * 0.3;
                data[idx + 2] = original[idx + 2] * 0.7 + (b / count) * 0.3;
            }
        }

        // Tăng brightness nhẹ
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * 1.1);
            data[i + 1] = Math.min(255, data[i + 1] * 1.1);
            data[i + 2] = Math.min(255, data[i + 2] * 1.1);
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Background Blur Filter - Sử dụng segmentation mask
     */
    private async renderBackgroundBlur() {
        await this.mediaPipe.processSegmentation(this.videoElement, (results: any) => {
            this.segmentationMask = results.segmentationMask;
        });

        if (!this.segmentationMask) {
            this.renderNoFilter();
            return;
        }

        // Draw original video
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw blurred background
        this.ctx.filter = 'blur(10px)';
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

        // Draw foreground (person) over it using mask
        this.ctx.filter = 'none';
        this.ctx.globalCompositeOperation = 'destination-in';

        // Create temporary canvas for mask
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(this.segmentationMask, 0, 0);

        this.ctx.drawImage(tempCanvas, 0, 0, this.canvas.width, this.canvas.height);

        // Draw sharp foreground
        this.ctx.globalCompositeOperation = 'destination-over';
        this.ctx.filter = 'blur(10px)';
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

        this.ctx.restore();
    }

    /**
     * AR Glasses Filter - Overlay kính lên mặt
     */
    private async renderARGlasses() {
        // Draw video
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

        // Get face landmarks
        await this.mediaPipe.processFaceMesh(this.videoElement, (results: any) => {
            this.faceLandmarks = results.multiFaceLandmarks || [];
        });

        if (this.faceLandmarks.length === 0 || !this.glassesImage) {
            return;
        }

        // Lấy face landmarks đầu tiên
        const landmarks = this.faceLandmarks[0];

        // Tính toán vị trí và kích thước kính
        // Landmarks: 33 = left eye inner, 133 = left eye outer
        // 362 = right eye inner, 263 = right eye outer
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        if (!leftEye || !rightEye) return;

        const eyeDistance = Math.sqrt(
            Math.pow((rightEye.x - leftEye.x) * this.canvas.width, 2) +
            Math.pow((rightEye.y - leftEye.y) * this.canvas.height, 2)
        );

        const centerX = ((leftEye.x + rightEye.x) / 2) * this.canvas.width;
        const centerY = ((leftEye.y + rightEye.y) / 2) * this.canvas.height;

        const glassesWidth = eyeDistance * 1.8;
        const glassesHeight = glassesWidth * 0.4;

        // Draw glasses
        this.ctx.save();
        this.ctx.globalAlpha = 0.8;
        this.ctx.drawImage(
            this.glassesImage,
            centerX - glassesWidth / 2,
            centerY - glassesHeight / 2,
            glassesWidth,
            glassesHeight
        );
        this.ctx.restore();
    }

    /**
     * Lấy output stream từ canvas
     */
    getOutputStream(frameRate: number = 30): MediaStream {
        return this.canvas.captureStream(frameRate);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        this.mediaPipe.close();
        console.log('🗑️ Canvas renderer destroyed');
    }
}
