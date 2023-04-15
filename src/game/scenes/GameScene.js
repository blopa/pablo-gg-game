import { Physics, Geom, Display, Math as PhaserMath } from 'phaser';
import { GridEngine } from 'grid-engine';

// Utils
import {
    fadeIn,
    handleCreateMap,
    handleCreateBomb,
    handleCreateHero,
    handleObjectsLayer,
    handleHeroMovement,
    handleCreateGroups,
    handleCreateControls,
    handleConfigureCamera,
    generateTextureFromColor,
    handleCreateHeroAnimations,
    subscribeToGridEngineEvents,
    calculateClosestStaticElement,
} from '../../utils/sceneHelpers';
import { getSelectorData } from '../../utils/utils';

// Selectors
import {
    selectGameHeight,
    selectGameSetters, selectGameWidth,
    selectShouldPauseScene,
} from '../../zustand/game/selectGameData';
import { selectHeroFacingDirection } from '../../zustand/hero/selectHeroData';

// Constants
import {
    TILE_WIDTH,
    TILE_HEIGHT,
    UP_DIRECTION,
    DOWN_DIRECTION,
    LEFT_DIRECTION,
    RIGHT_DIRECTION,
    HERO_SPRITE_NAME,
    ELEMENT_BOX_TYPE,
    ELEMENT_GRASS_TYPE,
    SHOULD_TILE_COLLIDE,
} from '../../constants';

export const key = 'GameScene';

export const sceneHelpers = {};

export const preload = () => {
    const scene = sceneHelpers.getScene();
    scene.load.scenePlugin('gridEngine', GridEngine, 'gridEngine', 'gridEngine');
};

export function create() {
    const scene = sceneHelpers.getScene();
    // scene.gridEngine = scene.game.scene.scenes.find((s) => s.scene.key === key).gridEngine;
    // scene.plugins.installScenePlugin('gridEngine', GridEngine, 'gridEngine' );
    // scene.input.on('pointerup', (pointer) => {
    //     console.log('clicky click');
    // });
    const { addGameCameraSizeUpdateCallback, setGameShowHeadsUpDisplay } = getSelectorData(selectGameSetters);

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
    scene.physics.add.overlap(scene.elements, scene.heroSprite.actionCollider, (element, actionCollider) => {
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

    scene.input.keyboard.on('keydown-ENTER', () => {
        // TODO adjust bomb position
        handleCreateBomb(scene, scene.heroSprite);
    });

    scene.input.keyboard.on('keydown-SPACE', () => {
        if (scene.heroSprite.isAttacking) {
            return;
        }

        const heroFacingDirection = getSelectorData(selectHeroFacingDirection);
        const element = calculateClosestStaticElement(scene.heroSprite, overlaps);

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
                scene.heroSprite.anims.play(`${HERO_SPRITE_NAME}_attack_${heroFacingDirection}`, true);

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
        scene.heroSprite.actionCollider.body.setVelocity(0, 0);
    });

    scene.heroSprite.on('animationstart', () => {
        const { heroSprite } = scene;
        heroSprite.updateActionCollider();
    });

    const weatherDirection = 'left';
    const multiplier = weatherDirection === 'left' ? 1 : -1;

    // TODO move this to somewhere else
    const rainTextureName = 'TODO_rain';
    const rainTexture = scene.textures.get(rainTextureName);
    if (rainTexture.key !== rainTextureName) {
        const darkBlue = Display.Color.GetColor(0, 176, 245);
        generateTextureFromColor(scene, darkBlue, rainTextureName, 1, 8);
    }

    const camera = scene.cameras.main;
    const gameWidth = getSelectorData(selectGameWidth);
    const gameHeight = getSelectorData(selectGameHeight);
    const spwanLocation = [0, gameWidth, gameWidth * 2.2 * multiplier];
    const rainParticles = scene.add.particles(rainTextureName);
    rainParticles.setDepth(Number.MAX_SAFE_INTEGER - 1);
    rainParticles.createEmitter({
        rotate: 30 * multiplier,
        y: 0,
        x: { min: Math.min(...spwanLocation), max: Math.max(...spwanLocation) },
        lifespan: 2000,
        speedY: { min: 300, max: 400 },
        scale: { start: 1, end: 0 },
        quantity: 5,
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

    const dropTextureName = 'TODO_drop';
    const dropTexture = scene.textures.get(dropTextureName);
    if (dropTexture.key !== dropTextureName) {
        const darkBlue = Display.Color.GetColor(0, 176, 245);
        generateTextureFromColor(scene, darkBlue, dropTextureName);
    }

    const dropParticles = scene.add.particles(dropTextureName);
    const emitter = dropParticles.createEmitter({
        speed: { min: 10, max: 40 },
        angle: { min: 0, max: 360 },
        gravityY: 50,
        lifespan: 400,
        scale: { start: 1, end: 0 },
        // quantity: 64,
    });

    scene.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => {
            emitter.setPosition(
                PhaserMath.Between(0, gameWidth) + camera.scrollX,
                PhaserMath.Between(0, gameHeight) + camera.scrollY
            );
            emitter.explode(PhaserMath.Between(3, 10));
        },
    });
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

    handleHeroMovement(scene);
    scene.heroSprite.update(time, delta);
    scene.heroSprite.actionCollider.update(time, delta);
    scene.enemies.getChildren().forEach((enemy) => {
        enemy?.update?.(time, delta);
    });
    scene.bombs.getChildren().forEach((item) => {
        item?.update?.(time, delta);
    });
}
