export interface Player {
  id: string
  name: string
  email: string
  ready: boolean
}

export interface Room {
  id: number
  joinable: boolean
  players: Player[]
}

export interface RoomSettings {
  round: number
  words: string[]
}

export interface Summary {
  player: Player
  stage: number
  data: string
}

export interface PlayerRank {
  name: string
  email: string
  goal: number
}
