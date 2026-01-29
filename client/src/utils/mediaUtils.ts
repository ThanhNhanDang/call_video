/**
 * Media Utilities
 * Helper functions cho camera/microphone access
 */

export async function getUserMediaStream(
    videoConstraints: MediaTrackConstraints = {},
    audioConstraints: MediaTrackConstraints = {}
): Promise<MediaStream> {
    try {
        const constraints: MediaStreamConstraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                ...videoConstraints
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                ...audioConstraints
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Media stream acquired:', {
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length
        });

        return stream;
    } catch (error) {
        console.error('❌ Error getting user media:', error);
        throw new Error(getMediaErrorMessage(error));
    }
}

export function stopMediaStream(stream: MediaStream | null) {
    if (!stream) return;

    stream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped track: ${track.kind}`);
    });
}

export async function enumerateDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        return {
            audioInput: devices.filter(d => d.kind === 'audioinput'),
            audioOutput: devices.filter(d => d.kind === 'audiooutput'),
            videoInput: devices.filter(d => d.kind === 'videoinput')
        };
    } catch (error) {
        console.error('❌ Error enumerating devices:', error);
        return { audioInput: [], audioOutput: [], videoInput: [] };
    }
}

function getMediaErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
        switch (error.name) {
            case 'NotFoundError':
                return 'Không tìm thấy camera hoặc microphone';
            case 'NotAllowedError':
                return 'Bạn cần cấp quyền truy cập camera và microphone';
            case 'NotReadableError':
                return 'Camera hoặc microphone đang được sử dụng bởi ứng dụng khác';
            case 'OverconstrainedError':
                return 'Không thể đáp ứng yêu cầu về chất lượng video/audio';
            default:
                return `Lỗi truy cập media: ${error.message}`;
        }
    }
    return 'Lỗi không xác định khi truy cập camera/microphone';
}
