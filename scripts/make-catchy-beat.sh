#!/bin/bash
# Catchy Apocalypse Radio Drum Beat
# 120 BPM, punchy and memorable

set -e
cd ~/clawd/radio/test-audio
mkdir -p /tmp/drums

BPM=120
BEAT_MS=$((60000 / BPM))  # 500ms per beat
SIXTEENTH=$((BEAT_MS / 4))  # 125ms

echo "🥁 Creating catchy drum beat @ ${BPM} BPM..."

# === DRUM SAMPLES ===

# Punchy kick - deep with click
sox -r 44100 -n -c 1 /tmp/drums/kick.wav \
  synth 0.15 sine 55:45 \
  synth 0.02 sine 2000 \
  fade 0 0.15 0.1 \
  gain -2

# Snappy snare with crack
sox -r 44100 -n -c 1 /tmp/drums/snare.wav \
  synth 0.1 noise \
  synth 0.08 sine 200 \
  bandpass 1500 1000 \
  fade 0 0.1 0.06 \
  gain -4

# Clap layer
sox -r 44100 -n -c 1 /tmp/drums/clap.wav \
  synth 0.08 noise \
  bandpass 2000 500 \
  fade 0.01 0.08 0.05 \
  gain -6

# Closed hi-hat - crispy
sox -r 44100 -n -c 1 /tmp/drums/hh.wav \
  synth 0.03 noise \
  highpass 6000 \
  fade 0 0.03 0.02 \
  gain -10

# Open hi-hat
sox -r 44100 -n -c 1 /tmp/drums/hho.wav \
  synth 0.15 noise \
  highpass 5000 \
  fade 0 0.15 0.12 \
  gain -12

# Rim shot / percussion
sox -r 44100 -n -c 1 /tmp/drums/rim.wav \
  synth 0.04 sine 800 \
  fade 0 0.04 0.03 \
  gain -8

# Tom hit
sox -r 44100 -n -c 1 /tmp/drums/tom.wav \
  synth 0.12 sine 100:80 \
  fade 0 0.12 0.08 \
  gain -5

# === BUILD THE PATTERN ===
# 4-bar pattern with variation
# Pattern: Kick on 1, 1&, 3 | Snare on 2, 4 | Hats shuffled

# Create silence blocks
sox -r 44100 -n -c 1 /tmp/drums/s16.wav trim 0 0.125   # sixteenth note
sox -r 44100 -n -c 1 /tmp/drums/s8.wav trim 0 0.250    # eighth note
sox -r 44100 -n -c 1 /tmp/drums/s4.wav trim 0 0.500    # quarter note
sox -r 44100 -n -c 1 /tmp/drums/s1bar.wav trim 0 2.0    # one bar

# Pad samples to sixteenth note length
for samp in kick snare clap hh hho rim tom; do
  sox /tmp/drums/${samp}.wav /tmp/drums/s16.wav /tmp/drums/${samp}_16.wav trim 0 0.125
done

echo "Building bar 1 (standard)..."
# Bar 1: K...S...K.K.S...  (K=kick, S=snare, .=hat)
#        1 e & a 2 e & a 3 e & a 4 e & a
# Beat 1: Kick + hat
sox -m /tmp/drums/kick_16.wav /tmp/drums/hh_16.wav -c 1 /tmp/drums/b1_1.wav
# e: hat
cp /tmp/drums/hh_16.wav /tmp/drums/b1_e.wav
# &: hat
cp /tmp/drums/hh_16.wav /tmp/drums/b1_and.wav
# a: hat
cp /tmp/drums/hh_16.wav /tmp/drums/b1_a.wav

# Beat 2: Snare + clap + hat
sox -m /tmp/drums/snare_16.wav /tmp/drums/clap_16.wav /tmp/drums/hh_16.wav -c 1 /tmp/drums/b2_1.wav
cp /tmp/drums/hh_16.wav /tmp/drums/b2_e.wav
cp /tmp/drums/hh_16.wav /tmp/drums/b2_and.wav
cp /tmp/drums/hh_16.wav /tmp/drums/b2_a.wav

# Beat 3: Kick + hat, then kick on &
sox -m /tmp/drums/kick_16.wav /tmp/drums/hh_16.wav -c 1 /tmp/drums/b3_1.wav
cp /tmp/drums/hh_16.wav /tmp/drums/b3_e.wav
sox -m /tmp/drums/kick_16.wav /tmp/drums/hh_16.wav -c 1 /tmp/drums/b3_and.wav  # syncopated kick!
cp /tmp/drums/hh_16.wav /tmp/drums/b3_a.wav

# Beat 4: Snare + clap + open hat
sox -m /tmp/drums/snare_16.wav /tmp/drums/clap_16.wav /tmp/drums/hho_16.wav -c 1 /tmp/drums/b4_1.wav
cp /tmp/drums/hh_16.wav /tmp/drums/b4_e.wav
cp /tmp/drums/hh_16.wav /tmp/drums/b4_and.wav
cp /tmp/drums/hh_16.wav /tmp/drums/b4_a.wav

