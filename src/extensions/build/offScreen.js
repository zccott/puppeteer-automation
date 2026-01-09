let device;
let currentCall;
document
  .getElementById("requestPermissions")
  .addEventListener("click", async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop the stream after access
      console.log("Microphone access granted.");

      // Test autoplay permission with muted audio
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Create and play a muted test audio to verify autoplay
      const audio = new Audio(
        "https://dl.dropboxusercontent.com/s/h8pvqqol3ovyle8/tom.mp3"
      );
      audio.muted = true; // Set the audio to muted
      await audio.play();
      console.log("Autoplay permission confirmed with muted audio.");

      alert("Microphone and autoplay permissions successfully granted!");

      // Close the tab or popup after permissions are granted
      window.close();
    } catch (error) {
      console.error("Permission request failed:", error);
      alert(
        "Failed to grant some permissions. Please check your browser settings."
      );
    }
  });

function start() {
  console.log("Starting offscreen");
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "hangup") {
      console.log("Disconnecting all calls.");
      device.disconnectAll();
    } else if (request.type === "connect") {
      setupDevice(request.recipient, request.appointmentId);
    } else if (request.type === "mute") {
      handleMuteCall(currentCall, "muteCall");
    } else {
      console.warn("Unhandled message type:", request.type);
      sendResponse({ status: "error", error: "Unhandled message type" });
    }
  });
}

function setupDevice(recepient, appointmentId) {
  let formattedNumber = recepient.replace(/[^\d]/g, "");
  let phoneNumber = "+91" + formattedNumber;
  const roomId = "91" + formattedNumber;
  console.log("[ Room ID ] : ", roomId);
  console.log("[ Appointment ID ] : ", appointmentId);

  if (currentCall) {
    console.warn("A call is already in progress. Cannot initiate a new call.");
    chrome.runtime.sendMessage({
      type: "error",
      message:
        "A call is already in progress. Please hang up before making a new call.",
    });
    return;
  }

  postJson("https://api.aiscribe.quipohealth.com/api/twilio/token", {
    room_id: roomId,
  })
    .then(({ token }) => {
      console.log("[ TOKEN ] : ", token);
      device = new Twilio.Device(token);
      console.log("[ Phone Number ] : ", phoneNumber);

      if (recepient) {
        device
          .connect({
            params: {
              phone_number: phoneNumber,
              appointment_id: appointmentId,
            },
          })
          .then((call) => {
            setupCallHandlers(call);
            handleMuteCall(call, "setupCall");
          })
          .catch((error) => {
            console.error("Error connecting call:", error);
          });
      }
    })
    .catch((error) => {
      console.error("Error getting token:", error);
    });
}

function setupCallHandlers(call) {
  call.on("accept", () => chrome.runtime.sendMessage({ type: "accept" }));

  call.on("disconnect", () => {
    console.log("Call disconnected.");
    currentCall = null;
    chrome.runtime.sendMessage({ type: "disconnect" });
  });

  call.on("cancel", () => chrome.runtime.sendMessage({ type: "cancel" }));
  call.on("reject", () => chrome.runtime.sendMessage({ type: "reject" }));
}

function handleMuteCall(call, message) {
  if (message === "setupCall") {
    currentCall = call;
  } else if (message === "muteCall") {
    if (currentCall) {
      const isMuted = currentCall.isMuted();
      currentCall.mute(!isMuted);
      console.log(`Call ${!isMuted ? "muted" : "unmuted"}`);
    } else {
      console.warn("No active call to mute/unmute");
    }
  } else {
    console.warn("No message received", message);
  }
}

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        resolve(JSON.parse(this.responseText));
      } else if (this.readyState == 4) {
        reject(new Error("Failed to load JSON"));
      }
    };
    xmlhttp.open("POST", url, true);
    xmlhttp.send(JSON.stringify(data));
  });
}

addEventListener("load", start);
