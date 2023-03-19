// Utils
import {
    fadeIn,
    handleCreateMap,
    handleCreateHero,
    handleObjectsLayer,
    handleHeroMovement,
    handleCreateGroups,
    handleCreateControls,
    handleConfigureCamera,
    handleCreateHeroAnimations,
    handleCreateEnemiesAnimations,
} from '../../utils/sceneHelpers';
import { getSelectorData } from '../../utils/utils';

// Selectors
import {
    selectGameSetters,
    selectShouldPauseScene,
} from '../../zustand/game/selectGameData';
import { selectHeroFacingDirection } from '../../zustand/hero/selectHeroData';

// Constants
import {
    SLIME_SPRITE_NAME,
    FOLLOW_BEHAVIOUR,
    HERO_SPRITE_NAME,
    RIGHT_DIRECTION,
    LEFT_DIRECTION,
    DOWN_DIRECTION,
    UP_DIRECTION,
    TILE_HEIGHT,
    TILE_WIDTH,
} from '../../constants';

export const key = 'GameScene';

export const scene = {};

export function create() {
    // scene.input.on('pointerup', (pointer) => {
    //     console.log('clicky click');
    // });
    const { addGameCameraSizeUpdateCallback } = getSelectorData(selectGameSetters);

    // All of these functions need to be called in order

    fadeIn(scene);

    // Create controls
    handleCreateControls(scene);

    // Create game groups
    handleCreateGroups(scene);

    // Create the map
    const customColliders = handleCreateMap(scene);

    // Create hero sprite
    handleCreateHero(scene);

    // Load game objects like items, enemies, etc
    handleObjectsLayer(scene);

    // Configure the main camera
    handleConfigureCamera(scene);
    addGameCameraSizeUpdateCallback(() => {
        handleConfigureCamera(scene);
    });

    // Enemies animations
    handleCreateEnemiesAnimations(scene);

    // Hero animations
    handleCreateHeroAnimations(scene);

    // Handle collisions
    // scene.physics.add.collider(scene.heroSprite, scene.enemies);
    scene.physics.add.collider(scene.heroSprite, customColliders);
    scene.physics.add.overlap(
        scene.heroSprite.attackSprite,
        scene.slimeSprite,
        (attackSprite, enemySprite) => {
            if (enemySprite.isTakingDamage || !attackSprite.visible) {
                return;
            }

            // eslint-disable-next-line no-param-reassign
            enemySprite.isTakingDamage = true;
            enemySprite.takeDamage(10, attackSprite.frame.name);

            // clearTimeout(timeOutFunctionId);
            // scene.gridEngine.stopMovement(SLIME_SPRITE_NAME);
            // const position = scene.gridEngine.getPosition(SLIME_SPRITE_NAME);
        }
    );

    scene.physics.add.overlap(
        scene.heroSprite.presencePerceptionCircle,
        scene.slimeSprite,
        (presencePerceptionCircle, slimeSprite) => {
            if (slimeSprite.body.overlapR > 100 && slimeSprite.behaviour !== FOLLOW_BEHAVIOUR) {
                // eslint-disable-next-line no-param-reassign
                slimeSprite.behaviour = FOLLOW_BEHAVIOUR;
                calculatePaths();
            }
        }
    );

    scene.gridEngine.addCharacter({
        id: SLIME_SPRITE_NAME,
        sprite: scene.slimeSprite,
        speed: 1,
        startPosition: {
            x: scene.slimeSprite.x / TILE_WIDTH,
            y: scene.slimeSprite.y / TILE_HEIGHT,
        },
        // offsetY: 4,
    });
    scene.gridEngine.moveRandomly(SLIME_SPRITE_NAME, 2000, 2);

    let timeOutFunctionId;
    const calculatePaths = () => {
        // clearTimeout(timeOutFunctionId);
        timeOutFunctionId?.remove?.();
        timeOutFunctionId = null;

        if (scene.slimeSprite.isTakingDamage) {
            return;
        }

        if (scene.slimeSprite.behaviour !== FOLLOW_BEHAVIOUR) {
            // scene.gridEngine.stopMovement(SLIME_SPRITE_NAME);
            scene.gridEngine.moveRandomly(SLIME_SPRITE_NAME, 2000, 2);
            scene.gridEngine.setSpeed(SLIME_SPRITE_NAME, 1);
            return;
        }

        scene.gridEngine.setSpeed(SLIME_SPRITE_NAME, 2);
        scene.gridEngine.moveTo(SLIME_SPRITE_NAME, {
            x: Math.round(scene.heroSprite.x / TILE_WIDTH),
            y: Math.round(scene.heroSprite.y / TILE_HEIGHT),
        });

        timeOutFunctionId = scene.time.delayedCall(1000, () => {
            calculatePaths();
        });
    };

    scene.gridEngine.movementStopped().subscribe(({ charId, direction }) => {
        if (charId === SLIME_SPRITE_NAME) {
            const slimePosition = scene.gridEngine.getPosition(SLIME_SPRITE_NAME);
            const heroPosition = {
                x: Math.round(scene.heroSprite.x / TILE_WIDTH),
                y: Math.round(scene.heroSprite.y / TILE_HEIGHT),
            };

            if (slimePosition.x === heroPosition.x && slimePosition.y === heroPosition.y) {
                // clearTimeout(timeOutFunctionId);
                scene.gridEngine.moveRandomly(SLIME_SPRITE_NAME, 10, 1);
            } else if (!timeOutFunctionId) {
                calculatePaths();
            }
        }
    });

    scene.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
        if (charId === SLIME_SPRITE_NAME && !scene.slimeSprite.isTakingDamage) {
            scene.slimeSprite.anims.play(`${SLIME_SPRITE_NAME}_walk_${direction}`);
        }
    });

    scene.heroSprite.on('animationcomplete', (animation, frame) => {
        if (animation.key.includes('hero_attack') && scene.slimeSprite.isTakingDamage) {
            scene.slimeSprite.isTakingDamage = false;
            calculatePaths();
        }
    });

    scene.input.keyboard.on('keydown-SPACE', () => {
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
            scene.heroSprite.attackSprite.setVisible(true);
        };

        updateAttackPosition();
        const heroFacingDirection = getSelectorData(selectHeroFacingDirection);
        scene.heroSprite.attackSprite.update = updateAttackPosition;
        scene.heroSprite.anims.play(`${HERO_SPRITE_NAME}_attack_${heroFacingDirection}`, true)
            .once('animationcomplete', () => {
                scene.heroSprite.attackSprite.setVisible(false);
                delete scene.heroSprite.attackSprite.update;
            });
    });
}

export function update(time, delta) {
    const shouldPause = getSelectorData(selectShouldPauseScene('GameScene'));
    if (shouldPause) {
        // figure out a better way to do this
        scene.heroSprite.body.setVelocity(0, 0);
        scene.heroSprite.anims.pause();
        return;
    }

    handleHeroMovement(scene);
    scene.heroSprite.update(time, delta);
    scene.slimeSprite?.update?.(time, delta);
}
