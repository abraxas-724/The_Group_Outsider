Place audio files here. Suggested filenames matching AudioManager default mapping:

ui_click.mp3
ui_hover.mp3
ui_confirm.mp3
ui_cancel.mp3
save.mp3
load.mp3
achievement.mp3
explore_enter.mp3
explore_exit.mp3
hotspot.mp3
minigame_start.mp3
minigame_complete.mp3
error.mp3
text_tick.mp3
dialogue_advance.mp3
bgm_main.mp3
amb_loop.mp3

Variants (optional for randomness):
text_tick_1.mp3
text_tick_2.mp3
text_tick_3.mp3
text_tick_4.mp3

If variant files exist, DialogueEngine will randomize using playVariant('text_tick',4).

You can add/replace formats (e.g., .ogg) and update mapping via new AudioManager({ customMapping: { ui_click: 'ui_click.ogg' } }).
Ensure files are short for UI SFX (<200ms preferred) and normalized to -3dB peak.
