# Alarm sounds

These are the DEFCON 1 alarms. One of them is played whenever a task reaches
DEFCON 1 — created with `!1` or escalated later — unless the `Alarm` chip in the
header is switched off. The alarm never plays the same file twice in a row, so
it keeps its edge instead of turning into background noise.

## The files that ship here

| File | Length | Original |
| --- | --- | --- |
| `defcon1-tannoy.mp3` | 4.8 s | `jonathanslattermusic-defcon-1-tannoy-with-effect-535004.mp3` |
| `defcon1-warning.mp3` | 5.4 s | `tithuh-warning-545568.mp3` |

Both are MPEG layer III, 44.1 kHz, stereo, downloaded from Pixabay:

* [Defcon 1 Tannoy with effect](https://pixabay.com/sound-effects/film-special-effects-defcon-1-tannoy-with-effect-535004/)
  by JonathanSlatterMusic (ID 535004).
* [Warning!](https://pixabay.com/sound-effects/film-special-effects-warning-545568/)
  by Tithuh (ID 545568).

## License

These recordings are **not covered by the project's MIT License**. They remain
subject to the [Pixabay Content License](https://pixabay.com/service/terms/);
Pixabay also provides a [license summary](https://pixabay.com/service/license-summary/).

The summary permits free use and adaptation without mandatory attribution, but
prohibits distributing content on a standalone basis. Whether distributing the
unmodified MP3 files in a public source repository satisfies the full license
terms has not yet been confirmed. These source credits do not grant additional
rights or resolve that question.

## Changing the set

The list lives in `ALARM_TRACKS` in `src/lib/alarm.ts`. Drop a file in here,
add its name there, done — the rotation picks it up on the next reload and stays
random-but-never-repeating for any number of files.

MP3 is the safest format: every browser decodes it. Ogg Vorbis is the one Safari
tends to refuse. Nothing else has to change, `public/` is copied into `dist/`
verbatim, so the files are served by `npm run dev` and by `npm start` alike. A
name in the list without a file simply stays silent — no error.

## Practical hints

* Keep them **short** — a few seconds. They fire during work, not at the start
  of a film.
* Normalise them so they are audible without being painful; playback volume is
  fixed at 90 % (`ALARM_VOLUME` in `src/lib/alarm.ts`).
* Trim the silence at the beginning, otherwise the alarm feels delayed.
* Watch the licence if a sound is not your own recording, and note it above.
