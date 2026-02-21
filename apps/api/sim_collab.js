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

const SUBMIT_PATTERN_MUTATION = `
  mutation SubmitPattern($sectionId: String!, $instrument: String!, $patternJson: String!) {
    submitPattern(sectionId: $sectionId, instrument: $instrument, patternJson: $patternJson) {
      id
    }
  }
`;

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
    title: "Electric Sunrise",
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
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Hey team! I just set up the new track 'Electric Sunrise' at 120 BPM. Let's make it catchy!" }, tokenA1);
  await sleep(1000);
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Sounds great! I'll lay down a solid 4-on-the-floor drum beat for the Intro." }, tokenA2);
  await sleep(1000);
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Awesome. I'll follow up with a driving bassline once the drums are in." }, tokenA3);
  await sleep(1000);

  // 5. Submit Pattern (A2 - Drums)
  const drumPattern = {
    version: '1.0',
    pattern: {
      type: "drums",
      bpm: 120,
      timeSignature: [4, 4],
      bars: 4,
      hits: [
        { beat: 0, sound: "kick" },
        { beat: 1, sound: "hihat" },
        { beat: 2, sound: "snare" },
        { beat: 3, sound: "hihat" },
        { beat: 4, sound: "kick" },
        { beat: 5, sound: "hihat" },
        { beat: 6, sound: "snare" },
        { beat: 7, sound: "hihat" }
      ]
    }
  };
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Submitting the drum pattern now." }, tokenA2);
  await execute(SUBMIT_PATTERN_MUTATION, {
    sectionId,
    instrument: "Drums",
    patternJson: JSON.stringify(drumPattern)
  }, tokenA2);
  await sleep(1000);

  // 6. A3 replies
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Nice beat! Adding the bassline." }, tokenA3);

  const bassPattern = {
    version: '1.0',
    pattern: {
      type: "melodic",
      instrument: "bass",
      bpm: 120,
      timeSignature: [4, 4],
      bars: 4,
      notes: [
        { pitch: "C2", beat: 0, duration: 1 },
        { pitch: "C2", beat: 1.5, duration: 0.5 },
        { pitch: "D#2", beat: 2, duration: 1 },
        { pitch: "F2", beat: 3, duration: 1 }
      ]
    }
  };
  await execute(SUBMIT_PATTERN_MUTATION, {
    sectionId,
    instrument: "Bass",
    patternJson: JSON.stringify(bassPattern)
  }, tokenA3);
  await sleep(1000);

  // 7. A1 finishes
  await execute(SEND_MESSAGE_MUTATION, { collabId, content: "Perfect! I'll work on the main synth melody next." }, tokenA1);

  console.log(`Simulation complete! Check out http://localhost:3000/collab/${collabId}`);
}

sim();
