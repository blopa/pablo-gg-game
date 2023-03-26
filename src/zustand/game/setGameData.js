export default (set) => ({
    setGameShowHeadsUpDisplay: (showHeadsUpDisplay) =>
        set((state) => ({
            ...state,
            game: {
                ...state.game,
                showHeadsUpDisplay,
            },
        })),
    setGameWidth: (width) =>
        set((state) => ({
            ...state,
            game: {
                ...state.game,
                width,
            },
        })),
    setGameHeight: (height) =>
        set((state) => ({
            ...state,
            game: {
                ...state.game,
                height,
            },
        })),
    setGameZoom: (zoom) =>
        set((state) => ({
            ...state,
            game: {
                ...state.game,
                zoom,
            },
        })),
    setGameCanvasElement: (canvas) =>
        set((state) => ({
            ...state,
            game: {
                ...state.game,
                canvas,
            },
        })),
    addGameCameraSizeUpdateCallback: (cameraSizeUpdateCallback) => {
        set((state) => ({
            ...state,
            game: {
                ...state.game,
                // TODO make this a Set()
                cameraSizeUpdateCallbacks: [...state.game.cameraSizeUpdateCallbacks, cameraSizeUpdateCallback],
            },
        }));

        return cameraSizeUpdateCallback;
    },
    setGameLocale: (locale) =>
        set((state) => ({
            ...state,
            game: {
                ...state.game,
                locale,
            },
        })),
    setShouldPauseScene: (sceneName, shouldPause) =>
        set((state) => ({
            ...state,
            game: {
                ...state.game,
                pausedScenes: {
                    ...state.game.pausedScenes,
                    [sceneName]: shouldPause,
                },
            },
        })),
});
