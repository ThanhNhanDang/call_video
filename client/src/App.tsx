/**
 * Main App Component
 */

import { useState } from 'react';
import { VideoCall } from './components/VideoCall';
import './index.css';

function App() {
    const [roomId, setRoomId] = useState('');
    const [inputRoomId, setInputRoomId] = useState('');
    const [inCall, setInCall] = useState(false);

    const handleJoinRoom = () => {
        if (inputRoomId.trim()) {
            setRoomId(inputRoomId.trim());
            setInCall(true);
        }
    };

    const handleLeaveRoom = () => {
        setInCall(false);
        setRoomId('');
        setInputRoomId('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleJoinRoom();
        }
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
                        1-1 Video calling with real-time camera filters
                    </p>

                    <div className="features">
                        <div className="feature">
                            <span className="feature-icon">✨</span>
                            <span className="feature-text">Beauty Filter</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">🌫️</span>
                            <span className="feature-text">Background Blur</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">🕶️</span>
                            <span className="feature-text">AR Overlay</span>
                        </div>
                    </div>

                    <div className="join-section">
                        <input
                            type="text"
                            className="room-input"
                            placeholder="Enter Room ID (e.g., meeting-123)"
                            value={inputRoomId}
                            onChange={(e) => setInputRoomId(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button
                            className="join-btn"
                            onClick={handleJoinRoom}
                            disabled={!inputRoomId.trim()}
                        >
                            🚀 Join Room
                        </button>
                    </div>

                    <div className="info-box">
                        <p className="info-text">
                            💡 <strong>Tip:</strong> Share the same room ID with a friend to start a video call
                        </p>
                    </div>
                </div>

                <footer className="footer">
                    <p>Built with WebRTC + MediaPipe + React</p>
                </footer>
            </div>
        </div>
    );
}

export default App;
