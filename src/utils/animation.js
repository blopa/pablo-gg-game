import {
    HERO_SPRITE_NAME,
    RIGHT_DIRECTION,
    DOWN_DIRECTION,
    LEFT_DIRECTION,
    UP_DIRECTION,
} from '../constants';

// Utils
import { generateAverageColorPixelTexture } from './color';

const createAnimation = (animationManager, assetKey, animationName, frameQuantity, frameRate, repeat, yoyo) => {
    const frames = Array.from({ length: frameQuantity }).map((n, index) => ({
        key: assetKey,
        frame: `${animationName}_${(index + 1).toString().padStart(2, '0')}`,
    }));

    // console.log(frames);
    animationManager.create({
        key: `${assetKey}_${animationName}`,
        frames,
        frameRate,
        repeat,
        yoyo,
    });
};

export const handleCreateItemAnimations = (scene, itemSprite, assetKey) => {
    createAnimation(
        itemSprite.anims,
        assetKey,
        'idle',
        3,
        3,
        -1,
        true
    );
};

export const handleCreateEnemyAnimations = (scene, enemySprite) => {
    // TODO check if animation already exists first
    [UP_DIRECTION, DOWN_DIRECTION, LEFT_DIRECTION, RIGHT_DIRECTION].forEach((direction) => {
        createAnimation(
            enemySprite.anims,
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

export const handleCreateHeroAnimations = (heroSprite) => {
    // Animations
    [UP_DIRECTION, DOWN_DIRECTION, LEFT_DIRECTION, RIGHT_DIRECTION].forEach((direction) => {
        createAnimation(
            heroSprite.anims,
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
            heroSprite.anims,
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
    //         sprite.anims,
    //         SWORD_SPRITE_NAME,
    //         `attack_${direction}`,
    //         1,
    //         4,
    //         0,
    //         false
    //     );
    // });
};

export const createEnemyDeathAnimation = (scene, enemySprite) => {
    const tex = generateAverageColorPixelTexture(scene, enemySprite, 'blue-pixel');
    const emitter = scene.add.particles(0, 0, tex, {
        x: enemySprite.x + Math.round(enemySprite.width / 2),
        y: enemySprite.y + Math.round(enemySprite.height / 2),
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        gravityY: 50,
        lifespan: 350,
        blendMode: 'ADD',
        scale: { start: 1, end: 0 },
        // quantity: 64,
    });
    emitter.setDepth(Number.MAX_SAFE_INTEGER - 1);

    emitter.onParticleDeath((particle) => {
        emitter.active = false;
        emitter.destroy();
    });

    return emitter;
};

export const animateCanvasDayNightEffect = (
    scene,
    startSepia,
    startBrightness,
    endSepia,
    endBrightness,
    canvas,
    duration,
    onComplete
) => {
    const startTime = Date.now();

    const updateDayNightCycle = () => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1); // Limit progress to 1
        const sepia = startSepia + (endSepia - startSepia) * progress;
        const brightness = startBrightness + (endBrightness - startBrightness) * progress;
        // eslint-disable-next-line no-param-reassign
        canvas.style.filter = `sepia(${sepia}) brightness(${brightness})`;

        if (progress < 1) {
            scene.time.delayedCall(1, updateDayNightCycle);
        } else {
            scene.time.delayedCall(duration, onComplete);
        }
    };

    scene.time.delayedCall(1, updateDayNightCycle);
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
