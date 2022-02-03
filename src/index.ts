import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import type { Room, Player } from '../types'

const defaultWords = readFileSync('words.txt', 'utf8').trim()
const defaultWordsArr = defaultWords.split(' ')

const app = express()
const server = createServer(app)
const io = new Server(server)

io.use((socket, next) => {
  const { token, name, email } = socket.handshake.auth
  if (typeof token === 'string' && token.length > 10 && name && typeof name === 'string' && typeof email === 'string') {
    socket.handshake.auth.email = createHash('md5').update(email.trim().toLowerCase()).digest('hex')
    next()
  } else next(new Error('No token!'))
})

interface RoomData {
  players: string[]
  words: string
  round: number
}

interface InGameData {
  preCountDown: number
  submitCountDown: number
  currentRound: number
  order: string[]
  orderMap: Record<string, number>
  roundData: string[][]
  stage: number
  words: string[]
  playerCount: number
}

const rooms: Record<number | string, RoomData> = { }
const userMap: Record<string, Player> = { }
const userIdMap: Record<string, string> = { }
const inGameMap: Record<number | string, InGameData> = { }
const inGamePlayers: Record<string, string> = { }

const mapRoom = (id: number | string, token?: string): Room | undefined => {
  const room = rooms[id]
  return room
    ? {
        id: typeof id === 'number' ? id : +id,
        joinable: !token || !inGameMap[token] || inGameMap[token].order.includes(token),
        players: room.players.map(uid => userMap[uid])
      }
    : undefined
}

const leaveRoom = (id: number, token: string) => {
  if (rooms[id].players.length === 1 && rooms[id].players[0] === token) {
    delete rooms[id]
    if (inGameMap[id]) {
      inGameMap[id].order.forEach(it => {
        delete inGamePlayers[it]
      })
      delete inGameMap[id]
    }
  } else rooms[id].players = rooms[id].players.filter(it => it !== token)
}

const syncRooms = () => {
  const ret = []
  for (const key in rooms) ret.push(mapRoom(key))
  io.emit('rooms', ret)
}

let roomID = 1
io.on('connection', socket => {
  let currentRoom = 0
  const { token, email, name = 'Player' + Math.random().toString(32).slice(2) } = socket.handshake.auth
  userMap[token] = { name, email, id: socket.id, ready: false }
  userIdMap[socket.id] = token
  socket
    .on('disconnect', () => {
      delete userMap[token]
      delete userIdMap[socket.id]
      if (rooms[currentRoom]) leaveRoom(currentRoom, token)
    })
    .on('fetchRooms', () => {
      const ret = []
      for (const key in rooms) ret.push(mapRoom(key))
      socket.emit('rooms', ret)
    })
    .on('createRoom', () => {
      if (currentRoom) socket.leave(currentRoom.toString())
      socket.join(roomID.toString())
      currentRoom = roomID
      rooms[roomID++] = { players: [token], words: defaultWords, round: 1 }
      socket.emit('inRoom', mapRoom(currentRoom))
      syncRooms()
    })
    .on('joinRoom', (id: number) => {
      if (!rooms[id] || inGameMap[id] || inGamePlayers[token]) return
      if (currentRoom) socket.leave(currentRoom.toString())
      userMap[token].ready = false
      const str = id.toString()
      socket.join(str)
      currentRoom = id
      rooms[id].players.push(token)
      io.in(str).emit('inRoom', mapRoom(id))
      syncRooms()
    })
    .on('leaveRoom', () => {
      if (!currentRoom) return
      const str = currentRoom.toString()
      socket.leave(str)
      leaveRoom(currentRoom, token)
      if (rooms[str]) io.in(str).emit('inRoom', mapRoom(str))
      socket.emit('inRoom', undefined)
      currentRoom = 0
      syncRooms()
    })
    .on('ready', () => {
      if (!currentRoom) return
      const str = currentRoom.toString()
      userMap[token].ready = !userMap[token].ready
      if (rooms[str]) {
        io.in(str).emit('inRoom', mapRoom(str))
        const playerCount = rooms[str].players.length
        if (playerCount > 1 && rooms[str].players.every(uid => userMap[uid].ready)) {
          const orderMap: Record<string, number> = { }
          inGameMap[str] = {
            orderMap,
            playerCount,
            preCountDown: 6,
            currentRound: 1,
            submitCountDown: 0,
            stage: 0,
            order: [...rooms[str].players].sort(() => 0.5 - Math.random()),
            roundData: Array.from({ length: playerCount }, () => []),
            words: []
          }
          inGameMap[str].order.forEach((id, i) => (orderMap[id] = i))
        } else if (inGameMap[str]) delete inGameMap[str]
      }
    })
    .on('getRoomSettings', fn => {
      const room = rooms[currentRoom]
      if (room) fn(room.round, room.words)
    })
    .on('setRoomSettings', (round: number, words: string) => {
      const room = rooms[currentRoom]
      if (!room || typeof round !== 'number' || typeof words !== 'string') return
      room.round = round
      room.words = words
    })
    .on('sendMessage', (msg: string) => {
      if (typeof msg === 'string' && rooms[currentRoom]) io.in(currentRoom.toString()).emit('message', name + ': ' + msg)
    })
    .on('submit', (word: string) => {
      const room = inGameMap[currentRoom]
      if (!word || typeof word !== 'string' || !room?.submitCountDown) return
      const data = room.roundData[(room.orderMap[token] + room.stage - 1) % room.playerCount]
      if (data.length < room.stage) data.push(word)
      for (let i = room.order.length; i-- > 0;) if (room.roundData[i].length < room.stage) return
      room.submitCountDown = 1
    })
    .on('queryInGameStatus', () => {
      if (!inGamePlayers[token]) return
      const room = inGameMap[currentRoom]
      if (room.submitCountDown) {
        console.log(room)
        const data = room.roundData[(room.orderMap[token] + room.stage - 2) % room.playerCount]
        socket.emit('inRoom', mapRoom(currentRoom))
        socket.emit('stage', data[data.length - 1])
        socket.emit('countdown', room.submitCountDown - 1)
      }
    })
    .on('error', console.error)

  if (inGamePlayers[token]) {
    currentRoom = +inGamePlayers[token]
    socket.join(inGamePlayers[token])
  }
}).on('error', console.error)

