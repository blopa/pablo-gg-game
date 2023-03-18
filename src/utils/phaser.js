import { Game, AUTO, Scale } from 'phaser';
import { PhaserNavMeshPlugin } from 'phaser-navmesh';

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
export const asyncLoader = (loaderPlugin) => new Promise((resolve, reject) => {
    loaderPlugin.on('filecomplete', resolve).on('loaderror', reject);
    loaderPlugin.start();
});

export const prepareScene = (module, modulePath) => {
    if (Object.getOwnPropertyDescriptor(module.default || {}, 'prototype')) {
        return module.default;
    }

    function init(data) {
        // eslint-disable-next-line no-undefined
        if (isObject(module.scene)) {
            // when this function is called, "this" will be the scene
            // eslint-disable-next-line @babel/no-invalid-this
            Object.entries(this).forEach(([key, value]) => {
                // eslint-disable-next-line no-param-reassign
                module.scene[key] = value;
            });
        }

        module.init?.(data);
    }

    // Object.keys(Scene.prototype).forEach((key) => {
    //     if (!module[key]) {
    //         throw new Error(`Missing "${key}" method`);
    //     }
    // });

    const key = module.key || getFileNameWithoutExtension(modulePath);
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
        plugins: {
            scene: [
                {
                    key: 'PhaserNavMeshPlugin', // Key to store the plugin class under in cache
                    plugin: PhaserNavMeshPlugin, // Class that constructs plugins
                    mapping: 'navMeshPlugin', // Property mapping to use for the scene, e.g. this.navMeshPlugin
                    start: true,
                },
            ],
        },
        scale: {
            autoCenter: Scale.CENTER_BOTH,
            mode: Scale.NONE,
        },
        scene: getScenesModules(),
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
