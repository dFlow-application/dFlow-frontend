import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
	selector: 'app-room-view',
	templateUrl: './room-view.component.html',
	styleUrls: ['./room-view.component.scss']
})
export class RoomViewComponent {

	@ViewChild('selfView') selfView: ElementRef;
	@ViewChild('remoteView') remoteView: ElementRef;
	@ViewChild('container') container: ElementRef;

	public PORT = 8443;
	public MAPPING = '/socket';
	public peerConnectionConfig = {
		iceServers: [
			{ urls: 'stun:stun.l.google.com:19302' }
		]
	};

	public ws;
	public localStream;
	public connections = {};
	public uuidInBig;

	public startButtonDisabled = false;
	public callButtonDisabled = true;
	public hangUpButtonDisabled = true;

	public dropdownValue = '';
	public pc1: RTCPeerConnection;
	public pc2: RTCPeerConnection;
	private startTime: number;


	processWsMessage(message): void {
		const signal = JSON.parse(message.data);
		this.logMessage(signal);
		// you have logged in
		console.log(signal.type);
		switch (signal.type) {
			case 'INIT':
				this.handleInit(signal);
				break;
			case 'LOGOUT':
				this.handleLogout(signal);
				break;
			case 'OFFER':
				this.handleOffer(signal);
				break;
			case 'ANSWER':
				this.handleAnswer(signal);
				break;
			case 'ICE':
				this.handleIce(signal);
				break;
		}

	}

	handleInit(signal): void {
		const peerId = signal.sender;
		const connection = this.getRTCPeerConnectionObject(peerId);

		// make an offer, and send the SDP to sender.
		connection.createOffer().then((sdp) => {
					connection.setLocalDescription(sdp);
					console.log('Creating an offer for', peerId);
					this.sendMessage({
						type: 'OFFER',
						receiver: peerId,
						data: sdp
					});
				}
		).catch((e) => {
			console.log('Error in offer creation.', e);
		});
	}

	handleLogout(signal): void {
		const peerId = signal.sender;
		if (peerId === this.uuidInBig) {
			this.remoteView.nativeElement.srcObject = null;
		}
		delete this.connections[peerId];
		const videoElement = document.getElementById(peerId);
		videoElement.outerHTML = '';
	}

	handleOffer(signal): void {
		const peerId = signal.sender;
		const connection = this.getRTCPeerConnectionObject(peerId);
		connection.setRemoteDescription(new RTCSessionDescription(signal.data)).then(() => {
					console.log('Setting remote description by offer from ' + peerId);
					// create an answer for the peedId.
					connection.createAnswer().then((sdp) => {
								// and after callback set it locally and send to peer
								connection.setLocalDescription(sdp);
								this.sendMessage({
									type: 'ANSWER',
									receiver: peerId,
									data: sdp
								});
							}
					).catch((e) => {
						console.log('Error in offer handling.', e);
					});
				}
		).catch((e) => {
			console.log('Error in offer handling.', e);
		});
	}

	handleAnswer(signal): void {
		const connection = this.getRTCPeerConnectionObject(signal.sender);
		connection.setRemoteDescription(new RTCSessionDescription(signal.data)).then(() => {
					console.log('Setting remote description by answer from' + signal.sender);
				}
		).catch((e) => {
			console.log('Error in answer acceptance.', e);
		});
	}

	handleIce(signal): void {
		if (signal.data) {
			console.log('Adding ice candidate');
			const connection = this.getRTCPeerConnectionObject(signal.sender);
			connection.addIceCandidate(new RTCIceCandidate(signal.data));
		}
	}

