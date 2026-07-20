"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { doc, setDoc, getDoc, onSnapshot, updateDoc, collection, addDoc, deleteDoc } from "firebase/firestore";

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ],
  iceCandidatePoolSize: 10,
};

export default function VideoCall({ user, otherUser, onEndCall }) {
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, ringing, connected
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);

  // Reference to the single private call document
  const callDocRef = doc(db, "calls", "private");

  const setupMedia = async () => {
    localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
    
    remoteStream.current = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream.current;
  };

  useEffect(() => {
    // Listen for incoming calls
    const unsubscribe = onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;

      if (data.offer && !data.answer && data.caller !== user && callStatus === "idle") {
        setCallStatus("ringing");
      }
      
      if (data.ended) {
        handleHangup(false); // Other side ended
      }
    });

    return () => unsubscribe();
  }, [callStatus, user]);

  const startCall = async () => {
    setCallStatus("calling");
    await setupMedia();

    peerConnection.current = new RTCPeerConnection(servers);
    
    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    peerConnection.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current.addTrack(track);
      });
    };

    const offerCandidates = collection(callDocRef, "callerCandidates");
    const answerCandidates = collection(callDocRef, "calleeCandidates");

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDocRef, { offer, caller: user, ended: false });

    // Listen for answer
    onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data();
      if (!peerConnection.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.current.setRemoteDescription(answerDescription);
        setCallStatus("connected");
      }
    });

    // Listen for remote ICE candidates
    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const answerCall = async () => {
    setCallStatus("connected");
    await setupMedia();

    peerConnection.current = new RTCPeerConnection(servers);

    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    peerConnection.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current.addTrack(track);
      });
    };

    const offerCandidates = collection(callDocRef, "callerCandidates");
    const answerCandidates = collection(callDocRef, "calleeCandidates");

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDocRef)).data();
    const offerDescription = callData.offer;
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDocRef, { answer });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  const handleHangup = async (isLocal = true) => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    if (remoteStream.current) {
      remoteStream.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    if (isLocal) {
      await setDoc(callDocRef, { ended: true }, { merge: true });
    }
    
    setCallStatus("idle");
    if (onEndCall) onEndCall();
  };

  if (callStatus === "idle") {
    return (
      <button onClick={startCall} style={{ background: 'var(--accent-color)', padding: '0.5rem 1rem', borderRadius: '20px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
        📹 Video Call
      </button>
    );
  }

  if (callStatus === "ringing") {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: 'white', marginBottom: '2rem' }}>{otherUser} is calling...</h2>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button onClick={answerCall} style={{ background: '#22c55e', padding: '1rem 2rem', borderRadius: '30px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>
            Answer
          </button>
          <button onClick={() => handleHangup(true)} style={{ background: '#ef4444', padding: '1rem 2rem', borderRadius: '30px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>
            Decline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'black', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Remote Video (Full Screen) */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        
        {/* Local Video (Picture in Picture) */}
        <div style={{ position: 'absolute', bottom: '100px', right: '20px', width: '120px', height: '160px', backgroundColor: '#333', borderRadius: '12px', overflow: 'hidden', border: '2px solid white' }}>
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      </div>

      <div style={{ height: '80px', backgroundColor: '#1a1d24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => handleHangup(true)} style={{ background: '#ef4444', padding: '0.75rem 2rem', borderRadius: '30px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
          End Call
        </button>
      </div>
    </div>
  );
}
