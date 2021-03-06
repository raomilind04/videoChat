let APP_ID = "";
let token = null;
let uid = String(Math.floor(Math.random() * 50000));
let client;
let channel;
let localStream;
let remoteStream;
let peerConnection;
const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};
//let queryString= window.location.search; 
let urlParmas= new URLSearchParams(window.location.search); 
let roomId= urlParmas.get("room"); 
if(!roomId){
    window.location= "lobby.html"; 
}

let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });

  channel = client.createChannel(roomId);
  await channel.join();

  channel.on("MemberJoined", handleUserJoin);
  channel.on("MemberLeft", handleUserLeft); 
  client.on("MessageFromPeer", handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  document.getElementById("user-1").srcObject = localStream;
};



let handleUserJoin = async (MemberId) => {
  console.log("New User joined the channel", MemberId);
  createOffer(MemberId);
};
let handleUserLeft= async(MemberId)=> {
    document.getElementById("user-2").style.display= "none";
    document.getElementById("user-1").classList.remove("myFrame");  
}
let handleMessageFromPeer = async (message, MemberId) => {
  message = JSON.parse(message.text);
  if (message.type === "offer") {
    createAnswer(MemberId, message.offer);
  }
  if (message.type === "answer") {
    addAnswer(message.answer);
  }
  if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }
};



let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  document.getElementById("user-2").style.display = "block";
  document.getElementById("user-1").classList.add("myFrame"); 

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById("user-1").srcObject = localStream;
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          }),
        },
        MemberId
      );
    }
  };
};



let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    MemberId
  );
};



let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);
  await peerConnection.setRemoteDescription(offer);
  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    MemberId
  );
};



let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

let leaveChannel= async ()=> {
    await channel.leave(); 
    await channel.logout(); 
}
let toggleCam= async ()=> {
    let videoTrack= localStream.getTracks().find((track)=> {
        return track.kind=== "video"; 
    })
    if(videoTrack.enabled){
        videoTrack.enabled= false; 
        document.getElementById("camera").style.backgroundColor= "red"; 
    }else{
        videoTrack.enabled= true; 
        document.getElementById("camera").style.backgroundColor= "skyblue"; 
    }
}
let toggleMic= async ()=> {
    let audioTrack= localStream.getTracks().find((track)=> {
        return track.kind=== "audio"; 
    })
    if(audioTrack.enabled){
        audioTrack.enabled= false; 
        document.getElementById("mic").style.backgroundColor= "red"; 
    }else{
        audioTrack.enabled= true; 
        document.getElementById("mic").style.backgroundColor= "skyblue"; 
    }
}

window.addEventListener("beforeunload", leaveChannel); 
document.getElementById("camera").addEventListener("click", toggleCam); 
document.getElementById("mic").addEventListener("click", toggleMic); 


init();
