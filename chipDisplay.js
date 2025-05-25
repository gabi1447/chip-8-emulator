export const chipDisplay = (function () {
    let canvas;

    const colors = {
        on: "#ffa31a",
        off: "#262626",
    };

    const rows = 32;
    const cols = 64;

    // Display grid 64x32
    // Each pixel is represented by a 0 or a 1
    // Indicating if it's on or off
    let arrayDisplay = Array(32)
        .fill()
        .map(() => {
            return Array(64).fill(0);
        });

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
        canvas.style.background = colors.off;

        return canvas;
    }

    function resetDisplay() {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                arrayDisplay[i][j] = 0;
            }
        }
        updateDisplay();
    }

    function setPixelOnOrOff(x, y, onOrOff) {
        arrayDisplay[y][x] = onOrOff ? 1 : 0;
    }

    function updateDisplay() {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (arrayDisplay[i][j] === 1) {
                    drawPixel(j, i, true);
                } else {
                    drawPixel(j, i, false);
                }
            }
        }
    }

    function drawPixel(x, y, isItOn) {
        const ctx = canvas.getContext("2d");
        let color;

        if (isItOn) {
            color = colors.on;
        } else {
            color = colors.off;
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    }

    return {
        init: function (container) {
            canvas = setupCanvas();
            container.appendChild(canvas);
            resetDisplay();
        },
        drawPixel,
        resetDisplay,
        updateDisplay,
        setPixelOnOrOff,
    };
})();
