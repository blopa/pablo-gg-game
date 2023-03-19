import { Input } from 'phaser';

// Constants
import {
    KEY,
    COIN,
    DOOR,
    HEART,
    ENEMY,
    CRYSTAL,
    IDLE_FRAME,
    TILE_WIDTH,
    TILE_HEIGHT,
    UP_DIRECTION,
    LEFT_DIRECTION,
    DOWN_DIRECTION,
    RIGHT_DIRECTION,
    KEY_SPRITE_NAME,
    RUN_BATTLE_ITEM,
    PATROL_BEHAVIOUR,
    HERO_SPRITE_NAME,
    COIN_SPRITE_NAME,
    ROCK_BATTLE_ITEM,
    ENEMY_SPRITE_NAME,
    PAPER_BATTLE_ITEM,
    ITEMS_BATTLE_ITEM,
    SWORD_SPRITE_NAME,
    SLIME_SPRITE_NAME,
    HEART_SPRITE_NAME,
    RETURN_BATTLE_ITEM,
    ATTACK_BATTLE_ITEM,
    DEFENSE_BATTLE_ITEM,
    CRYSTAL_SPRITE_NAME,
    SHOULD_TILE_COLLIDE,
    SCISSORS_BATTLE_ITEM,
    IDLE_FRAME_POSITION_KEY,
} from '../constants';

// Utils
import {
    getSelectorData,
    getDegreeFromRadians,
    rotateRectangleInsideTile,
    createInteractiveGameObject,
} from './utils';

// Selectors
import { selectBattleSetters } from '../zustand/battle/selectBattle';
import { selectDialogMessages, selectDialogSetters } from '../zustand/dialog/selectDialog';
import { selectMapKey, selectTilesets, selectMapSetters } from '../zustand/map/selectMapData';
import {
    selectHeroSetters,
    selectHeroInitialFrame,
    selectHeroInitialPosition,
    selectHeroFacingDirection,
} from '../zustand/hero/selectHeroData';
import { selectTextSetters } from '../zustand/text/selectText';
import { selectGameSetters } from '../zustand/game/selectGameData';

export const createAnimation = (scene, assetKey, animationName, frameQuantity, frameRate, repeat, yoyo) => {
    scene.anims.create({
        key: `${assetKey}_${animationName}`,
        frames: Array.from({ length: frameQuantity }).map((n, index) => ({
            key: assetKey,
            frame: `${animationName}_${(index + 1).toString().padStart(2, '0')}`,
        })),
        frameRate,
        repeat,
        yoyo,
    });
};

export const handleCreateControls = (scene) => {
    // Controls
    // eslint-disable-next-line no-param-reassign
    scene.actionKey = scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.SPACE);
    // eslint-disable-next-line no-param-reassign
    scene.cursors = scene.input.keyboard.createCursorKeys();
    // eslint-disable-next-line no-param-reassign
    scene.wasd = scene.input.keyboard.addKeys({
        [UP_DIRECTION]: Input.Keyboard.KeyCodes.W,
        [DOWN_DIRECTION]: Input.Keyboard.KeyCodes.S,
        [LEFT_DIRECTION]: Input.Keyboard.KeyCodes.A,
        [RIGHT_DIRECTION]: Input.Keyboard.KeyCodes.D,
    });
};

export const handleCreateGroups = (scene) => {
    // Game groups
    // eslint-disable-next-line no-param-reassign
    scene.sprites = scene.add.group();
    // eslint-disable-next-line no-param-reassign
    scene.enemies = scene.add.group();
    // eslint-disable-next-line no-param-reassign
    scene.items = scene.add.group();
    // eslint-disable-next-line no-param-reassign
    scene.mapLayers = scene.add.group();
};

/**
 * @param scene
 * @returns Phaser.GameObjects.Group
 */
