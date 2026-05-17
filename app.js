import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://fuvifjkxzlhpmqtexqfn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SruR6Ol1E4k0EysS_lD4QQ_Nm-eU-lm";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const els = {
  status: document.getElementById("status"),
  authPanel: document.getElementById("authPanel"),
  roomPanel: document.getElementById("roomPanel"),
  callPanel: document.getElementById("callPanel"),
  displayName: document.getElementById("displayName"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  signUpBtn: document.getElementById("signUpBtn"),
  signInBtn: document.getElementById("signInBtn"),
  resetBtn: document.getElementById("resetBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  userLine: document.getElementById("userLine"),
  createRoomBtn: document.getElementById("createRoomBtn"),
  inviteCode: document.getElementById("inviteCode"),
  joinRoomBtn: document.getElementById("joinRoomBtn"),
  roomInfo: document.getElementById("roomInfo"),
  roomCodeText: document.getElementById("roomCodeText"),
  copyInviteBtn: document.getElementById("copyInviteBtn"),
  presenceLine: document.getElementById("presenceLine"),
  startMediaBtn: document.getElementById("startMediaBtn"),
  callBtn: document.getElementById("callBtn"),
  hangUpBtn: document.getElementById("hangUpBtn"),
  localVideo: document.getElementById("localVideo"),
  remoteVideo: document.getElementById("remoteVideo"),
  log: document.getElementById("log")
};

let currentUser = null;
let currentRoom = null;
let roomChannel = null;
let localStream = null;
let peerConnection = null;
let peerUserId = null;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

function log(message) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  els.log.textContent = `${line}\n${els.log.textContent}`;
  console.log(line);
}

function setStatus(message) {
  els.status.textContent = message;
}

function showSignedOut() {
  els.authPanel.classList.remove("hidden");
  els.roomPanel.classList.add("hidden");
  els.callPanel.classList.add("hidden");
  setStatus("Signed out");
}

function userEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function showSignedIn(user) {
  if (!userEmailVerified(user)) {
    els.authPanel.classList.remove("hidden");
    els.roomPanel.classList.add("hidden");
    els.callPanel.classList.add("hidden");
    setStatus("Please verify your email");
    alert("Please verify your email before using LMA Communications.");
    return;
  }

  els.authPanel.classList.add("hidden");
  els.roomPanel.classList.remove("hidden");
  els.callPanel.classList.add("hidden");
  els.userLine.textContent = user.email;
  setStatus("Signed in");
}

function randomInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function ensureProfile(user, displayName = "") {
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    display_name: displayName || user.user_metadata?.display_name || user.email,
    visibility: "private",
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

els.signUpBtn.addEventListener("click", async () => {
  try {
    const email = els.email.value.trim();
    const password = els.password.value;
    const displayName = els.displayName.value.trim();

    if (!email || !password || !displayName) {
      alert("Please enter name, email, and password.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } }
    });
    if (error) throw error;

    if (data.user && !data.session) {
      alert("Account created. Please check your email and confirm your account before signing in.");
      return;
    }

    if (data.session?.user) {
      currentUser = data.session.user;
      await ensureProfile(currentUser, displayName);
      showSignedIn(currentUser);
    }
  } catch (err) {
    alert(err.message);
  }
});

els.signInBtn.addEventListener("click", async () => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: els.email.value.trim(),
      password: els.password.value
    });
    if (error) throw error;

    currentUser = data.user;
    await ensureProfile(currentUser);
    showSignedIn(currentUser);
  } catch (err) {
    alert(err.message);
  }
});

els.resetBtn.addEventListener("click", async () => {
  try {
    const email = els.email.value.trim();
    if (!email) {
      alert("Enter your email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;
    alert("Password reset email requested.");
  } catch (err) {
    alert(err.message);
  }
});

els.signOutBtn.addEventListener("click", async () => {
  await hangUp(false);

  currentRoom = null;

  if (roomChannel) {
    await supabase.removeChannel(roomChannel);
    roomChannel = null;
  }

  await supabase.auth.signOut();

  currentUser = null;

  showSignedOut();
});

els.createRoomBtn.addEventListener("click", async () => {
  try {
    const inviteCode = randomInviteCode();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        invite_code: inviteCode,
        created_by: currentUser.id,
        visibility: "private"
      })
      .select()
      .single();

    if (roomError) throw roomError;

    const { error: memberError } = await supabase
      .from("room_members")
      .insert({
        room_id: room.id,
        user_id: currentUser.id,
        role: "host"
      });

    if (memberError) throw memberError;

    await enterRoom(room);
  } catch (err) {
    alert(err.message);
  }
});

els.joinRoomBtn.addEventListener("click", async () => {
  try {
    const inviteCode = els.inviteCode.value.trim().toUpperCase();
    if (!inviteCode) {
      alert("Enter an invite code.");
      return;
    }

    const { data: room, error: findError } = await supabase
      .from("rooms")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    if (findError) throw findError;

    const { error: memberError } = await supabase
      .from("room_members")
      .upsert({
        room_id: room.id,
        user_id: currentUser.id,
        role: "member"
      });

    if (memberError) throw memberError;

    await enterRoom(room);
  } catch (err) {
    alert(err.message);
  }
});

