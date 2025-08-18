# Card Back Images

This directory contains card back images for the poker/blackjack game.

## Usage

1. **Place your card back image** in this directory
2. **Name it `default.png`** (or update the code to use a different filename)
3. **Recommended dimensions**: 96x140 pixels (matches the card dimensions in the game)
4. **Format**: PNG is recommended for best quality and transparency support

## How it works

- When `enableCardBackImage` is set to `true` in the config, the game will use your image instead of the default CSS gradient
- If the image fails to load, it will automatically fall back to the original CSS gradient design
- The image will be automatically scaled to fit the card dimensions

## Configuration

The feature is controlled by the `enableCardBackImage` setting in:
- `src/config/ui.ts`
- `src/config.ts`

Set to `true` to enable image-based card backs, `false` to use CSS gradients.

## File structure

```
public/
  cardback/
    default.png    # Your card back image
    README.md      # This file
```
