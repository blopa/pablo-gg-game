import { Display, Math as PhaserMath } from 'phaser';

export const generateColorPixelTexture = (scene, color, textureName, width = 2, height = 2) => {
    let texture = scene.textures.get(textureName);
    if (texture.key !== textureName) {
        generateTextureFromColor(scene, color, textureName, width, height);
        texture = scene.textures.get(textureName);
    }

    return texture;
};

export const generateAverageColorPixelTexture = (scene, sprite, textureName) => {
    // const tex = scene.textures.get('slime');
    // let newTexture = tex.generateTexture('new', tex.width, tex.height);
    const tex = scene.textures.get(textureName);
    if (tex.key === textureName) {
        return tex;
    }

    // const pixels = scene.textures.getPixel(16, 16, enemyImage.texture.key);
    // const hexColor = Display.Color.RGBToString(pixels.r, pixels.g, pixels.b);

    const source = sprite.texture.getSourceImage(); // enemyImage
    const canvas = scene.textures.createCanvas(PhaserMath.RND.uuid(), source.width, source.height);
    canvas.draw(0, 0, source);
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    canvas.destroy();

    let totalRed = 0;
    let totalGreen = 0;
    let totalBlue = 0;
    const numPixels = pixels.length / 4;

    for (let i = 0; i < pixels.length; i += 4) {
        totalRed += pixels[i];
        totalGreen += pixels[i + 1];
        totalBlue += pixels[i + 2];
    }

    const avgRed = totalRed / numPixels;
    const avgGreen = totalGreen / numPixels;
    const avgBlue = totalBlue / numPixels;
    const avgColor = Display.Color.GetColor(avgRed, avgGreen, avgBlue);

    // const intColor = Number.parseInt(avgColor.replace('#', '0x'), 10);
    generateTextureFromColor(scene, avgColor, textureName);

    return scene.textures.get(textureName);
};

export const generateTextureFromColor = (scene, color, textureName, width = 2, height = 2) => {
    const graphics = scene.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, height);
    return graphics.generateTexture(textureName, width, height);
    // scene.textures.addTexture(texture);
};
