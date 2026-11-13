# REALSHIFT — Automotive Transmission & Dyno Simulator

A browser-based chassis dynamometer simulator focused on engine behaviour, manual
transmissions, clutch mechanics, working instrumentation and per-vehicle engine audio.

**Created and developed by Asif**
- Portfolio: [asif4517-git.github.io](https://asif4517-git.github.io/)
- Instagram: [@asif_xrk](https://www.instagram.com/asif_xrk/)
- Email: [asifsrk4517@gmail.com](mailto:asifsrk4517@gmail.com)

---

## Run it

```bash
npm install
npm run dev      # local development
npm run build    # production build (dist/)
npm run preview  # serve the production build
```

Open the served URL, press **Start engine**, then select a gear and apply throttle.
Audio is created on the first user gesture (browser autoplay policy).

## Feature set

| Area | Implementation |
| --- | --- |
| Vehicle database | 11 real production models across NA petrol I4, turbo petrol I4, NA I4 sedan, NA V6, NA V8, twin-turbo flat-six, turbo diesel I4 and two 4×4 diesels |
| Engine | Torque-anchor curve interpolation, flywheel inertia, friction/pumping losses, idle governor, boost lag, fuel-cut rev limiter, coolant/oil/fuel/battery state |
| Clutch | Nonlinear clamp/bite curve, friction capacity, slip coupling, heat build-up with friction fade, manual/assisted/bypass modes, anti-stall reserve, stall behaviour and gearbox input-shaft speed |
| Gearbox | Individual ratios and final drive per vehicle, reverse and neutral, sequential and direct selection |
| Dyno | Rolling-road resistance, roller inertia, roller state derived speed and torque, live power/torque trace, run archive (up to 14 stored traces) |
| Instrument cluster | Seven original selectable designs (performance, classic analogue, modern digital, Bavaria, elegance, Stuttgart five-dial, minimal), all fed by the same live snapshot: rpm, roller speed, gear, redline, shift lights, temperatures, fuel and warning lamps. Selection persists. |
| Audio | Per-vehicle rendered combustion-cycle engine: cylinder firing pulses, bank imbalance, exhaust/intake resonance networks, three seamless RPM-band loops, load and boost spectral mapping, turbo, overrun, limiter, transmission, rollers and workshop convolution; eight routed buses plus master |
| 3D | Three.js garage / dyno bay, procedurally built vehicles from published dimensions, rotating wheels and rollers, lights, cutaway engine view, seven camera positions |
| Controls | Fully rebindable keys through a central input manager, conflict detection, per-binding reset, persistence, blur-safe releases |
| Data | Local persistence of settings, bindings, selected vehicle and dyno runs; JSON export of run traces |
| Attribution | Creator card in the left sidebar and a dedicated About page |

## Architecture

```
src/
  lib/vehicles.ts      sourced vehicle database, torque anchors, audio profiles
  lib/physics.ts       fixed-step engine / clutch / gearbox / roller model
  lib/audio.ts         rendered combustion-cycle engine audio
  lib/store.tsx        settings, bindings, persistence, keyboard input manager
  hooks/useDyno.ts     fixed 120 Hz loop connecting physics → audio → UI snapshot
  three/CarScene.tsx   original procedural vehicle + dyno bay renderer
  components/          DynoBay, Garage, DataLog, About, Modals, gauges, layout
  App.tsx              view shell and dialogs
```

The physics loop runs at a fixed 120 Hz timestep, accumulates render deltas and is
decoupled from frame rate. The same `SimSnapshot` feeds the 3D scene, the gauge
cluster, the dyno chart and the audio engine — no gauge uses independent values.

### Core equations

```
α_engine = (T_curve(rpm)·throttle·k_boost − T_friction − T_clutch) / J_flywheel
α_roller = (T_clutch·i_gear·i_final·η − ΣT_load) / (J_dyno + m·r²)
rpm      = ω_wheel · i_gear · i_final · 60/(2π)
P_wheel  = T_wheel · ω_wheel / 745.7              [hp]
P_crank  = P_wheel / η_drivetrain                 [estimated]
v        = ω_wheel · r · 3.6                      [km/h]
```

## Measurement honesty

Readouts are labelled by provenance:

- **Measured simulation state** — engine rpm, gear, clutch, throttle, coolant/oil.
- **Roller-derived** — wheel speed, vehicle speed, wheel torque, wheel power.
- **Estimated** — crank power/torque and all “hp” figures, derived using the
  vehicle's modelled drivetrain efficiency.

This is a software simulation, not a load-cell measurement. Tyre slip, torsional
vibration and full thermal models are simplified.

## Audio architecture (v2)

The previous audio layer used one oscillator bank and static noise. It was replaced
rather than patched.

**What is rendered per vehicle**

Every vehicle generates its own PCM voice offline in the browser. Each cylinder fires as
a shaped pressure pulse (rise + exponential decay) with deterministic timing jitter,
per-cylinder amplitude imbalance and — for the cross-plane V8 — uneven pulse energy.
Those pulses excite a tuned exhaust resonance network and a separate intake resonance
network, plus broadband transient air noise per cylinder and a mechanical
firing-order body layer. The result is saturated, low-pass shaped and DC-blocked, then
folded onto itself with an equal-power seam so the loop has no click.

Three loop bands are rendered per vehicle at idle, ~46% and ~85% of redline. At playback
they run continuously and are equal-power crossfaded based on live rpm, while playback
rate tracks rpm between anchors (0.72×–1.42×). All bands therefore produce the same
firing pitch at a given rpm — no chorus or detuned doubling.

**What modulates the sound**

- rpm → band crossfade, playback rate, low-pass cutoff, mechanical level
- throttle/load → band level, exhaust and intake opening, transient gain
- boost → dedicated turbo bus: compressor whistle, whoosh, blow-off
- clutch/gear → independent rev behaviour, shift clunks, speed-driven gear whine
- wheel speed → rollers, tyre contact, low roller hum
- limiter → timed overrun crackle and high-band ducking
- camera → stereo pan, distance tone, intake/exhaust balance, cabin low-pass and
  reverb send (cockpit and cluster are interior perspectives)
- start/stop → starter motor, ignition flare, shutdown run-down

Audio is always normalised and passed through a glue compressor and a fast brickwall
limiter. A live analyser can be inspected at `window.__REALSHIFT_AUDIO__.levels()`.

**Honesty about recordings**

No licensed engine recordings were available to bundle, and audio ripped from games or
video platforms is not permissible. The app therefore does **not** claim to play a
recording of any specific car. Every engine is an original rendered combustion model
matched to that engine's cylinder count, firing frequency, displacement, induction,
redline and character. This limitation is stated in the UI.

## Audio testing performed

- Rendered and played every engine class in Chromium with live analyser checks.
- Verified non-silent idle and revving, no clipping (peak < 0.3, RMS ≈ 0.07–0.11).
- Verified model rendering completes and re-renders once per vehicle/quality change.
- Verified startup, shutdown, shift, rejected-shift, limiter and blow-off events fire
  without console errors.
- Verified camera presets alter intake/exhaust balance, cabin filtering and reverb.

## Vehicle data sources

Headline specifications are taken from manufacturer pages and documented references.
Intermediate torque shape, flywheel inertia, clutch capacity, friction and some gear
ratios are **calibrated estimates**. Every vehicle datasheet in the app lists both,
with links.

| Vehicle | Key references |
| --- | --- |
| Maruti Suzuki Swift VXi 1.2 (2018) | marutisuzuki.com/swift · en.wikipedia.org/wiki/Suzuki_Swift |
| Volkswagen Golf GTI Mk7 (2017) | volkswagen.co.uk/en/models/golf.html · en.wikipedia.org/wiki/Volkswagen_Golf_Mk7 |
| Honda S2000 AP1 (2002) | global.honda/en/heritage · en.wikipedia.org/wiki/Honda_S2000 |
| Toyota Corolla Altis 1.8 (2014) | toyota.com/corolla · en.wikipedia.org/wiki/Toyota_Corolla_(E170) |
| Honda Civic Si 1.5T (2019) | automobiles.honda.com/civic-si · en.wikipedia.org/wiki/Honda_Civic_(tenth_generation) |
| BMW 320d F30 (2015) | bmw.com · en.wikipedia.org/wiki/BMW_3_Series_(F30) |
| Porsche 911 Carrera S 991.2 (2016) | newsroom.porsche.com · en.wikipedia.org/wiki/Porsche_911_(991) |
| Chevrolet Camaro LT 3.6 (2016) | chevrolet.com/camaro · en.wikipedia.org/wiki/Chevrolet_Camaro_(sixth_generation) |
| Ford Mustang GT 5.0 S550 (2017) | ford.com/cars/mustang · en.wikipedia.org/wiki/Ford_Mustang_(S550) |
| Mahindra Thar LX 4×4 2.2 (2020) | mahindra.com/auto/muvs-suvs/thar · en.wikipedia.org/wiki/Mahindra_Thar |
| Toyota Hilux Invincible 2.8 (2018) | toyota.co.uk/new-cars/hilux · en.wikipedia.org/wiki/Toyota_Hilux |

Bodies are **original procedural geometry** built to published length, width, height and
wheelbase. No manufacturer CAD, logos, textures or game-ripped models are redistributed.

## Asset licences

| Component | Licence | Use |
| --- | --- | --- |
| [Three.js](https://threejs.org) | MIT | WebGL renderer |
| [React](https://react.dev) / [Vite](https://vite.dev) | MIT | Application framework |
| [Tailwind CSS](https://tailwindcss.com) | MIT | Styling |
| [Lucide](https://lucide.dev) | ISC | Interface icons |
| [Simple Icons](https://simpleicons.org) — Instagram glyph | CC0 1.0 | Social attribution icon |
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | SIL OFL 1.1 | Display typeface |
| [Inter](https://fonts.google.com/specimen/Inter) | SIL OFL 1.1 | UI typeface |
| [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | SIL OFL 1.1 | Telemetry typeface |

All vehicle artwork, the dyno bay, the audio synthesis engine, the physics modules and
the interface are original work created for this project.

## Persistence keys

`realshift.settings.v1`, `realshift.bindings.v1`, `realshift.vehicle.v1`,
`realshift.runs.v1` — stored in `localStorage` on the current device only.

## Default controls

| Input | Function |
| --- | --- |
| W | Throttle |
| S | Brake |
| A / D | Steer left / right |
| ↑ | Shift up |
| ↓ | Shift down |
| Space | Clutch |
| I | Ignition |

Every binding can be reassigned in **Controls**, with conflict detection and individual
or full reset.

## Instrument design

The cluster panel in Bay 01 has a design selector. Seven original layouts are implemented:
Performance (central tach + shift bar), Classic analogue (twin cream dials), Modern
digital (full-width bar), Bavaria (red-accented twin dials), Elegance (wide calm dials
with central display), Stuttgart (five-dial sports layout) and Minimal (thin arc, large
numerals). Every design reads the same `SimSnapshot` — rpm, redline, limiter, roller
speed converted from wheel rotation, gear, coolant, oil, fuel and warning states.
Switching designs never touches the simulation; the choice is saved in settings.

## Transmission validation

A scripted sweep across all 11 vehicles and all three clutch modes checks: idle
stability, free revving in neutral, rpm settling on throttle release, gear engagement
with and without the clutch, stall when releasing the clutch at a standstill in manual
mode, progressive launch, gear-ratio-dependent roller speed, pull sampling, reverse
lock-out, neutral isolation from the rollers, and brake hold. The dyno is stationary:
only the driven wheels and rollers rotate, and speed is derived from roller angular
velocity and tyre radius.

## Known limitations

- **Engine recordings:** no licensed recording set for these vehicles could be
  obtained for redistribution, and game/YouTube audio is not permissible. The audio is
  therefore an original rendered combustion model, labelled as such, not a sampled
  recording. Licensed recordings can replace the three rendered bands later without
  changing the mixer or state integration.
- **3D models:** downloadable Sketchfab vehicle models could not be verified for licence
  and geometry accuracy inside this environment, so the existing licence-clean procedural
  bodies were retained and refined rather than replaced with unverified assets. They are
  dimensioned from published length/width/height/wheelbase and are explicitly presented
  as original stylised models, not manufacturer CAD.
- Simulated power figures are calculated estimates, not dyno-cell measurements.
- Tyre slip, suspension travel and full ECU/thermal models are simplified.
- Runs and settings persist per browser profile only.

## This upgrade (preservation-first)

Existing navigation, garage layout, colour system, vehicle cards, dyno bay, run archive,
Data Log and About page were kept. Targeted changes only:

- **Readability:** typography scale raised throughout working UI, secondary text
  contrast improved (muted colours lifted), buttons and key controls enlarged, labels
  made less cryptic. The Creator/portfolio card and its dimensions were left untouched.
- **Instrument clusters:** seven selectable original designs, persisted, driven by the
  same simulation snapshot. Placed in the existing Live Cluster panel.
- **Transmission:** nonlinear clutch clamp/bite curve, free play, friction fade from slip
  heat, idle-governor integral term, low-speed anti-stall reserve, clutch slip energy,
  gearbox input-shaft speed, reverse lock-out, stronger service brake, and pull sampling
  moved from wall-clock to simulation time.
- **Audio:** load, overrun and free-rev timbre shaping (intake closes on overrun, exhaust
  resonance sharpens, mechanical level depends on clutch/traction), camera-aware
  intake/exhaust balance and reverb, plus more audible roller/tyre layers.
- **Validation:** scripted 11-vehicle × 3-clutch-mode sweep for idle, revving, settle,
  shift, launch, stall, ratio/speed relationships, neutral isolation, brake hold and pull
  sampling.
