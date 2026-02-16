# Bone Breaker Arena

Browser-based 2.5D-style ragdoll staircase simulator built with Matter.js.

## Features

- Sequential deterministic simulation of Character A and B in the same generated environment.
- Seeded staircase + obstacle generation for fair comparisons.
- Slight pose/impulse differences between characters.
- Physics-based damage scoring with body-part multipliers.
- Face upload for each character (client-side only, no server storage).

## Run locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Controls

1. Upload Face A and Face B (optional).
2. Set seed.
3. Click **Start Simulation**.
4. Review winner and damage summary.