export const handleCreateMap = (scene) => {
    const mapKey = getSelectorData(selectMapKey);
    const tilesets = getSelectorData(selectTilesets);
    const customColliders = scene.add.group();

    // Create the map
    const map = scene.make.tilemap({ key: mapKey });
    tilesets.forEach((tilesetName) => {
        map.addTilesetImage(tilesetName, tilesetName);
    });

    map.layers.forEach((layerData, idx) => {
        const layer = map.createLayer(layerData.name, tilesets, 0, 0);

        layer.layer.data.forEach((tileRows) => {
            tileRows.forEach((tile) => {
                const { index, tileset, properties } = tile;
                const { collideLeft, collideRight, collideUp, collideDown } = properties;
                const tilesetCustomColliders = tileset?.getTileData?.(index);
                const shouldCollide = Boolean(collideLeft)
                    || Boolean(collideRight)
                    || Boolean(collideUp)
                    || Boolean(collideDown);

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

    const layersWithCollision = scene.mapLayers.getChildren().filter((layer) => layer.containsCollision);
    scene.gridEngine.create(map, {
        characters: [],
        collisionTilePropertyName: SHOULD_TILE_COLLIDE,
    });

    // eslint-disable-next-line no-param-reassign
    scene.map = map;

    return customColliders;
};

export const handleCreateEnemies = (scene) => {
    // Create slime sprite
    const slimeSprite = scene.physics.add
        .sprite(8 * TILE_WIDTH, 3 * TILE_HEIGHT, SLIME_SPRITE_NAME)
        .setName(SLIME_SPRITE_NAME)
        .setOrigin(0, 0)
        .setDepth(1);

    // // eslint-disable-next-line operator-assignment
    // slimeSprite.body.width = 12;
    // // eslint-disable-next-line operator-assignment
    // slimeSprite.body.height = 10;
    slimeSprite.body.setCircle(6);
    slimeSprite.body.setOffset(slimeSprite.body.width / 2, slimeSprite.body.height + 1);
    slimeSprite.behaviour = PATROL_BEHAVIOUR;

    slimeSprite.update = (time, delta) => {
        if (slimeSprite.body.overlapR < 10 && slimeSprite.body.overlapR > 0) {
            slimeSprite.behaviour = PATROL_BEHAVIOUR;
        }
    };

    // eslint-disable-next-line no-param-reassign
    scene.slimeSprite = slimeSprite;
};

export const handleCreateHero = (scene) => {
    const initialFrame = getSelectorData(selectHeroInitialFrame);
    const initialPosition = getSelectorData(selectHeroInitialPosition);
    const { x, y } = initialPosition;

    // Create hero sprite
    const heroSprite = scene.physics.add
        .sprite(x * TILE_WIDTH, y * TILE_HEIGHT, HERO_SPRITE_NAME, initialFrame)
        .setName(HERO_SPRITE_NAME)
        .setOrigin(0, 0)
        .setDepth(1);

    // eslint-disable-next-line operator-assignment
    heroSprite.body.width = heroSprite.body.width / 2;
    // eslint-disable-next-line operator-assignment
    heroSprite.body.height = heroSprite.body.height / 2;
    heroSprite.body.setOffset(heroSprite.body.width / 2, heroSprite.body.height);

    // Create attack animation
    heroSprite.attackSprite = scene.physics.add
        .sprite(x * TILE_WIDTH, y * TILE_HEIGHT, SWORD_SPRITE_NAME)
        .setName(SWORD_SPRITE_NAME)
        .setOrigin(0, 0)
        .setVisible(false)
        .setDepth(1);

    // eslint-disable-next-line operator-assignment
    heroSprite.attackSprite.body.width = 20;
    // eslint-disable-next-line operator-assignment
    heroSprite.attackSprite.body.height = 20;

    // const facingDirection = getSelectorData(selectHeroFacingDirection);
    // heroSprite.setFrame(
    //     IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, facingDirection)
    // );

    scene.physics.add.collider(heroSprite, scene.mapLayers);
    heroSprite.actionCollider = createInteractiveGameObject(
        scene,
        heroSprite.x + heroSprite.body.width / 2,
        heroSprite.y + heroSprite.height,
        heroSprite.body.width,
        TILE_HEIGHT / 2
    );

    // heroSprite.attackCollider = createInteractiveGameObject(
    //     scene,
    //     0,
    //     0,
    //     TILE_WIDTH,
    //     TILE_HEIGHT
    // );

    // hero presence
    heroSprite.presencePerceptionCircle = createInteractiveGameObject(
        scene,
        heroSprite.x,
        heroSprite.y,
        TILE_WIDTH * 26,
        TILE_HEIGHT * 26,
        { x: 0, y: 0 },
        true
    );

    const updateActionCollider = ({ top, right, bottom, left, width, height } = heroSprite.body) => {
        const facingDirection = getSelectorData(selectHeroFacingDirection);
        heroSprite.presencePerceptionCircle.setX(
            heroSprite.x - Math.round(heroSprite.presencePerceptionCircle.width / 2 - heroSprite.width / 2)
        );
        heroSprite.presencePerceptionCircle.setY(
            heroSprite.y - Math.round(heroSprite.presencePerceptionCircle.height / 2 - heroSprite.height / 2) + 6
        );

        switch (facingDirection) {
            case DOWN_DIRECTION: {
                heroSprite.actionCollider.body.width = heroSprite.body.width;
                heroSprite.actionCollider.body.height = TILE_HEIGHT / 2;
                heroSprite.actionCollider.setX(left);
                heroSprite.actionCollider.setY(bottom);

                break;
            }

            case UP_DIRECTION: {
                heroSprite.actionCollider.body.width = heroSprite.body.width;
                heroSprite.actionCollider.body.height = TILE_HEIGHT / 2;
                heroSprite.actionCollider.setX(left);
                heroSprite.actionCollider.setY(top - heroSprite.actionCollider.body.height);

                break;
            }

            case LEFT_DIRECTION: {
                heroSprite.actionCollider.body.height = heroSprite.body.height;
                heroSprite.actionCollider.body.width = TILE_WIDTH / 2;
                heroSprite.actionCollider.setX(left - heroSprite.actionCollider.body.width);
                heroSprite.actionCollider.setY(top);

                break;
            }

            case RIGHT_DIRECTION: {
                heroSprite.actionCollider.body.height = heroSprite.body.height;
                heroSprite.actionCollider.body.width = TILE_WIDTH / 2;
                heroSprite.actionCollider.setX(right);
                heroSprite.actionCollider.setY(top);

                break;
            }

            default: {
                break;
            }
        }
    };

    updateActionCollider({
        top: heroSprite.y + (heroSprite.height - heroSprite.body.height),
        right: heroSprite.x + heroSprite.width - (heroSprite.width - heroSprite.body.width) / 2,
        bottom: heroSprite.y + heroSprite.height,
        left: heroSprite.x + (heroSprite.width - heroSprite.body.width) / 2,
    });

    heroSprite.update = (time, delta) => {
        if (heroSprite.body.velocity.y === 0 && heroSprite.body.velocity.x === 0) {
            return;
        }

        heroSprite.attackSprite.update?.();
        updateActionCollider();
    };

    // eslint-disable-next-line no-param-reassign
    scene.heroSprite = heroSprite;
    scene.sprites.add(heroSprite);
};

export const handleObjectsLayer = (scene) => {
    // Load game objects like items, enemies, etc
    scene.map.objects.forEach((objectLayerData, layerIndex) => {
        objectLayerData?.objects?.forEach((object, objectIndex) => {
            const { gid, properties, x, y, name, width, height } = object;
            const propertiesObject = Object.fromEntries(properties?.map((curr) => [curr.name, curr.value]) || []);

            switch (gid || name) {
                case ENEMY: {
                    const spriteName = `${ENEMY_SPRITE_NAME}_${layerIndex}${objectIndex}`;
                    const enemy = scene.physics.add
                        .sprite(x, y, ENEMY_SPRITE_NAME, IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, DOWN_DIRECTION))
                        .setName(spriteName)
                        .setOrigin(0, 1)
                        .setDepth(1);

                    enemy.body.setImmovable(true);
                    scene.sprites.add(enemy);
                    scene.enemies.add(enemy);

                    enemy.setInteractive();
                    enemy.on('pointerdown', () => {
                        const { setTextTexts } = getSelectorData(selectTextSetters);
                        setTextTexts([{
                            key: 'game_title',
                            variables: {},
                            config: {},
                        }]);
                    });

                    enemy.on('pointerdown', () => {
                        scene.scene.moveBelow('GameScene', 'BattleScene');
                        scene.scene.pause('GameScene');
                        scene.scene.launch('BattleScene');

                        const {
                            setBattleItems,
                            setBattleEnemies,
                            setBattleOnHover,
                            setBattleOnSelect,
                            setBattleHoveredItem,
                        } = getSelectorData(selectBattleSetters);

                        setBattleItems([
                            ATTACK_BATTLE_ITEM,
                            ITEMS_BATTLE_ITEM,
                            DEFENSE_BATTLE_ITEM,
                            RUN_BATTLE_ITEM,
                        ]);

                        setBattleEnemies([
                            {
                                sprite: 'enemy_01',
                                position: { x: 200, y: 140 },
                                types: [ROCK_BATTLE_ITEM],
                                health: 100,
                                attack: 10,
                            },
                            {
                                sprite: 'enemy_02',
                                position: { x: 300, y: 140 },
                                types: [PAPER_BATTLE_ITEM],
                                health: 100,
                                attack: 10,
                            },
                            {
                                sprite: 'enemy_03',
                                position: { x: 400, y: 160 },
                                types: [SCISSORS_BATTLE_ITEM],
                                health: 100,
                                attack: 10,
                            },
                        ]);

                        setBattleOnSelect((item, itemIndex) => {
                            switch (item) {
                                case ATTACK_BATTLE_ITEM: {
                                    const items = [
                                        RETURN_BATTLE_ITEM,
                                    ];

                                    setBattleItems(items);
                                    setBattleOnHover((itemIndex) => {
                                        setBattleHoveredItem(itemIndex);
                                    });

                                    setBattleOnSelect((item, itemIndex) => {
                                        switch (item) {
                                            case RETURN_BATTLE_ITEM:
                                            default: {
                                                break;
                                            }
                                        }
                                    });

                                    break;
                                }
                                case ITEMS_BATTLE_ITEM: {
                                    break;
                                }
                                case DEFENSE_BATTLE_ITEM: {
                                    break;
                                }
                                case RUN_BATTLE_ITEM:
                                default: {
                                    break;
                                }
                            }

                            // setBattleItems([]);
                        });
                    });

                    const enemyActionHeroCollider = scene.physics.add.overlap(
                        enemy,
                        scene.heroSprite.actionCollider,
                        (e, a) => {
                            if (Input.Keyboard.JustDown(scene.actionKey)) {
                                const {
                                    setDialogAction,
                                    setDialogMessages,
                                    setDialogCharacterName,
                                } = getSelectorData(selectDialogSetters);
                                const dialogMessages = getSelectorData(selectDialogMessages);

                                if (dialogMessages.length === 0) {
                                    enemyActionHeroCollider.active = false;
                                    setDialogCharacterName('monster');
                                    setDialogMessages([
                                        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                                        'Praesent id neque sodales, feugiat tortor non, fringilla ex.',
                                        'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur',
                                    ]);
                                    setDialogAction(() => {
                                        // Do this to not trigger the message again
                                        // Because whenever you call JustDown once, the second time
                                        // you call it, it will be false
                                        Input.Keyboard.JustDown(scene.actionKey);
                                        setDialogCharacterName('');
                                        setDialogMessages([]);
                                        setDialogAction(null);
                                    });

                                    scene.time.delayedCall(0, () => {
                                        enemyActionHeroCollider.active = true;
                                    });
                                }
                            }
                        }
                    );

                    break;
                }

                case COIN: {
                    const spriteName = `${COIN_SPRITE_NAME}_${layerIndex}${objectIndex}`;
                    const coin = scene.physics.add
                        .sprite(x, y, COIN_SPRITE_NAME, 'coin_idle_01')
                        .setOrigin(0, 1)
                        .setName(spriteName)
                        .setDepth(1);

                    const animationKey = `${COIN_SPRITE_NAME}_idle`;
                    if (!scene.anims.exists(animationKey)) {
                        scene.anims.create({
                            key: animationKey,
                            frames: Array.from({ length: 2 }).map((n, index) => ({
                                key: COIN_SPRITE_NAME,
                                frame: `${COIN_SPRITE_NAME}_idle_${(index + 1).toString().padStart(2, '0')}`,
                            })),
                            frameRate: 3,
                            repeat: -1,
                            yoyo: false,
                        });
                    }

                    coin.anims.play(animationKey);
                    scene.items.add(coin);

                    break;
                }

                case HEART: {
                    const spriteName = `${HEART_SPRITE_NAME}_${layerIndex}${objectIndex}`;
                    const heart = scene.physics.add
                        .image(x, y, HEART_SPRITE_NAME)
                        .setOrigin(0, 1)
                        .setName(spriteName)
                        .setDepth(1);

                    scene.items.add(heart);

                    break;
                }

                case CRYSTAL: {
                    const spriteName = `${CRYSTAL_SPRITE_NAME}_${layerIndex}${objectIndex}`;
                    const crystal = scene.physics.add
                        .image(x, y, CRYSTAL_SPRITE_NAME)
                        .setOrigin(0, 1)
                        .setName(spriteName)
                        .setDepth(1);

                    scene.items.add(crystal);

                    break;
                }

                case KEY: {
                    const spriteName = `${KEY_SPRITE_NAME}_${layerIndex}${objectIndex}`;
                    const key = scene.physics.add
                        .image(x, y, KEY_SPRITE_NAME)
                        .setOrigin(0, 1)
                        .setName(spriteName)
                        .setDepth(1);

                    scene.items.add(key);

                    break;
                }

                case DOOR: {
                    const { type, map, position } = propertiesObject;
                    const customCollider = createInteractiveGameObject(scene, x, y, TILE_WIDTH, TILE_HEIGHT, {
                        x: 0,
                        y: 1,
                    });

                    const overlapCollider = scene.physics.add.overlap(scene.heroSprite, customCollider, () => {
                        scene.physics.world.removeCollider(overlapCollider);
                        const [posX, posY] = position.split(';');
                        const {
                            setHeroInitialFrame,
                            setHeroFacingDirection,
                            setHeroInitialPosition,
                            setHeroPreviousPosition,
                        } = getSelectorData(selectHeroSetters);
                        const { setMapKey } = getSelectorData(selectMapSetters);
                        const facingDirection = getSelectorData(selectHeroFacingDirection);

                        setMapKey(map);
                        setHeroFacingDirection(facingDirection);
                        setHeroInitialFrame(IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, facingDirection));
                        setHeroInitialPosition({ x: posX, y: posY });
                        setHeroPreviousPosition({ x: posX, y: posY });

                        const { setShouldPauseScene } = getSelectorData(selectGameSetters);
                        setShouldPauseScene('GameScene', true);
                        changeScene(scene, 'GameScene', {
                            atlases: ['hero', 'sword', 'slime'],
                            images: [],
                            mapKey: map,
                        }, {
                            fadeType: 'out',
                        });
                    });

                    break;
                }

                // case 'encounter': {
                //     const customCollider = createInteractiveGameObject(
                //         scene,
                //         x,
                //         y,
                //         width,
                //         height
                //     );
                //
                //     const overlapCollider = scene.physics.add.overlap(scene.heroSprite, customCollider, () => {
                //         // TODO
                //     });
                //
                //     break;
                // }

                default: {
                    break;
                }
            }
        });
    });
};

export const handleConfigureCamera = (scene) => {
    const { game } = scene.sys;
    const camera = scene.cameras.main;
    // console.log(JSON.stringify(game.scale.gameSize));

    // Configure the main camera
    camera.startFollow(scene.heroSprite, true);
    camera.setFollowOffset(-scene.heroSprite.width, -scene.heroSprite.height);
    camera.setBounds(
        0,
        0,
        Math.max(scene.map.widthInPixels, game.scale.gameSize.width),
        Math.max(scene.map.heightInPixels, game.scale.gameSize.height)
    );

    if (scene.map.widthInPixels < game.scale.gameSize.width) {
        camera.setPosition(Math.round((game.scale.gameSize.width - scene.map.widthInPixels) / 2));
    }

    if (scene.map.heightInPixels < game.scale.gameSize.height) {
        camera.setPosition(camera.x, Math.round((game.scale.gameSize.height - scene.map.heightInPixels) / 2));
    }
};

export const handleCreateEnemiesAnimations = (scene) => {
    [UP_DIRECTION, DOWN_DIRECTION, LEFT_DIRECTION, RIGHT_DIRECTION].forEach((direction) => {
        createAnimation(
            scene,
            SLIME_SPRITE_NAME,
            `walk_${direction}`,
            3,
            3,
            -1,
            true
        );
    });

    scene.slimeSprite.anims.play('slime_walk_down');
};

export const handleCreateHeroAnimations = (scene) => {
    // Animations
    [UP_DIRECTION, DOWN_DIRECTION, LEFT_DIRECTION, RIGHT_DIRECTION].forEach((direction) => {
        createAnimation(
            scene,
            HERO_SPRITE_NAME,
            `walk_${direction}`,
            3,
            6,
            -1,
            true
        );
    });

    [UP_DIRECTION, DOWN_DIRECTION, LEFT_DIRECTION, RIGHT_DIRECTION].forEach((direction) => {
        createAnimation(
            scene,
            HERO_SPRITE_NAME,
            `attack_${direction}`,
            1,
            4,
            0,
            false
        );
    });

    // [UP_DIRECTION, DOWN_DIRECTION, LEFT_DIRECTION, RIGHT_DIRECTION].forEach((direction) => {
    //     createAnimation(
    //         scene,
    //         SWORD_SPRITE_NAME,
    //         `attack_${direction}`,
    //         1,
    //         4,
    //         0,
    //         false
    //     );
    // });
};

export const handleHeroMovement = (scene, heroSpeed = 80) => {
    const dialogMessages = getSelectorData(selectDialogMessages);
    if (dialogMessages.length > 0) {
        return;
    }

    const { setHeroFacingDirection } = getSelectorData(selectHeroSetters);

    let velocityX = 0;
    let velocityY = 0;
    let animName = null;

    if (scene.cursors.up.isDown || scene.wasd[UP_DIRECTION].isDown) {
        velocityY = -heroSpeed;
        animName = `${HERO_SPRITE_NAME}_walk_${UP_DIRECTION}`;
        setHeroFacingDirection(UP_DIRECTION);
    } else if (scene.cursors.down.isDown || scene.wasd[DOWN_DIRECTION].isDown) {
        velocityY = heroSpeed;
        animName = `${HERO_SPRITE_NAME}_walk_${DOWN_DIRECTION}`;
        setHeroFacingDirection(DOWN_DIRECTION);
    }

    if (scene.cursors.left.isDown || scene.wasd[LEFT_DIRECTION].isDown) {
        velocityX = -heroSpeed;
        animName = `${HERO_SPRITE_NAME}_walk_${LEFT_DIRECTION}`;
        setHeroFacingDirection(LEFT_DIRECTION);
    } else if (scene.cursors.right.isDown || scene.wasd[RIGHT_DIRECTION].isDown) {
        velocityX = heroSpeed;
        animName = `${HERO_SPRITE_NAME}_walk_${RIGHT_DIRECTION}`;
        setHeroFacingDirection(RIGHT_DIRECTION);
    }

    // Adjust velocity for diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
        velocityX *= 1 / Math.sqrt(2);
        velocityY *= 1 / Math.sqrt(2);
    }

    if (scene.heroSprite.anims.isPlaying && !scene.heroSprite.anims.currentAnim?.key.includes('walk')) {
        scene.heroSprite.body.setVelocity(0, 0); // TODO maybe
        return;
    }

    scene.heroSprite.body.setVelocity(velocityX, velocityY);
    if (animName) {
        scene.heroSprite.anims.play(animName, true);
    } else {
        scene.heroSprite.anims.stop();
        const facingDirection = getSelectorData(selectHeroFacingDirection);
        scene.heroSprite.setFrame(IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, facingDirection));
    }
};

export const changeScene = (scene, nextScene, assets = {}, config = {}) => {
    // const sceneKey = scene.scene.key;
    // scene.scene.stop(sceneKey);
    const startNewScene = () => {
        // const loadAssetsScene = scene.game.scene.getScene('LoadAssetsScene');
        scene.scene.start('LoadAssetsScene', {
            nextScene,
            assets,
        });
    };

    const { fadeType } = config;
    if (fadeType) {
        fade(scene, startNewScene, 'right', fadeType);
        return;
    }

    startNewScene();
};

export const fadeOut = (scene, callback = null, direction = 'right') => {
    fade(scene, callback, direction, 'out');
};

export const fadeIn = (scene, callback = null, direction = 'left') => {
    fade(scene, callback, direction, 'in');
};

const fade = (scene, callback, direction, type) => {
    const blackBlock = scene.add.graphics();
    const multiplier = direction === 'right' ? 1 : -1;
    blackBlock.fillStyle(0x000000);

    // TODO get sizes from store
    blackBlock.fillRect(
        -scene.game.config.width * (type === 'in' ? 0 : multiplier),
        0,
        scene.game.config.width,
        scene.game.config.height
    );
    // blackBlock.setAlpha(0);
    blackBlock.setDepth(Number.POSITIVE_INFINITY);

    scene.tweens.add({
        targets: blackBlock,
        x: scene.game.config.width * (type === 'in' ? -2 : multiplier),
        // alpha: 1,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
            callback?.();
            // blackBlock.clear();
            // blackBlock.destroy();
        },
    });
};
