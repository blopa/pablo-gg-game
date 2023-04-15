import { GameObjects } from 'phaser';
import {
    ENTER_KEY,
    SPACE_KEY,
    TILE_WIDTH,
    TILE_HEIGHT,
    ARROW_UP_KEY,
    ARROW_LEFT_KEY,
    ARROW_DOWN_KEY,
    ARROW_RIGHT_KEY, WEATHER_STRENGTH_MEDIUM, WEATHER_DIRECTION_LEFT,
} from '../constants';

// Store
import { getState } from '../zustand/store';

export const isObject = (obj) =>
    typeof obj === 'object' && obj?.constructor === Object;

export const isObjectEmpty = (obj) =>
    isObject(obj) && Object.keys(obj).length === 0;

export const isObjectNotEmpty = (obj) =>
    isObject(obj) && Object.keys(obj).length > 0;

export const getStageWeatherFromMap = (map) => {
    const weatherType = map.properties?.find(
        (property) => property.name === 'weather_type'
    );

    if (!weatherType?.value) {
        return {};
    }

    const weatherStrength = map.properties?.find(
        (property) => property.name === 'weather_strength'
    );

    const weatherDirection = map.properties?.find(
        (property) => property.name === 'weather_direction'
    );

    return {
        type: weatherType.value,
        strength: weatherStrength?.value || WEATHER_STRENGTH_MEDIUM,
        direction: weatherDirection?.value || WEATHER_DIRECTION_LEFT,
    };
};

/**
 * source https://gist.github.com/GlauberF/d8278ce3aa592389e6e3d4e758e6a0c2
 * Simulate a key event.
 * @param {String} code The code of the key to simulate
 * @param {String} type (optional) The type of event : down, up or press. The default is down
 */
export const simulateKeyEvent = (code, type = 'down') => {
    const keysMap = {
        [ENTER_KEY]: 13,
        [SPACE_KEY]: 32,
        [ARROW_LEFT_KEY]: 37,
        [ARROW_UP_KEY]: 38,
        [ARROW_RIGHT_KEY]: 39,
        [ARROW_DOWN_KEY]: 40,
    };

    const event = document.createEvent('HTMLEvents');
    event.initEvent(`key${type}`, true, false);
    event.code = code;
    event.keyCode = keysMap[code];

    document.dispatchEvent(event);
};

export const getTranslationVariables = (item) => {
    if (isObject(item)) {
        return [item.key, item.variables];
    }

    return [item, {}];
};

export const getSelectorData = (selector) => selector(getState());

export const createInteractiveGameObject = (
    scene,
    x,
    y,
    width,
    height,
    origin = { x: 0, y: 0 },
    isCircle = false
) => {
    const radius = Math.max(width, height) / 2;
    const customCollider = new GameObjects.Rectangle(
        scene,
        x,
        y,
        width,
        height
    ).setOrigin(origin.x, origin.y);

    scene.physics.add.existing(customCollider);
    customCollider.body.setImmovable(true);

    if (isCircle) {
        customCollider.body.setCircle(radius);
    }

    return customCollider;
};

// export const getFileNameWithoutPathOrExtension = (fileName) => {
//     const nameWithExtension = fileName.split('/').pop();
//     return nameWithExtension.replace(/\.[^/.]+$/, '');
// };

// Functions to check if a file exists within Webpack modules
// This might look dumb, but due to the way Webpack works, this is the only way to properly check
// Using a full path as a variable doesn't work because: https://github.com/webpack/webpack/issues/6680#issuecomment-370800037
export const isMapFileAvailable = (file) => {
    try {
        require.resolveWeak(`../assets/maps/${file}`);
        return true;
    } catch {
        console.error(`Error loading file ${file}`);
        return false;
    }
};

export const isWorldFileAvailable = (file) => {
    try {
        require.resolveWeak(`../assets/maps/worlds/${file}`);
        return true;
    } catch {
        console.error(`Error loading file ${file}`);
        return false;
    }
};

export const isImageFileAvailable = (file) => {
    try {
        require.resolveWeak(`../assets/images/${file}`);
        return true;
    } catch {
        console.error(`Error loading file ${file}`);
        return false;
    }
};

export const isTilesetFileAvailable = (file) => {
    try {
        require.resolveWeak(`../assets/tilesets/${file}`);
        return true;
    } catch {
        console.error(`Error loading file ${file}`);
        return false;
    }
};

export const isGeneratedAtlasFileAvailable = (file) => {
    try {
        require.resolveWeak(`../assets/atlases/generated/${file}`);
        return true;
    } catch {
        console.error(`Error loading file ${file}`);
        return false;
    }
};

export const getDegreeFromRadians = (radians) => (radians * (180 / Math.PI));

export const getRadiansFromDegree = (degree) => (degree * (Math.PI / 180));

export const rotateRectangleInsideTile = (x, y, width, height, degree) => {
    switch (degree) {
        case 90: {
            return [
                TILE_HEIGHT - (y + height),
                x,
                height,
                width,
            ];
        }

        case 180: {
            return [
                TILE_WIDTH - (x + width),
                TILE_HEIGHT - (y + height),
                width,
                height,
            ];
        }

        case 270: {
            return [
                y,
                TILE_WIDTH - (x + width),
                height,
                width,
            ];
        }

        default: {
            return [x, y, width, height];
        }
    }
};

export const isDev = () => process.env.NODE_ENV !== 'production';

export const getFileNameWithoutExtension = (filePath) => filePath.split('/').pop().split('.').shift();
