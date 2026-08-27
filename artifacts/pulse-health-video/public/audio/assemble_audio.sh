#!/bin/bash
set -e

# Trim bg_music to 60 seconds and fade out
ffmpeg -y -i bg_music.mp3 -filter_complex "[0:a]volume=0.25,afade=t=out:st=56:d=4[bg]" -map "[bg]" -t 60 bg_music_60s.mp3

# Assemble the final audio
# Delays:
# S1: 500
# S2: 10000
# S3: 21500
# S4: 32000
# S5: 42500
# S6: 53500
ffmpeg -y \
  -i bg_music_60s.mp3 \
  -i vo_scene1.mp3 \
  -i vo_scene2.mp3 \
  -i vo_scene3.mp3 \
  -i vo_scene4.mp3 \
  -i vo_scene5.mp3 \
  -i vo_scene6.mp3 \
  -i sfx_confirm.mp3 \
  -i sfx_logo.mp3 \
  -filter_complex "\
    [1:a]volume=1.5,adelay=500|500[v1]; \
    [2:a]volume=1.5,adelay=10000|10000[v2]; \
    [3:a]volume=1.5,adelay=21500|21500[v3]; \
    [4:a]volume=1.5,adelay=32000|32000[v4]; \
    [5:a]volume=1.5,adelay=42500|42500[v5]; \
    [6:a]volume=1.5,adelay=53500|53500[v6]; \
    [7:a]volume=0.5,adelay=26000|26000[s1]; \
    [8:a]volume=0.8,adelay=57000|57000[s2]; \
    [0:a][v1][v2][v3][v4][v5][v6][s1][s2]amix=inputs=9:normalize=0[out] \
  " \
  -map "[out]" \
  -t 60 \
  composite_audio.mp3

echo "Final audio created: composite_audio.mp3"
