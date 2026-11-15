# Drivetrain validation — work in progress

This report records **model consistency tests**, not certification or a claim that any car reproduces measured real-world acceleration. Benchmarks: Swift and 911 are included; neither is used as a universal tuning template.

## Automated results

The fixed-step tests exercise every factory vehicle and two sample custom builds. In each forward gear and all three modes they initialize a coupled state, compare input and wheel RPM with gear × final drive, and check tyre-derived speed and roller geometry. They check one-step torque balance, dyno-load response, open-clutch slip, held-throttle assisted upshift reconnection, engine braking, reverse launch and direction-change safety. The broader existing physics tests cover launch, a manual stall, downshift safety and numerical stability. This does **not** establish independent manufacturer accuracy, full acceleration curves or exhaustive custom configurations. The validation utility below flags estimates; it does not verify a manufacturer source.

## Ideal gearing audit

Speeds are theoretical km/h at 4,000 engine RPM with a fully coupled clutch. This is not an achievable-speed or shift recommendation; 4,000 RPM can be close to or beyond a diesel's normal operating range. Original ratios and tyre sizes are unchanged. A *review* flag signals ratios or final drive identified as estimated in the vehicle record; no flag is not proof of correctness.

| Vehicle | Gear speeds at 4,000 RPM, first through highest | Review |
| --- | --- | --- |
| Maruti Suzuki Swift (swift-1.2-2018) | 30.1 / 56.1 / 83.4 / 110.5 / 141.1 | Ratios or final drive are estimates; independent verification is required. |
| Volkswagen Golf GTI (golf-gti-mk7) | 36.9 / 66.7 / 94.8 / 123.0 / 150.4 / 184.2 | Ratios or final drive are estimates; independent verification is required. |
| Honda S2000 (s2000-ap1) | 31.9 / 48.9 / 67.6 / 86.2 / 103.1 / 123.4 | No automated warning; source verification still needed. |
| Toyota Corolla Altis (corolla-altis-1.8) | 32.0 / 55.3 / 84.9 / 110.1 / 138.0 / 161.9 | Ratios or final drive are estimates; independent verification is required. |
| Honda Civic Si (civic-si-2019) | 32.5 / 56.9 / 87.0 / 115.6 / 142.6 / 172.5 | Ratios or final drive are estimates; independent verification is required. |
| BMW 320d (bmw-320d-f30) | 30.0 / 53.7 / 86.0 / 124.2 / 154.0 / 187.8 | Ratios or final drive are estimates; independent verification is required. |
| Porsche 911 Carrera S (911-carrera-s-9912) | 37.1 / 63.4 / 91.9 / 123.0 / 154.4 / 183.7 / 234.1 | No automated warning; source verification still needed. |
| Chevrolet Camaro LT (camaro-3.6-2016) | 36.9 / 62.7 / 90.2 / 121.1 / 162.3 / 216.4 | No automated warning; source verification still needed. |
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

