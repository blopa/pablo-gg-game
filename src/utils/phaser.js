import { Game, AUTO, Scale } from 'phaser';
// import { GridEngine } from 'grid-engine';

// Utils
import { getFileNameWithoutExtension, getSelectorData, isDev, isObject } from './utils';

// Constants
import {
    TILE_WIDTH,
    TILE_HEIGHT,
    MIN_GAME_WIDTH,
    GAME_CONTENT_ID,
    BOOT_SCENE_NAME,
    MIN_GAME_HEIGHT,
    RESIZE_THRESHOLD,
    RE_RESIZE_THRESHOLD,
} from '../constants';

// Selectors
import { selectGameCameraSizeUpdateCallbacks, selectGameSetters } from '../zustand/game/selectGameData';

export const calculateGameSize = (
    minWidth,
    minHeight,
    tileWidth,
    tileHeight,
    widthThreshold = 0.5,
    heightThreshold = 0.5
) => {
    // const pixelRatio = window.devicePixelRatio || 1;
    const pixelRatio = 1;
    const widthScale = Math.floor((window.innerWidth * pixelRatio) / minWidth);
    const heightScale = Math.floor((window.innerHeight * pixelRatio) / minHeight);
    const zoom = Math.floor((widthScale + heightScale) / 2) || 1;
    // const zoom = 1;

    return {
        zoom,
        width: Math.floor(((window.innerWidth * pixelRatio) / zoom) / tileWidth) * tileWidth,
        height: Math.floor(((window.innerHeight * pixelRatio) / zoom - Math.ceil(10 / zoom)) / tileHeight) * tileHeight,
    };
};

// Thanks yannick @ https://phaser.discourse.group/t/loading-audio/1306/4
export const asyncLoader = (loaderPlugin, name = null) => new Promise((resolve, reject) => {
    loaderPlugin.on('filecomplete', resolve).on('complete', resolve).on('loaderror', reject);
    // .on('filecomplete', () => console.log('filecomplete', name))
    // .on('loaderror', () => console.log('loaderror', name))
    // .on('complete', () => console.log('complete', name))
    // .on('load', () => console.log('load', name))
    // .on('fileprogress', () => console.log('fileprogress', name))
    // .on('postprocess', () => console.log('postprocess', name))
    // .on('progress', () => console.log('progress', name))
    // .on('start', () => console.log('start', name))
    // .on('addfile', () => console.log('addfile', name));
    loaderPlugin.start();
});

export const prepareScene = (module, modulePath) => {
    if (Object.getOwnPropertyDescriptor(module.default || {}, 'prototype')) {
        return module.default;
    }

    const key = module.key || getFileNameWithoutExtension(modulePath);
    function init(data) {
        // eslint-disable-next-line @babel/no-invalid-this,unicorn/no-this-assignment
        const actualScene = this;
        // eslint-disable-next-line no-undefined
        if (isObject(module.sceneHelpers)) {
            // when this function is called, "this" will be the scene
            Object.entries(actualScene).forEach(([propName, value]) => {
                // eslint-disable-next-line no-param-reassign
                module.sceneHelpers[propName] = value;
            });

            // eslint-disable-next-line no-param-reassign
            module.sceneHelpers.getScene = () => actualScene;
        }

        module.init?.(data);
    }

    // Object.keys(Scene.prototype).forEach((key) => {
    //     if (!module[key]) {
    //         throw new Error(`Missing "${key}" method`);
    //     }
    // });

    return {
        ...module,
        name: key,
        key,
        init,
    };
};

export const getScenesModules = () => {
    // automatically import all scenes from the scenes folder
    const contextResolver = require.context('../game/scenes/', true, /\.(js|ts)$/);

    const modulePaths = contextResolver.keys();
    const bootScene = modulePaths
        .find((modulePath) => getFileNameWithoutExtension(modulePath) === BOOT_SCENE_NAME);
    const otherScenes = modulePaths
        .filter((modulePath) => getFileNameWithoutExtension(modulePath) !== BOOT_SCENE_NAME);

    return [bootScene, ...otherScenes]
        .map((modulePath) => prepareScene(contextResolver(modulePath), modulePath));
};

export const instantiatePhaserGame = (gameTitle = 'some-game-title') => {
    const IS_DEV = isDev();
    const { width, height, zoom } = calculateGameSize(
        MIN_GAME_WIDTH,
        MIN_GAME_HEIGHT,
        TILE_WIDTH,
        TILE_HEIGHT
    );

    const phaserGame = new Game({
        type: AUTO,
        title: gameTitle,
        parent: GAME_CONTENT_ID,
        // orientation: Scale.LANDSCAPE,
        localStorageName: gameTitle,
        width,
        height,
        zoom,
        autoRound: true,
        pixelArt: true,
        // plugins: {
        //     scene: [
        //         {
        //             key: 'gridEngine',
        //             plugin: GridEngine,
        //             mapping: 'gridEngine',
        //         },
        //     ],
        // },
        scale: {
            autoCenter: Scale.CENTER_BOTH,
            mode: Scale.NONE,
        },
        scene: getScenesModules(),
        roundPixels: true,
        physics: {
            default: 'arcade',
            arcade: {
                debug: IS_DEV,
                // fixedStep: false,
                // fps: 120,
            },
        },
        backgroundColor: '#000000',
    });

    const {
        setGameZoom,
        setGameWidth,
        setGameHeight,
        setGameCanvasElement,
    } = getSelectorData(selectGameSetters);
    const updateGameGlobalState = (gameWidth, gameHeight, gameZoom) => {
        setGameHeight(gameHeight);
        setGameWidth(gameWidth);
        setGameZoom(gameZoom);
    };

    updateGameGlobalState(width, height, zoom);
    setGameCanvasElement(phaserGame.canvas);

    if (IS_DEV) {
        window.phaserGame = phaserGame;
    }

    let timeOutFunctionId;
    const resizeDoneCallback = () => {
        const scaleGame = () => {
            const gameSize = calculateGameSize(
                MIN_GAME_WIDTH,
                MIN_GAME_HEIGHT,
                TILE_WIDTH,
                TILE_HEIGHT
            );

            const cameraSizeUpdateCallbacks = getSelectorData(selectGameCameraSizeUpdateCallbacks);
            phaserGame.scale.setZoom(gameSize.zoom);
            phaserGame.scale.resize(gameSize.width, gameSize.height);
            // game.scale.setGameSize(gameSize.width, gameSize.height);
            // game.scale.displaySize.resize(gameSize.width, gameSize.height);
            // game.scale.resize(gameSize.width, gameSize.height).getParentBounds();
            updateGameGlobalState(gameSize.width, gameSize.height, gameSize.zoom);
            // game.canvas.style.width = `${gameSize.width}px`;
            // game.canvas.style.height = `${gameSize.height}px`;
            cameraSizeUpdateCallbacks.forEach((cameraSizeUpdateCallback) => {
                cameraSizeUpdateCallback?.();
            });
        };

        scaleGame();

        // re-run function after resize is done to re-trigger css calculations
        setTimeout(scaleGame, RE_RESIZE_THRESHOLD);
    };

    const canvasResizeCallback = () => {
        clearTimeout(timeOutFunctionId);
        timeOutFunctionId = setTimeout(resizeDoneCallback, RESIZE_THRESHOLD);
    };

    // TODO move to the ResizeObserver https://jsfiddle.net/rudiedirkx/p0ckdcnv/
    window.addEventListener('resize', canvasResizeCallback);
};
