/**
 * Socket.IO Signaling Client
 * 
 * Wrapper cho Socket.IO client để giao tiếp với signaling server
 */
/// <reference types="vite/client" />

import { io, Socket } from 'socket.io-client';
import type { SignalingEvents } from '../types';

// URL từ environment variable (cho production) hoặc localhost (cho development)
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export class SignalingClient {
    private socket: Socket;
    private eventHandlers: Partial<SignalingEvents> = {};

    constructor() {
        this.socket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.setupSocketEvents();
        console.log('🔌 Connecting to signaling server:', SERVER_URL);
    }

    private setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to signaling server, socket ID:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from signaling server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
        });

        // Relay các events về WebRTC
        this.socket.on('user-joined', (data) => {
            console.log('👤 User joined:', data.userId);
            this.eventHandlers['user-joined']?.(data);
        });

        this.socket.on('user-already-in-room', (data) => {
            console.log('👤 User already in room:', data.userId);
            this.eventHandlers['user-already-in-room']?.(data);
        });

        this.socket.on('user-left', (data) => {
            console.log('👋 User left:', data.userId);
            this.eventHandlers['user-left']?.(data);
        });

        this.socket.on('webrtc-offer', (data) => {
            console.log('📥 Received WebRTC offer from:', data.userId);
            this.eventHandlers['webrtc-offer']?.(data);
        });

        this.socket.on('webrtc-answer', (data) => {
            console.log('📥 Received WebRTC answer from:', data.userId);
            this.eventHandlers['webrtc-answer']?.(data);
        });

        this.socket.on('ice-candidate', (data) => {
            console.log('🧊 Received ICE candidate from:', data.userId);
            this.eventHandlers['ice-candidate']?.(data);
        });
    }

    /**
     * Đăng ký event handlers
     */
    on<K extends keyof SignalingEvents>(event: K, handler: SignalingEvents[K]) {
        this.eventHandlers[event] = handler;
    }

    /**
     * Join room
     */
    joinRoom(roomId: string) {
        console.log('📥 Joining room:', roomId);
        this.socket.emit('join-room', roomId);
    }

    /**
     * Leave room
     */
    leaveRoom(roomId: string) {
        console.log('📤 Leaving room:', roomId);
        this.socket.emit('leave-room', roomId);
    }

    /**
     * Gửi WebRTC offer
     */
    sendOffer(offer: RTCSessionDescriptionInit, targetUserId: string) {
        console.log('📤 Sending offer to:', targetUserId);
        this.socket.emit('webrtc-offer', { offer, targetUserId });
    }

    /**
     * Gửi WebRTC answer
     */
    sendAnswer(answer: RTCSessionDescriptionInit, targetUserId: string) {
        console.log('📤 Sending answer to:', targetUserId);
        this.socket.emit('webrtc-answer', { answer, targetUserId });
    }

    /**
     * Gửi ICE candidate
     */
    sendIceCandidate(candidate: RTCIceCandidate, targetUserId: string) {
        console.log('📤 Sending ICE candidate to:', targetUserId);
        this.socket.emit('ice-candidate', {
            candidate: candidate.toJSON(),
            targetUserId
        });
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.socket.disconnect();
        console.log('🔌 Signaling client disconnected');
    }

    /**
     * Lấy socket ID
     */
    get id(): string | undefined {
        return this.socket.id;
    }

    /**
     * Check connection status
     */
    get connected(): boolean {
        return this.socket.connected;
    }
}
