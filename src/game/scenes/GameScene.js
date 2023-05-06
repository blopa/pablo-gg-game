import { Physics, Geom, Display, Math as PhaserMath } from 'phaser';
import { GridEngine } from 'grid-engine';

// Utils
import {
    fadeIn,
    handleCreateMap,
    handleCreateBomb,
    handleCreateHero,
    handleObjectsLayer,
    handleCreateGroups,
    handleCreateControls,
    handleConfigureCamera,
    generateColorPixelTexture,
    handleCreateHeroAnimations,
    animateCanvasDayNightEffect,
    subscribeToGridEngineEvents,
    calculateClosestStaticElement,
} from '../../utils/sceneHelpers';
import { getSelectorData, getMapWeatherFromMap, getMapTypeFromMap } from '../../utils/utils';

// Selectors
import {
    selectGameWidth,
    selectGameHeight,
    selectGameSetters,
    selectGameControls,
    selectShouldPauseScene,
    selectGameCanvasElement,
} from '../../zustand/game/selectGameData';
import { selectHeroFacingDirection, selectHeroSetters } from '../../zustand/hero/selectHeroData';

// Constants
import {
    IDLE_FRAME,
    TILE_WIDTH,
    TILE_HEIGHT,
    UP_DIRECTION,
    RAINY_WEATHER,
    DOWN_DIRECTION,
    LEFT_DIRECTION,
    RIGHT_DIRECTION,
    MAP_TYPE_INDOOR,
    HERO_SPRITE_NAME,
    ELEMENT_BOX_TYPE,
    ELEMENT_GRASS_TYPE,
    SHOULD_TILE_COLLIDE,
    WEATHER_STRENGTH_WEAK,
    WEATHER_DIRECTION_LEFT,
    IDLE_FRAME_POSITION_KEY,
    WEATHER_STRENGTH_MEDIUM,
    WEATHER_STRENGTH_STRONG,
} from '../../constants';
import { selectDialogMessages } from '../../zustand/dialog/selectDialog';

export const key = 'GameScene';

export const sceneHelpers = {};

export const preload = () => {
    const scene = sceneHelpers.getScene();

    if (!scene.gridEngine) {
        scene.load.scenePlugin('gridEngine', GridEngine, 'gridEngine', 'gridEngine');
    }
};

