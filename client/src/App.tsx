import { useState, useEffect } from 'react';
import { VideoCall } from './components/VideoCall';
import './index.css';

function App() {
    const [roomId, setRoomId] = useState('');
    const [inCall, setInCall] = useState(false);

    useEffect(() => {
        // Check URL for room param
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        if (roomParam) {
            setRoomId(roomParam);
            setInCall(true);
        }
    }, []);

    const handleStartNewCall = () => {
        // Generate random room ID (e.g., room-123456)
        const randomId = 'room-' + Math.floor(Math.random() * 1000000);
        const newUrl = window.location.pathname + '?room=' + randomId;
        window.history.pushState({ path: newUrl }, '', newUrl);

        setRoomId(randomId);
        setInCall(true);
    };

    const handleLeaveRoom = () => {
        setInCall(false);
        setRoomId('');
        // Clear URL
        window.history.pushState({}, '', window.location.pathname);
    };

    if (inCall && roomId) {
        return <VideoCall roomId={roomId} onLeave={handleLeaveRoom} />;
    }

    return (
        <div className="app">
            <div className="home-container">
                <div className="home-card">
                    <div className="logo">
                        <div className="logo-icon">📹</div>
                        <h1 className="logo-text">WebRTC Video Call</h1>
                    </div>

                    <p className="tagline">
                        Gọi video 1-1 với bộ lọc camera thời gian thực
                    </p>

                    <div className="join-section">
                        <button
                            className="join-btn"
                            onClick={handleStartNewCall}
                        >
                            🚀 Bắt đầu cuộc gọi mới
                        </button>
                    </div>

                    <div className="info-box">
                        <p className="info-text">
                            💡 <strong>Mẹo:</strong> Nhấn nút trên để tạo phòng, sau đó gửi link cho bạn bè
                        </p>
                    </div>
                </div>

                <footer className="footer">
                    <p>Được xây dựng với WebRTC + MediaPipe + React</p>
                </footer>
            </div>
        </div>
    );
}

export default App;