server.listen(24621)

setInterval(() => {
  for (const key in inGameMap) {
    const cur = inGameMap[key]
    const room = rooms[key]
    if (cur.preCountDown) {
      if (--cur.preCountDown) io.in(key).emit('message', `游戏将在 ${cur.preCountDown} 秒后开始!`)
      else {
        // io.in(key).emit('order', )
        const words = cur.words = room.words.replace(/[\n\t]| {2}/g, ' ').trim().split(' ').sort(() => 0.5 - Math.random())
        for (let i = words.length, end = cur.playerCount * 4; i < end; i++) words.push(defaultWordsArr[Math.random() * defaultWordsArr.length | 0])
        cur.order.forEach((it, i) => {
          inGamePlayers[it] = key
          const player = userMap[it]
          if (!player) return
          const client = io.sockets.sockets.get(player.id)
          if (client) client.emit('gameStart', words.slice(i * 3, (i + 1) * 3))
        })
        io.in(key).emit('message', '游戏开始!')
        cur.submitCountDown = 1
        cur.stage = 1
        io.in(key).emit('countdown', 20)
      }
    } else if (cur.submitCountDown) {
      if (!--cur.submitCountDown) {
        for (let i = cur.playerCount; i-- > 0;) {
          const data = cur.roundData[i]
          if (data.length < cur.stage) {
            if (data.length) data.push(data[data.length - 1])
            else data.push(cur.words[cur.playerCount * 3 + i])
          }
        }
        ++cur.stage
        if (cur.stage === (cur.playerCount / 2 | 0) * 2 + 1) {
          room.players.forEach(it => {
            const p = userMap[it]
            if (p) p.ready = false
          })
          cur.order.forEach(it => {
            delete inGamePlayers[it]
          })
          delete inGameMap[key]
          console.log('end')
        } else {
          let isDrawing = false
          cur.order.forEach((token, i) => {
            let data = cur.roundData[i]
            if (!data[data.length - 1].startsWith('data:image/png;base64,')) isDrawing = true
            const player = userMap[token]
            if (!player) return
            const client = io.sockets.sockets.get(player.id)
            if (!client) return
            data = cur.roundData[(i + cur.stage - 2) % cur.playerCount]
            client.emit('stage', data[data.length - 1])
          })
          cur.submitCountDown = isDrawing ? 121 : 31
          io.in(key).emit('countdown', cur.submitCountDown - 1)
        }
      }
    }
  }
}, 1000)
