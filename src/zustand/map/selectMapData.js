export const selectCurrentMapKey = (state) => state.mapData.currentMapKey;

export const selectMapKeyData = (mapKey) => (state) => state.mapData[mapKey];

export const selectTilesets = (mapKey) => (state) => state.mapData[mapKey].tilesets;

export const selectMapSetters = (state) => state.mapData.setters;

export const selectWorldData = (state) => state.mapData.worldData;
