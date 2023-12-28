import { Display, Math as PhaserMath } from 'phaser';

// Constants
import {
    ELEMENT_CRACK_TYPE,
    SLIME_SPRITE_NAME,
    SWORD_SPRITE_NAME,
    PATROL_BEHAVIOUR,
    BOMB_SPRITE_NAME,
    HERO_SPRITE_NAME,
    FOLLOW_BEHAVIOUR,
    ELEMENT_BOX_TYPE,
    RIGHT_DIRECTION,
    LEFT_DIRECTION,
    DOWN_DIRECTION,
    UP_DIRECTION,
    TILE_HEIGHT,
    ITEM_DEPTH,
    HERO_DEPTH,
    TILE_WIDTH,
} from '../constants';

// Utils
import {
    createBlinkingEffect,
    createEnemyDeathAnimation,
    handleCreateItemAnimations,
    handleCreateEnemyAnimations,
} from './animation';
import {
    displayDamageNumber,
    getCalculateEnemyFollowPaths,
    updateSpriteDepthBasedOnHeroPosition,
} from './sceneHelpers';
import { createInteractiveGameObject, getSelectorData } from './utils';
import { generateColorPixelTexture } from './color';

// Selectors
import {
    selectHeroSetters,
    selectHeroInitialFrame,
    selectHeroCurrentHealth,
    selectHeroFacingDirection,
    selectHeroInitialPosition,
} from '../zustand/hero/selectHeroData';

