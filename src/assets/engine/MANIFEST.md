# Engine audio assets

These are **edited loops**, not complete vehicle sound libraries. They were
obtained from [350Chev](https://github.com/Jxstrr0/350Chev/tree/a17ad08e4e48186bf7d904217ded6d0c14dc68ac/sounds),
which documents its source recordings, edited time windows and estimated anchor
RPMs in its [credits](https://github.com/Jxstrr0/350Chev/blob/a17ad08e4e48186bf7d904217ded6d0c14dc68ac/sounds/CREDITS.md).
Its processing includes trimming, high-pass filtering, time-warping, cycle
cutting, crossfading, normalization, mono mixing and MP3 encoding. RPM values
below are the upstream editor's estimates, not manufacturer specifications.
The original asset pages and licence notices were checked on 2026-11-13.

| Asset | Source / author | Licence | Engine and approximate anchor / condition |
|---|---|---|---|
| i4s_idle.mp3 | [AlexanderChe, Chevrolet Lacetti 1.4](https://freesound.org/people/AlexanderChe/sounds/362942/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Petrol inline-4, 877 rpm, idle, interior |
| i4_rev.mp3 | [Nox_Sound, Peugeot 308](https://freesound.org/people/Nox_Sound/sounds/522221/) | CC0 1.0 | Inline-4, 2274 rpm, rev, near exhaust |
| i4b_rev.mp3 | [erik90, Chevrolet Cobalt LS](https://freesound.org/people/erik90/sounds/181460/) | CC0 1.0 | Petrol inline-4, 2529 rpm, rev, interior |
| i4hi_hi.mp3 | [Tyler Riddle, 2002 Honda F20C](https://commons.wikimedia.org/wiki/File:2002-Honda-F20C.ogg) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Petrol inline-4, 7317 rpm, engine bay, edited as described above |
| d4s_idle.mp3, d4s_rev.mp3 | [Evilmikie, VW New Beetle TDI](https://freesound.org/people/Evilmikie/sounds/448217/) | CC0 1.0 | Turbo diesel inline-4, 887 rpm idle and 2191 rpm rev |
| v8x57_idle.mp3, v8x57_rev.mp3 | [romanholtwick, Chevrolet Caprice](https://freesound.org/people/romanholtwick/sounds/391671/) | CC0 1.0 | Petrol V8, 805 rpm idle and 1444 rpm rev |
| v8xsc_hi.mp3 | [Ears68, supercharged Holden/Chev V8 dyno](https://freesound.org/people/Ears68/sounds/177184/) | CC0 1.0 | Petrol V8, 6478 rpm, loaded dyno run |
| v6_idle.mp3 | [Robo9418, Porsche Cayenne](https://freesound.org/people/Robo9418/sounds/840317/) | CC0 1.0 | V6, 651 rpm, idle, mixed engine/exhaust |
| v6_rev.mp3 | [TTTNIS, Nissan VQ35HR](https://commons.wikimedia.org/wiki/File:NISSAN_VQ35HR_engine.ogg) | Public domain, worldwide dedication | Petrol V6, 4111 rpm, rev |
| f6_mid.mp3, f6_hi.mp3 | [John64, 2006 Porsche Cayman S](https://commons.wikimedia.org/wiki/File:2006_Porsche_Cayman_S_engine_sound.wav) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Petrol flat-six, 3706 and 5193 rpm, loaded acceleration. Edited as above; these derived audio files remain CC BY-SA 3.0. |

## Mapping and limitations

* Swift, Golf, Corolla and Civic: generic petrol inline-four approximations.
  S2000 uses the same generic lower bands and an actual F20C high band, not
  necessarily the simulated individual car.
* BMW 320d, Thar and Hilux: Beetle TDI diesel approximation, not those engines.
* Mustang: Caprice/Holden V8 approximation. Camaro V6: Cayenne/Nissan V6
  approximation. Porsche 911: Cayman flat-six at mid/high RPM; the idle is a
  **V6 substitute**, not a flat-six recording.
* These clips are not matched microphones or a complete multisample bank.
  Some high RPM is extrapolated by playback-rate changes. Distinct loaded,
  unloaded, closed-throttle, startup and shutdown recordings are not available
  for each family; load is approximated with gain/EQ and some ancillary sounds
  are still synthesized. On decoding failure the old procedural voice is used.
  No claim of authentic make/model reproduction or listening validation is made.
* Sonniss's engine, idle and rev catalogues were reviewed. Their commercial
  libraries require acquisition; the free GDC bundle's [v2 licence](https://sonniss.com/gdc-bundle-license/)
  restricts distribution of sounds as sounds. No Sonniss assets are included.
