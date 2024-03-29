import { GAME_CONTENT_ID } from '../../constants';

export const selectGameWidth = (state) => state.game.width;

export const selectGameHeight = (state) => state.game.height;

export const selectGameZoom = (state) => state.game.zoom;

export const selectGameCanvasElement = (state) =>
    state.game.canvas || document.querySelector(`#${GAME_CONTENT_ID}`)?.firstChild;

export const selectGameLocale = (state) => state.game.locale;

export const selectGameCameraSizeUpdateCallbacks = (state) =>
    state.game.cameraSizeUpdateCallbacks;

export const selectGameSetters = (state) => state.game.setters;

export const selectGameShowHeadsUpDisplay = (state) => state.game.showHeadsUpDisplay;

export const selectGameFadeAnimation = (state) => state.game.fadeAnimation;

export const selectGameControls = (state) => state.game.controls;

export const selectShouldPauseScene = (sceneName) => (state) =>
    state.game.pausedScenes[sceneName];
