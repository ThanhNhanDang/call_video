/**
 * TypeScript Type Definitions
 */

export type FilterType = 'none' | 'beauty' | 'blur' | 'glasses';

export interface PeerConnectionConfig {
    iceServers: RTCIceServer[];
}

export interface SignalingEvents {
    'user-joined': (data: { userId: string }) => void;
    'user-already-in-room': (data: { userId: string }) => void;
    'user-left': (data: { userId: string }) => void;
    'webrtc-offer': (data: { offer: RTCSessionDescriptionInit; userId: string }) => void;
    'webrtc-answer': (data: { answer: RTCSessionDescriptionInit; userId: string }) => void;
    'ice-candidate': (data: { candidate: RTCIceCandidateInit; userId: string }) => void;
}

export interface MediaDevices {
    audioInput: MediaDeviceInfo[];
    audioOutput: MediaDeviceInfo[];
    videoInput: MediaDeviceInfo[];
}
