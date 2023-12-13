let pc = new RTCPeerConnection();
const socket = io();

let dataChannel;
const CHUNK_SIZE = 16384; // Size of chunks in bytes
let receivedChunks = [];

// Handlers for receiving the WebRTC offer/answer
socket.on('file-offer', async offer => {
    console.log("Received file offer:", offer);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('file-answer', answer);

    setupDataChannel();
});

socket.on('file-answer', async answer => {
    console.log("Received file answer:", answer);
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

// Setup data channel for the receiver
function setupDataChannel() {
    pc.ondatachannel = event => {
        console.log("Data channel received:", event.channel);
        dataChannel = event.channel;
        dataChannel.binaryType = 'arraybuffer';
        setupDataChannelHandlers();
    };
}

// Setup handlers for sending the file
document.getElementById('sendButton').addEventListener('click', async () => {
    console.log("Send button clicked");
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (file) {
        console.log("File selected:", file);
        dataChannel = pc.createDataChannel("fileTransfer");
        setupDataChannelHandlers();

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('file-offer', offer);
    } else {
        console.log("No file selected");
    }
});

function setupDataChannelHandlers() {
    dataChannel.onopen = () => {
        console.log("Data channel opened");
    };
    dataChannel.onmessage = e => {
        console.log("Message received:", e.data);
        if (e.data !== 'finished') {
            receivedChunks.push(e.data);
            console.log("Chunk received:", e.data.byteLength, "bytes");
        } else {
            console.log("File transfer complete, assembling file...");
            const blob = new Blob(receivedChunks, { type: 'video/mp4' });
            displayVideo(blob);
            receivedChunks = [];
        }
    };
}

function sendFile(file) {
    console.log("Sending file:", file.name);
    const fileReader = new FileReader();
    let offset = 0;

    fileReader.onload = e => {
        if (e.target.readyState === FileReader.DONE) {
            const chunk = e.target.result;
            dataChannel.send(chunk);
            console.log(`Chunk sent: ${chunk.byteLength} bytes`);

            offset += chunk.byteLength;
            if (offset < file.size) {
                readSlice(offset);
            } else {
                console.log("File fully sent, signaling end of transfer");
                dataChannel.send('finished');
            }
        }
    };

    const readSlice = o => {
        const slice = file.slice(offset, o + CHUNK_SIZE);
        fileReader.readAsArrayBuffer(slice);
    };

    readSlice(0);
}

function displayVideo(blob) {
    console.log(`Assembling video from Blob: ${blob.size} bytes`);
    const url = URL.createObjectURL(blob);
    const videoElement = document.createElement('video');
    videoElement.src = url;
    videoElement.controls = true;
    videoElement.autoplay = true;
    document.body.appendChild(videoElement);
    console.log("Video should now be visible on the page");
}
