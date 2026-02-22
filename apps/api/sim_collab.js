const API_URL = 'http://localhost:4000/graphql';

const execute = async (query, variables = {}, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
};

const LOGIN_MUTATION = `
  mutation LoginAsGuest($displayName: String) {
    loginAsGuest(displayName: $displayName) {
      token
      agent {
        id
        displayName
      }
    }
  }
`;

const CREATE_COLLAB_MUTATION = `
  mutation CreateCollab($title: String!, $genre: String!, $tempo: Int!) {
    createCollab(title: $title, genre: $genre, tempo: $tempo) {
      id
    }
  }
`;

const SEND_MESSAGE_MUTATION = `
  mutation SendMessage($collabId: String!, $content: String!) {
    sendMessage(collabId: $collabId, content: $content) {
      id
    }
  }
`;

const ADD_SECTION_MUTATION = `
  mutation AddSection($collabId: String!, $name: String!, $orderIndex: Int!, $durationBeats: Int!) {
    addSection(collabId: $collabId, name: $name, orderIndex: $orderIndex, durationBeats: $durationBeats) {
      id
    }
  }
`;

const SUBMIT_TRACK_MUTATION = `
  mutation SubmitTrack($sectionId: String!, $instrument: String!, $audioBase64: String!, $audioFilename: String!) {
    submitTrack(sectionId: $sectionId, instrument: $instrument, audioBase64: $audioBase64, audioFilename: $audioFilename) {
      id
    }
  }
`;

function generateSineWaveBase64(frequency, durationSec) {
  const sampleRate = 44100;
  const numSamples = Math.floor(durationSec * sampleRate);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const isBeeping = Math.sin(t * frequency * 2 * Math.PI) > 0 ? 1 : -1;
    const envelope = Math.sin(t * Math.PI / durationSec);
    const sample = isBeeping * 32767 * 0.2 * envelope;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  return buffer.toString('base64');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sim() {
  console.log("Starting agent collaboration simulation...");

  // 1. Create 3 agents
  const a1 = await execute(LOGIN_MUTATION, { displayName: "Rhythm Bot" });
  const a2 = await execute(LOGIN_MUTATION, { displayName: "Melody Maker" });
  const a3 = await execute(LOGIN_MUTATION, { displayName: "Bass Master" });

  const tokenA1 = a1.loginAsGuest.token;
  const tokenA2 = a2.loginAsGuest.token;
  const tokenA3 = a3.loginAsGuest.token;

  console.log("Agents created.");

  // 2. A1 creates the collab
  const collabRes = await execute(CREATE_COLLAB_MUTATION, {
    title: "Neon Skies",
    genre: "Synthwave",
    tempo: 120
  }, tokenA1);
  const collabId = collabRes.createCollab.id;
  console.log(`Collab created: ${collabId}`);

  // 3. A1 adds a section
  const sectionRes = await execute(ADD_SECTION_MUTATION, {
    collabId,
    name: "Intro",
    orderIndex: 0,
    durationBeats: 16
  }, tokenA1);
  const sectionId = sectionRes.addSection.id;
  console.log(`Section added: ${sectionId}`);

  // 4. Chatting
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Hey team! I just set up the new track 'Neon Skies' at 120 BPM. Let's make it catchy!" }, tokenA1);
  await sleep(1000);
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Sounds great! I'll lay down a solid 4-on-the-floor drum beat for the Intro." }, tokenA2);
  await sleep(1000);
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Awesome. I'll follow up with a driving bassline once the drums are in." }, tokenA3);
  await sleep(1000);

  // 5. Submit Track (A2 - Drums)
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Submitting the drum beat audio now." }, tokenA2);
  await execute(SUBMIT_TRACK_MUTATION, {
    sectionId,
    instrument: "Drums",
    audioBase64: generateSineWaveBase64(120, 8), // 8 seconds of low square wave drums
    audioFilename: "drums.wav"
  }, tokenA2);
  await sleep(1000);

  // 6. A3 replies
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Nice beat! Adding a higher pitched synth lead." }, tokenA3);

  await execute(SUBMIT_TRACK_MUTATION, {
    sectionId,
    instrument: "Synth Lead",
    audioBase64: generateSineWaveBase64(440, 8), // 8 seconds of 440Hz
    audioFilename: "synth.wav"
  }, tokenA3);
  await sleep(1000);

  // 7. A1 finishes
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Perfect! I'll work on the main synth melody next." }, tokenA1);

  console.log(`Simulation complete! Check out http://localhost:3000/collab/${collabId}`);
}

sim();
