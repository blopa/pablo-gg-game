import { Math as PhaserMath } from 'phaser';

// Utils
import {
    createInteractiveGameObject,
    getFileNameWithoutExtension,
    rotateRectangleInsideTile,
    getDegreeFromRadians,
    getSelectorData,
} from './utils';
import { selectGameSetters } from '../zustand/game/selectGameData';
import {
    changeScene,
    createCaveEntrance,
} from './sceneHelpers';
import { handleCreateEnemy } from './sprite';
import { generateAverageColorPixelTexture } from './color';

// Selectors
import {
    selectCurrentMapKey,
    selectMapKeyData,
    selectMapSetters,
    selectWorldData,
    selectTilesets,
} from '../zustand/map/selectMapData';
import { selectHeroFacingDirection, selectHeroSetters } from '../zustand/hero/selectHeroData';

// Constants
import {
    HERO_DEPTH,
    IDLE_FRAME,
    DEPTH_DIFF,
    TILE_WIDTH,
    TILE_HEIGHT,
    UP_DIRECTION,
    LEFT_DIRECTION,
    DOWN_DIRECTION,
    RIGHT_DIRECTION,
    DOOR_TILE_INDEX,
    SLIME_TILE_INDEX,
    ELEMENT_BOX_TYPE,
    SLIME_SPRITE_NAME,
    LAYER_TYPE_TERRAIN,
    ELEMENT_CRACK_TYPE,
    ELEMENT_GRASS_TYPE,
    SHOULD_TILE_COLLIDE,
    ENEMY_SPRITE_PREFIX,
    IDLE_FRAME_POSITION_KEY,
} from '../constants';

export const findAdjacentMaps = (currentMap, maps) => maps.filter((map) => (
    (Math.abs(map.x - currentMap.x) === currentMap.width && map.y === currentMap.y) // left/right
    || (Math.abs(map.y - currentMap.y) === currentMap.height && map.x === currentMap.x) // up/down
    || (map.x === currentMap.x + currentMap.width && map.y === currentMap.y - currentMap.height) // up-right
    || (map.x === currentMap.x - currentMap.width && map.y === currentMap.y - currentMap.height) // up-left
    || (map.x === currentMap.x + currentMap.width && map.y === currentMap.y + currentMap.height) // down-right
    || (map.x === currentMap.x - currentMap.width && map.y === currentMap.y + currentMap.height) // down-left
));

const getAdjacentMapsPositions = (currentMap, adjacentMaps) => adjacentMaps.reduce((adjacentMapObj, map) => {
    const dx = map.x - currentMap.x;
    const dy = map.y - currentMap.y;

    if (dx === -currentMap.width && dy === 0) { // left
        return { ...adjacentMapObj, left: map };
    }

    if (dx === currentMap.width && dy === 0) { // right
        return { ...adjacentMapObj, right: map };
    }

    if (dx === 0 && dy === -currentMap.height) { // up
        return { ...adjacentMapObj, up: map };
    }

    if (dx === 0 && dy === currentMap.height) { // down
        return { ...adjacentMapObj, down: map };
    }

    if (dx === currentMap.width && dy === -currentMap.height) { // up-right
        return { ...adjacentMapObj, up_right: map };
    }

    if (dx === -currentMap.width && dy === -currentMap.height) { // up-left
        return { ...adjacentMapObj, up_left: map };
    }

    if (dx === currentMap.width && dy === currentMap.height) { // down-right
        return { ...adjacentMapObj, down_right: map };
    }

    if (dx === -currentMap.width && dy === currentMap.height) { // down-left
        return { ...adjacentMapObj, down_left: map };
    }

    return adjacentMapObj;
}, {});

export const handleCreateMap = (scene) => {
    const currentMapKey = getSelectorData(selectCurrentMapKey);
    const tilesets = getSelectorData(selectTilesets(currentMapKey));
    const currentMapKeyData = getSelectorData(selectMapKeyData(currentMapKey));
    const worldData = getSelectorData(selectWorldData);
    const customColliders = scene.add.group();
    const adjacentMaps = findAdjacentMaps(currentMapKeyData, worldData.maps);
    const adjacentMapsPositions = getAdjacentMapsPositions(currentMapKeyData, adjacentMaps);

    return createTilemap(
        scene,
        currentMapKey,
        currentMapKeyData,
        tilesets,
        customColliders,
        adjacentMapsPositions
    );
};