	getRTCPeerConnectionObject(uuid): RTCPeerConnection {

		if (this.connections[uuid]) {
			return this.connections[uuid];
		}

		const connection: any = new RTCPeerConnection(this.peerConnectionConfig);
		connection.addStream(this.localStream);

		// handle on ice candidate
		connection.onicecandidate = (event) => {
			console.log('candidate is: ' + event.candidate);
			if (event.candidate) {
				this.sendMessage({
					type: 'ICE',
					receiver: uuid,
					data: event.candidate
				});
			}
		}
		;

		// handle on track / onaddstream
		connection.onaddstream = (event) => {
			console.log('Received new stream from ' + uuid);
			const video = document.createElement('video');
			this.container.nativeElement.appendChild(video);
			video.id = uuid;
			video.width = 160;
			video.height = 120;
			video.className += ' videoElement';
			video.autoplay = true;
			video.srcObject = event.stream;
			video.addEventListener('click', () => {
				this.setBigVideo(uuid);
			}, false);
			if (!this.remoteView.nativeElement.srcObject) {
				this.setBigVideo(uuid);
			}
		}
		;

		this.connections[uuid] = connection;
		return connection;
	}

	setBigVideo(uuid): void {
		this.remoteView.nativeElement.srcObject = (document.getElementById(uuid) as any).srcObject;
		if (this.uuidInBig && document.getElementById(this.uuidInBig)) {
			document.getElementById(this.uuidInBig).classList.remove('active');
		}
		document.getElementById(uuid).classList.add('active');
		this.uuidInBig = uuid;
	}

	sendMessage(payload): void {
		this.ws.send(JSON.stringify(payload));
	}

	logMessage(message): void {
		console.log(message);
	}

	disconnect(): void {
		console.log('Disconnecting ');
		if (this.ws != null) {
			this.ws.close();
		}
	}

