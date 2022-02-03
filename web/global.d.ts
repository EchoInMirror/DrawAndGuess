import type { Client } from 'socket.io-client'

declare global {
  const $client: Client

  interface Window {
    $client: Client
  }
}
