// socket.js — Socket.io setup with JWT auth
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io = null

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.id
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`)
    console.log(`[socket] User ${socket.userId} connected (${socket.id})`)

    socket.on('disconnect', () => {
      console.log(`[socket] User ${socket.userId} disconnected`)
    })
  })

  console.log('Socket.io initialized')
  return io
}

function getIO() {
  return io
}

module.exports = { init, getIO }
