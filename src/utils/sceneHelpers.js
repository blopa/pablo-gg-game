import { Input, Math as PhaserMath } from 'phaser';

// Constants
import {
    DOOR,
    SLIME,
    UI_DEPTH,
    IDLE_FRAME,
    HERO_DEPTH,
    TILE_WIDTH,
    ENEMY_DEPTH,
    TILE_HEIGHT,
    UP_DIRECTION,
    DOWN_DIRECTION,
    LEFT_DIRECTION,
    RIGHT_DIRECTION,
    PATROL_BEHAVIOUR,
    FOLLOW_BEHAVIOUR,
    HERO_SPRITE_NAME,
    SLIME_SPRITE_NAME,
    SWORD_SPRITE_NAME,
    SHOULD_TILE_COLLIDE,
    ENEMY_SPRITE_PREFIX,
    IDLE_FRAME_POSITION_KEY,
} from '../constants';

// Utils
import { createInteractiveGameObject, getDegreeFromRadians, getSelectorData, rotateRectangleInsideTile } from './utils';

// Selectors
import { selectDialogMessages } from '../zustand/dialog/selectDialog';
import { selectMapKey, selectMapSetters, selectTilesets } from '../zustand/map/selectMapData';
import {
    selectHeroSetters,
    selectHeroInitialFrame,
    selectHeroCurrentHealth,
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

export const handleCreateEnemy = (scene, spriteName, position, enemyType, enemyFamily, enemyHealth) => {
    // Create slime sprite
    const enemySprite = scene.physics.add
        .sprite(position.x, position.y, SLIME_SPRITE_NAME)
        .setName(spriteName)
        .setOrigin(0, 0)
        .setDepth(ENEMY_DEPTH);

    enemySprite.body.setCircle(6);
    enemySprite.body.setOffset(enemySprite.body.width / 2, enemySprite.body.height + 1);
    enemySprite.behaviour = PATROL_BEHAVIOUR;
    enemySprite.totalHealth = enemyHealth;
    enemySprite.currentHealth = enemyHealth;
    enemySprite.enemyFamily = enemyFamily;
    enemySprite.enemyType = enemyType;

    enemySprite.update = (time, delta) => {
        if (enemySprite.body.overlapR < 10 && enemySprite.body.overlapR > 0) {
            enemySprite.behaviour = PATROL_BEHAVIOUR;
        }
    };

    const [calculateEnemyFollowPaths, timeOutFunctionId] = getCalculateEnemyFollowPaths(scene, enemySprite);
    enemySprite.handleEnemyStoppedMoving = () => {
        if (enemySprite.isTakingDamage) {
            timeOutFunctionId?.remove?.();
            return;
        }

        calculateEnemyFollowPaths();
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
    )
        .setOrigin(0.2, 0.35)
        .setDepth(ENEMY_DEPTH)
        .setAlpha(0);

    enemySprite.handleTakeDamage = (damage, attackDirection) => {
        enemySprite.currentHealth -= damage;

        if (enemySprite.currentHealth <= 0) {
            scene.gridEngine.removeCharacter(spriteName);
            enemySprite.destroy(true);
            enemyImage.destroy(true);
            return;
        }

        // const attackAnimation = scene.anims.anims.get('hero_attack_down');
        // const attackAnimationDuration = attackAnimation.duration; // / attackAnimation.frameRate;
        const animationDuration = 90;

        const pos = scene.gridEngine.getPosition(spriteName);
        scene.gridEngine.stopMovement(spriteName);
        scene.gridEngine.setSpeed(spriteName, 20);
        enemyImage.setPosition(enemySprite.x + (enemySprite.body.width / 2), enemySprite.y);
        enemyImage.setFrame(enemySprite.frame.name);

        // TODO there is a bug when you hit the enemy again right after hitting it, it will cancel the blinking animation
        enemySprite.setAlpha(0);
        enemyImage.setAlpha(1);

        switch (attackDirection) {
            case 'attack_up_01': {
                const newPos = {
                    x: pos.x,
                    y: pos.y - 1,
                };

                if (scene.gridEngine.isTileBlocked(newPos)) {
                    enemySprite.setAlpha(1);
                    enemyImage.setAlpha(0);
                    break;
                }

                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_down`);
                scene.gridEngine.setPosition(spriteName, newPos);

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
                const newPos = {
                    x: pos.x + 1,
                    y: pos.y,
                };

                if (scene.gridEngine.isTileBlocked(newPos)) {
                    enemySprite.setAlpha(1);
                    enemyImage.setAlpha(0);
                    break;
                }

                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_left`);
                scene.gridEngine.setPosition(spriteName, newPos);

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
                const newPos = {
                    x: pos.x,
                    y: pos.y + 1,
                };

                if (scene.gridEngine.isTileBlocked(newPos)) {
                    enemySprite.setAlpha(1);
                    enemyImage.setAlpha(0);
                    break;
                }

                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_up`);
                scene.gridEngine.setPosition(spriteName, newPos);

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
                const newPos = {
                    x: pos.x - 1,
                    y: pos.y,
                };

                if (scene.gridEngine.isTileBlocked(newPos)) {
                    enemySprite.setAlpha(1);
                    enemyImage.setAlpha(0);
                    break;
                }

                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_right`);
                scene.gridEngine.setPosition(spriteName, newPos);

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

        // Display damage number
        displayDamageNumber(scene, enemySprite, damage);

        // Add blinking effect
        createBlinkingEffect(
            scene,
            enemyImage,
            Math.floor(animationDuration / 3),
            () => {
                enemySprite.setAlpha(1);
                enemyImage.setAlpha(0);
            }
        );
    };

    enemySprite.onAttackOverlap = (attackSprite, enemySprite) => {
        if (
            enemySprite.isTakingDamage
            || !attackSprite.visible
            || attackSprite.enemies.includes(enemySprite)
        ) {
            return;
        }

        // eslint-disable-next-line no-param-reassign
        enemySprite.isTakingDamage = true;
        enemySprite.handleTakeDamage(10, attackSprite.frame.name);
        attackSprite.enemies.push(enemySprite);

        // scene.gridEngine.stopMovement(spriteName);
        // const position = scene.gridEngine.getPosition(spriteName);
    };

    enemySprite.onPresenceOverlap = (presencePerceptionCircle, enemySprite) => {
        if (enemySprite.body.overlapR > 100 && enemySprite.behaviour !== FOLLOW_BEHAVIOUR) {
            enemySprite.handlePerceptedHero();
        }
    };

    scene.gridEngine.addCharacter({
        id: spriteName,
        sprite: enemySprite,
        speed: 1,
        startPosition: {
            x: position.x / TILE_WIDTH,
            y: position.y / TILE_HEIGHT,
        },
        // offsetY: 4,
    });
    scene.gridEngine.moveRandomly(spriteName, 2000, 2);

    scene.enemies.add(enemySprite);

    // Create enemy animation
    handleCreateEnemiesAnimations(scene, enemySprite);
};

export const subscribeToGridEngineEvents = (scene) => {
    scene.gridEngine.movementStopped().subscribe(({ charId, direction }) => {
        if (charId.includes(ENEMY_SPRITE_PREFIX)) {
            const enemySprite = scene.enemies.getChildren().find(({ name }) => name === charId);

            if (enemySprite) {
                enemySprite.handleEnemyStoppedMoving();
            }
        }
    });

    scene.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
        if (charId.includes(ENEMY_SPRITE_PREFIX)) {
            const enemySprite = scene.enemies.getChildren().find(({ name }) => name === charId);

            if (enemySprite && !enemySprite.isTakingDamage) {
                enemySprite.anims.play(`${SLIME_SPRITE_NAME}_walk_${direction}`);
            }
        }
    });
};