- [Honda S2000 transmission documentation](https://hondanews.com/en-US/releases/release-4a111fc377fd37d93a2f73004c34c870-honda-s2000-transmission) lists a 1.160 primary reduction in addition to the 4.100 differential, and different fifth and sixth ratios from the previously modelled AP2-like values. The AP1 now uses 0.971 and 0.811 and includes the primary reduction in forward, reverse, shift safety and speed calculations. These values match the [2000 specifications](https://www.thecarconnection.com/specifications/honda_s2000_2000).
- [VW’s 2017 US GTI specification](https://media.vw.com/assets/documents/original/6416-116801676557d8494f0ae0f.pdf) lists two final-drive ratios, unlike the single-final-drive model used for the European variant here. The current ratios are now flagged as provisional; source and architecture must be reconciled rather than silently treating the single final as verified.
- The [991.2 Carrera S specification sheet](https://www.motorshow.me/uploadImages/GalleryDocs/Doc6116.pdf) specifies 3.91 / 2.29 / 1.58 / 1.18 / 0.94 / 0.79 / 0.62, reverse 3.55 and **total** rear axle ratio 3.59 (including the constant 1.16 stage). The previously estimated gear set and reverse were corrected; using only the 3.09 axle component would omit a reduction stage.
- The [2016 Camaro preliminary transmission table](https://gmauthority.com/blog/2015/05/and-now-the-preliminary-specifications-of-the-2016-chevy-camaro/) specifies the V6 TR3160, not the V8 TR6060: 4.40 / 2.59 / 1.80 / 1.34 / 1.00 / 0.75, reverse 3.99. The [1LT specification](https://www.caranddriver.com/chevrolet/camaro/specs/2016/chevrolet_camaro_chevrolet-camaro-coupe_2016) supports a 3.27 V6 manual axle. Database corrected accordingly.
- The [2019 Civic Si Honda sheet](https://hondanews.com/en-US/honda-automobiles/releases/release-aa554e0e5b624d799f9ce3e7296b828a-2019-civic-si-specifications-features) gives reverse 3.673 and final 4.105, while [Car and Driver](https://www.caranddriver.com/honda/civic-si/specs/2019/honda_civic-si_honda-civic-si_2019) lists final 4.35 for the Si sedan. Forward ratios match Honda and the reverse was corrected from 3.583 to Honda’s 3.673. The final drive remains provisional pending reconciliation of this conflict.
- A [Maruti dealer page for the older Swift Deca](https://navnitmaruti.com/maruti-swift-deca-limited-edition-specification.html) lists different fourth and reverse ratios, but it does not establish the 2018 VXi gearbox; those figures were not substituted. [CarWale's 2018–2019 VXi listing](https://www.carwale.com/maruti-suzuki-cars/swift-2018-2021/vxi-2018-2019/) lists 165/80R14 tyres and 860 kg, rather than the simulation's 185/65R15 and 890 kg; configuration details require confirmation.
- [Honda 2017 US Civic Type R specifications](https://hondanews.com/en-US/honda-automobiles/releases/release-dda03e0c69c6476cbf2e0c544555aeef-2017-civic-type-r-specifications-features) lists 3.625 / 2.115 / 1.529 / 1.125 / 0.911 / 0.735, reverse 3.758 and final 4.111; these match the database.
- An [aftermarket MT-82 reference](https://www.bearingkits.co.uk/FORD-GEARBOX-PARTS/FORD-MUSTANG-6-SPEED-MT82-GEARBOX-PARTS/C1-101-1-0.htm) lists the same 2011–2017 Mustang gear and reverse ratios as the database. This is not manufacturer verification of the simulated axle and tyre package. The incorrect datasheet note describing fourth gear as 1:1 was fixed: fifth gear is 1:1 for that set.
- A [2023 manual Supra review](https://www.cars.com/articles/2023-toyota-gr-supra-manual-transmission-first-drive-better-late-than-never-456394/) supports the 3.46 final drive; individual ratios remain provisional.
- Sources located for the 2020 Thar did not independently establish this exact diesel transmission's complete ratio set; it remains flagged rather than substituting an earlier generation's numbers.

## Corrections and open issues

- Assisted shifts now keep the torque request interrupted until the automated clutch is re-engaged; an active driver clutch input or switching to manual restores driver control. Downshift rev matching remains modelled. This is a simplified control strategy, not a manufacturer ECU calibration.
- Wheel RPM and roller RPM are now distinct; the roller uses the 0.17 m radius of the existing 3D dyno. Both assume no tyre/roller slip. Open-clutch shaft slip is visible when a gear is selected; neutral input-shaft dynamics are not modelled.
- Removed artificial reverse-speed damping and caps, and the hard engine RPM ceiling. Fuel cut remains; moving-direction gear changes that would require a backward-spinning engine are rejected. Estimated crank power is now wheel power divided by modelled drivetrain efficiency; it is still not an actual crank measurement.
- S2000, Porsche, Camaro and Civic Si gearing was corrected as documented above; other uncertain ratios and vehicle inertia values were not silently replaced. Several gear sets and reverse/final ratios remain unverified estimates. The absence of a warning above does not constitute independent source verification.
- A [2018 Hilux 2.8 GD-6 4x4 Raider brochure](https://www.harrisauto.co.zw/wp-content/uploads/2018/06/hilux-brochure-2018.pdf) lists 4.784 / 2.423 / 1.443 / 1.000 / 0.826 / 0.643; that is a different market and does not confirm the exact European Invincible specification. Its ratio discrepancy requires follow-up.
- The existing model still approximates roller/vehicle equivalent inertia, torque curves, boost, clutch temperature/fade and drivetrain losses. Manufacturer acceleration traces, per-gear verification for every vehicle, manual real-world validation and fleet-wide listening remain outstanding. The generic custom editor permits a large configuration space and cannot be exhaustively tested.
- Desktop and mobile diagnostic panels, Swift and 911 ignition/acceleration/shift/graph, custom build persistence, storage failure handling, run deletion and V8 audio decoding passed browser smoke checks. Fleet-wide browser interactions, audible synchronization and the live deployment still require regression verification for this branch before release. Do not interpret a passing build as completion of those checks.

