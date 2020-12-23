export const environment: EnvironmentInterface = {
	production: true,
	webSocketIp: '18.193.41.207',
	mapping: '/socket',
	port: 8443,
	socketServer: {
		iceServers: [
			{ urls: 'stun:stun.l.google.com:19302' }
		]
	}
};

export interface EnvironmentInterface {
	production: boolean;
	webSocketIp: string;
	mapping: string;
	port: number;
	socketServer: any;
}
