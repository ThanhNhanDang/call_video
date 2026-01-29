/**
 * WebRTC Peer Connection Wrapper
 * 
 * Quản lý RTCPeerConnection cho video call 1-1
 */

import type { PeerConnectionConfig } from '../types';

export class PeerConnection {
    private pc: RTCPeerConnection;
    private localStream: MediaStream | null = null;

    // Callbacks
    public onTrack?: (stream: MediaStream) => void;
    public onIceCandidate?: (candidate: RTCIceCandidate) => void;
    public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

    constructor(config?: PeerConnectionConfig) {
        // Sử dụng Google STUN server
        const defaultConfig: RTCConfiguration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ],
            ...config
        };

        this.pc = new RTCPeerConnection(defaultConfig);
        this.setupEventHandlers();

        console.log('🔗 RTCPeerConnection created');
    }

    private setupEventHandlers() {
        // ICE candidate event
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 New ICE candidate:', event.candidate.candidate);
                this.onIceCandidate?.(event.candidate);
            }
        };

        // Track event - nhận remote stream
        this.pc.ontrack = (event) => {
            console.log('📺 Remote track received:', event.track.kind);
            const [remoteStream] = event.streams;
            this.onTrack?.(remoteStream);
        };

        // Connection state change
        this.pc.onconnectionstatechange = () => {
            const state = this.pc.connectionState;
            console.log(`🔄 Connection state: ${state}`);
            this.onConnectionStateChange?.(state);
        };

        // ICE connection state
        this.pc.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE connection state: ${this.pc.iceConnectionState}`);
        };
    }

    /**
     * Thêm local stream vào peer connection
     */
    addStream(stream: MediaStream) {
        this.localStream = stream;

        stream.getTracks().forEach(track => {
            this.pc.addTrack(track, stream);
            console.log(`➕ Added ${track.kind} track to peer connection`);
        });
    }

    /**
     * Tạo SDP offer
     */
    async createOffer(): Promise<RTCSessionDescriptionInit> {
        try {
            const offer = await this.pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await this.pc.setLocalDescription(offer);
            console.log('📤 Created and set local offer');

            return offer;
        } catch (error) {
            console.error('❌ Error creating offer:', error);
            throw error;
        }
    }

    /**
     * Tạo SDP answer
     */
    async createAnswer(): Promise<RTCSessionDescriptionInit> {
        try {
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            console.log('📤 Created and set local answer');

            return answer;
        } catch (error) {
            console.error('❌ Error creating answer:', error);
            throw error;
        }
    }

    /**
     * Set remote description (offer hoặc answer từ peer)
     */
    async setRemoteDescription(description: RTCSessionDescriptionInit) {
        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(description));
            console.log(`📥 Set remote ${description.type}`);
        } catch (error) {
            console.error('❌ Error setting remote description:', error);
            throw error;
        }
    }

    /**
     * Thêm ICE candidate từ peer
     */
    async addIceCandidate(candidate: RTCIceCandidateInit) {
        try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('🧊 Added ICE candidate');
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
            throw error;
        }
    }

    /**
     * Đóng peer connection
     */
    close() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        this.pc.close();
        console.log('🔌 Peer connection closed');
    }

    /**
     * Lấy connection stats
     */
    async getStats(): Promise<RTCStatsReport> {
        return await this.pc.getStats();
    }
}
