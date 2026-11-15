# Drivetrain validation — work in progress

This report records **model consistency tests**, not certification or a claim that any car reproduces measured real-world acceleration. Benchmarks: Swift and 911 are included; neither is used as a universal tuning template.

## Automated results

The fixed-step tests exercise every factory vehicle and two sample custom builds. In each forward gear and all three modes they initialize a coupled state, compare input and wheel RPM with gear × final drive, and check tyre-derived speed and roller geometry. They check one-step torque balance, dyno-load response, open-clutch slip, and held-throttle assisted upshift reconnection. The broader existing physics tests cover launch, a manual stall, downshift safety and numerical stability. This does **not** establish independent manufacturer accuracy, full acceleration curves or exhaustive custom configurations. The validation utility below flags estimates; it does not verify a manufacturer source.

## Ideal gearing audit

Speeds are theoretical km/h at 4,000 engine RPM with a fully coupled clutch. This is not an achievable-speed or shift recommendation; 4,000 RPM can be close to or beyond a diesel's normal operating range. Original ratios and tyre sizes are unchanged. A *review* flag signals ratios or final drive identified as estimated in the vehicle record; no flag is not proof of correctness.

| Vehicle | Gear speeds at 4,000 RPM, first through highest | Review |
| --- | --- | --- |
| Maruti Suzuki Swift (swift-1.2-2018) | 30.1 / 56.1 / 83.4 / 110.5 / 141.1 | Ratios or final drive are estimates; independent verification is required. |
| Volkswagen Golf GTI (golf-gti-mk7) | 36.9 / 66.7 / 94.8 / 123.0 / 150.4 / 184.2 | No automated warning; source verification still needed. |
| Honda S2000 (s2000-ap1) | 37.1 / 56.8 / 78.4 / 100.0 / 123.1 / 152.2 | Ratios or final drive are estimates; independent verification is required. |
| Toyota Corolla Altis (corolla-altis-1.8) | 32.0 / 55.3 / 84.9 / 110.1 / 138.0 / 161.9 | Ratios or final drive are estimates; independent verification is required. |
| Honda Civic Si (civic-si-2019) | 32.5 / 56.9 / 87.0 / 115.6 / 142.6 / 172.5 | Ratios or final drive are estimates; independent verification is required. |
| BMW 320d (bmw-320d-f30) | 30.0 / 53.7 / 86.0 / 124.2 / 154.0 / 187.8 | Ratios or final drive are estimates; independent verification is required. |
| Porsche 911 Carrera S (911-carrera-s-9912) | 40.4 / 66.3 / 93.6 / 117.0 / 138.2 / 164.9 / 201.6 | Ratios or final drive are estimates; independent verification is required. |
| Chevrolet Camaro LT (camaro-3.6-2016) | 36.2 / 62.0 / 92.8 / 122.0 / 162.3 / 216.4 | Ratios or final drive are estimates; independent verification is required. |
| Ford Mustang GT (mustang-gt-2017) | 38.8 / 58.4 / 84.0 / 107.6 / 142.0 / 218.5 | Ratios or final drive are estimates; independent verification is required. |
| Mahindra Thar (thar-2.2-2020) | 37.0 / 55.3 / 98.5 / 149.7 / 189.6 / 226.9 | Ratios or final drive are estimates; independent verification is required. |
| Toyota Hilux (hilux-2.8-2018) | 31.3 / 55.0 / 89.0 / 131.1 / 173.8 / 219.8 | Ratios or final drive are estimates; independent verification is required. |
| Honda Civic Type R (civic-type-r-fk8-2017) | 33.1 / 56.8 / 78.6 / 106.8 / 131.9 / 163.4 | No automated warning; source verification still needed. |
| BMW M3 (bmw-m3-g80-2021-manual) | 36.2 / 64.1 / 96.5 / 126.0 / 148.6 / 174.9 | No automated warning; source verification still needed. |
| Toyota GR Supra (toyota-gr-supra-a90-2023-manual) | 35.8 / 63.4 / 95.5 / 124.7 / 147.1 / 173.1 | Ratios or final drive are estimates; independent verification is required. |
| Mazda MX-5 Miata (mazda-mx5-nd2-2020) | 31.1 / 52.9 / 77.7 / 99.3 / 123.0 / 158.2 | No automated warning; source verification still needed. |
| Hyundai i20 N Line (hyundai-i20-nline-2023-mt) | 30.1 / 55.7 / 84.7 / 112.1 / 140.7 / 167.5 | Ratios or final drive are estimates; independent verification is required. |
| Toyota Fortuner (toyota-fortuner-2021-28-mt) | 31.3 / 55.0 / 89.1 / 131.3 / 174.1 / 220.1 | Ratios or final drive are estimates; independent verification is required. |

## Source spot checks (not a complete fleet verification)

- [Honda 2017 US Civic Type R specifications](https://hondanews.com/en-US/honda-automobiles/releases/release-dda03e0c69c6476cbf2e0c544555aeef-2017-civic-type-r-specifications-features) lists 3.625 / 2.115 / 1.529 / 1.125 / 0.911 / 0.735, reverse 3.758 and final 4.111; these match the database.
- An [aftermarket MT-82 reference](https://www.bearingkits.co.uk/FORD-GEARBOX-PARTS/FORD-MUSTANG-6-SPEED-MT82-GEARBOX-PARTS/C1-101-1-0.htm) lists the same 2011–2017 Mustang gear and reverse ratios as the database. This is not manufacturer verification of the simulated axle and tyre package. The incorrect datasheet note describing fourth gear as 1:1 was fixed: fifth gear is 1:1 for that set.
- A [2023 manual Supra review](https://www.cars.com/articles/2023-toyota-gr-supra-manual-transmission-first-drive-better-late-than-never-456394/) supports the 3.46 final drive; individual ratios remain provisional.
- Sources located for the 2020 Thar did not independently establish this exact diesel transmission's complete ratio set; it remains flagged rather than substituting an earlier generation's numbers.

## Corrections and open issues

- Assisted shifts now keep the torque request interrupted until the automated clutch is re-engaged; an active driver clutch input or switching to manual restores driver control. Downshift rev matching remains modelled. This is a simplified control strategy, not a manufacturer ECU calibration.
- Wheel RPM and roller RPM are now distinct; the roller uses the 0.17 m radius of the existing 3D dyno. Both assume no tyre/roller slip. Open-clutch shaft slip is visible when a gear is selected; neutral input-shaft dynamics are not modelled.
- Removed artificial reverse-speed damping and caps. Estimated crank power is now wheel power divided by modelled drivetrain efficiency; it is still not an actual crank measurement.
- No gear ratios or vehicle inertia values have been silently replaced. Several gear sets and reverse/final ratios remain unverified estimates. The absence of a warning above does not constitute independent source verification.
- The existing model still approximates roller/vehicle equivalent inertia, torque curves, boost, clutch temperature/fade and drivetrain losses. Manufacturer acceleration traces, per-gear verification for every vehicle, manual real-world validation and fleet-wide listening remain outstanding. The generic custom editor permits a large configuration space and cannot be exhaustively tested.
- Desktop and mobile diagnostic panels, custom preset persistence and V8 audio decoding passed browser smoke checks. Fleet-wide browser interactions, audible synchronization and the live deployment still require regression verification for this branch before release. Do not interpret a passing build as completion of those checks.