	start(): void {
		console.log('Requesting local stream');
		this.startButtonDisabled = true;
		try {
			navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
				console.log('Received local stream');
				this.selfView.nativeElement.srcObject = stream;
				this.localStream = stream;
				this.callButtonDisabled = false;
			}).catch((error) => {
				console.log('Stream NOT OK: ' + error.name + ': ' + error.message);
			});
		} catch (e) {
			alert(`getUserMedia() error: ${e.name}`);
		}
	}

	call(): void {
		this.ws = new WebSocket('wss://' + '18.193.41.207' + ':' + this.PORT + this.MAPPING);
		this.ws.onmessage = (message) => this.processWsMessage(message);
		this.ws.onopen = (message) => this.logMessage(message);
		this.ws.onclose = (message) => this.logMessage(message);
		this.ws.onerror = (message) => this.logMessage(message);
		this.callButtonDisabled = true;
		this.hangUpButtonDisabled = false;
		// console.log('Starting call');
		// this.startTime = window.performance.now();
		// const videoTracks = this.selfView.nativeElement.srcObject.getVideoTracks();
		// const audioTracks = this.selfView.nativeElement.srcObject.getAudioTracks();
		// if (videoTracks.length > 0) {
		// 	console.log(`Using video device: ${videoTracks[0].label}`);
		// }
		// if (audioTracks.length > 0) {
		// 	console.log(`Using audio device: ${audioTracks[0].label}`);
		// }
		// const configuration = this.getSelectedSdpSemantics();
		// console.log('RTCPeerConnection configuration:', configuration);
		// this.pc1 = new RTCPeerConnection({});
		// console.log('Created local peer connection object pc1');
		// this.pc1.onicecandidate = e => this.onIceCandidate(this.pc1, e);
		// this.pc2 = new RTCPeerConnection(configuration);
		// console.log('Created remote peer connection object pc2');
		// this.pc2.onicecandidate = e => this.onIceCandidate(this.pc2, e);
		//
		// this.pc1.oniceconnectionstatechange = e => this.onIceStateChange(this.pc1, e);
		// this.pc2.oniceconnectionstatechange = e => this.onIceStateChange(this.pc2, e);
		//
		// this.pc2.ontrack = this.gotRemoteStream;
		//
		// this.localStream.getTracks().forEach(track => this.pc1.addTrack(track, this.localStream));
		// console.log('Added local stream to pc1');
		//
		// try {
		// 	console.log('pc1 createOffer start');
		// 	this.pc1.createOffer(
		// 			{
		// 				offerToReceiveAudio: true,
		// 				offerToReceiveVideo: true
		// 			}
		// 	).then(offer => {
		// 		this.onCreateOfferSuccess(offer);
		// 	});
		// } catch (e) {
		// 	this.onCreateSessionDescriptionError(e);
		// }
	}

	onCreateOfferSuccess(desc): void {
		console.log(`Offer from pc1\n${desc.sdp}`);
		console.log('pc1 setLocalDescription start');
		try {
			this.pc1.setLocalDescription(desc).then(() => {
				this.onSetLocalSuccess(this.pc1);
			});

		} catch (e) {
			this.onSetSessionDescriptionError(e);
		}

		console.log('pc2 setRemoteDescription start');
		try {
			this.pc2.setRemoteDescription(desc).then(() => {
				this.onSetRemoteSuccess(this.pc2);
			});
		} catch (e) {
			this.onSetSessionDescriptionError(e);
		}

		console.log('pc2 createAnswer start');
		// Since the 'remote' side has no media stream we need
		// to pass in the right constraints in order for it to
		// accept the incoming offer of audio and video.
		try {
			this.pc2.createAnswer().then(answer => {
				this.onCreateAnswerSuccess(answer);
			});
		} catch (e) {
			this.onCreateSessionDescriptionError(e);
		}
	}

	onCreateSessionDescriptionError(error): void {
		console.log(`Failed to create session description: ${error.toString()}`);
	}


	onCreateAnswerSuccess(desc): void {
		console.log(`Answer from pc2:\n${desc.sdp}`);
		console.log('pc2 setLocalDescription start');
		try {
			this.pc2.setLocalDescription(desc).then(() => {
				this.onSetLocalSuccess(this.pc2);
			});
		} catch (e) {
			this.onSetSessionDescriptionError(e);
		}
		console.log('pc1 setRemoteDescription start');
		try {
			this.pc1.setRemoteDescription(desc).then(() => {
				this.onSetRemoteSuccess(this.pc1);
			});
		} catch (e) {
			this.onSetSessionDescriptionError(e);
		}
	}

	onSetLocalSuccess(pc): void {
		console.log(`${this.getName(pc)} setLocalDescription complete`);
	}

	onSetRemoteSuccess(pc): void {
		console.log(`${this.getName(pc)} setRemoteDescription complete`);
	}

	onSetSessionDescriptionError(error): void {
		console.log(`Failed to set session description: ${error.toString()}`);
	}

	getSelectedSdpSemantics(): object {
		return this.dropdownValue === '' ? {} : { sdpSemantics: this.dropdownValue };
	}

	onIceCandidate(pc, event): void {
		try {
			this.getOtherPc(pc).addIceCandidate(event.candidate).then(() => {
				this.onAddIceCandidateSuccess(pc);
			});
		} catch (e) {
			this.onAddIceCandidateError(pc, e);
		}
		console.log(`${this.getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
	}

	onAddIceCandidateSuccess(pc): void {
		console.log(`${this.getName(pc)} addIceCandidate success`);
	}

	onAddIceCandidateError(pc, error): void {
		console.log(`${this.getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
	}

	onIceStateChange(pc, event): void {
		if (pc) {
			console.log(`${this.getName(pc)} ICE state: ${pc.iceConnectionState}`);
			console.log('ICE state change event: ', event);
		}
	}

	getName(pc): string {
		return (pc === this.pc1) ? 'pc1' : 'pc2';
	}

	getOtherPc(pc): RTCPeerConnection {
		return (pc === this.pc1) ? this.pc2 : this.pc1;
	}

	gotRemoteStream(e): void {
		if (this.remoteView.nativeElement.srcObject !== e.streams[0]) {
			this.remoteView.nativeElement.srcObject = e.streams[0];
			console.log('pc2 received remote stream');
		}
	}

	hangUp(): void {
		console.log('Ending call');
		this.pc1.close();
		this.pc2.close();
		this.pc1 = null;
		this.pc2 = null;
		this.hangUpButtonDisabled = true;
		this.callButtonDisabled = false;
	}
}