export const getCalculateEnemyFollowPaths = (scene, enemySprite) => {
    let timeOutFunctionId;
    const calculateEnemyFollowPaths = () => {
        // console.log('running thiiis', ((new Error()).stack.split('\n')[2].trim().split(' ')[2]));
        const allEnemies = scene.gridEngine.getAllCharacters();

        timeOutFunctionId?.remove?.();
        timeOutFunctionId = null;

        if (!allEnemies.includes(enemySprite.name) || !enemySprite || enemySprite.isTakingDamage) {
            return;
        }

        if (enemySprite.behaviour !== FOLLOW_BEHAVIOUR) {
            // scene.gridEngine.stopMovement(enemySprite.name);
            scene.gridEngine.moveRandomly(enemySprite.name, 2000, 4);
            scene.gridEngine.setSpeed(enemySprite.name, 1);
            return;
        }

        const distance = PhaserMath.Distance.Between(
            scene.heroSprite.x,
            scene.heroSprite.y,
            enemySprite.x,
            enemySprite.y
        );

        const movement = scene.gridEngine.getMovement(enemySprite.name);
        if (
            (!scene.gridEngine.isMoving(enemySprite.name) && movement.type === 'Target')
            && distance < (TILE_HEIGHT * TILE_WIDTH) / 2
        ) {
            scene.gridEngine.moveRandomly(enemySprite.name, 10, 1);
        } else {
            scene.gridEngine.setSpeed(enemySprite.name, 2);
            scene.gridEngine.moveTo(enemySprite.name, {
                x: Math.round(scene.heroSprite.x / TILE_WIDTH),
                y: Math.round(scene.heroSprite.y / TILE_HEIGHT),
            });
        }

        timeOutFunctionId = scene.time.delayedCall(1000, () => {
            calculateEnemyFollowPaths();
        });
    };

    return [calculateEnemyFollowPaths, timeOutFunctionId];
};

export const createBlinkingEffect = (scene, targetSprite, duration, handleOnComplete) => {
    scene.tweens.add({
        targets: targetSprite,
        alpha: 0,
        duration,
        ease: 'Power1',
        repeat: 3,
        yoyo: true,
        onComplete: () => {
            handleOnComplete?.();
        },
    });
};