els.copyInviteBtn.addEventListener("click", async () => {
  const url = new URL(window.location.href);
  url.searchParams.set("room", currentRoom.invite_code);
  await navigator.clipboard.writeText(url.toString());
  alert("Invite link copied.");
});

async function enterRoom(room) {
  currentRoom = room;
  els.roomInfo.classList.remove("hidden");
  els.roomCodeText.textContent = room.invite_code;
  els.callPanel.classList.remove("hidden");
  setStatus(`In room ${room.invite_code}`);
  await setupRealtime(room);
}

async function setupRealtime(room) {
  if (roomChannel) {
    await supabase.removeChannel(roomChannel);
  }

  roomChannel = supabase.channel(`room:${room.id}`, {
    config: {
      broadcast: { self: false },
      presence: { key: currentUser.id }
    }
  });

  roomChannel
    .on("presence", { event: "sync" }, () => {
      const state = roomChannel.presenceState();
      const users = Object.keys(state);
      peerUserId = users.find((id) => id !== currentUser.id) || null;
      els.presenceLine.textContent = peerUserId ? "Peer is present. Ready to call." : "Waiting for peer…";
      log(`Presence users: ${users.length}`);
    })
    .on("broadcast", { event: "signal" }, async ({ payload }) => {
      if (!payload || payload.from === currentUser.id) return;
      if (payload.to && payload.to !== currentUser.id) return;
      await handleSignal(payload);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await roomChannel.track({
          user_id: currentUser.id,
          email: currentUser.email,
          online_at: new Date().toISOString()
        });
        log("Realtime signaling connected.");
      }
    });
}

async function startMedia() {
  if (localStream) return localStream;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  els.localVideo.srcObject = localStream;
  log("Camera and microphone started.");
  return localStream;
}

els.startMediaBtn.addEventListener("click", async () => {
  try {
    await startMedia();
  } catch (err) {
    alert(err.message);
  }
});

function createPeerConnection() {
  const pc = new RTCPeerConnection(rtcConfig);

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      sendSignal({
        type: "ice-candidate",
        candidate,
        to: peerUserId || undefined
      });
    }
  };

  pc.ontrack = (event) => {
    els.remoteVideo.srcObject = event.streams[0];
    log("Remote stream received.");
  };

  pc.onconnectionstatechange = () => {
    log(`Connection state: ${pc.connectionState}`);
    setStatus(`Call: ${pc.connectionState}`);
  };

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  return pc;
}

function sendSignal(payload) {
  if (!roomChannel) return;

  roomChannel.send({
    type: "broadcast",
    event: "signal",
    payload: {
      ...payload,
      from: currentUser.id,
      room_id: currentRoom.id,
      sent_at: new Date().toISOString()
    }
  });
}

els.callBtn.addEventListener("click", async () => {
  try {
    if (!currentRoom) {
      alert("Join or create a room first.");
      return;
    }

    await startMedia();

    peerConnection = createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    sendSignal({
      type: "offer",
      sdp: offer,
      to: peerUserId || undefined
    });

    log("Offer sent.");
  } catch (err) {
    alert(err.message);
  }
});

async function handleSignal(signal) {
  await startMedia();

  if (!peerConnection) {
    peerConnection = createPeerConnection();
  }

  if (signal.type === "offer") {
    log("Offer received.");
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    peerUserId = signal.from;

    sendSignal({
      type: "answer",
      sdp: answer,
      to: signal.from
    });

    log("Answer sent.");
  }

  if (signal.type === "answer") {
    log("Answer received.");
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
  }

  if (signal.type === "ice-candidate" && signal.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      log("ICE candidate added.");
    } catch (err) {
      log(`ICE candidate error: ${err.message}`);
    }
  }

  if (signal.type === "hang-up") {
    log("Peer hung up.");
    await hangUp(false);
  }
}

els.hangUpBtn.addEventListener("click", () => hangUp(true));

async function hangUp(notifyPeer = true) {
  try {
    if (notifyPeer && currentRoom) {
      sendSignal({
        type: "hang-up",
        to: peerUserId || undefined
      });
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;

      peerConnection.close();
      peerConnection = null;
    }

    // Stop remote media
    if (els.remoteVideo.srcObject) {
      els.remoteVideo.srcObject.getTracks().forEach(track => {
        track.stop();
      });

      els.remoteVideo.srcObject = null;
    }

    // Stop local media
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });

      localStream = null;
    }

    // Clear local preview
    if (els.localVideo.srcObject) {
      els.localVideo.srcObject = null;
    }

    peerUserId = null;

    setStatus(
      currentRoom
        ? `In room ${currentRoom.invite_code}`
        : "Ready"
    );

    log("Call ended.");
  }
  catch (err) {
    console.error(err);
  }
}

async function init() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(console.warn);
  }

  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser) {
    await ensureProfile(currentUser);
    showSignedIn(currentUser);

    const roomCode = new URLSearchParams(window.location.search).get("room");
    if (roomCode) {
      els.inviteCode.value = roomCode.toUpperCase();
    }
  } else {
    showSignedOut();
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      await ensureProfile(currentUser);
      showSignedIn(currentUser);
    } else {
      showSignedOut();
    }
  });
}

init();
