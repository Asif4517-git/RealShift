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

### GitHub Pages

The `.github/workflows/pages.yml` workflow builds and publishes the site on
changes to `main`. In repository **Settings → Pages**, choose **GitHub Actions**
as the build and deployment source. Once the workflow succeeds the project
site is available at `https://asif4517-git.github.io/RealShift/`.

## Feature set

| Area | Implementation |
| --- | --- |
| Vehicle database | 11 real production models across NA petrol I4, turbo petrol I4, NA I4 sedan, NA V6, NA V8, twin-turbo flat-six, turbo diesel I4 and two 4×4 diesels |
| Engine | Torque-anchor curve interpolation, flywheel inertia, friction/pumping losses, idle governor, boost lag, fuel-cut rev limiter, coolant/oil/fuel/battery state |
| Clutch | Nonlinear clamp/bite curve, friction capacity, slip coupling, heat build-up with friction fade, manual/assisted/bypass modes, anti-stall reserve, stall behaviour and gearbox input-shaft speed |
| Gearbox | Individual ratios and final drive per vehicle, reverse and neutral, sequential and direct selection |
| Dyno | Rolling-road resistance, roller inertia, roller state derived speed and torque, live power/torque trace, run archive (up to 14 stored traces) |
| Instrument cluster | Seven original selectable designs (performance, classic analogue, modern digital, Bavaria, elegance, Stuttgart five-dial, minimal), all fed by the same live snapshot: rpm, roller speed, gear, redline, shift lights, temperatures, fuel and warning lamps. Selection persists. |
| Audio | Licensed engine-family recording loops crossfaded by simulation RPM, with synthetic auxiliary effects and a procedural fallback; see the audio manifest for approximations and limitations |
| 3D | Three.js garage / dyno bay, procedurally built vehicles from published dimensions, rotating wheels and rollers, lights, cutaway engine view, seven camera positions |
| Controls | Fully rebindable keys through a central input manager, conflict detection, per-binding reset, persistence, blur-safe releases |
| Data | Local persistence of settings, bindings, selected vehicle and dyno runs; JSON export of run traces |
| Attribution | Creator card in the left sidebar and a dedicated About page |

## Architecture

```
src/
  lib/vehicles.ts      sourced vehicle database, torque anchors, audio profiles
  lib/physics.ts       fixed-step engine / clutch / gearbox / roller model
  lib/audio.ts         recorded loops and auxiliary effects
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

## Audio and source credits

The primary engine voice blends locally bundled recorded engine loops at
RPM anchors. Sources, licences, edits and vehicle mapping are documented in
[`src/assets/engine/MANIFEST.md`](src/assets/engine/MANIFEST.md). Most
recordings are approximations, not the selected vehicle. The S2000 high band
uses an F20C recording. The library does not yet contain a full matched
idle/acceleration/overrun/start/stop bank for each vehicle; gain/EQ and
playback-rate changes approximate missing conditions, and auxiliary effects
and the decode-error fallback are synthetic. Listening validation remains
necessary; no claim of complete realism is made.

Clutch torque is limited by capacity and calculated from the relative angular
velocity and effective inertia; shift selection does not assign engine RPM.
Assisted/bypass shifts open the clutch, interrupt torque and reconnect it;
assisted downshifts request a bounded rev match. The model remains simplified
and is not a validated representation of real dyno hardware. A discussion of
clutch stick/slip modelling is available from [MathWorks](https://www.mathworks.com/help/simulink/slref/building-a-clutch-lock-up-model.html).

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

Vehicle artwork, the dyno bay, physics and interface are original project work. Recorded audio sources are credited in the manifest.

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

`npm run test:physics` exercises the fixed-step simulation for a petrol four,
diesel and V8 in all three clutch modes, plus manual stall, an unsafe downshift
and 180 seconds of numerical operation. These are automated model tests, not
browser, listening or real-world validation.

## Known limitations

- **Engine recordings:** the bundled bank is incomplete and uses family
  approximations, some pitch extrapolation and synthetic ancillary effects;
  see the audio manifest. Listening validation is still required.
- **3D models:** downloadable Sketchfab vehicle models could not be verified for licence
  and geometry accuracy inside this environment, so the existing licence-clean procedural
  bodies were retained and refined rather than replaced with unverified assets. They are
  dimensioned from published length/width/height/wheelbase and are explicitly presented
  as original stylised models, not manufacturer CAD.
- Simulated power figures are calculated estimates, not dyno-cell measurements.
- Tyre slip, suspension travel and full ECU/thermal models are simplified.
- Runs and settings persist per browser profile only.
