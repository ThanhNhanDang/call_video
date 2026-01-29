/**
 * Video Call Component
 * Main UI cho video call interface
 */

import { useEffect, useRef, useState } from 'react';
import { FilterType } from '../types';
import { getUserMediaStream, stopMediaStream } from '../utils/mediaUtils';
import { CanvasRenderer } from '../filters/CanvasRenderer';
import { PeerConnection } from '../webrtc/PeerConnection';
import { SignalingClient } from '../webrtc/SignalingClient';
import { FilterSelector } from './FilterSelector';

interface VideoCallProps {
    roomId: string;
    onLeave: () => void;
}

// Helper function to safely play video
const safePlay = async (video: HTMLVideoElement | null) => {
    if (!video) return;
    try {
        // Only play if not already playing or to handle new source
        await video.play();
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('🎥 Playback interrupted (AbortError), safe to ignore');
        } else {
            console.error('❌ Error playing video:', error);
        }
    }
};

export function VideoCall({ roomId, onLeave }: VideoCallProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
    const [peerConnection, setPeerConnection] = useState<PeerConnection | null>(null);
    const [signalingClient, setSignalingClient] = useState<SignalingClient | null>(null);

    const [currentFilter, setCurrentFilter] = useState<FilterType>('none');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [connectionState, setConnectionState] = useState<string>('connecting');
    const [peerUserId, setPeerUserId] = useState<string | null>(null);
    const peerUserIdRef = useRef<string | null>(null);

    const updatePeerUserId = (id: string | null) => {
        setPeerUserId(id);
        peerUserIdRef.current = id;
    };

    // Initialize camera and setup
    useEffect(() => {
        let mounted = true;

        async function setupCall() {
            try {
                // 1. Get user media
                const stream = await getUserMediaStream();
                if (!mounted) return;

                setLocalStream(stream);

                // 2. Setup video element and wait for it to be ready
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                    await safePlay(localVideoRef.current);

                    // Wait for video to have dimensions
                    if (localVideoRef.current.readyState < 2) { // HAVE_CURRENT_DATA
                        await new Promise(resolve => {
                            if (localVideoRef.current) {
                                localVideoRef.current.onloadeddata = resolve;
                            } else {
                                resolve(null);
                            }
                        });
                    }
                }

                // 3. Setup canvas renderer
                if (canvasRef.current && localVideoRef.current && mounted) {
                    const canvasRenderer = new CanvasRenderer(canvasRef.current, localVideoRef.current);
                    await canvasRenderer.initialize();
                    canvasRenderer.start();
                    setRenderer(canvasRenderer);

                    // 4. Setup WebRTC peer connection với filtered stream
                    // Wait a bit to ensure the first frame is rendered
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const filteredStream = canvasRenderer.getOutputStream(30);

                    // Thêm audio tracks từ original stream
                    stream.getAudioTracks().forEach(track => {
                        filteredStream.addTrack(track);
                    });

                    const pc = new PeerConnection();
                    pc.addStream(filteredStream);

                    pc.onTrack = (remoteStream) => {
                        console.log('📺 Received remote stream');
                        setRemoteStream(remoteStream);
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                            safePlay(remoteVideoRef.current);
                        }
                    };

                    pc.onConnectionStateChange = (state) => {
                        setConnectionState(state);
                    };

                    setPeerConnection(pc);

                    // 5. Setup signaling client
                    const signaling = new SignalingClient();

                    signaling.on('user-joined', async ({ userId }) => {
                        console.log('👤 Peer joined, creating offer');
                        updatePeerUserId(userId);

                        // Người join sau sẽ tạo offer
                        const offer = await pc.createOffer();
                        signaling.sendOffer(offer, userId);
                    });

                    signaling.on('user-already-in-room', async ({ userId }) => {
                        console.log('👤 Peer already in room');
                        updatePeerUserId(userId);
                        // Chờ offer từ peer
                    });

                    signaling.on('webrtc-offer', async ({ offer, userId }) => {
                        console.log('📥 Received offer, creating answer');
                        updatePeerUserId(userId);

                        await pc.setRemoteDescription(offer);
                        const answer = await pc.createAnswer();
                        signaling.sendAnswer(answer, userId);
                    });

                    signaling.on('webrtc-answer', async ({ answer }) => {
                        console.log('📥 Received answer');
                        await pc.setRemoteDescription(answer);
                    });

                    signaling.on('ice-candidate', async ({ candidate }) => {
                        console.log('🧊 Received ICE candidate');
                        await pc.addIceCandidate(candidate);
                    });

                    signaling.on('user-left', () => {
                        console.log('👋 Peer left');
                        setRemoteStream(null);
                        updatePeerUserId(null);
                        setConnectionState('disconnected');
                    });

                    pc.onIceCandidate = (candidate) => {
                        if (peerUserIdRef.current) {
                            signaling.sendIceCandidate(candidate, peerUserIdRef.current);
                        } else {
                            console.log('⏳ ICE candidate generated but peer not identified yet');
                        }
                    };

                    setSignalingClient(signaling);

                    // 6. Join room
                    signaling.joinRoom(roomId);

                }
            } catch (error) {
                console.error('❌ Error setting up call:', error);
                alert(error);
                onLeave();
            }
        }

        setupCall();

        return () => {
            mounted = false;
        };
    }, [roomId, onLeave]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (renderer) {
                renderer.destroy();
            }
            if (peerConnection) {
                peerConnection.close();
            }
            if (signalingClient) {
                signalingClient.leaveRoom(roomId);
                signalingClient.disconnect();
            }
            if (localStream) {
                stopMediaStream(localStream);
            }
        };
    }, [renderer, peerConnection, signalingClient, localStream, roomId]);

    // Handle filter change
    const handleFilterChange = (filter: FilterType) => {
        setCurrentFilter(filter);
        if (renderer) {
            renderer.setFilter(filter);
        }
    };

    // Toggle mute
    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Toggle video
    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    // Leave call
    const handleLeave = () => {
        if (signalingClient) {
            signalingClient.leaveRoom(roomId);
        }
        onLeave();
    };

    return (
        <div className="video-call">
            <div className="video-header">
                <h2>📞 Cuộc gọi video - Phòng: {roomId}</h2>
                <div className="connection-status">
                    <span className={`status-indicator ${connectionState}`}></span>
                    <span className="status-text">
                        {connectionState} {peerUserId && `(Đang gọi với: ${peerUserId.slice(0, 5)}...)`}
                    </span>
                </div>
            </div>

            <div className="video-container">
                {/* Remote Video - Main */}
                <div className="remote-video-wrapper">
                    <video
                        ref={remoteVideoRef}
                        className="remote-video"
                        autoPlay
                        playsInline
                    />
                    {!remoteStream && (
                        <div className="waiting-peer">
                            <div className="spinner"></div>
                            <p>Đang chờ người khác tham gia...</p>
                        </div>
                    )}
                </div>

                {/* Local Video - Picture in Picture */}
                <div className="local-video-wrapper">
                    <canvas ref={canvasRef} className="local-canvas" />
                    <video
                        ref={localVideoRef}
                        className="local-video-hidden"
                        autoPlay
                        playsInline
                        muted
                    />
                    <div className="local-label">Bạn</div>
                </div>
            </div>

            {/* Controls */}
            <div className="controls-panel">
                <FilterSelector
                    currentFilter={currentFilter}
                    onFilterChange={handleFilterChange}
                />

                <div className="call-controls">
                    <button
                        className={`control-btn ${isMuted ? 'muted' : ''}`}
                        onClick={toggleMute}
                        title={isMuted ? 'Bật micro' : 'Tắt micro'}
                    >
                        {isMuted ? '🔇' : '🎤'}
                    </button>

                    <button
                        className={`control-btn ${isVideoOff ? 'video-off' : ''}`}
                        onClick={toggleVideo}
                        title={isVideoOff ? 'Bật camera' : 'Tắt camera'}
                    >
                        {isVideoOff ? '📷' : '📹'}
                    </button>

                    <button
                        className="control-btn leave-btn"
                        onClick={handleLeave}
                        title="Rời cuộc gọi"
                    >
                        📞 Rời phòng
                    </button>
                </div>
            </div>
        </div>
    );
}