const createMapChangeTeleportObject = (
    scene,
    width,
    height,
    position,
    mapData,
    origin = { x: 0, y: 0 }
) => {
    const { fileName, width: mapWidth, height: mapHeight } = mapData;
    const targetMapKey = getFileNameWithoutExtension(fileName);

    const customCollider = createInteractiveGameObject(
        scene,
        position.x,
        position.y,
        width,
        height,
        origin
    );

    const overlapCollider = scene.physics.add.overlap(scene.heroSprite, customCollider, () => {
        scene.physics.world.removeCollider(overlapCollider);
        const facingDirection = getSelectorData(selectHeroFacingDirection);
        let targetTilePosition = {
            x: 1,
            y: 1,
        };

        switch (facingDirection) {
            case UP_DIRECTION: {
                targetTilePosition = {
                    x: Math.round(scene.heroSprite.x / TILE_WIDTH),
                    y: (mapHeight / TILE_HEIGHT) - 2,
                };

                break;
            }
            case DOWN_DIRECTION: {
                targetTilePosition = {
                    x: Math.round(scene.heroSprite.x / TILE_WIDTH),
                    y: 0,
                };

                break;
            }
            case LEFT_DIRECTION: {
                targetTilePosition = {
                    x: (mapWidth / TILE_WIDTH) - 2,
                    y: Math.round(scene.heroSprite.y / TILE_HEIGHT),
                };

                break;
            }
            case RIGHT_DIRECTION: {
                targetTilePosition = {
                    x: 0,
                    y: Math.round(scene.heroSprite.y / TILE_HEIGHT),
                };

                break;
            }
            default: {
                break;
            }
        }

        const {
            setHeroInitialFrame,
            setHeroFacingDirection,
            setHeroInitialPosition,
            setHeroPreviousPosition,
        } = getSelectorData(selectHeroSetters);
        const { setCurrentMapKey } = getSelectorData(selectMapSetters);

        setCurrentMapKey(targetMapKey);
        setHeroFacingDirection(facingDirection);
        setHeroInitialFrame(IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, facingDirection));
        setHeroInitialPosition({ x: targetTilePosition.x, y: targetTilePosition.y });
        setHeroPreviousPosition({ x: targetTilePosition.x, y: targetTilePosition.y });

        const { setShouldPauseScene, setGameShowHeadsUpDisplay } = getSelectorData(selectGameSetters);
        setShouldPauseScene('GameScene', true);
        setGameShowHeadsUpDisplay(false);

        changeScene(scene, 'GameScene', {
            atlases: ['hero', 'sword', 'bomb'],
            images: [],
            mapKey: targetMapKey,
        }, {
            fadeType: 'out',
        });
    });
};

const createTeleportTileObject = (scene, position, mapKey, targetTilePosition, type, margin = 3) => {
    const customCollider = createInteractiveGameObject(
        scene,
        position.x + margin,
        position.y - margin,
        TILE_WIDTH - margin * 2,
        TILE_HEIGHT - margin * 2,
        {
            x: 0,
            y: 1,
        }
    );

    const overlapCollider = scene.physics.add.overlap(scene.heroSprite, customCollider, () => {
        // console.log({
        //     overlapX: Math.abs(customCollider.body.overlapX),
        //     overlapY: Math.abs(customCollider.body.overlapY),
        //     // velocityX: Math.abs(scene.heroSprite.body.velocity.x),
        //     // velocityY: Math.abs(scene.heroSprite.body.velocity.y),
        // });
        // return;
        //
        // const yAxisMovement = [UP_DIRECTION, DOWN_DIRECTION].includes(facingDirection);
        // const xAxisMovement = [LEFT_DIRECTION, RIGHT_DIRECTION].includes(facingDirection);
        // if (xAxisMovement && Math.abs(customCollider.body.overlapX) < 10) {
        //     return;
        // }
        //
        // if (yAxisMovement && Math.abs(customCollider.body.overlapY) < 10) {
        //     return;
        // }

        // if (!((xAxisMovement && Math.abs(customCollider.body.overlapX) > 8) || (yAxisMovement && Math.abs(customCollider.body.overlapY) > 8))) {
        //     return;
        // }

        scene.physics.world.removeCollider(overlapCollider);
        const {
            setHeroInitialFrame,
            setHeroFacingDirection,
            setHeroInitialPosition,
            setHeroPreviousPosition,
        } = getSelectorData(selectHeroSetters);
        const { setCurrentMapKey } = getSelectorData(selectMapSetters);
        const facingDirection = getSelectorData(selectHeroFacingDirection);

        setCurrentMapKey(mapKey);
        setHeroFacingDirection(facingDirection);
        setHeroInitialFrame(IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, facingDirection));
        setHeroInitialPosition({ x: targetTilePosition.x, y: targetTilePosition.y });
        setHeroPreviousPosition({ x: targetTilePosition.x, y: targetTilePosition.y });

        const { setShouldPauseScene, setGameShowHeadsUpDisplay } = getSelectorData(selectGameSetters);
        setShouldPauseScene('GameScene', true);
        setGameShowHeadsUpDisplay(false);

        changeScene(scene, 'GameScene', {
            atlases: ['hero', 'sword', 'bomb'],
            images: [],
            mapKey,
        }, {
            fadeType: 'out',
        });
    });
};

