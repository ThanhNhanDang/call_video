/**
 * MediaPipe Filter Integration
 * 
 * Sử dụng MediaPipe từ CDN thay vì npm packages để tránh bundling issues
 */

// Declare global types for MediaPipe loaded from CDN
declare global {
    interface Window {
        SelfieSegmentation: any;
        FaceMesh: any;
    }
}

export class MediaPipeFilter {
    private selfieSegmentation: any | null = null;
    private faceMesh: any | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        console.log('🎨 Initializing MediaPipe filters...');

        try {
            // Load MediaPipe scripts from CDN if not already loaded
            await this.loadMediaPipeScripts();

            // Initialize Selfie Segmentation cho background blur
            this.selfieSegmentation = new window.SelfieSegmentation({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                }
            });

            this.selfieSegmentation.setOptions({
                modelSelection: 1, // 0: general model, 1: landscape model (better quality)
                selfieMode: true
            });

            // Initialize Face Mesh cho beauty filter và AR overlay
            this.faceMesh = new window.FaceMesh({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.isInitialized = true;
            console.log('✅ MediaPipe filters initialized');
        } catch (error) {
            console.error('❌ Error initializing MediaPipe:', error);
            throw error;
        }
    }

    /**
     * Load MediaPipe scripts from CDN
     */
    private async loadMediaPipeScripts(): Promise<void> {
        // Check if already loaded
        if (window.SelfieSegmentation && window.FaceMesh) {
            return;
        }

        // Load scripts
        await Promise.all([
            this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js'),
            this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js')
        ]);

        // Wait a bit for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Helper to load external script
     */
    private loadScript(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Xử lý segmentation cho background blur
     */
    async processSegmentation(
        videoElement: HTMLVideoElement,
        callback: (results: any) => void
    ) {
        if (!this.selfieSegmentation) {
            throw new Error('Selfie segmentation not initialized');
        }

        this.selfieSegmentation.onResults(callback);
        await this.selfieSegmentation.send({ image: videoElement });
    }

    /**
     * Xử lý face mesh cho beauty filter và AR
     */
    async processFaceMesh(
        videoElement: HTMLVideoElement,
        callback: (results: any) => void
    ) {
        if (!this.faceMesh) {
            throw new Error('Face mesh not initialized');
        }

        this.faceMesh.onResults(callback);
        await this.faceMesh.send({ image: videoElement });
    }

    /**
     * Cleanup resources
     */
    close() {
        this.selfieSegmentation?.close();
        this.faceMesh?.close();
        this.isInitialized = false;
        console.log('🗑️ MediaPipe filters closed');
    }
}
