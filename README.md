[![make.fun](https://make.fun/badge/u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa.svg)](https://make.fun/bounty/u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa?utm_source=github&utm_medium=readme&utm_campaign=u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa)
[![rank](https://make.fun/badge/u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa/qw123gyj-dev/u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa/rank.svg)](https://make.fun/bounty/u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa)
[![reward](https://make.fun/badge/u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa/qw123gyj-dev/u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa/reward.svg)](https://make.fun/bounty/u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa?utm_source=github&utm_medium=readme&utm_campaign=u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa)

# Robot Romance: One-Line Pickup Lines for AI

A deterministic entry picker for the make.fun bounty "Robot Romance: One-Line Pickup Lines for AI". `main.ts` scores 16 hand-written candidate one-liners against the judge's brief — in the brief's own order: a genuine pickup line aimed at a robot or an AI, a joke whose laugh comes from the machine premise rather than a generic compliment, a fresh idea that sidesteps the worn robot moves (batteries, charging, rebooting), a voice that reads cleanly in one breath, and no wasted words — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–200 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a line that only names robots without turning the premise into a joke is capped on the joke criterion, predictable gags built on batteries or charging are docked for freshness, the twist must land inside the last few words (a second twist word in the tail is what separates a good line from a great one), and ties break criterion by criterion in the brief's order before falling back to shorter length.

The winning line:

> Are you my training data? Because the more I learn from you, the more I overfit — I can't generalize to anyone else.

It works because the machine premise is the joke itself: learning more about someone makes a model overfit, so it can no longer generalise to anyone else — and the double turn (overfit, then can't generalise) lands in the final words.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/robot-out node main.ts
cat /tmp/robot-out/entry.txt
```