/**
 * @param scene
 * @param mapKey
 * @param mapData
 * @param tilesets
 * @param customColliders
 * @param adjacentMapsPositions
 * @returns Phaser.GameObjects.Group
 * TODO it's currently not possible to create a tilemap with custom positions
 */
const createTilemap = (
    scene,
    mapKey,
    mapData,
    tilesets,
    customColliders,
    adjacentMapsPositions = {}
) => {
    // Create the map
    const map = scene.make.tilemap({ key: mapKey });
    // TODO check if tileset is already added
    tilesets.forEach((tilesetName) => {
        map.addTilesetImage(tilesetName, tilesetName);
    });

    // const tilesWithoutCollision = [];
    map.layers.forEach((layerData, idx) => {
        const layer = map.createLayer(
            layerData.name,
            tilesets,
            0,
            0
            // mapData.x,
            // mapData.y
        );

        const layerType = layerData.properties.find((property) => property.name === 'type')?.value;
        if (layerType === LAYER_TYPE_TERRAIN) {
            layer.setDepth(HERO_DEPTH - DEPTH_DIFF);
        } else {
            layer.setDepth(HERO_DEPTH + DEPTH_DIFF);
        }

        // const columnLength = layer.layer.data.length;
        layer.layer.data.forEach((tileRows, columnIndex) => {
            // const rowLength = tileRows.length;
            tileRows.forEach((tile, rowIndex) => {
                const {
                    index,
                    tileset,
                    properties,
                    x: tileX,
                    y: tileY,
                    // pixelX,
                    // pixelY,
                } = tile;

                const { collideLeft, collideRight, collideUp, collideDown } = properties;
                const shouldCollide = Boolean(collideLeft)
                    || Boolean(collideRight)
                    || Boolean(collideUp)
                    || Boolean(collideDown);

                // if (!shouldCollide) {
                //     tilesWithoutCollision.push(tile);
                // }

                if (index === -1) {
                    return;
                }

                if (isGrassTile(tile)) {
                    const gameObject = createGameObjectForTile(scene, tile);
                    gameObject.elementType = ELEMENT_GRASS_TYPE;
                    layer.removeTileAt(tileX, tileY);
                    gameObject.handleDestroyElement = () => {
                        const lifespan = 700;
                        const tex = generateAverageColorPixelTexture(scene, gameObject, 'grass');
                        const emitter = scene.add.particles(0, 0, tex, {
                            x: gameObject.body.x + Math.round(gameObject.body.width / 2),
                            y: gameObject.body.y + Math.round(gameObject.body.height / 2),
                            speed: { min: 20, max: 60 },
                            angle: { min: 0, max: 360 },
                            gravityY: 50,
                            lifespan,
                            // blendMode: 'ADD',
                            scale: { start: 1, end: 0 },
                            // quantity: 64,
                        });
                        emitter.setDepth(Number.MAX_SAFE_INTEGER - 1);

                        gameObject.destroy();
                        emitter.explode(PhaserMath.Between(20, 35));
                    };

                    scene.elements.add(gameObject);

                    return;
                }

                if (isCrackedTile(tile)) {
                    const entranceSprite = createCaveEntrance(scene, tile);
                    entranceSprite.setAlpha(0);
                    entranceSprite.setDepth(HERO_DEPTH - DEPTH_DIFF);
                    const gameObject = createGameObjectForTile(scene, tile);
                    gameObject.elementType = ELEMENT_CRACK_TYPE;
                    gameObject.setDepth(HERO_DEPTH - DEPTH_DIFF);
                    layer.removeTileAt(tileX, tileY);
                    gameObject.entranceSprite = entranceSprite;

                    // scene.elements.add(gameObject);
                    scene.bombDestroyableElements.add(gameObject);

                    return;
                }

                // TODO create a function that checkes this
                // and also check for the tileset name I guess
                if (isBoxTile(tile)) {
                    // const gameObjects = layer.createFromTiles(
                    //     index,
                    //     -1,
                    //     { key: tileset.name, frame: index },
                    //     scene
                    // );

                    const gameObject = createGameObjectForTile(scene, tile);
                    gameObject.elementType = ELEMENT_BOX_TYPE;
                    layer.removeTileAt(tileX, tileY);

                    scene.elements.add(gameObject);
                    scene.bombDestroyableElements.add(gameObject);

                    return;
                }

                const tilesetCustomColliders = tileset?.getTileData?.(index);

                if (shouldCollide) {
                    properties[SHOULD_TILE_COLLIDE] = shouldCollide;
                }

                if (!layer.containsCollision) {
                    layer.containsCollision = shouldCollide;
                }

                if (tilesetCustomColliders) {
                    const { objectgroup } = tilesetCustomColliders;
                    const { objects } = objectgroup;

                    objects?.forEach((objectData) => {
                        let { height, width, x, y, ellipse } = objectData;

                        // if the custom collider is the same size as the tile
                        // then we enable the normal tile collider from Phaser
                        if (height === TILE_HEIGHT && width === TILE_WIDTH) {
                            tile.setCollision(
                                Boolean(collideLeft),
                                Boolean(collideRight),
                                Boolean(collideUp),
                                Boolean(collideDown)
                            );

                            return;
                        }

                        const { rotation, flipX, flipY } = tile;
                        if (flipX) {
                            x = TILE_WIDTH - (x + width);
                        }
                        if (flipY) {
                            y = TILE_HEIGHT - (y + height);
                        }

                        const degree = getDegreeFromRadians(rotation);
                        [x, y, width, height] = rotateRectangleInsideTile(x, y, width, height, degree);

                        const customCollider = createInteractiveGameObject(
                            scene,
                            tile.x * TILE_WIDTH + x,
                            tile.y * TILE_HEIGHT + y,
                            width,
                            height
                        );

                        customColliders.add(customCollider);
                    });
                } else {
                    tile.setCollision(
                        Boolean(collideLeft),
                        Boolean(collideRight),
                        Boolean(collideUp),
                        Boolean(collideDown)
                    );
                }
            });
        });

        // scene.physics.add.collider(scene.heroSprite, customColliders);
        // layer.setCollisionByProperty({ collides: true });
        scene.mapLayers.add(layer);
    });

    // const layersWithCollision = scene.mapLayers.getChildren().filter((layer) => layer.containsCollision);
    // const tilesWithCollision = layersWithCollision.flatMap(
    //     (layer) => layer.layer.data.flat().filter((tile, idx) => tile?.properties?.[SHOULD_TILE_COLLIDE])
    // );

    // tilesWithoutCollision.forEach((tile) => {
    //     const { height, width } = mapData;
    //     const { pixelX, pixelY, x: tileX, y: tileY } = tile;
    //     if (adjacentMapsPositions.right && pixelX === width - TILE_WIDTH) {
    //         const { fileName } = adjacentMapsPositions.right;
    //         const targetMapKey = getFileNameWithoutExtension(fileName);
    //         createTeleportTileObject(
    //             scene,
    //             { x: pixelX + TILE_WIDTH, y: pixelY + TILE_HEIGHT },
    //             targetMapKey,
    //             { x: 0, y: tileY - 1 }
    //         );
    //     } else if (adjacentMapsPositions.left && pixelX === 0) {
    //         const { fileName, width } = adjacentMapsPositions.left;
    //         const targetMapKey = getFileNameWithoutExtension(fileName);
    //         createTeleportTileObject(
    //             scene,
    //             { x: pixelX - TILE_WIDTH, y: pixelY + TILE_HEIGHT },
    //             targetMapKey,
    //             { x: (width / TILE_WIDTH) - 2, y: tileY - 1 }
    //         );
    //     }
    // });

    const { width: mapWidth, height: mapHeight } = mapData;
    if (adjacentMapsPositions.right) {
        createMapChangeTeleportObject(
            scene,
            TILE_WIDTH,
            mapHeight,
            { x: mapWidth, y: 0 },
            adjacentMapsPositions.right
        );
    }

    if (adjacentMapsPositions.left) {
        createMapChangeTeleportObject(
            scene,
            TILE_WIDTH,
            mapHeight,
            { x: -TILE_WIDTH, y: 0 },
            adjacentMapsPositions.left
        );
    }

    if (adjacentMapsPositions.up) {
        createMapChangeTeleportObject(
            scene,
            mapWidth,
            TILE_HEIGHT,
            { x: 0, y: -TILE_HEIGHT },
            adjacentMapsPositions.up
        );
    }

    if (adjacentMapsPositions.down) {
        createMapChangeTeleportObject(
            scene,
            mapWidth,
            TILE_HEIGHT,
            { x: 0, y: mapHeight },
            adjacentMapsPositions.down
        );
    }

    scene.gridEngine.create(map, {
        characters: [],
        collisionTilePropertyName: SHOULD_TILE_COLLIDE,
    });

    // eslint-disable-next-line no-param-reassign
    scene.map = map;

    return customColliders;
};

