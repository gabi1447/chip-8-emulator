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
        const WIDTH = cols;
        const HEIGHT = rows;
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

    function renderSprites(x, y, spriteArray) {
        // Takes an array of bytes representing a sprite
        // if it has 5 elements, the sprite is 8x5
        // x, y represent the initial coordinates to start drawing the sprite from
        // sprites always have 8 bits of width

        // Once there's been a collision, no need to check for more
        let isThereACollision = false;

        // if x is greater than or equal to 64
        // or y is greater than or equal to 32
        // we perform the modulo to wrap the coordinates around
        x = x >= 64 ? x % 64 : x;
        y = y >= 32 ? y % 32 : y;

        // calculate end of the row to check if surpasses rightwards edge
        const endOfRow = x + 8;
        let rowLength = 8;
        if (endOfRow >= 64) {
            // if so calculate allowable row length to place in the display
            // set row length
            rowLength = 64 - x;
        }

        for (let i = 0; i < spriteArray.length; i++) {
            // take current state of the display row that's going to be updated
            const screen8bitRow = arrayDisplay[y].slice(x, x + rowLength);

            // turn the array into a string
            const screen8bitRowString = screen8bitRow.join("");
            // check for collisions
            if (!isThereACollision) {
                const spriteRowString = intToBinaryString(spriteArray[i]);
                isThereACollision = checkForCollision(
                    spriteRowString,
                    screen8bitRowString
                );
            }
            // add padding until its 8 bits and then turn it
            //  into the decimal representaion of that binary sequence
            const screen8bitRowNum = parseInt(
                screen8bitRowString.padEnd(8, "0"),
                2
            );

            // execute an XOR operation to determine the new state of that 8 pixel row
            const binaryRowRepresentation = screen8bitRowNum ^ spriteArray[i];

            // turn the new state to a 8 bit binary string
            const binaryRowStringRepresentation = intToBinaryString(
                binaryRowRepresentation
            );

            // parse the binary string and update the arrayDisplay
            for (let j = 0; j < rowLength; j++) {
                arrayDisplay[y][x + j] = Number(
                    binaryRowStringRepresentation[j]
                );
            }
            // Render rows
            // Increase Y coordinates
            y++;
            // if height surpasses downwards display edge, break.
            if (y >= 32) {
                break;
            }
        }

        // Render sprite --> DISABLED, just update the display buffer
        // The buffer will be rendered after each tick when the draw flag
        // is set to true
        /* updateDisplay(); */

        return isThereACollision;
    }

    function checkForCollision(spriteRowString, screenRowString) {
        spriteRowString = spriteRowString.slice(0, screenRowString.length);
        for (let i = 0; i < spriteRowString.length; i++) {
            if (
                Number(spriteRowString[i]) === 1 &&
                Number(screenRowString[i]) === 1
            ) {
                return true;
            }
        }
        return false;
    }

    function intToBinaryString(number) {
        const binaryString = number.toString(2);
        return binaryString.padStart(8, "0");
    }

    function test() {}

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
        renderSprites,
        test,
    };
})();
