import { Socket } from 'socket.io-client'

declare global {
  const $client: Socket

  interface Window {
    $client: Socket
  }
}
