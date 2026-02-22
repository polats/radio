const API_URL = 'https://api.apocalypseradio.xyz/graphql';
const QUERY = `query {
  collab(id: "cmlifdrm50004o201g1r58z8d") {
    id
    sections {
      tracks {
        instrument
        patternData
      }
    }
  }
}`;

fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: QUERY })
})
.then(res => res.json())
.then(json => {
  const collab = json.data.collab;
  if (!collab) return console.log("Collab not found");
  collab.sections.forEach((s, i) => {
    s.tracks.forEach((t, j) => {
      console.log(`\n--- Instrument: ${t.instrument} ---`);
      console.log(JSON.stringify(t.patternData, null, 2));
    });
  });
})
.catch(console.error);