# Assemble bar 1
sox /tmp/drums/b1_1.wav /tmp/drums/b1_e.wav /tmp/drums/b1_and.wav /tmp/drums/b1_a.wav \
    /tmp/drums/b2_1.wav /tmp/drums/b2_e.wav /tmp/drums/b2_and.wav /tmp/drums/b2_a.wav \
    /tmp/drums/b3_1.wav /tmp/drums/b3_e.wav /tmp/drums/b3_and.wav /tmp/drums/b3_a.wav \
    /tmp/drums/b4_1.wav /tmp/drums/b4_e.wav /tmp/drums/b4_and.wav /tmp/drums/b4_a.wav \
    /tmp/drums/bar1.wav

echo "Building bar 2 (with fill)..."
# Bar 2: Similar but add a rim on the & of 4
sox -m /tmp/drums/hh_16.wav /tmp/drums/rim_16.wav -c 1 /tmp/drums/b4_and_fill.wav

sox /tmp/drums/b1_1.wav /tmp/drums/b1_e.wav /tmp/drums/b1_and.wav /tmp/drums/b1_a.wav \
    /tmp/drums/b2_1.wav /tmp/drums/b2_e.wav /tmp/drums/b2_and.wav /tmp/drums/b2_a.wav \
    /tmp/drums/b3_1.wav /tmp/drums/b3_e.wav /tmp/drums/b3_and.wav /tmp/drums/b3_a.wav \
    /tmp/drums/b4_1.wav /tmp/drums/b4_e.wav /tmp/drums/b4_and_fill.wav /tmp/drums/b4_a.wav \
    /tmp/drums/bar2.wav

echo "Building bar 3 (variation)..."
# Bar 3: Add tom on beat 2 &
sox -m /tmp/drums/hh_16.wav /tmp/drums/tom_16.wav -c 1 /tmp/drums/b2_and_tom.wav

sox /tmp/drums/b1_1.wav /tmp/drums/b1_e.wav /tmp/drums/b1_and.wav /tmp/drums/b1_a.wav \
    /tmp/drums/b2_1.wav /tmp/drums/b2_e.wav /tmp/drums/b2_and_tom.wav /tmp/drums/b2_a.wav \
    /tmp/drums/b3_1.wav /tmp/drums/b3_e.wav /tmp/drums/b3_and.wav /tmp/drums/b3_a.wav \
    /tmp/drums/b4_1.wav /tmp/drums/b4_e.wav /tmp/drums/b4_and.wav /tmp/drums/b4_a.wav \
    /tmp/drums/bar3.wav

echo "Building bar 4 (big fill)..."
# Bar 4: Fill on beat 4 - tom tom snare
sox -m /tmp/drums/tom_16.wav /tmp/drums/hh_16.wav -c 1 /tmp/drums/fill_1.wav
sox -m /tmp/drums/tom_16.wav /tmp/drums/hh_16.wav -c 1 /tmp/drums/fill_2.wav
sox -m /tmp/drums/snare_16.wav /tmp/drums/clap_16.wav -c 1 /tmp/drums/fill_3.wav
sox -m /tmp/drums/kick_16.wav /tmp/drums/hho_16.wav -c 1 /tmp/drums/fill_4.wav

sox /tmp/drums/b1_1.wav /tmp/drums/b1_e.wav /tmp/drums/b1_and.wav /tmp/drums/b1_a.wav \
    /tmp/drums/b2_1.wav /tmp/drums/b2_e.wav /tmp/drums/b2_and.wav /tmp/drums/b2_a.wav \
    /tmp/drums/b3_1.wav /tmp/drums/b3_e.wav /tmp/drums/b3_and.wav /tmp/drums/b3_a.wav \
    /tmp/drums/fill_1.wav /tmp/drums/fill_2.wav /tmp/drums/fill_3.wav /tmp/drums/fill_4.wav \
    /tmp/drums/bar4.wav

echo "Assembling 4-bar loop..."
sox /tmp/drums/bar1.wav /tmp/drums/bar2.wav /tmp/drums/bar3.wav /tmp/drums/bar4.wav /tmp/drums/loop_4bar.wav

echo "Creating 8-bar version..."
sox /tmp/drums/loop_4bar.wav /tmp/drums/loop_4bar.wav /tmp/drums/loop_8bar.wav

echo "Adding punch and warmth..."
sox /tmp/drums/loop_4bar.wav catchy-beat.wav \
  compand 0.01,0.3 -6,-4,-3,-3,0,-2 -2 \
  bass +3 \
  treble +2 \
  gain -3

sox /tmp/drums/loop_8bar.wav catchy-beat-8bar.wav \
  compand 0.01,0.3 -6,-4,-3,-3,0,-2 -2 \
  bass +3 \
  treble +2 \
  gain -3

# Cleanup
rm -rf /tmp/drums

echo ""
echo "✅ Created catchy drum beats!"
ls -lh catchy-beat*.wav
sox --i catchy-beat.wav | head -5
