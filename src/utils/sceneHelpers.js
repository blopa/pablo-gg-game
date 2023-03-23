import { Input, Math as PhaserMath } from 'phaser';

// Constants
import {
    DOOR,
    SLIME,
    IDLE_FRAME,
    TILE_WIDTH,
    TILE_HEIGHT,
    UP_DIRECTION,
    LEFT_DIRECTION,
    DOWN_DIRECTION,
    RIGHT_DIRECTION,
    PATROL_BEHAVIOUR,
    FOLLOW_BEHAVIOUR,
    HERO_SPRITE_NAME,
    SWORD_SPRITE_NAME,
    SLIME_SPRITE_NAME,
    SHOULD_TILE_COLLIDE,
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
import { selectDialogMessages } from '../zustand/dialog/selectDialog';
import { selectMapKey, selectTilesets, selectMapSetters } from '../zustand/map/selectMapData';
import {
    selectHeroSetters,
    selectHeroInitialFrame,
    selectHeroInitialPosition,
    selectHeroFacingDirection,
} from '../zustand/hero/selectHeroData';
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

export const handleCreateEnemy = (scene, spriteName, position, enemyType, enemyHealth) => {
    // Create slime sprite
    const enemySprite = scene.physics.add
        .sprite(position.x, position.y, spriteName)
        .setName(spriteName)
        .setOrigin(0, 0)
        .setDepth(1);

    enemySprite.body.setCircle(6);
    enemySprite.body.setOffset(enemySprite.body.width / 2, enemySprite.body.height + 1);
    enemySprite.behaviour = PATROL_BEHAVIOUR;

    enemySprite.update = (time, delta) => {
        if (enemySprite.body.overlapR < 10 && enemySprite.body.overlapR > 0) {
            enemySprite.behaviour = PATROL_BEHAVIOUR;
        }
    };

    const [calculateEnemyFollowPaths, timeOutFunctionId] = getCalculateEnemyFollowPaths(scene);
    enemySprite.handleEnemyStoppedMoving = () => {
        if (enemySprite.isTakingDamage) {
            timeOutFunctionId?.remove?.();
            return;
        }

        const distance = PhaserMath.Distance.Between(
            scene.heroSprite.x,
            scene.heroSprite.y,
            enemySprite.x,
            enemySprite.y
        );

        if (distance < (TILE_HEIGHT * TILE_WIDTH) / 2) {
            scene.gridEngine.moveRandomly(SLIME_SPRITE_NAME, 10, 1);
        } else {
            calculateEnemyFollowPaths();
        }
    };

    enemySprite.handleStopTakingDamage = () => {
        enemySprite.isTakingDamage = false;
        calculateEnemyFollowPaths();
    };

    enemySprite.handlePerceptedHero = () => {
        enemySprite.behaviour = FOLLOW_BEHAVIOUR;
        calculateEnemyFollowPaths();
    };

    const enemyImage = scene.add.image(
        enemySprite.x,
        enemySprite.y,
        SLIME_SPRITE_NAME,
        enemySprite.frame.name
    ).setOrigin(0.2, 0.35);
    enemyImage.setAlpha(0);

    enemySprite.handleTakeDamage = (damage, attackDirection) => {
        // const attackAnimation = scene.anims.anims.get('hero_attack_down');
        // const attackAnimationDuration = attackAnimation.duration; // / attackAnimation.frameRate;
        const animationDuration = 90;

        const pos = scene.gridEngine.getPosition(SLIME_SPRITE_NAME);
        scene.gridEngine.stopMovement(SLIME_SPRITE_NAME);
        scene.gridEngine.setSpeed(SLIME_SPRITE_NAME, 20);
        enemyImage.setPosition(enemySprite.x + (enemySprite.body.width / 2), enemySprite.y);
        enemyImage.setFrame(enemySprite.frame.name);
        enemySprite.setAlpha(0);
        enemyImage.setAlpha(1);

        switch (attackDirection) {
            case 'attack_up_01': {
                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_down`);
                scene.gridEngine.setPosition(SLIME_SPRITE_NAME, {
                    x: pos.x,
                    y: pos.y - 1,
                });

                scene.tweens.add({
                    targets: enemyImage,
                    duration: animationDuration,
                    x: pos.x * TILE_WIDTH,
                    y: (pos.y - 1) * TILE_HEIGHT,
                    ease: 'Power1',
                });

                break;
            }
            case 'attack_right_01': {
                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_left`);
                scene.gridEngine.setPosition(SLIME_SPRITE_NAME, {
                    x: pos.x + 1,
                    y: pos.y,
                });

                scene.tweens.add({
                    targets: enemyImage,
                    duration: animationDuration,
                    x: (pos.x + 1) * TILE_WIDTH,
                    y: pos.y * TILE_HEIGHT,
                    ease: 'Power1',
                });

                break;
            }
            case 'attack_down_01': {
                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_up`);
                scene.gridEngine.setPosition(SLIME_SPRITE_NAME, {
                    x: pos.x,
                    y: pos.y + 1,
                });

                scene.tweens.add({
                    targets: enemyImage,
                    duration: animationDuration,
                    x: pos.x * TILE_WIDTH,
                    y: (pos.y + 1) * TILE_HEIGHT,
                    ease: 'Power1',
                });

                break;
            }
            case 'attack_left_01': {
                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_right`);
                scene.gridEngine.setPosition(SLIME_SPRITE_NAME, {
                    x: pos.x - 1,
                    y: pos.y,
                });

                scene.tweens.add({
                    targets: enemyImage,
                    duration: animationDuration,
                    x: (pos.x - 1) * TILE_WIDTH,
                    y: pos.y * TILE_HEIGHT,
                    ease: 'Power1',
                });

                break;
            }

            default: {
                break;
            }
        }

        const damageNumber = scene.add.text(
            enemySprite.x + 10,
            enemySprite.y + 5,
            `-${damage}`,
            { fontFamily: '"Press Start 2P"', fontSize: 8, color: '#ff0000' }
        ).setOrigin(0.5);

        // Add blinking effect
        const blinkTween = scene.tweens.add({
            targets: enemyImage,
            alpha: 0,
            duration: Math.floor(animationDuration / 3),
            // duration: animationDuration,
            ease: 'Power1',
            repeat: 3,
            yoyo: true,
            onComplete: () => {
                enemySprite.setAlpha(1);
                enemyImage.setAlpha(0);
            },
        });

        scene.tweens.add({
            targets: damageNumber,
            alpha: 0,
            duration: 1000,
            onUpdate: (tween, target) => {
                damageNumber.x = enemySprite.x + 10;
                damageNumber.y = enemySprite.y + 5 - tween.totalProgress * 5;
            },
            onComplete: () => {
                damageNumber.destroy();
                blinkTween.stop();
            },
        });
    };

    scene.gridEngine.addCharacter({
        id: SLIME_SPRITE_NAME,
        sprite: enemySprite,
        speed: 1,
        startPosition: {
            x: position.x / TILE_WIDTH,
            y: position.y / TILE_HEIGHT,
        },
        // offsetY: 4,
    });
    scene.gridEngine.moveRandomly(SLIME_SPRITE_NAME, 2000, 2);

    scene.enemies.add(enemySprite);
    // eslint-disable-next-line no-param-reassign
    scene.slimeSprite = enemySprite;
};

