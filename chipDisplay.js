export const chipDisplay = (function () {
    let canvas;

    function setupCanvas() {
        const scaleFactor = 15;
        const WIDTH = 64;
        const HEIGHT = 32;
        const realWidth = WIDTH * scaleFactor;
        const realHeight = HEIGHT * scaleFactor;

        const canvas = document.createElement("canvas");

        canvas.id = "myCanvas";
        canvas.style.display = "block";
        canvas.style.width = `${realWidth}px`;
        canvas.style.height = `${realHeight}px`;
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        canvas.style.imageRendering = "pixelated";
        canvas.style.imageRendering = "crisp-edges";
        canvas.style.border = "2px solid #333";
        canvas.style.background = "black";

        return canvas;
    }

    function drawPixel(x, y) {
        console.log(canvas.width);
        console.log(canvas.height);

        const ctx = canvas.getContext("2d");

        // Draw a test pattern to see the scaling
        ctx.fillStyle = "#0F0"; // CHIP-8 green
        ctx.fillRect(x, y, 1, 1);
    }

    return {
        init: function (container) {
            canvas = setupCanvas();
            container.appendChild(canvas);
        },
        drawPixel,
    };
})();
