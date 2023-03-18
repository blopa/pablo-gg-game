import { Math as PhaserMath } from 'phaser';

// Utils
import {
    fadeIn,
    handleCreateMap,
    handleCreateHero,
    handleObjectsLayer,
    handleHeroMovement,
    handleCreateGroups,
    handleCreateEnemies,
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
    DOWN_DIRECTION,
    HERO_SPRITE_NAME,
    LEFT_DIRECTION, RIGHT_DIRECTION,
    UP_DIRECTION,
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

    // Create enemies sprites
    handleCreateEnemies(scene);

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
    scene.physics.add.collider(scene.heroSprite, scene.enemies);
    scene.physics.add.collider(scene.heroSprite, customColliders);
    scene.physics.add.overlap(scene.heroSprite.presenceCircle, scene.slimeSprite, (presenceCircle, slimeSprite) => {
        // TODO
    });

    const setupEnemy = () => {
        let paths = [];
        let currentPath = 0;

        const calculatePaths = () => {
            scene.tweens.getTweensOf(scene.slimeSprite).forEach((tween) => tween.stop());
            paths = scene.navigationMesh.findPath(
                { x: scene.slimeSprite.x, y: scene.slimeSprite.y },
                { x: scene.heroSprite.x, y: scene.heroSprite.y }
            );

            console.log('recalculating...', paths);

            // Schedule next recalculation
            setTimeout(() => {
                calculatePaths();
                moveToNextPoint();
            }, 5000);
        };

        const moveToNextPoint = () => {
            if (!paths) {
                return;
            }

            currentPath += 1;
            if (currentPath >= paths.length) {
                currentPath = 0;
            }

            const nextPoint = paths[currentPath];
            const distance = PhaserMath.Distance.Between(
                scene.slimeSprite.x,
                scene.slimeSprite.y,
                nextPoint.x,
                nextPoint.y
            );

            const tween = scene.tweens.add({
                targets: scene.slimeSprite,
                duration: distance * 100,
                x: nextPoint.x,
                y: nextPoint.y,
                onComplete: moveToNextPoint,
            });
        };

        calculatePaths();
        moveToNextPoint();
    };

    setupEnemy();

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
}
