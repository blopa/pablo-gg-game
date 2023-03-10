const path = require('path');
const sharp = require('sharp');
const { existsSync, mkdirSync, statSync, readdirSync } = require('fs');

async function runTask(
    inputFilePath,
    ...rest
) {
    if (statSync(inputFilePath).isDirectory()) {
        readdirSync(inputFilePath).forEach((filePath) => generateSeparatedSpriteFiles(
            path.resolve(inputFilePath, filePath),
            ...rest
        ));

        return;
    }

    generateSeparatedSpriteFiles(inputFilePath, ...rest);
}

async function generateSeparatedSpriteFiles(
    inputFilePath,
    spriteWidth,
    spriteHeight,
    order = 'row',
    ...movementNames
) {
    const inputFileName = path.basename(inputFilePath, path.extname(inputFilePath));
    const outputDirectory = path.join(path.dirname(inputFilePath), inputFileName);
    if (!existsSync(outputDirectory)) {
        mkdirSync(outputDirectory);
    }

    const metadata = await sharp(inputFilePath).metadata();
    const cols = Math.floor(metadata.width / spriteWidth);
    const rows = Math.floor(metadata.height / spriteHeight);
    if (movementNames.length === 0) {
        // eslint-disable-next-line no-param-reassign
        movementNames = [1, 2, 3, 4];
    }

    if (
        !((movementNames.length === cols && order === 'column')
        || (movementNames.length === rows && order === 'row'))
    ) {
        console.error('Sprites row/column quantity must be the same as the as the number of sprite names.');
        process.exit(1);
    }

    const isColumn = order === 'column';
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const left = col * spriteWidth;
            const top = row * spriteHeight;
            const spriteName = isColumn ? movementNames[col] : movementNames[row];
            const number = `${(isColumn ? row : col) + 1}`.padStart(`${isColumn ? rows : cols}`.length + 1, '0');
            const outputFileName = `${spriteName}_${number}.png`;
            const outputPath = path.join(outputDirectory, outputFileName);

            // eslint-disable-next-line no-await-in-loop
            await sharp(inputFilePath)
                .extract({ left, top, width: spriteWidth, height: spriteHeight })
                .toFile(outputPath);

            console.log(`Created ${outputPath}`);
        }
    }
}

runTask(
    process.argv[2],
    Number.parseInt(process.argv[3], 10),
    Number.parseInt(process.argv[4], 10),
    process.argv[5],
    ...process.argv.slice(6)
);
