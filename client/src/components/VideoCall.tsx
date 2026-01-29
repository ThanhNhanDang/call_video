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
    // Removed unused state for renderer, pc, signaling (managed by refs)

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

    // Refs for objects that don't need to trigger re-renders
    const streamRef = useRef<MediaStream | null>(null);
    const rendererRef = useRef<CanvasRenderer | null>(null);
    const pcRef = useRef<PeerConnection | null>(null);
    const signalingRef = useRef<SignalingClient | null>(null);

    // Initialize camera and setup
    useEffect(() => {
        let mounted = true;

        async function setupCall() {
            try {
                // 1. Get user media
                const stream = await getUserMediaStream();
                if (!mounted) {
                    stopMediaStream(stream);
                    return;
                }

                streamRef.current = stream;
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
                // Start filtering immediately if possible
                if (canvasRef.current && localVideoRef.current && mounted) {
                    const canvasRenderer = new CanvasRenderer(canvasRef.current, localVideoRef.current);
                    await canvasRenderer.initialize();
                    canvasRenderer.start();

                    rendererRef.current = canvasRenderer;
                    // setRenderer(canvasRenderer); // Removed

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

                    pcRef.current = pc;
                    // setPeerConnection(pc); // Removed

                    // 5. Setup signaling client
                    const signaling = new SignalingClient();

                    signaling.on('user-joined', async ({ userId }) => {
                        console.log('👤 Peer joined, creating offer');
                        updatePeerUserId(userId);

                        // Người join sau sẽ tạo offer
                        if (pcRef.current) {
                            const offer = await pcRef.current.createOffer();
                            signaling.sendOffer(offer, userId);
                        }
                    });

                    signaling.on('user-already-in-room', async ({ userId }) => {
                        console.log('👤 Peer already in room');
                        updatePeerUserId(userId);
                        // Chờ offer từ peer
                    });

                    signaling.on('webrtc-offer', async ({ offer, userId }) => {
                        console.log('📥 Received offer, creating answer');
                        updatePeerUserId(userId);

                        if (pcRef.current) {
                            await pcRef.current.setRemoteDescription(offer);
                            const answer = await pcRef.current.createAnswer();
                            signaling.sendAnswer(answer, userId);
                        }
                    });

                    signaling.on('webrtc-answer', async ({ answer }) => {
                        console.log('📥 Received answer');
                        if (pcRef.current) {
                            await pcRef.current.setRemoteDescription(answer);
                        }
                    });

                    signaling.on('ice-candidate', async ({ candidate }) => {
                        console.log('🧊 Received ICE candidate');
                        if (pcRef.current) {
                            await pcRef.current.addIceCandidate(candidate);
                        }
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

                    signalingRef.current = signaling;
                    // setSignalingClient(signaling); // Removed

                    // 6. Join room
                    signaling.joinRoom(roomId);
                }
            } catch (error) {
                console.error('❌ Error setting up call:', error);
                if (mounted) {
                    alert('Lỗi khởi tạo cuộc gọi: ' + error);
                    onLeave();
                }
            }
        }

        setupCall();

        // Consolidated Cleanup
        return () => {
            mounted = false;
            console.log('🧹 Cleaning up component resources');

            // Cleanup Renderer
            if (rendererRef.current) {
                rendererRef.current.destroy();
                rendererRef.current = null;
            }

            // Cleanup PeerConnection
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }

            // Cleanup Signaling
            if (signalingRef.current) {
                signalingRef.current.leaveRoom(roomId);
                signalingRef.current.disconnect();
                signalingRef.current = null;
            }

            // Cleanup Media Stream
            if (streamRef.current) {
                stopMediaStream(streamRef.current);
                streamRef.current = null;
            }

            // Note: We don't need to manually clear state (setLocalStream(null)) because the component is unmounting
        };
    }, [roomId, onLeave]); // Only restart if room changes

    // Handle filter change
    const handleFilterChange = (filter: FilterType) => {
        setCurrentFilter(filter);
        if (rendererRef.current) {
            rendererRef.current.setFilter(filter);
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
        if (signalingRef.current) {
            signalingRef.current.leaveRoom(roomId);
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
