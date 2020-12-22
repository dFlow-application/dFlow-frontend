export const environment = {
  production: false,
  mapping: '/socket',
  port: 8443,
  socketServer: {
    iceServers: [
       {urls: 'stun:stun.l.google.com:19302'}
    ]
  }
};
