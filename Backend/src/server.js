require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { startReminderJobs } = require('./config/reminderJob');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Attach Socket.io
const io = new Server(server, {
  cors: {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500',
      'https://your-site.netlify.app'
    ],
    methods: ['GET', 'POST']
  }
});

// Session rooms — each booking ref is a room
// e.g. room name = "REF-A3FX92"
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // User or therapist joins a session room
  socket.on('join_session', (sessionRef) => {
    socket.join(sessionRef);
    console.log(`Socket ${socket.id} joined room ${sessionRef}`);
  });

  // A message sent to the room is broadcast to the other person
  socket.on('send_message', ({ sessionRef, sender, text, time }) => {
    io.to(sessionRef).emit('receive_message', { sender, text, time });
  });

  // Session timer events
  socket.on('session_started', (sessionRef) => {
    io.to(sessionRef).emit('session_started', { time: new Date() });
  });

  socket.on('session_ended', (sessionRef) => {
    io.to(sessionRef).emit('session_ended', { time: new Date() });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
  socket.on('join_chat', (room) => { socket.join(room); });
  socket.on('chat_message', ({ room, sender, text, createdAt }) => {
    socket.to(room).emit('chat_message', { sender, text, createdAt });
  });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Mindora server running on http://localhost:${PORT}`);
  });
  startReminderJobs();
});