export const displayDamageNumber = (scene, targetSprite, damage) => {
    const damageNumber = scene.add.text(
        targetSprite.x + 10,
        targetSprite.y + 5,
        `-${damage}`,
        { fontFamily: '"Press Start 2P"', fontSize: 8, color: '#ff0000' }
    )
        .setOrigin(0.5)
        .setDepth(UI_DEPTH);

    scene.tweens.add({
        targets: damageNumber,
        alpha: 0,
        duration: 1000,
        onUpdate: (tween, target) => {
            damageNumber.x = targetSprite.x + 10;
            damageNumber.y = targetSprite.y + 5 - tween.totalProgress * 5;
        },
        onComplete: () => {
            damageNumber.destroy();

            // by the time the tween is over
            // the sprite might have been deleted already
            targetSprite?.anims?.stop?.();
        },
    });
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
        .setDepth(HERO_DEPTH);

    // eslint-disable-next-line operator-assignment
    // heroSprite.body.width = heroSprite.body.width / 2;
    // eslint-disable-next-line operator-assignment
    // heroSprite.body.height = heroSprite.body.height / 2;
    heroSprite.body.setCircle(heroSprite.body.width / 4);
    heroSprite.body.setOffset(heroSprite.body.width / 2, heroSprite.body.height);

    // Create attack animation
    heroSprite.attackSprite = scene.physics.add
        .sprite(x * TILE_WIDTH, y * TILE_HEIGHT, SWORD_SPRITE_NAME)
        .setName(SWORD_SPRITE_NAME)
        .setOrigin(0, 0)
        .setVisible(false)
        .setDepth(HERO_DEPTH);

    // eslint-disable-next-line operator-assignment
    heroSprite.attackSprite.body.width = 20;
    // eslint-disable-next-line operator-assignment
    heroSprite.attackSprite.body.height = 20;
    heroSprite.attackSprite.enemies = [];

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

    heroSprite.handleTakeDamage = (damage, enemySprite, heroEnemyOverlap) => {
        if (
            heroSprite.body.overlapR === enemySprite.body.overlapR
            && heroSprite.body.overlapR < 5
        ) {
            return;
        }

        const { setHeroCurrentHealth } = getSelectorData(selectHeroSetters);
        const currentHealth = getSelectorData(selectHeroCurrentHealth);
        const newHealth = setHeroCurrentHealth(currentHealth - damage);

        // eslint-disable-next-line no-param-reassign
        heroEnemyOverlap.active = false;

        // eslint-disable-next-line no-param-reassign
        heroSprite.isTakingDamage = true;

        // Calculate the x and y positions relative to the enemySprite
        const deltaX = enemySprite.x - heroSprite.x;
        const deltaY = enemySprite.y - heroSprite.y;

        // Check if deltaX is positive or negative and multiply by 1 or -1 accordingly
        const newX = heroSprite.x - (deltaX > 0 ? 1 : -1) * TILE_WIDTH / 2;
        // Check if deltaY is positive or negative and multiply by 1 or -1 accordingly
        const newY = heroSprite.y - (deltaY > 0 ? 1 : -1) * TILE_HEIGHT / 2;

        // Display damage number
        displayDamageNumber(
            scene,
            heroSprite,
            Math.abs(newHealth - currentHealth)
        );

        // Add blinking effect
        createBlinkingEffect(
            scene,
            heroSprite,
            50,
            () => {
                heroSprite.setAlpha(1);
                // eslint-disable-next-line no-param-reassign
                heroEnemyOverlap.active = true;
                // eslint-disable-next-line no-param-reassign
                heroSprite.isTakingDamage = false;
            }
        );

        // Create the tween animation to move the heroSprite
        scene.tweens.add({
            targets: heroSprite,
            x: newX,
            y: newY,
            ease: 'Power1',
            duration: 40,
            onUpdate: () => {
                scene.heroSprite.attackSprite.update?.();
            },
            onComplete: () => {
                heroSprite.updateActionCollider();
            },
        });
    };

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

    heroSprite.updateActionCollider = updateActionCollider;

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
                        `${ENEMY_SPRITE_PREFIX}_${SLIME_SPRITE_NAME}_${objectIndex}`,
                        { x, y },
                        type,
                        SLIME_SPRITE_NAME,
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

export const handleCreateEnemiesAnimations = (scene, enemySprite) => {
    // TODO check if animation already exists first
    [UP_DIRECTION, DOWN_DIRECTION, LEFT_DIRECTION, RIGHT_DIRECTION].forEach((direction) => {
        createAnimation(
            scene,
            enemySprite.enemyFamily,
            `walk_${direction}`,
            3,
            3,
            -1,
            true
        );
    });

    enemySprite.anims.play(`${enemySprite.enemyFamily}_walk_${DOWN_DIRECTION}`);
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