export function create() {
    const scene = sceneHelpers.getScene();
    // scene.gridEngine = scene.game.scene.scenes.find((s) => s.scene.key === key).gridEngine;
    // scene.plugins.installScenePlugin('gridEngine', GridEngine, 'gridEngine' );
    // scene.input.on('pointerup', (pointer) => {
    //     console.log('clicky click');
    // });
    const { addGameCameraSizeUpdateCallback, setGameShowHeadsUpDisplay } = getSelectorData(selectGameSetters);
    const controls = getSelectorData(selectGameControls);
    console.log(controls);

    // All of these functions need to be called in order

    // Create controls
    handleCreateControls(scene);

    // Create game groups
    handleCreateGroups(scene);

    // Create hero sprite
    handleCreateHero(scene);

    // Create the map
    const customColliders = handleCreateMap(scene);

    // Load game objects like items, enemies, etc
    handleObjectsLayer(scene);

    // Configure the main camera
    handleConfigureCamera(scene);
    addGameCameraSizeUpdateCallback(() => {
        handleConfigureCamera(scene);
    });

    // TODO Hero animations
    handleCreateHeroAnimations(scene.heroSprite);

    // Subscribe to grid-engine events
    subscribeToGridEngineEvents(scene);

    fadeIn(scene, () => {
        setGameShowHeadsUpDisplay(true);
    });

    // Handle collisions
    scene.physics.add.collider(scene.heroSprite, scene.mapLayers);
    scene.physics.add.collider(scene.heroSprite, scene.bombs);
    const heroEnemyOverlap = scene.physics.add.overlap(scene.heroSprite, scene.enemies, (heroSprite, enemySprite) => {
        // console.log('overlap', 'heroSprite, enemySprite', enemyHeroOverlap);
        heroSprite.handleTakeDamage(5, enemySprite, heroEnemyOverlap);
        // enemySprite.handleHeroOverlap?.(heroSprite);
    });

    // scene.physics.world.on('worldstep', () => {
    //     scene.heroSprite.x = PhaserMath.snapTo(scene.heroSprite.x, 1);
    //     scene.heroSprite.y = PhaserMath.snapTo(scene.heroSprite.y, 1);
    // });

    // scene.physics.add.collider(scene.mapLayers, scene.elements);
    scene.physics.add.collider(scene.heroSprite, scene.elements);
    // scene.physics.add.collider(scene.elements, null);
    scene.physics.add.collider(scene.heroSprite, customColliders);

    const overlaps = new Set();
    scene.physics.add.overlap(scene.heroSprite.actionCollider, scene.elements, (actionCollider, element) => {
        overlaps.add(element);
    });

    scene.heroSprite.actionCollider.on('overlapend', () => {
        overlaps.clear();
        // console.log('overlapend', overlaps);
    });

    // scene.heroSprite.actionCollider.on('overlapstart', () => {
    //     console.log('overlapstart', overlaps);
    // });

    scene.physics.add.overlap(
        scene.heroSprite.attackSprite,
        scene.enemies,
        (attackSprite, enemySprite) => {
            enemySprite.onAttackOverlap(attackSprite, enemySprite);
        }
    );

    scene.physics.add.overlap(
        scene.heroSprite.attackSprite,
        scene.elements,
        (attackSprite, elementSprite) => {
            if (elementSprite.elementType === ELEMENT_GRASS_TYPE) {
                elementSprite.handleDestroyElement();
            }
        }
    );

    scene.physics.add.overlap(
        scene.heroSprite.presencePerceptionCircle,
        scene.enemies,
        (presencePerceptionCircle, enemySprite) => {
            enemySprite.onPresenceOverlap(presencePerceptionCircle, enemySprite);
        }
    );

    // TODO
    // scene.input.keyboard.on('keydown-SHIFT', () => {
    //     const { heroSprite } = scene;
    //     const heroFacingDirection = getSelectorData(selectHeroFacingDirection);
    //     const jumpTween = scene.tweens.add({
    //         targets: heroSprite,
    //         duration: 300,
    //         ease: 'Quad.easeOut',
    //         y: heroSprite.y - 24,
    //         // y: heroSprite.y + (heroFacingDirection === 'up' ? 16 : heroFacingDirection === 'down' ? -16 : 0),
    //         x: heroSprite.x + (heroFacingDirection === 'left' ? -32 : heroFacingDirection === 'right' ? 32 : 0),
    //         onComplete: () => {
    //             scene.tweens.add({
    //                 targets: heroSprite,
    //                 duration: 300,
    //                 ease: 'Quad.easeIn',
    //                 y: heroSprite.y + 24,
    //             });
    //         },
    //     });
    // });

    const heroSpeed = 80;
    const handleHeroStartMovement = (direction) => (event) => {
        const dialogMessages = getSelectorData(selectDialogMessages);
        if (dialogMessages.length > 0) {
            return;
        }

        const { setHeroFacingDirection } = getSelectorData(selectHeroSetters);

        let velocityX = scene.heroSprite.body.velocity.x;
        let velocityY = scene.heroSprite.body.velocity.y;
        let multiplierY = 0;
        let multiplierX = 0;
        let facingDirection = DOWN_DIRECTION;

        switch (direction) {
            case UP_DIRECTION: {
                multiplierY = -1;
                facingDirection = UP_DIRECTION;
                break;
            }

            case DOWN_DIRECTION: {
                multiplierY = 1;
                facingDirection = DOWN_DIRECTION;
                break;
            }

            default: {
                break;
            }
        }

        switch (direction) {
            case LEFT_DIRECTION: {
                multiplierX = -1;
                facingDirection = LEFT_DIRECTION;
                break;
            }

            case RIGHT_DIRECTION: {
                multiplierX = 1;
                facingDirection = RIGHT_DIRECTION;
                break;
            }

            default: {
                break;
            }
        }

        // Adjust velocity for diagonal movement
        if (Math.abs(multiplierX) && Math.abs(scene.heroSprite.body.velocity.y)) {
            if (scene.heroSprite.body.velocity.y < 0) {
                multiplierY = -1;
            } else {
                multiplierY = 1;
            }

            velocityX = heroSpeed * (1 / Math.sqrt(2)) * multiplierX;
            velocityY = heroSpeed * (1 / Math.sqrt(2)) * multiplierY;
        } else if (Math.abs(multiplierY) && Math.abs(scene.heroSprite.body.velocity.x)) {
            if (scene.heroSprite.body.velocity.x < 0) {
                multiplierX = -1;
            } else {
                multiplierX = 1;
            }

            velocityX = heroSpeed * (1 / Math.sqrt(2)) * multiplierX;
            velocityY = heroSpeed * (1 / Math.sqrt(2)) * multiplierY;

            if (velocityX < 0) {
                facingDirection = LEFT_DIRECTION;
            } else {
                facingDirection = RIGHT_DIRECTION;
            }
        } else {
            velocityX = heroSpeed * multiplierX;
            velocityY = heroSpeed * multiplierY;
        }

        scene.heroSprite.updateActionCollider();
        scene.heroSprite.body.setVelocity(velocityX, velocityY);
        scene.heroSprite.actionCollider.body.setVelocity(velocityX, velocityY);

        setHeroFacingDirection(facingDirection);
        scene.heroSprite.anims.play(`${HERO_SPRITE_NAME}_walk_${facingDirection}`, true);
    };

    scene.input.keyboard.on('keydown-LEFT', handleHeroStartMovement(LEFT_DIRECTION));
    scene.input.keyboard.on('keydown-RIGHT', handleHeroStartMovement(RIGHT_DIRECTION));
    scene.input.keyboard.on('keydown-UP', handleHeroStartMovement(UP_DIRECTION));
    scene.input.keyboard.on('keydown-DOWN', handleHeroStartMovement(DOWN_DIRECTION));

    const handleHeroStopMovement = (direction) => (event) => {
        switch (direction) {
            case LEFT_DIRECTION:
            case RIGHT_DIRECTION: {
                scene.heroSprite.body.setVelocityX(0);
                scene.heroSprite.actionCollider.body.setVelocityX(0);
                break;
            }

            case UP_DIRECTION:
            case DOWN_DIRECTION: {
                scene.heroSprite.body.setVelocityY(0);
                scene.heroSprite.actionCollider.body.setVelocityY(0);
                break;
            }

            default: {
                break;
            }
        }

        const velocityX = scene.heroSprite.body.velocity.x;
        const velocityY = scene.heroSprite.body.velocity.y;
        if (velocityX === 0 && velocityY === 0) {
            if (scene.heroSprite.anims.isPlaying) {
                scene.heroSprite.anims.stop();
                const facingDirection = getSelectorData(selectHeroFacingDirection);
                scene.heroSprite.setFrame(IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, facingDirection));
            }
        } else {
            let facingDirection = DOWN_DIRECTION;
            const { setHeroFacingDirection } = getSelectorData(selectHeroSetters);

            if (velocityX < 0) {
                scene.heroSprite.body.setVelocityX(-heroSpeed);
                scene.heroSprite.actionCollider.body.setVelocityX(-heroSpeed);
                facingDirection = LEFT_DIRECTION;
            } else if (velocityX > 0) {
                scene.heroSprite.body.setVelocityX(heroSpeed);
                scene.heroSprite.actionCollider.body.setVelocityX(heroSpeed);
                facingDirection = RIGHT_DIRECTION;
            } else if (velocityY < 0) {
                scene.heroSprite.body.setVelocityY(-heroSpeed);
                scene.heroSprite.actionCollider.body.setVelocityY(-heroSpeed);
                facingDirection = UP_DIRECTION;
            } else {
                scene.heroSprite.body.setVelocityY(heroSpeed);
                scene.heroSprite.actionCollider.body.setVelocityY(heroSpeed);
                facingDirection = DOWN_DIRECTION;
            }

            setHeroFacingDirection(facingDirection);
            scene.heroSprite.anims.play(`${HERO_SPRITE_NAME}_walk_${facingDirection}`, true);
        }
    };

    scene.input.keyboard.on('keyup-LEFT', handleHeroStopMovement(LEFT_DIRECTION));
    scene.input.keyboard.on('keyup-RIGHT', handleHeroStopMovement(RIGHT_DIRECTION));
    scene.input.keyboard.on('keyup-UP', handleHeroStopMovement(UP_DIRECTION));
    scene.input.keyboard.on('keyup-DOWN', handleHeroStopMovement(DOWN_DIRECTION));

    scene.input.keyboard.on('keydown-ENTER', () => {
        // TODO adjust bomb position
        handleCreateBomb(scene, scene.heroSprite);
    });

    scene.input.keyboard.on('keydown-SPACE', () => {
        if (scene.heroSprite.isAttacking) {
            return;
        }

        const heroFacingDirection = getSelectorData(selectHeroFacingDirection);
        const element = calculateClosestStaticElement(scene.heroSprite.actionCollider, overlaps);
        const currentVelocityY = scene.heroSprite.body.velocity.y;
        const currentVelocityX = scene.heroSprite.body.velocity.x;

        if (element) {
            // eslint-disable-next-line unicorn/no-lonely-if
            if (element.elementType === ELEMENT_BOX_TYPE) {
                if (element.isMoving) {
                    return;
                }

                let diffX = 0;
                let diffY = 0;

                switch (heroFacingDirection) {
                    case UP_DIRECTION:
                        diffY = -TILE_HEIGHT;
                        break;
                    case DOWN_DIRECTION:
                        diffY = TILE_HEIGHT;
                        break;
                    case LEFT_DIRECTION:
                        diffX = -TILE_WIDTH;
                        break;
                    case RIGHT_DIRECTION:
                        diffX = TILE_WIDTH;
                        break;
                    default:
                        // Handle invalid direction
                        break;
                }

                // the actual sprite position is not accurate
                // because of a lot of offsets
                // so to get the real position we need to check for the body
                // but to move the sprite image we need to move the sprite itself
                // this is like this because I'm using the tile image as the sprite image
                const startX = element.x;
                const startY = element.y;
                const newX = startX + diffX;
                const newY = startY + diffY;
                const bodyStartX = element.body.x;
                const bodyStartY = element.body.y;
                const bodyNewX = bodyStartX + diffX;
                const bodyNewY = bodyStartY + diffY;

                const handlePushAnimationComplete = () => {
                    if (currentVelocityX) {
                        scene.heroSprite.body.setVelocityX(currentVelocityX);
                        scene.heroSprite.actionCollider.body.setVelocityX(currentVelocityX);
                    }

                    if (currentVelocityY) {
                        scene.heroSprite.body.setVelocityY(currentVelocityY);
                        scene.heroSprite.actionCollider.body.setVelocityY(currentVelocityY);
                    }

                    const heroFacingDirection = getSelectorData(selectHeroFacingDirection);
                    if (!currentVelocityX && !currentVelocityY) {
                        scene.heroSprite.setFrame(IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, heroFacingDirection));
                    } else {
                        scene.heroSprite.anims.play(`${HERO_SPRITE_NAME}_walk_${heroFacingDirection}`, true);
                    }
                };
                scene.heroSprite.anims.play(`${HERO_SPRITE_NAME}_attack_${heroFacingDirection}`, true)
                    .once('animationcomplete', handlePushAnimationComplete)
                    .once('animationstop', handlePushAnimationComplete);

                // scene.physics.moveTo(element, newX, newY);
                const isOccupiedByTile = scene.mapLayers.getChildren().some((layer) => {
                    const tile = scene.map.getTileAtWorldXY(bodyNewX, bodyNewY, false, undefined, layer);
                    return tile?.properties?.[SHOULD_TILE_COLLIDE] || false;
                });

                if (isOccupiedByTile) {
                    return;
                }

                const isOccupiedBySprite = scene.elements.getChildren().some((sprite) => {
                    if (sprite === element) {
                        return false; // skip checking against itself
                    }

                    const spriteBounds = new Geom.Rectangle(
                        sprite.body.x,
                        sprite.body.y,
                        sprite.body.width,
                        sprite.body.height
                    );

                    return Geom.Rectangle.Overlaps(
                        spriteBounds,
                        new Geom.Rectangle(bodyNewX, bodyNewY, element.body.width, element.body.height)
                    );
                });

                if (isOccupiedBySprite) {
                    return;
                }

                element.isMoving = true;
                scene.tweens.add({
                    targets: element,
                    x: newX,
                    y: newY,
                    duration: 500,
                    ease: 'Linear',
                    onUpdate: (tween, target) => {
                        const { totalProgress } = tween;
                        if (target.body && target.body.type === Physics.STATIC_BODY) {
                            // eslint-disable-next-line no-param-reassign
                            target.body.x = bodyStartX + (newX - startX) * totalProgress;
                            // eslint-disable-next-line no-param-reassign
                            target.body.y = bodyStartY + (newY - startY) * totalProgress;
                        }
                    },
                    onComplete: () => {
                        element.isMoving = false;
                    },
                });

                return;
            }
        }

        scene.heroSprite.isAttacking = true;
        scene.heroSprite.attackSprite.setVisible(true);

        const updateAttackPosition = () => {
            const heroFacingDirection = getSelectorData(selectHeroFacingDirection);
            switch (heroFacingDirection) {
                case DOWN_DIRECTION: {
                    scene.heroSprite.attackSprite.setX(scene.heroSprite.x - scene.heroSprite.body.width + 2);
                    scene.heroSprite.attackSprite.setY(scene.heroSprite.y - 6);
                    scene.heroSprite.attackSprite.body.setOffset(17, 22);

                    break;
                }

                case UP_DIRECTION: {
                    scene.heroSprite.attackSprite.setX(scene.heroSprite.x - scene.heroSprite.body.width + 2);
                    scene.heroSprite.attackSprite.setY(scene.heroSprite.y - scene.heroSprite.body.height + 6);
                    scene.heroSprite.attackSprite.body.setOffset(9, 1);

                    break;
                }

                case LEFT_DIRECTION: {
                    scene.heroSprite.attackSprite.setX(scene.heroSprite.x - scene.heroSprite.body.width + 2);
                    scene.heroSprite.attackSprite.setY(scene.heroSprite.y - scene.heroSprite.body.height + 6);
                    scene.heroSprite.attackSprite.body.setOffset(0, 8);

                    break;
                }

                case RIGHT_DIRECTION: {
                    scene.heroSprite.attackSprite.setX(scene.heroSprite.x - scene.heroSprite.body.width + 2);
                    scene.heroSprite.attackSprite.setY(scene.heroSprite.y - 6);
                    scene.heroSprite.attackSprite.body.setOffset(24, 8);

                    break;
                }

                default: {
                    break;
                }
            }

            scene.heroSprite.attackSprite.setFrame(`attack_${heroFacingDirection}_01`);
        };

        updateAttackPosition();
        scene.heroSprite.attackSprite.update = updateAttackPosition;
        const handleAttackComplete = (animation, frame) => {
            if (!animation.key.includes('hero_attack')) {
                return;
            }

            while (scene.heroSprite.attackSprite.enemies.length > 0) {
                const enemySprite = scene.heroSprite.attackSprite.enemies.pop();
                enemySprite.handleStopTakingDamage();
            }

            if (currentVelocityX) {
                scene.heroSprite.body.setVelocityX(currentVelocityX);
                scene.heroSprite.actionCollider.body.setVelocityX(currentVelocityX);
            }

            if (currentVelocityY) {
                scene.heroSprite.body.setVelocityY(currentVelocityY);
                scene.heroSprite.actionCollider.body.setVelocityY(currentVelocityY);
            }

            const heroFacingDirection = getSelectorData(selectHeroFacingDirection);
            if (!currentVelocityX && !currentVelocityY) {
                scene.heroSprite.setFrame(IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, heroFacingDirection));
            } else {
                scene.heroSprite.anims.play(`${HERO_SPRITE_NAME}_walk_${heroFacingDirection}`, true);
            }

            scene.heroSprite.attackSprite.setVisible(false);
            scene.heroSprite.isAttacking = false;
            delete scene.heroSprite.attackSprite.update;
        };

        const handleAttackStarted = (animation, frame) => {
            if (!animation.key.includes('hero_attack')) {
                return;
            }

            scene.heroSprite.attackSprite.setVisible(true);
        };

        scene.heroSprite.anims.play(`${HERO_SPRITE_NAME}_attack_${heroFacingDirection}`, true)
            .once('animationstart', handleAttackStarted)
            .once('animationcomplete', handleAttackComplete)
            .once('animationstop', handleAttackComplete);
    });

    scene.heroSprite.on('animationstop', () => {
        // TODO I don't remember why I had this
        // scene.heroSprite.actionCollider.body.setVelocity(0, 0);
    });

    scene.heroSprite.on('animationstart', () => {
        const { heroSprite } = scene;
        heroSprite.updateActionCollider();
    });

    const mapType = getMapTypeFromMap(scene.map);
    if (mapType === MAP_TYPE_INDOOR) {
        // TODO
        return;
    }

    const weatherData = getMapWeatherFromMap(scene.map);
    const { type: weatherType, direction: weatherDirection, strength: weatherStrength } = weatherData;
    if (weatherType === RAINY_WEATHER) {
        const strengthMultiplier = {
            [WEATHER_STRENGTH_WEAK]: 1,
            [WEATHER_STRENGTH_MEDIUM]: 2,
            [WEATHER_STRENGTH_STRONG]: 3,
        };

        const multiplier = weatherDirection === WEATHER_DIRECTION_LEFT ? 1 : -1;

        // TODO move this to somewhere else
        const darkBlue = Display.Color.GetColor(0, 176, 245);
        const rainTexture = generateColorPixelTexture(scene, darkBlue, 'TODO_rain', 1, 8);

        const camera = scene.cameras.main;
        const gameWidth = getSelectorData(selectGameWidth);
        const gameHeight = getSelectorData(selectGameHeight);
        const spwanLocation = [0, gameWidth, gameWidth * 2.2 * multiplier];
        const rainParticles = scene.add.particles(rainTexture.key);
        rainParticles.setDepth(Number.MAX_SAFE_INTEGER - 1);
        rainParticles.createEmitter({
            rotate: 30 * multiplier,
            y: 0,
            x: { min: Math.min(...spwanLocation), max: Math.max(...spwanLocation) },
            lifespan: 2000,
            speedY: { min: 300, max: 400 },
            scale: { start: 1, end: 0 },
            quantity: 2 * strengthMultiplier[weatherStrength],
            // follow: scene.heroSprite,
            emitCallback: (particle) => {
                // eslint-disable-next-line no-param-reassign
                particle.velocityX = -(particle.velocityY / 2) * multiplier;
                // eslint-disable-next-line no-param-reassign
                particle.x += camera.scrollX;
                // eslint-disable-next-line no-param-reassign
                particle.y += camera.scrollY;
            },
        });

        const dropTexture = generateColorPixelTexture(scene, darkBlue, 'TODO_drop');

        const dropParticles = scene.add.particles(dropTexture.key);
        const emitter = dropParticles.createEmitter({
            speed: { min: 10, max: 40 },
            angle: { min: 0, max: 360 },
            gravityY: 50,
            lifespan: 400,
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            // quantity: 64,
        });

        scene.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
                Array.from({ length: strengthMultiplier[weatherStrength] }).fill(null).forEach(() => {
                    emitter.setPosition(
                        PhaserMath.Between(0, gameWidth) + camera.scrollX,
                        PhaserMath.Between(0, gameHeight) + camera.scrollY
                    );
                    emitter.explode(PhaserMath.Between(2, 6));
                });
            },
        });
    }

    // TODO move this to somewhere else
    const durationOfDay = 60 * 1000 * 4; // 4 minutes in milliseconds
    const durationPartsOfDay = durationOfDay / 4;
    const canvas = getSelectorData(selectGameCanvasElement);

    const startSepia = 0;
    const endSepia = 0.6;
    const startBrightness = 1;
    const endBrightness = 0.6;
    const startDayNightCycle = () => {
        animateCanvasDayNightEffect(
            scene,
            startSepia,
            startBrightness,
            endSepia,
            endBrightness,
            canvas,
            durationPartsOfDay,
            () => animateCanvasDayNightEffect(
                scene,
                endSepia,
                endBrightness,
                startSepia,
                startBrightness,
                canvas,
                durationPartsOfDay,
                startDayNightCycle
            )
        );
    };

    startDayNightCycle();
}

export function update(time, delta) {
    const scene = sceneHelpers.getScene();
    const shouldPause = getSelectorData(selectShouldPauseScene(key));
    if (shouldPause) {
        // TODO figure out a better way to do this
        scene.heroSprite.body.setVelocity(0, 0);
        scene.heroSprite.anims.pause();
        return;
    }

    scene.heroSprite.update(time, delta);
    scene.heroSprite.actionCollider.update(time, delta);
    scene.enemies.getChildren().forEach((enemy) => {
        enemy?.update?.(time, delta);
    });
    scene.bombs.getChildren().forEach((item) => {
        item?.update?.(time, delta);
    });
}
