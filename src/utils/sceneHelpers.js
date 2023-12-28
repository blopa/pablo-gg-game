import { Input, Math as PhaserMath } from 'phaser';

// Constants
import {
    UI_DEPTH,
    DEPTH_DIFF,
    HERO_DEPTH,
    TILE_WIDTH,
    TILE_HEIGHT,
    UP_DIRECTION,
    DOWN_DIRECTION,
    LEFT_DIRECTION,
    RIGHT_DIRECTION,
    FOLLOW_BEHAVIOUR,
    SLIME_SPRITE_NAME,
    ENEMY_SPRITE_PREFIX,
} from '../constants';

// Utils
import {
    getSelectorData,
} from './utils';
import { createGameObjectForTile } from './tilemap';

// Selectors
import { selectGameHeight, selectGameWidth } from '../zustand/game/selectGameData';

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

// TODO add option for dark or light entrance
export const createCaveEntrance = (scene, tile) => {
    const tileData = {
        index: 1634,
        tileset: {
            name: 'mountains_01',
            firstgid: 1459,
        },
        properties: {},
        pixelX: tile.pixelX,
        pixelY: tile.pixelY,
    };

    return createGameObjectForTile(scene, tileData);
};

export const updateSpriteDepthBasedOnHeroPosition = (scene, sprite) => {
    const { heroSprite } = scene;

    const spriteBounds = sprite.getBounds();
    const heroBounds = heroSprite.getBounds();

    if (spriteBounds.bottom - 1 <= heroBounds.bottom) {
        if (sprite.depth > HERO_DEPTH) {
            sprite.setDepth(HERO_DEPTH - DEPTH_DIFF);
        }
    } else if (sprite.depth < HERO_DEPTH) {
        sprite.setDepth(HERO_DEPTH + DEPTH_DIFF);
    }
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

export const calculateClosestStaticElement = (targetSprite, sprites) => {
    let closestSprite;
    let shortestDistance = Number.POSITIVE_INFINITY;

    sprites.forEach((sprite) => {
        const distance = PhaserMath.Distance.Between(targetSprite.x, targetSprite.y, sprite.body.x, sprite.body.y);
        if (distance < shortestDistance) {
            closestSprite = sprite;
            shortestDistance = distance;
        }
    });

    return closestSprite;
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

// TODO make this into a new scene
const fade = (scene, callback, direction, type) => {
    // return callback?.();
    const camera = scene.cameras.main;
    const gameWidth = getSelectorData(selectGameWidth);
    const gameHeight = getSelectorData(selectGameHeight);

    const blackBlock = scene.add.graphics();
    const multiplier = direction === 'right' ? 1 : -1;
    blackBlock.fillStyle(0x000000);
    const marginWidth = gameWidth * 0.1;
    const marginHeight = gameHeight * 0.1;

    blackBlock.fillRect(0, 0, gameWidth + marginWidth, gameHeight + marginHeight);
    let targetX = 0;
    blackBlock.setDepth(Number.POSITIVE_INFINITY);
    // blackBlock.setAlpha(0);

    if (type === 'in') {
        const addOnX = camera.scrollX > 0 ? scene.heroSprite.height : 0;
        const addOnY = camera.scrollY > 0 ? scene.heroSprite.width : 0;
        targetX = (camera.scrollX + addOnX) - (gameWidth + marginWidth * 2);
        blackBlock.setPosition(
            camera.scrollX + addOnX,
            camera.scrollY + addOnY
        );
    } else {
        targetX = camera.scrollX;
        blackBlock.setPosition(
            camera.scrollX - gameWidth,
            camera.scrollY
        );
    }

    blackBlock.setPosition(
        blackBlock.x - marginWidth / 2,
        blackBlock.y - marginHeight / 2
    );

    const duration = type === 'in' ? 700 : 1200;
    scene.time.delayedCall(duration * 0.7, () => {
        callback?.();
    });

    scene.tweens.add({
        targets: blackBlock,
        x: targetX,
        // alpha: 1,
        duration,
        ease: 'Power2',
        onComplete: () => {
            // callback?.();
            scene.time.delayedCall(10, () => {
                blackBlock.clear();
                blackBlock.destroy();
            });
        },
    });
};
