/**
 * MediaPipe Filter Integration
 * 
 * Sử dụng MediaPipe Selfie Segmentation cho background blur
 * và Face Mesh cho beauty filter
 */

import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { FaceMesh } from '@mediapipe/face_mesh';

export class MediaPipeFilter {
    private selfieSegmentation: any | null = null;
    private faceMesh: any | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        console.log('🎨 Initializing MediaPipe filters...');

        try {
            // Initialize Selfie Segmentation cho background blur
            this.selfieSegmentation = new SelfieSegmentation({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                }
            });

            this.selfieSegmentation.setOptions({
                modelSelection: 1, // 0: general model, 1: landscape model (better quality)
                selfieMode: true
            });

            // Initialize Face Mesh cho beauty filter và AR overlay
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
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
