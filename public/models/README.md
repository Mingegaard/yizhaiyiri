# Tang courtyard game assets

The game now uses production GLBs instead of the original procedural blockouts.

- `tang-courtyard.glb` is a byte-for-byte copy of the model embedded in the original user-supplied courtyard scene.
- `tang-study-daybed.glb` is the locally modeled three-sided low daybed requested for the north side of the courtyard study, placed in front of the folding screen. Its editable source and construction script are `art-source/study-daybed.blend` and `art-source/build_study_daybed.py`. It contains 10 meshes, 9 exported unlit materials and 5,695 triangles, with no external textures. No Lux3D generation task was submitted for this asset.
- `tang-study-writing-table.glb` is the reference-inspired long writing table east of the daybed, with pierced carved end panels, twelve books in two stacks, and an open cabinet holding twelve tagged scrolls. Both red and jade book stacks, including their pages, bindings and labels, are uniformly scaled to 75% around their own tabletop bases. The small ochre stack is removed. The cabinet remains at 56.25% of its first large-box dimensions. The table and centered tally vessel retain their placement. The table is placed 10 cm from the daybed's east side. It contains 13 meshes, 11 unlit pigments and 32,736 triangles, with no external textures. Source: `art-source/study-writing-table.blend`; rebuild with `art-source/build_study_writing_table.py` using the same local Blender command below. The complete asset bounds are approximately 2.32 × 0.60 × 1.032 m. No cloud generation was submitted.
- `tang-game-props.glb` contains 28 named asset roots: the courtyard companion, bedroom and kitchen furniture, the tally vessel and cloud, plus state variants for the seven-act adventure. Their editable Blender source and local build script are in `art-source/`.
- `tang-volume-clouds.glb` contains three locally sculpted horizontal cloud volumes with a broad, billowing underside, vertex-painted ivory/blue-grey shading and sparse underside contour strokes. Ground views reveal the actual cloud base; the models remain upright without pitching toward the camera. The editable source is `art-source/volume-clouds.blend`, rebuilt with `art-source/build_volume_clouds.py`. The earlier side-view cloud assets and their source remain available as `tang-sky-clouds.glb` and `art-source/sky-clouds.blend`. These are local Blender outputs based on the user's reference, with no paid generation submitted.
- The source courtyard already contains the generated hall, flowering trees, bamboo, rockery, chairs, and their textures. No additional paid generation was submitted.

## Coordinate system

All app coordinates use metres, Y up. The supplied scene is displayed at scale `0.8` and position `[0, -0.176, -2]`. The courtyard study is additionally moved north by 2.28m (half its structural depth), using `studyNorthShift` on the asset and `studyLayout.ts` for matching app coordinates. Its centre is `[0, 0, -4.28]`; attached furnishings, plaque, stairs, desk/vessel interaction, focus seat and navigation volumes follow that move. The raised study floor remains 0.272m above the courtyard.

`courtyardPaving.ts` re-lays the inner court's limestone routes around the relocated plinth using the original 2.4-unit slab module, joint width, two stone materials and surface height. The north/south axial paths meet the new apron, while both wing approaches retain their connections. Fitted slabs stop at the existing garden beds, and the forecourt retains its original paving triangles. This replaces the offset old loop and its temporary footprint infill without overlapping stone surfaces.

Interior scenes reuse the supplied study's architectural parts at scale `1.05`, excluding its original furnishings and potted plants. The adventure uses the same architecture and outdoor model. Evidence variants are selected by their named roots from the shared props GLB; story progression and saving remain owned by the original game engine.

The courtyard writing desk, its tabletop objects and two stools are additionally moved 0.4m south within the study. `studyDesk.ts` translates only their separated regions in cloned, material-merged furniture geometry; corner bookcases and the scroll stand retain their placement. `studyDeskZ` aligns the desk/vessel interaction, focus seat and furniture collisions with this adjustment.

The courtyard study canopy is 0.4m higher via `STUDY_CANOPY_RAISE`. The roof and upper beam/bracket assembly move up without scaling the roof profile. `studyCanopy.ts` extends the column tops and lantern cords while retaining column bases, lantern bodies, windows, platform, furniture and interaction heights. The exterior plaque follows the lifted beam. Interior room variants retain their original architecture.

The courtyard asset config enables the open south study front requested by the user. `src/scene/studyScreens.ts` filters only the south screen leaves from cloned geometry before adding ink. The reference GLB, north/side screens, and interior-room variants remain intact. Both newly opened bays are navigable, with column collisions retained.

## Rendering

The renderer uses the supplied model's unlit materials, sRGB output, no tone mapping, and cached crease outlines. Vegetation bends subtly above the trunk. Night scenes tint cloned materials without modifying the original assets. All textures are embedded; no model, font, or texture requires a remote service at runtime.

Architectural parts, stairs and furniture share one warm ink style and the same screen-space line width/depth offset. This balances the pale stone steps against the dark wooden desks and chairs, with no separate heavy exterior stroke. Explicit source crease-angle metadata remains respected.

The sky clouds use a separate soft back-face silhouette and painted crease strokes rather than a triangle wireframe. Model geometry and pigments are shared between 13 instances: eight distant banks, four larger high-elevation cumulus banks, and one near the zenith. The closer banks span 50–62 metres. Every cloud base stays horizontal, with sculpted lower billows, reflected-light shading and a fixed yaw; camera rotation never turns a cloud's side toward the viewer. Their positions drift slowly, while reduced motion freezes the drift. Clouds remain behind the courtyard and are hidden in the downward overview.

## Rebuilding local props

Run `/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python art-source/build_game_assets.py` from the project directory. This creates `art-source/game-props.blend` and `public/models/tang-game-props.glb` without network access.

Run the same Blender command with `art-source/build_volume_clouds.py` to rebuild the current sky models and their Blender source without network access. `art-source/build_sky_clouds.py` rebuilds the earlier cloud variant.
