/**
 * Socket.IO Event Handlers cho WebRTC Signaling
 * 
 * Luồng hoạt động:
 * 1. User A và User B đều join cùng một room
 * 2. User B (người join sau) tạo offer và gửi cho User A
 * 3. User A nhận offer, tạo answer và gửi lại User B
 * 4. Trao đổi ICE candidates để thiết lập P2P connection
 */

// Lưu trữ rooms và users
const rooms = new Map();

export function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.id}`);

        /**
         * JOIN ROOM
         * User tham gia một room để bắt đầu video call
         */
        socket.on('join-room', (roomId) => {
            console.log(`📥 User ${socket.id} joining room: ${roomId}`);

            // Rời khỏi tất cả rooms cũ
            Array.from(socket.rooms).forEach(room => {
                if (room !== socket.id) {
                    socket.leave(room);
                }
            });

            // Join room mới
            socket.join(roomId);

            // Lấy danh sách users trong room
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }

            const roomUsers = rooms.get(roomId);
            const otherUsers = Array.from(roomUsers).filter(id => id !== socket.id);

            // Thêm user vào room
            roomUsers.add(socket.id);

            console.log(`👥 Room ${roomId} now has ${roomUsers.size} users`);

            // Nếu có user khác trong room, notify họ
            if (otherUsers.length > 0) {
                // Chỉ cho phép 1-1 call, nên chỉ notify user đầu tiên
                const otherUserId = otherUsers[0];

                // Notify user kia rằng có người mới join
                io.to(otherUserId).emit('user-joined', {
                    userId: socket.id
                });

                // Notify user mới rằng đã có người trong room
                socket.emit('user-already-in-room', {
                    userId: otherUserId
                });

                console.log(`✅ Connected ${socket.id} ↔️ ${otherUserId}`);
            } else {
                console.log(`⏳ User ${socket.id} waiting for peer in room ${roomId}`);
            }
        });

        /**
         * WEBRTC OFFER
         * User B gửi SDP offer cho User A
         */
        socket.on('webrtc-offer', ({ offer, targetUserId }) => {
            console.log(`📤 Relaying offer from ${socket.id} to ${targetUserId}`);

            io.to(targetUserId).emit('webrtc-offer', {
                offer,
                userId: socket.id
            });
        });

        /**
         * WEBRTC ANSWER
         * User A gửi SDP answer cho User B
         */
        socket.on('webrtc-answer', ({ answer, targetUserId }) => {
            console.log(`📤 Relaying answer from ${socket.id} to ${targetUserId}`);

            io.to(targetUserId).emit('webrtc-answer', {
                answer,
                userId: socket.id
            });
        });

        /**
         * ICE CANDIDATE
         * Trao đổi ICE candidates để thiết lập P2P connection
         */
        socket.on('ice-candidate', ({ candidate, targetUserId }) => {
            console.log(`🧊 Relaying ICE candidate from ${socket.id} to ${targetUserId}`);

            io.to(targetUserId).emit('ice-candidate', {
                candidate,
                userId: socket.id
            });
        });

        /**
         * LEAVE ROOM
         * User rời khỏi room
         */
        socket.on('leave-room', (roomId) => {
            handleUserLeave(socket, roomId);
        });

        /**
         * DISCONNECT
         * User ngắt kết nối (đóng browser/tab)
         */
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.id}`);

            // Tìm và cleanup tất cả rooms mà user này đang ở
            rooms.forEach((users, roomId) => {
                if (users.has(socket.id)) {
                    handleUserLeave(socket, roomId);
                }
            });
        });
    });
}

/**
 * Helper function để xử lý user rời room
 */
function handleUserLeave(socket, roomId) {
    console.log(`📤 User ${socket.id} leaving room: ${roomId}`);

    const roomUsers = rooms.get(roomId);
    if (roomUsers) {
        roomUsers.delete(socket.id);

        // Notify user kia rằng peer đã rời đi
        const otherUsers = Array.from(roomUsers);
        otherUsers.forEach(userId => {
            socket.to(userId).emit('user-left', {
                userId: socket.id
            });
        });

        // Nếu room rỗng, xóa room
        if (roomUsers.size === 0) {
            rooms.delete(roomId);
            console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
    }

    socket.leave(roomId);
}
