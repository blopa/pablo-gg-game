const { readdirSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');

const MAPS_PATH = path.resolve(
    __dirname,
    '..',
    'src',
    'assets',
    'maps'
);

async function copyTilesetData(mapName = null) {
    if (!mapName) {
        console.error('No map passed');
        return;
    }

    const allFiles = [];
    let sourceTilesetData = [];
    const mapFiles = readdirSync(MAPS_PATH);

    // eslint-disable-next-line no-restricted-syntax
    for (const mapFile of mapFiles) {
        if (mapFile === `${mapName}.json`) {
            const jsonData = JSON.parse(readFileSync(path.resolve(MAPS_PATH, mapFile)));
            sourceTilesetData = jsonData.tilesets;
        } else {
            allFiles.push(path.resolve(MAPS_PATH, mapFile));
        }
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const jsonFile of allFiles) {
        const jsonData = JSON.parse(readFileSync(
            jsonFile
        ));

        jsonData.tilesets = sourceTilesetData;

        writeFileSync(
            jsonFile,
            JSON.stringify(jsonData, null, 2)
        );
    }
}

copyTilesetData(process.argv[2]);
