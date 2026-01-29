# WebRTC Video Call với Real-time Camera Filters

Ứng dụng video call 1-1 sử dụng WebRTC P2P, tích hợp filters camera real-time bằng MediaPipe.

## ✨ Tính Năng

- 📹 **Video Call 1-1** - P2P connection không cần media server
- 🎨 **Real-time Filters**:
  - ✨ Beauty Filter (làm mịn da)
  - 🌫️ Background Blur (làm mờ background)
  - 🕶️ AR Glasses (overlay kính)
- 🎤 **Điều khiển hoàn chỉnh** - Bật/tắt mic, camera
- 🌐 **Chạy trên browser** - Không cần cài đặt app

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Browser A     │         │ Signaling Server │         │   Browser B     │
│                 │         │   (Socket.IO)    │         │                 │
│  Camera/Mic     │         │                  │         │  Camera/Mic     │
│       ↓         │         │  - Room Manager  │         │       ↓         │
│  MediaPipe      │         │  - SDP Relay     │         │  MediaPipe      │
│       ↓         │◄───────►│  - ICE Relay     │◄───────►│       ↓         │
│  Canvas Filter  │         │                  │         │  Canvas Filter  │
│       ↓         │         └──────────────────┘         │       ↓         │
│  WebRTC Peer    │◄────────────────────────────────────►│  WebRTC Peer    │
└─────────────────┘      P2P Video/Audio Stream          └─────────────────┘
```

### Luồng WebRTC

1. **User A** và **User B** đều join cùng room ID
2. Signaling server notify User B có người mới join
3. **User B** tạo SDP offer → gửi qua Socket.IO → User A
4. **User A** nhận offer, tạo SDP answer → gửi về User B
5. Trao đổi **ICE candidates** để tìm đường kết nối tốt nhất
6. **P2P connection** được thiết lập, video/audio truyền trực tiếp

## 📦 Tech Stack

### Backend
- Node.js + Express
- Socket.IO (signaling server)

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- WebRTC API
- MediaPipe (Selfie Segmentation + Face Mesh)
- Canvas API

## 🚀 Hướng Dẫn Chạy Local

### Bước 1: Clone & Cài Đặt

```bash
# Clone project (nếu có git repository)
# hoặc đảm bảo bạn đã có folder structure

cd d:\workspaces\Project
```

### Bước 2: Cài Đặt Backend

```bash
cd server
npm install
```

### Bước 3: Cài Đặt Frontend

```bash
cd ../client
npm install
```

### Bước 4: Chạy Backend Server

Mở terminal mới:

```bash
cd d:\workspaces\Project\server
npm start
```

Server sẽ chạy tại: `http://localhost:3001`

### Bước 5: Chạy Frontend Client

Mở terminal mới (khác với backend):

```bash
cd d:\workspaces\Project\client
npm run dev
```

Client sẽ chạy tại: `http://localhost:5173`

### Bước 6: Test Video Call

1. Mở browser tại `http://localhost:5173`
2. Browser sẽ yêu cầu quyền camera/microphone → Click **Allow**
3. Nhập Room ID (ví dụ: `test-room-123`) → Click **Join Room**
4. Mở **tab mới** hoặc **browser khác** tại `http://localhost:5173`
5. Nhập **cùng Room ID** (`test-room-123`) → Click **Join Room**
6. ✅ Video call sẽ bắt đầu!

## 🎨 Sử Dụng Filters

Sau khi vào room, bạn sẽ thấy 4 filter options:

- **None (🚫)** - Không filter, video gốc
- **Beauty (✨)** - Làm mịn da, tăng sáng nhẹ
- **Blur BG (🌫️)** - Làm mờ background, giữ người rõ nét
- **Glasses (🕶️)** - Overlay kính AR lên mặt

Click vào filter để chuyển đổi real-time!

## 🎛️ Điều Khiển

- **🎤 Mute/Unmute** - Bật/tắt microphone
- **📹 Camera On/Off** - Bật/tắt camera
- **📞 Leave** - Rời khỏi room

## 🧪 Giải Thích Chi Tiết

### 1. WebRTC P2P Connection

WebRTC cho phép kết nối trực tiếp giữa 2 browsers mà không cần server trung gian để truyền video/audio:

```typescript
// Tạo peer connection
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }  // Google STUN server
  ]
});

// Thêm local stream
localStream.getTracks().forEach(track => {
  pc.addTrack(track, localStream);
});

// Nhận remote stream
pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
};
```

### 2. Signaling với Socket.IO

Socket.IO được dùng để trao đổi metadata (SDP, ICE) giữa peers:

```typescript
// User A nhận offer từ User B
socket.on('webrtc-offer', async ({ offer, userId }) => {
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('webrtc-answer', { answer, targetUserId: userId });
});
```