export const getCalculateEnemyFollowPaths = (scene) => {
    let timeOutFunctionId;
    const calculateEnemyFollowPaths = () => {
        // console.log('running thiiis', ((new Error()).stack.split('\n')[2].trim().split(' ')[2]));
        const movement = scene.gridEngine.getMovement(SLIME_SPRITE_NAME);
        timeOutFunctionId?.remove?.();
        timeOutFunctionId = null;

        if (scene.slimeSprite.isTakingDamage) {
            return;
        }

        // TODO add a if condition that checks for hero range
        if (
            (!scene.gridEngine.isMoving(SLIME_SPRITE_NAME) && movement.type === 'Target')
            || scene.slimeSprite.behaviour !== FOLLOW_BEHAVIOUR
        ) {
            // scene.gridEngine.stopMovement(SLIME_SPRITE_NAME);
            scene.gridEngine.moveRandomly(SLIME_SPRITE_NAME, 2000, 4);
            scene.gridEngine.setSpeed(SLIME_SPRITE_NAME, 1);
            return;
        }

        scene.gridEngine.setSpeed(SLIME_SPRITE_NAME, 2);
        scene.gridEngine.moveTo(SLIME_SPRITE_NAME, {
            x: Math.round(scene.heroSprite.x / TILE_WIDTH),
            y: Math.round(scene.heroSprite.y / TILE_HEIGHT),
        });

        timeOutFunctionId = scene.time.delayedCall(1000, () => {
            calculateEnemyFollowPaths();
        });
    };

    return [calculateEnemyFollowPaths, timeOutFunctionId];
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
                case SLIME: {
                    const { type, health } = propertiesObject;
                    handleCreateEnemy(
                        scene,
                        SLIME_SPRITE_NAME,
                        { x, y },
                        type,
                        health
                    );

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
                            atlases: ['hero', 'sword'],
                            images: [],
                            mapKey: map,
                        }, {
                            fadeType: 'out',
                        });
                    });

                    break;
                }

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
