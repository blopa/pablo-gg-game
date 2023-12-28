import { createStore, useStore } from 'zustand';

// Constants
import {
    ACTION_KEY,
    ACTION_ITEM,
    UP_DIRECTION,
    ACTION_CANCEL,
    DOWN_DIRECTION,
    LEFT_DIRECTION,
    MIN_GAME_WIDTH,
    MIN_GAME_HEIGHT,
    RIGHT_DIRECTION,
} from '../constants';

// Setters
import setLoadedAssets from './assets/setLoadedAssets';
import setGameData from './game/setGameData';
import setHeroData from './hero/setHeroData';
import setDialog from './dialog/setDialog';
import setMapData from './map/setMapData';
import setMenu from './menu/setMenu';
import setText from './text/setText';

// define the store
const store = createStore((set) => ({
    loadedAssets: {
        fonts: [],
        atlases: [],
        images: [],
        maps: [],
        worlds: [],
        jsons: [],
        setters: setLoadedAssets(set),
    },
    heroData: {
        facingDirection: '',
        initialPosition: {},
        previousPosition: {},
        totalHealth: 80,
        currentHealth: 80,
        totalMana: 60,
        currentMana: 60,
        initialFrame: '',
        inventory: {
            dice: [],
        },
        setters: setHeroData(set),
    },
    mapData: {
        // '[mapKey]': {
        //     tilesets: [],
        //     height: 800,
        //     width: 800,
        //     x: -320,
        //     y: 0,
        // },
        currentMapKey: '',
        worldData: {
            maps: [],
            onlyShowAdjacentMaps: false,
            type: 'world',
        },
        setters: setMapData(set),
    },
    game: {
        width: MIN_GAME_WIDTH,
        height: MIN_GAME_HEIGHT,
        zoom: 1,
        locale: 'en',
        cameraSizeUpdateCallbacks: [],
        pausedScenes: {},
        showHeadsUpDisplay: false,
        controls: {
            [UP_DIRECTION]: 'ArrowUp',
            [DOWN_DIRECTION]: 'ArrowDown',
            [LEFT_DIRECTION]: 'ArrowLeft',
            [RIGHT_DIRECTION]: 'ArrowRight',
            [ACTION_KEY]: 'Space',
            [ACTION_ITEM]: 'Enter',
            [ACTION_CANCEL]: 'Escape',
        },
        // 'left', 'right', 'up', 'down', 'none'
        fadeAnimation: 'none',
        setters: setGameData(set),
    },
    dialog: {
        messages: [],
        action: null,
        characterName: '',
        setters: setDialog(set),
    },
    menu: {
        items: [],
        position: 'center',
        onSelect: null,
        setters: setMenu(set),
    },
    text: {
        texts: [],
        setters: setText(set),
    },
}));

export const useGameStore = (selector) => useStore(store, selector);

export const getState = () => store.getState();