### 3. MediaPipe Filters

#### Beauty Filter
- Sử dụng **bilateral filter approximation**
- Blur nhẹ + blend với original (70%/30%)
- Tăng brightness 10%

#### Background Blur
- **MediaPipe Selfie Segmentation** tạo segmentation mask
- Blur toàn bộ video
- Overlay foreground (người) từ mask lên trên

#### AR Glasses
- **MediaPipe Face Mesh** phát hiện 468 face landmarks
- Tính toán vị trí mắt từ landmarks #33 và #263
- Scale và overlay glasses SVG

### 4. Canvas Rendering Pipeline

```
Camera Input → MediaPipe Processing → Canvas Filter → Canvas Output Stream → WebRTC
```

Canvas chạy ở **30 FPS**, mỗi frame:
1. Draw video lên canvas
2. Apply filter (beauty/blur/AR)
3. `captureStream()` từ canvas → filtered video stream
4. Stream này được gửi qua WebRTC

## 🔧 Cấu Trúc Project

```
Project/
├── server/
│   ├── package.json          # Backend dependencies
│   ├── index.js              # Express + Socket.IO server
│   └── socket.js             # Signaling handlers
│
└── client/
    ├── package.json          # Frontend dependencies
    ├── index.html            # HTML template
    ├── vite.config.ts        # Vite configuration
    ├── src/
    │   ├── main.tsx          # React entry point
    │   ├── App.tsx           # Main app component
    │   ├── index.css         # Styles (dark theme + glassmorphism)
    │   ├── types/
    │   │   └── index.ts      # TypeScript types
    │   ├── utils/
    │   │   └── mediaUtils.ts # Camera/mic helpers
    │   ├── webrtc/
    │   │   ├── PeerConnection.ts      # WebRTC wrapper
    │   │   └── SignalingClient.ts     # Socket.IO client
    │   ├── filters/
    │   │   ├── MediaPipeFilter.ts     # MediaPipe integration
    │   │   └── CanvasRenderer.ts      # Canvas filter renderer
    │   └── components/
    │       ├── FilterSelector.tsx     # Filter UI
    │       └── VideoCall.tsx          # Video call UI
```

## 🐛 Troubleshooting

### Camera/Microphone không hoạt động

- Đảm bảo browser có quyền truy cập camera/mic
- Chrome/Edge: Click icon khóa bên trái URL → cho phép camera/mic
- Firefox: Click icon camera trong address bar
- Safari: Preferences → Websites → Camera/Microphone

### Video call không kết nối

- Kiểm tra backend server đang chạy (`http://localhost:3001/health`)
- Check browser console (F12) xem có lỗi
- Đảm bảo cả 2 browsers đều join **cùng Room ID**
- Thử refresh browser

### Filter chậm/lag

- MediaPipe cần thời gian initialize lần đầu
- Beauty filter nhanh nhất (pure canvas)
- Background blur & AR cần MediaPipe (chậm hơn)
- Performance phụ thuộc vào CPU/GPU

### Safari không hoạt động

- Safari yêu cầu HTTPS cho `getUserMedia`
- Để test local, dùng:
  - `ngrok` để tạo HTTPS tunnel
  - `mkcert` để tạo self-signed certificate

## 📈 Mở Rộng / Tối Ưu

### Thêm TURN Server (cho mạng khó)

Một số mạng bị firewall/NAT nghiêm ngặt, P2P không kết nối được. Cần TURN server:

```typescript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
};
```

Free TURN servers: Xirsys, Metered.ca

### Thêm Filters Khác

- **Face Swap** - Sử dụng Face Mesh + texture mapping
- **Color Grading** - Adjust hue/saturation/brightness
- **Virtual Background** - Replace background với image/video
- **3D Masks** - THREE.js + Face Mesh

### Deploy Production

#### Backend
- Deploy lên Heroku/Railway/Render
- Set environment variable `PORT`
- Enable CORS cho frontend domain

#### Frontend
- Build: `npm run build`
- Deploy lên Vercel/Netlify/Cloudflare Pages
- Update `SERVER_URL` trong `SignalingClient.ts`

### Tối Ưu Performance

- Giảm Canvas resolution cho mobile
- Throttle filter processing (skip frames)
- Lazy load MediaPipe models
- Web Worker cho filter processing

## 📄 License

MIT License - Free to use for personal and commercial projects

## 🙏 Credits

- **WebRTC** - W3C Standard
- **MediaPipe** - Google AI
- **Socket.IO** - Real-time communication
- **React** - UI framework
- **Vite** - Build tool

---

**Chúc bạn tạo được ứng dụng video call tuyệt vời! 🚀**
