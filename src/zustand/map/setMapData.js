export default (set) => ({
    setWorldData: (worldData) =>
        set((state) => ({
            ...state,
            mapData: {
                ...state.mapData,
                worldData,
            },
        })),
    setCurrentMapKey: (currentMapKey) =>
        set((state) => ({
            ...state,
            mapData: {
                ...state.mapData,
                currentMapKey,
            },
        })),
    addMapKeyData: (mapKey, mapData) =>
        set((state) => ({
            ...state,
            mapData: {
                ...state.mapData,
                [mapKey]: mapData,
            },
        })),
    removeMapKey: (mapKey, mapData) =>
        set((state) => {
            // TODO use filter
            // eslint-disable-next-line no-param-reassign
            const newState = { ...state };
            delete newState.mapData[mapKey];
            return newState;
        }),
    addMapKeyDataTileset: (mapKey, tilesets) =>
        set((state) => ({
            ...state,
            mapData: {
                ...state.mapData,
                [mapKey]: {
                    ...state.mapData[mapKey],
                    // TODO make this a Set()
                    tilesets: [...state.mapData[mapKey].tilesets, tilesets],
                },
            },
        })),
});
