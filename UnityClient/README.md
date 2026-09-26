# Retro RPG Unity Client

Open this folder with Unity `6000.5.10f1`. The client connects to the local
authoritative engine at `http://127.0.0.1:4321`.

Start the engine from the repository root:

```sh
npm start
```

Then enter Play mode in Unity. The first client slice renders Stonebridge as a
single shaded background mesh plus a single ASCII glyph mesh. Click an adjacent
cell or use WASD/arrow keys to move; use the mouse wheel to zoom.

The Unity protocol intentionally sends lightweight cell records. Full object
descriptions and contextual action queries will be added as selection endpoints
rather than duplicated on every map cell.