export const handleCreateEnemy = (scene, spriteName, position, enemyType, enemyFamily, enemyHealth) => {
    // Create slime sprite
    const enemySprite = scene.physics.add
        .sprite(position.x, position.y, SLIME_SPRITE_NAME)
        .setName(spriteName)
        .setOrigin(0, 0);

    updateSpriteDepthBasedOnHeroPosition(scene, enemySprite);
    enemySprite.body.setCircle(6);
    enemySprite.body.setOffset(enemySprite.body.width / 2, enemySprite.body.height + 1);
    enemySprite.behaviour = PATROL_BEHAVIOUR;
    enemySprite.totalHealth = enemyHealth;
    enemySprite.currentHealth = enemyHealth;
    enemySprite.enemyFamily = enemyFamily;
    enemySprite.enemyType = enemyType;

    enemySprite.update = (time, delta) => {
        updateSpriteDepthBasedOnHeroPosition(scene, enemySprite);
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
        .setDepth(enemySprite.depth)
        .setAlpha(0);

    enemySprite.handleTakeDamage = (damage, attackDirection) => {
        enemySprite.currentHealth -= damage;

        // Display damage number
        displayDamageNumber(scene, enemySprite, damage);

        if (enemySprite.currentHealth <= 0) {
            const emitter = createEnemyDeathAnimation(scene, enemySprite);
            scene.gridEngine.stopMovement(spriteName);
            scene.tweens.add({
                targets: enemySprite,
                duration: 70,
                scale: 1.5,
                alpha: 0.5,
                ease: 'Power1',
                onComplete: () => {
                    emitter.explode(PhaserMath.Between(20, 35));
                    scene.gridEngine.removeCharacter(spriteName);
                    enemySprite.destroy(true);
                    enemyImage.destroy(true);
                    // canvas.destroy();
                },
            });

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
            case 'attack_left_01':
            default: {
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
        }

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
    handleCreateEnemyAnimations(scene, enemySprite);
};

export const handleCreateBomb = (scene, heroSprite) => {
    const position = {
        x: heroSprite.x + heroSprite.body.width / 2,
        y: heroSprite.y + heroSprite.body.height - 4,
    };

    const bombSprite = scene.physics.add
        .sprite(position.x, position.y, BOMB_SPRITE_NAME)
        .setName(BOMB_SPRITE_NAME)
        .setOrigin(0, 0)
        .setDepth(ITEM_DEPTH);

    const explosionCollider = createInteractiveGameObject(
        scene,
        bombSprite.x - bombSprite.body.width / 2 - 1,
        bombSprite.y - bombSprite.body.height / 2,
        TILE_WIDTH * 2,
        TILE_HEIGHT * 2,
        { x: 0, y: 0 },
        true
    );

    bombSprite.body.setImmovable(true);
    bombSprite.body.width = TILE_WIDTH - 4;
    bombSprite.body.height = TILE_HEIGHT - 4;
    bombSprite.body.setOffset(1, 3);
    updateSpriteDepthBasedOnHeroPosition(scene, bombSprite);
    bombSprite.update = (time, delta) => {
        updateSpriteDepthBasedOnHeroPosition(scene, bombSprite);
    };

    handleCreateItemAnimations(scene, bombSprite, BOMB_SPRITE_NAME);
    bombSprite.anims.play('bomb_idle');

    // TODO because need to make this look better
    const orangeColor = Display.Color.GetColor(255, 135, 64);
    const orangeTexture = generateColorPixelTexture(scene, orangeColor, 'TODO_explosion_orange');
    const yellowColor = Display.Color.GetColor(255, 231, 64);
    const yellowTexture = generateColorPixelTexture(scene, yellowColor, 'TODO_explosion_yellow');

    scene.time.delayedCall(200, () => {
        // console.time('bomb');
        const speedUpTween = scene.tweens.add({
            targets: bombSprite,
            alpha: 0.3,
            duration: 200,
            yoyo: true,
            repeat: 15,
            ease: 'Linear',
            loop: 0,
            onStart: () => {
                speedUpTween.timeScale = 1;
            },
            onRepeat: () => {
                speedUpTween.timeScale += 0.08;
            },
            onComplete: () => {
                // console.timeEnd('bomb');
                let hasExploded = false;
                // explosionCollider.body.setVelocity(1, 1);
                const enemiesOverlap = scene.physics.overlap(
                    explosionCollider,
                    scene.enemies,
                    (explosion, enemySprite) => {
                        if (!hasExploded) {
                            enemySprite.handleTakeDamage(20, null);
                        }
                    }
                );

                const onExplosionEmitterStartedCallbacks = [];
                const elementsOverlap = scene.physics.overlap(
                    explosionCollider,
                    scene.bombDestroyableElements,
                    (explosion, elementSprite) => {
                        if (!hasExploded) {
                            // TODO add destroy animation
                            // and check if element should be destroyed or not
                            elementSprite.destroy();
                            switch (elementSprite.elementType) {
                                case ELEMENT_CRACK_TYPE: {
                                    const tilesAtPosition = scene.mapLayers.getChildren().reduce((tiles, layer) => {
                                        const tile = scene.map.getTileAtWorldXY(
                                            elementSprite.x,
                                            elementSprite.y,
                                            false,
                                            undefined,
                                            layer
                                        );

                                        if (tile) {
                                            return [...tiles, tile];
                                        }

                                        return tiles;
                                    }, []);

                                    onExplosionEmitterStartedCallbacks.push(() => {
                                        tilesAtPosition.forEach((tile) => tile.setCollision(false));
                                        elementSprite.entranceSprite.setAlpha(1);
                                    });

                                    break;
                                }
                                case ELEMENT_BOX_TYPE: {
                                    // TODO
                                    break;
                                }
                                default: {
                                    // TODO
                                    break;
                                }
                            }
                        }
                    }
                );

                scene.tweens.add({
                    targets: bombSprite,
                    x: bombSprite.x - Math.round(bombSprite.body.width / 2),
                    y: bombSprite.y - Math.round(bombSprite.body.height / 2),
                    duration: 40,
                    scale: 1.5,
                    alpha: 0.5,
                    ease: 'Power1',
                    onComplete: () => {
                        hasExploded = true;
                        const emitterConfig = {
                            x: bombSprite.x + Math.round(bombSprite.width / 2),
                            y: bombSprite.y + Math.round(bombSprite.height / 2),
                            quantity: { min: 50, max: 150 },
                            speed: { min: 50, max: 200 },
                            angle: { min: 0, max: 360 },
                            gravityY: 50,
                            lifespan: 350,
                            // blendMode: 'ADD',
                            scale: { start: 1, end: 0 },
                        };

                        const orangeExplosionEmitter = scene.add.particles(0, 0, orangeTexture.key, emitterConfig);
                        // orangeExplosionParticles.setDepth(Number.MAX_SAFE_INTEGER - 1);
                        orangeExplosionEmitter.explode();

                        const yellowExplosionEmitter = scene.add.particles(0, 0, yellowTexture.key, emitterConfig);
                        // yellowExplosionParticles.setDepth(Number.MAX_SAFE_INTEGER - 1);
                        yellowExplosionEmitter.explode();

                        bombSprite.destroy();
                        scene.time.delayedCall(10, () => {
                            explosionCollider.destroy();
                            scene.physics.world.removeCollider(enemiesOverlap);
                            scene.physics.world.removeCollider(elementsOverlap);
                            onExplosionEmitterStartedCallbacks.forEach((callback) => callback());
                        });
                    },
                });
            },
        });
    });

    scene.bombs.add(bombSprite);
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

    heroSprite.actionCollider = createInteractiveGameObject(
        scene,
        heroSprite.x + heroSprite.body.width / 2,
        heroSprite.y + heroSprite.height,
        heroSprite.body.width,
        TILE_HEIGHT / 2
    );

    // const canvas = scene.textures.createCanvas('transparent', 1, 1);
    // const context = canvas.getContext('2d');
    // context.clearRect(0, 0, canvas.width, canvas.height);
    // const sprite = scene.physics.add.sprite(
    //     heroSprite.x + heroSprite.body.width / 2,
    //     heroSprite.y + heroSprite.height,
    //     'slime'
    // );
    // sprite.setSize(heroSprite.body.width, TILE_HEIGHT / 2);
    // heroSprite.actionCollider = sprite;

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

    const updatePresencePerceptionCircle = () => {
        heroSprite.presencePerceptionCircle.setX(
            heroSprite.x - Math.round(heroSprite.presencePerceptionCircle.width / 2 - heroSprite.width / 2)
        );
        heroSprite.presencePerceptionCircle.setY(
            heroSprite.y - Math.round(heroSprite.presencePerceptionCircle.height / 2 - heroSprite.height / 2) + 6
        );
    };

    const updateActionCollider = ({ top, right, bottom, left, width, height } = heroSprite.body) => {
        const facingDirection = getSelectorData(selectHeroFacingDirection);

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

    heroSprite.handleTakeDamage = (damage, enemySprite, heroEnemyOverlap, shouldMoveHero = false) => {
        if (
            heroSprite.body.overlapR === enemySprite.body.overlapR
            && heroSprite.body.overlapR < 5
        ) {
            return;
        }

        if (heroSprite.isTakingDamage) {
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
                heroSprite.body.setVelocity(0, 0);
                updateActionCollider();
                updatePresencePerceptionCircle();
            }
        );

        if (shouldMoveHero) {
            // Create the tween animation to move the heroSprite
            scene.tweens.add({
                targets: heroSprite,
                x: newX,
                y: newY,
                ease: 'Power1',
                duration: 40,
                onUpdate: () => {
                    updateActionCollider();
                    updatePresencePerceptionCircle();
                    scene.heroSprite.attackSprite.update?.();
                    // scene.physics.moveTo(heroSprite, heroSprite.x, heroSprite.y);
                    scene.heroSprite.body.setVelocity(1, 1); // TODO maybe
                },
                onComplete: () => {
                    updateActionCollider();
                    updatePresencePerceptionCircle();
                },
            });
        }
    };

    updatePresencePerceptionCircle();
    updateActionCollider({
        top: heroSprite.y + (heroSprite.height - heroSprite.body.height),
        right: heroSprite.x + heroSprite.width - (heroSprite.width - heroSprite.body.width) / 2,
        bottom: heroSprite.y + heroSprite.height,
        left: heroSprite.x + (heroSprite.width - heroSprite.body.width) / 2,
    });

    heroSprite.update = (time, delta) => {
        const velocityX = scene.heroSprite.body.velocity.x;
        const velocityY = scene.heroSprite.body.velocity.y;
        // console.log(velocityX, velocityY);

        if (heroSprite.anims.isPlaying && !heroSprite.anims.currentAnim?.key.includes('walk')) {
            heroSprite.body.setVelocity(0, 0); // TODO maybe
        }

        if (!heroSprite.body.blocked.none || heroSprite.body.speed === 0) {
            heroSprite.actionCollider.body.setVelocity(0, 0); // TODO maybe
            heroSprite.updateActionCollider();
        }

        if ((heroSprite.body.blocked.up || heroSprite.body.blocked.down) && velocityX !== 0) {
            heroSprite.actionCollider.body.setVelocity(velocityX, 0); // TODO maybe
            heroSprite.updateActionCollider();
        }

        if ((scene.heroSprite.body.blocked.left || heroSprite.body.blocked.right) && velocityY !== 0) {
            heroSprite.actionCollider.body.setVelocity(0, velocityY); // TODO maybe
            heroSprite.updateActionCollider();
        }

        if (velocityY === 0 && velocityX === 0) {
            heroSprite.x = PhaserMath.Snap.To(heroSprite.x, 1);
            heroSprite.y = PhaserMath.Snap.To(heroSprite.y, 1);

            return;
        }

        heroSprite.attackSprite.update?.();
        updatePresencePerceptionCircle();
    };

    heroSprite.updateActionCollider = updateActionCollider;

    let lastEvent = 'overlapend';
    heroSprite.actionCollider.update = (time, delta) => {
        const touching = !heroSprite.actionCollider.body.touching.none;
        const wasTouching = !heroSprite.actionCollider.body.wasTouching.none;
        const { actionCollider } = heroSprite;
        const { embedded } = actionCollider.body;
        const hasVelocity = actionCollider.body.velocity.x !== 0
            || actionCollider.body.velocity.y !== 0;

        if (lastEvent !== 'overlapstart' && ((hasVelocity && touching && !wasTouching) || embedded)) {
            lastEvent = 'overlapstart';
            actionCollider.emit(lastEvent);
        } else if (lastEvent !== 'overlapend' && ((hasVelocity && !touching && wasTouching) || !embedded)) {
            lastEvent = 'overlapend';
            actionCollider.emit(lastEvent);
        }
    };

    // eslint-disable-next-line no-param-reassign
    scene.heroSprite = heroSprite;
    scene.sprites.add(heroSprite);
};
