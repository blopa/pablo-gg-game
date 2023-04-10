import { Display } from 'phaser';

// Utils
import {
    getSelectorData,
    isGeneratedAtlasFileAvailable,
    isImageFileAvailable,
    isMapFileAvailable,
    isTilesetFileAvailable,
} from '../../utils/utils';
import { asyncLoader } from '../../utils/phaser';
import { findAdjacentMaps } from '../../utils/sceneHelpers';

// Constants
import { IGNORED_TILESETS, SLIME, SLIME_SPRITE_NAME } from '../../constants';

// Selectors
import {
    selectAssetsSetters,
    selectLoadedAtlases,
    selectLoadedFonts,
    selectLoadedImages,
    selectLoadedJSONs,
    selectLoadedMaps,
    selectLoadedWorlds,
} from '../../zustand/assets/selectLoadedAssets';
import {
    selectCurrentMapKey,
    selectMapSetters,
    selectWorldData,
} from '../../zustand/map/selectMapData';
import { selectGameSetters } from '../../zustand/game/selectGameData';

export const sceneHelpers = {};

export const key = 'LoadAssetsScene';

export async function create(initData) {
    const scene = sceneHelpers.getScene();
    const { width: gameWidth, height: gameHeight } = scene.cameras.main;
    const {
        fonts = [],
        atlases = [],
        images = [],
        mapKey: extraMapKey = '',
        worldKey = '',
    } = initData?.assets || {};

    const {
        addLoadedAtlas,
        addLoadedFont,
        addLoadedImage,
        addLoadedMap,
        addLoadedWorld,
        addLoadedJson,
    } = getSelectorData(selectAssetsSetters);
    const { setWorldData, addMapKeyData, addMapKeyDataTileset } = getSelectorData(selectMapSetters);

    const loadedAtlases = getSelectorData(selectLoadedAtlases);
    const loadedImages = getSelectorData(selectLoadedImages);
    const loadedFonts = getSelectorData(selectLoadedFonts);
    const loadedMaps = getSelectorData(selectLoadedMaps);
    const loadedWorlds = getSelectorData(selectLoadedWorlds);

    // setup loading bar
    const progressBar = scene.add.graphics();
    const progressBox = scene.add.graphics();

    const barWidth = Math.round(gameWidth * 0.6);
    const handleBarProgress = (value) => {
        progressBar.clear();
        progressBar.fillStyle(0xFFFFFF, 1);
        progressBox.fillRect(
            (gameWidth - barWidth) / 2,
            gameHeight - 80,
            barWidth * value,
            20
        );
    };

    scene.load.on('progress', handleBarProgress);

    scene.load.on('fileprogress', (file) => {
        // console.info(file.key);
    });

    scene.load.on('complete', () => {
        progressBar.destroy();
        progressBox.destroy();

        scene.load.off('progress');
        scene.load.off('fileprogress');
        scene.load.off('complete');
    });

    // Preload all the fonts needed for the scene
    // so Phaser can render them properly
    let newFontsCount = 0;
    fonts?.forEach((font, idx) => {
        // If a font is already loaded, then skip this
        if (loadedFonts.includes(font)) {
            return;
        }

        if (!extraMapKey && atlases.length === 0 && images.length === 0) {
            handleBarProgress(fonts.length - (fonts.length - (idx + 1)));
        }

        // Set font as already loaded in the zustand store
        addLoadedFont(font);
        newFontsCount += 1;
        const color = scene.game.config.backgroundColor;
        scene.add.text(
            0,
            0,
            '',
            {
                fontFamily: font,
                color: Display.Color.RGBToString(color.r, color.g, color.b, color.a),
            }
        );
    });

    const mapKeys = [];
    if (worldKey) {
        const currentMapKey = getSelectorData(selectCurrentMapKey);
        if (!currentMapKey) {
            throw new Error('No current map key found');
        }

        mapKeys.push(currentMapKey);
        const { default: worldJson } = await import(`../../assets/maps/worlds/${worldKey}.json`);
        const currentMapKeyData = worldJson.maps.find((map) => map.fileName.includes(`${currentMapKey}.json`));
        addLoadedWorld(worldKey);
        setWorldData(worldJson);
        const adjacentMaps = findAdjacentMaps(currentMapKeyData, worldJson.maps);

        mapKeys.push(
            ...adjacentMaps.map((mapData) => {
                const nameWithExtension = mapData.fileName.split('/').pop();
                return nameWithExtension.replace(/\.[^/.]+$/, '');
            })
        );
    }

    // BIG TODO
    if (extraMapKey) {
        mapKeys.push(extraMapKey);
    }

    // TODO no need to load all maps at the same time, probably best to load only the adjacent maps
    // or even only load the current map and load the adjacent maps when the player is close to them
    // eslint-disable-next-line no-restricted-syntax
    for (const mapKey of mapKeys) {
        // Load the Tiled map needed for the next scene
        if (
            mapKey
            && !loadedMaps.includes(mapKey)
            && isMapFileAvailable(`${mapKey}.json`)
        ) {
            // eslint-disable-next-line no-await-in-loop
            const { default: mapJson } = await import(`../../assets/maps/${mapKey}.json`);
            const worldData = getSelectorData(selectWorldData);
            if (worldData.maps.length > 0) {
                const mapData = worldData.maps.find((map) => map.fileName.includes(`${mapKey}.json`));
                addMapKeyData(mapKey, { ...mapData, tilesets: [] });
            } else {
                const mapData = {
                    tilesets: [],
                    fileName: `../${mapKey}.json`,
                    height: mapJson.height * mapJson.tileheight,
                    width: mapJson.width * mapJson.tilewidth,
                    x: 0,
                    y: 0,
                };
                setWorldData({
                    ...worldData,
                    maps: [...worldData.maps, mapData],
                });
                addMapKeyData(mapKey, mapData);
            }

            const tilesets = mapJson.tilesets.map((tileset) =>
                // the string will be something like "../tilesets/village.json" or "../tilesets/village.png"
                tileset.source?.split('/').pop().split('.')[0] || tileset.image?.split('/').pop().split('.')[0]);

            // Load objects assets
            const objectLayers = mapJson.layers.filter((layer) => layer.type === 'objectgroup');
            objectLayers.forEach((layer) => {
                layer.objects.forEach(async (object) => {
                    const { gid, properties } = object;
                    switch (gid) {
                        case SLIME: {
                            // for some reason, if I don't assign this constant to a local variable
                            // webpack production build do something that the code doesn't work properly
                            // on the browser
                            const spriteName = SLIME_SPRITE_NAME;

                            if (
                                isGeneratedAtlasFileAvailable(`${spriteName}.json`)
                                && isGeneratedAtlasFileAvailable(`${spriteName}.png`)
                                && !loadedAtlases.includes(spriteName)
                            ) {
                                // eslint-disable-next-line no-await-in-loop
                                const { default: jsonPath } =
                                    await import(`../../assets/atlases/generated/${spriteName}.json`);
                                // eslint-disable-next-line no-await-in-loop
                                const { default: imagePath } =
                                    await import(`../../assets/atlases/generated/${spriteName}.png`);

                                addLoadedAtlas(spriteName);
                                await asyncLoader(scene.load.atlas(spriteName, imagePath, jsonPath));
                            }

                            break;
                        }

                        default: {
                            break;
                        }
                    }

                    properties?.forEach((property) => {
                        // TODO
                        const { name, type, value } = property;
                    });
                });
            });

            const loadedJSONs = getSelectorData(selectLoadedJSONs);
            // eslint-disable-next-line no-restricted-syntax
            for (const tilesetName of tilesets) {
                if (tilesetName && !IGNORED_TILESETS.includes(tilesetName)) {
                    let tilesetJson = {};
                    if (!loadedJSONs.includes(tilesetName) && isTilesetFileAvailable(`${tilesetName}.json`)) {
                        // eslint-disable-next-line no-await-in-loop
                        const { default: jsonResult } = await import(`../../assets/tilesets/${tilesetName}.json`);
                        tilesetJson = jsonResult;

                        addLoadedJson(tilesetName);
                        // eslint-disable-next-line no-await-in-loop
                        await asyncLoader(scene.load.json(tilesetName, tilesetJson));
                    } else {
                        tilesetJson = scene.cache.json.get(tilesetName);
                    }

                    if (!loadedImages.includes(tilesetName) && isTilesetFileAvailable(tilesetJson.image)) {
                        // remove the file extension so webpack only pre-load the files with the png extension
                        const fileName = tilesetJson.image.replace(/\.[^/.]+$/, '');
                        // eslint-disable-next-line no-await-in-loop
                        const { default: tilesetImage } = await import(
                            `../../assets/tilesets/${fileName}.png`
                        );

                        addLoadedImage(tilesetName);
                        // eslint-disable-next-line no-await-in-loop
                        await asyncLoader(scene.load.image(tilesetName, tilesetImage));
                    }

                    mapJson.tilesets = mapJson.tilesets
                        .filter(
                            (tileset) => !IGNORED_TILESETS.includes(tileset.source?.split('/')?.pop()?.split('.')?.[0])
                        ).map((tileset) => {
                            if (tileset.source?.includes(`/${tilesetName}.json`)) {
                                const imageExtension = tilesetJson.image.split('.').pop();
                                const imagePath = tileset.source.replace('.json', `.${imageExtension}`);
                                // eslint-disable-next-line no-param-reassign
                                delete tileset.source;

                                return {
                                    ...tileset,
                                    ...tilesetJson,
                                    image: imagePath, // not really necessary but why not
                                };
                            }

                            return tileset;
                        });

                    addMapKeyDataTileset(mapKey, tilesetName);
                }
            }

            addLoadedMap(mapKey);
            // Load map with preloaded tilesets
            // eslint-disable-next-line no-await-in-loop
            await asyncLoader(scene.load.tilemapTiledJSON(mapKey, mapJson));
        }
    }

    // Load all the atlases needed for the next scene
    // eslint-disable-next-line no-restricted-syntax
    for (const atlas of atlases) {
        if (
            !isGeneratedAtlasFileAvailable(`${atlas}.json`)
            || loadedAtlases.includes(atlas)
        ) {
            // eslint-disable-next-line no-continue
            continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const { default: jsonPath } = await import(`../../assets/atlases/generated/${atlas}.json`);
        const imageName = jsonPath.textures.find((texture) => texture.image.includes(atlas))?.image;
        if (!imageName || !isGeneratedAtlasFileAvailable(imageName)) {
            // eslint-disable-next-line no-continue
            continue;
        }

        const fileName = imageName.replace(/\.[^/.]+$/, '');
        // eslint-disable-next-line no-await-in-loop
        const { default: imagePath } = await import(`../../assets/atlases/generated/${fileName}.png`);

        addLoadedAtlas(atlas);
        // eslint-disable-next-line no-await-in-loop
        await asyncLoader(scene.load.atlas(atlas, imagePath, jsonPath));
    }

    // Load all the images needed for the next scene
    // eslint-disable-next-line no-restricted-syntax
    for (const image of images) {
        if (
            !isImageFileAvailable(`${image}.png`)
            || loadedImages.includes(image)
        ) {
            // eslint-disable-next-line no-continue
            continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const { default: imagePath } = await import(`../../assets/images/${image}.png`);

        addLoadedImage(image);
        // eslint-disable-next-line no-await-in-loop
        await asyncLoader(scene.load.image(image, imagePath));
    }

    const startNewScene = () => {
        // const nextScene = scene.game.scene.getScene(initData.nextScene);
        // if (nextScene.sys.isPaused()) {
        //     nextScene.sys.resume();
        // }

        const { setShouldPauseScene } = getSelectorData(selectGameSetters);
        setShouldPauseScene(initData.nextScene, false);

        scene.scene.start(
            initData.nextScene
        );
    };

    // If we have fonts, then wait for them to be loaded before calling the next scene...
    if (newFontsCount > 0) {
        document.fonts.ready.then((fontFace) => {
            startNewScene();
        });
    } else {
        // ... otherwise just call the next scene already
        startNewScene();
    }
}