const isGrassTile = (tile) => {
    const { index, tileset } = tile;
    const { name, firstgid } = tileset;
    const tileIndex = index - firstgid;

    switch (name) {
        case 'field_01': {
            return [173, 174, 175, 176, 177, 178].includes(tileIndex);
        }

        default: {
            return false;
        }
    }
};

const isBoxTile = (tile) => {
    const { index, tileset } = tile;
    const { name, firstgid } = tileset;
    const tileIndex = index - firstgid;

    switch (name) {
        case 'village_01': {
            return [261, 293, 325, 357].includes(tileIndex);
        }

        default: {
            return false;
        }
    }
};

const isCrackedTile = (tile) => {
    const { index, tileset } = tile;
    const { name, firstgid } = tileset;
    const tileIndex = index - firstgid;

    switch (name) {
        case 'custom_tileset': {
            return [0, 1].includes(tileIndex);
        }

        default: {
            return false;
        }
    }
};

export const handleObjectsLayer = (scene) => {
    // Load game objects like items, enemies, etc
    scene.map.objects.forEach((objectLayerData, layerIndex) => {
        objectLayerData?.objects?.forEach((object, objectIndex) => {
            const { gid, properties, x, y, name, width, height } = object;
            const propertiesObject = Object.fromEntries(properties?.map((curr) => [curr.name, curr.value]) || []);

            switch (gid || name) {
                case SLIME_TILE_INDEX: {
                    const { type, health } = propertiesObject;
                    handleCreateEnemy(
                        scene,
                        `${ENEMY_SPRITE_PREFIX}_${SLIME_SPRITE_NAME}_${objectIndex}`,
                        { x, y },
                        type,
                        SLIME_SPRITE_NAME,
                        health
                    );

                    break;
                }

                case DOOR_TILE_INDEX: {
                    const { type, map: mapKey, position } = propertiesObject;
                    const [posX, posY] = position.split(';');

                    createTeleportTileObject(
                        scene,
                        { x, y },
                        mapKey,
                        { x: Number.parseInt(posX, 10), y: Number.parseInt(posY, 10) },
                        type
                    );

                    break;
                }

                default: {
                    break;
                }
            }
        });
    });
};

export const createGameObjectForTile = (scene, tile) => {
    const { index, tileset, properties, pixelX, pixelY } = tile;
    const gameObject = scene.physics.add.staticSprite(
        pixelX,
        pixelY,
        tileset.name
    ).setOrigin(0, 0);
    // gameObjects.setImmovable(true);

    const columns = gameObject.width / TILE_WIDTH;
    // const rows = gameObject.height / TILE_HEIGHT;
    const tileIndex = index - tileset.firstgid;
    const x = (tileIndex % columns) * TILE_WIDTH;
    const y = Math.round(tileIndex / columns) * TILE_HEIGHT;
    // const y = (Math.floor((tileIndex - 1) / columns) + 1) * TILE_HEIGHT;

    gameObject.body.width = TILE_WIDTH;
    gameObject.body.height = TILE_HEIGHT;
    // gameObjects.body.setOffset(x, y);
    gameObject.body.setOffset(gameObject.width / 2, gameObject.height / 2);

    gameObject.setCrop(x, y, TILE_WIDTH, TILE_HEIGHT);
    gameObject.setPosition(gameObject.x - x, gameObject.y - y);

    return gameObject;
};
