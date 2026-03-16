# Progression Lab AI

**Progression Lab AI** is an AI-assisted harmony exploration tool that generates chord continuations, full progressions, and musical structure ideas based on a few starting chords.

The app also visualizes suggested voicings on **piano and guitar**, making it useful for musicians, producers, and songwriters.

## Features

* AI-generated chord continuation suggestions
* Full chord progression ideas
* Song structure suggestions (verse / chorus / bridge)
* Piano voicing visualization
* Guitar chord diagrams
* Support for musical modes and scales
* Genre-aware harmony generation

## Tech Stack

* **Next.js**
* **TypeScript**
* **OpenAI API**
* **piano-chart**
* **svguitar**

## Example Workflow

1. Enter seed chords
2. Choose a mode or scale
3. Select a genre and mood
4. Generate harmonic ideas

The system returns:

* next chord suggestions
* complete progression ideas
* song structure guidance
* playable voicings for piano and guitar

## Running Locally

```bash
git clone https://github.com/carlwelchdesign/progression-lab-ai
cd progression-lab-ai
make install
make dev
```

Create a `.env.local` file:

```
OPENAI_API_KEY=your_key_here
```

Then visit:

```
http://localhost:3000
```

## Command Summary
| Command           | Purpose                 |
| ----------------- | ----------------------- |
| `make install`    | Install dependencies    |
| `make dev`        | Run local dev server    |
| `make build`      | Build production bundle |
| `make start`      | Run production server   |
| `make docker-dev` | Run with Docker         |
| `make clean`      | Clean build files       |


## Future Improvements

* MIDI playback of generated chords
* Audio preview of voicings
* Voice leading optimization
* Progression export to MIDI / DAW
* Save and share progressions

## Author

Carl Welch
Senior Product Engineer
