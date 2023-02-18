const path = require('path');
const sharp = require('sharp');
const { existsSync, mkdirSync } = require('fs');

async function generateSeparatedSpriteFiles(inputFilePath, spriteWidth, spriteHeight) {
    const inputFileName = path.basename(inputFilePath, path.extname(inputFilePath));
    const outputDirectory = path.join(path.dirname(inputFilePath), inputFileName);
    if (!existsSync(outputDirectory)) {
        mkdirSync(outputDirectory);
    }

    const metadata = await sharp(inputFilePath).metadata();
    const cols = Math.floor(metadata.width / spriteWidth);
    const rows = Math.floor(metadata.height / spriteHeight);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const left = col * spriteWidth;
            const top = row * spriteHeight;
            const outputFileName = `${inputFileName}_${row + 1}_${col + 1}.png`;
            const outputPath = path.join(outputDirectory, outputFileName);

            // eslint-disable-next-line no-await-in-loop
            await sharp(inputFilePath)
                .extract({ left, top, width: spriteWidth, height: spriteHeight })
                .toFile(outputPath);

            console.log(`Created ${outputPath}`);
        }
    }
}

generateSeparatedSpriteFiles(
    process.argv[2],
    Number.parseInt(process.argv[3], 10),
    Number.parseInt(process.argv[4], 10)
);
