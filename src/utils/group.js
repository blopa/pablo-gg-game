// eslint-disable-next-line import/prefer-default-export
export const handleCreateGroups = (scene) => {
    // Game groups
    // eslint-disable-next-line no-param-reassign
    scene.sprites = scene.add.group();
    // eslint-disable-next-line no-param-reassign
    scene.enemies = scene.add.group();
    // eslint-disable-next-line no-param-reassign
    scene.items = scene.add.group();
    // eslint-disable-next-line no-param-reassign
    scene.bombs = scene.add.group();
    // eslint-disable-next-line no-param-reassign
    scene.mapLayers = scene.add.group();
    // eslint-disable-next-line no-param-reassign
    scene.elements = scene.physics.add.staticGroup();
    // eslint-disable-next-line no-param-reassign
    scene.bombDestroyableElements = scene.physics.add.staticGroup();
};
