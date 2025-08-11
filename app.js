import { chipDisplay } from "./chipDisplay.js";
import roms from "./roms.js";

/* 
🟢 --> Implemented and tested
🟠 --> Implemented, but not tested
🔴 --> Not implemented
*/

const chipEmulator = (function () {
    // MEMORY

    // 4096 memory addresses of 1 byte each one
    // 0x000-0x1FF - Chip 8 interpreter (contains font set in emu)
    // 0x050-0x0A0 - Used for the built in 4x5 pixel font set (0-F)
    // 0x200-0xFFF - Program ROM and work RAM

    let memory = new Uint8Array(4096);

    // CPU REGISTERS
    // 16 8-bit General purpose registers v0-vF
    // vF register is used as a flag register
    let generalPurposeRegisters;

    // Index register I (16 bit) used to store memory addresses
    let I;

    // Program Counter (PC) used to store the currently execution address
    // 16 bit register
    let pc;

    // Stack array of 16 16bits
    let stack;
    // Stack pointer. Points to the top level of the stack 8-bit
    let sp;

    // Delay and Sound Timers 8-bit registers
    let delayTimer;
    let soundTimer;

    // Draw flag to check when the screen needs to be updated using the display buffer
    let drawFlag;

    function setDrawFlag(bool) {
        drawFlag = bool;
    }

    function checkDrawFlag() {
        return drawFlag;
    }

    // Hexadecimal font sprites
    // 0x050- 0x0A0
    // prettier-ignore
    const hexFontData = new Uint8Array([
    0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
    0x20, 0x60, 0x20, 0x20, 0x70, // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
    0x90, 0x90, 0xF0, 0x10, 0x10, // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
    0xF0, 0x10, 0x20, 0x40, 0x40, // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90, // A
    0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
    0xF0, 0x80, 0x80, 0x80, 0xF0, // C
    0xE0, 0x90, 0x90, 0x90, 0xE0, // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
    0xF0, 0x80, 0xF0, 0x80, 0x80, // F
]);

    // Keypad keys
    const keys = new Array(16).fill(false);

    // prettier-ignore
    const keyMap = {
        '1': 0x1, '2': 0x2, '3': 0x3, '4': 0xC,
        'q': 0x4, 'w': 0x5, 'e': 0x6, 'r': 0xD,
        'a': 0x7, 's': 0x8, 'd': 0x9, 'f': 0xE,
        'z': 0xA, 'x': 0x0, 'c': 0xB, 'v': 0xF
    }

    // Keyboard event listeners
    function addKeyboardEventListeners() {
        window.addEventListener("keydown", (e) => {
            const keyPressed = e.key;
            const keyMapping = keyMap[keyPressed];

            if (keyMapping !== undefined) {
                keys[keyMapping] = true;
                if (waitingForKey) {
                    generalPurposeRegisters[waitingRegister] = keyMapping;
                    waitingForKey = false;
                    waitingRegister = null;
                    incrementPcByNumber(2);
                }
            }
        });

        window.addEventListener("keyup", (e) => {
            const keyReleased = e.key;
            const keyMapping = keyMap[keyReleased];

            if (keyMapping !== undefined) {
                keys[keyMapping] = false;
            }
        });
    }

    let opcode;

    const INSTRUCTIONS_PER_TICK = 1;

    let waitingForKey = false;
    let waitingRegister = null;

    function addRomChangeEventListener() {
        const selectRoms = document.getElementById("roms");

        selectRoms.addEventListener("change", (e) => {
            const romName = e.target.value;
            main(romName);
        });
    }

    let listenersAdded = false;

    function addEventListeners() {
        if (listenersAdded) return;
        addKeyboardEventListeners();
        addRomChangeEventListener();
        listenersAdded = true;
    }

    let animationFrameId;

    function checkAnimationFrameId() {
        return animationFrameId;
    }

    function setAnimationFrameId(id) {
        animationFrameId = id;
    }

    // ---------------------------------------------------------------

    function init() {
        pc = 0x200; // Program counter starts at 0x200
        opcode = 0; // Reset current opcode
        I = 0; // Reset index register
        sp = 0; // Reset stack pointer

        // Set keys state to false NOT NECESSARY??
        /* keys = new Uint8Array(16).fill(false); */

        addEventListeners();

        // Reset key wait state
        waitingForKey = false;
        waitingRegister = null;

        // Reset drawFlag NOT NECESSARY??
        drawFlag = false;

        // Clear display
        chipDisplay.resetDisplay();
        // Clear stack
        stack = new Uint16Array(16);
        // Clear registers V0-VF
        generalPurposeRegisters = new Uint8Array(16).fill(0);
        // Clear memory
        memory = new Uint8Array(4096);

        // Load fontset
        loadFontsIntoMemory();

        // Reset timers
        delayTimer = 0;
        soundTimer = 0;
    }

    function incrementPcByNumber(num) {
        pc += num;
    }

    function emulateCycle() {
        // Nibble means a hex character that represents 4 bits in the 2 byte instruction
        // Fetch opcode
        opcode = (memory[pc] << 8) | memory[pc + 1];

        const firstNibble = (opcode & 0xf000) >> 12;
        const secondNibble = (opcode & 0x0f00) >> 8;
        const thirdNibble = (opcode & 0x00f0) >> 4;
        const fourthNibble = opcode & 0x000f;

        /* console.log(`Instruction: ${opcode.toString(16).padStart(4, "0")}`); */
        if (waitingForKey) return;

        // Filter instructions by first nibble for handling purporses
        // Decode by filtering
        switch (opcode & 0xf000) {
            case 0x0000:
                switch (opcode) {
                    case 0x00e0:
                        // 0x00E0: Clears the Screen
                        chipDisplay.resetDisplay();
                        incrementPcByNumber(2);
                        setDrawFlag(true);
                        break;
                    case 0x00ee:
                        // 0x00EE: Returns from subroutine
                        // Decrement stack pointer
                        sp--;
                        // Pop address from stack and set the pc to it to continue program flow
                        // after subroutine call
                        pc = stack[sp];
                        stack[sp] = 0;
                        incrementPcByNumber(2);
                        break;
                    default:
                        console.log(`Unknown opcode ${opcode}`);
                        break;
                }
                break;
            case 0x1000:
                // 1NNN: jump to the specified NNN address
                // update program counter
                pc = opcode & 0x0fff;
                break;
            case 0x2000:
                // 2NNN: Call subroutine at NNN address
                // XOR subroutine address
                const subroutineAddress = opcode & 0x0fff;
                // save current address at stack and increment stack pointer
                stack[sp] = pc;
                sp++;
                // set program counter to subroutine address
                pc = subroutineAddress;
                break;
            case 0x3000:
                // 3XNN: Skips next instruction if vX is equal NN.
                if (
                    generalPurposeRegisters[(opcode & 0x0f00) >> 8] ===
                    (opcode & 0x00ff)
                ) {
                    incrementPcByNumber(2);
                }
                incrementPcByNumber(2);
                break;
            case 0x4000:
                // 4XNN: Skips next instruction if vX doesn't equal NN.
                if (
                    generalPurposeRegisters[(opcode & 0x0f00) >> 8] !==
                    (opcode & 0x00ff)
                ) {
                    incrementPcByNumber(2);
                }
                incrementPcByNumber(2);
                break;
            case 0x5000:
                // 5XY0: Skips next instruction if vX and vY are equal
                if (
                    generalPurposeRegisters[(opcode & 0x0f00) >> 8] ===
                    generalPurposeRegisters[(opcode & 0x00f0) >> 4]
                ) {
                    incrementPcByNumber(2);
                }
                incrementPcByNumber(2);
                break;
            case 0x6000:
                // 6XNN: Set Vx register to NN
                generalPurposeRegisters[(opcode & 0x0f00) >> 8] =
                    opcode & 0x00ff;
                /* console.log(generalPurposeRegisters); */
                incrementPcByNumber(2);
                break;
            case 0x7000:
                // 7XNN: Add the value of NN to Vx
                generalPurposeRegisters[(opcode & 0x0f00) >> 8] +=
                    opcode & 0x00ff;
                incrementPcByNumber(2);
                break;
            case 0x8000:
                switch (opcode & 0x000f) {
                    case 0x0000:
                        // 8XY0: vX is set to vY.
                        generalPurposeRegisters[secondNibble] =
                            generalPurposeRegisters[thirdNibble];
                        break;
                    case 0x0001:
                        // 8XY1: vX is set to the or operation of vX and vY.
                        generalPurposeRegisters[secondNibble] =
                            generalPurposeRegisters[secondNibble] |
                            generalPurposeRegisters[thirdNibble];
                        break;
                    case 0x0002:
                        // 8XY2: vX is set to the and operation of vX and vY
                        generalPurposeRegisters[secondNibble] =
                            generalPurposeRegisters[secondNibble] &
                            generalPurposeRegisters[thirdNibble];
                        break;
                    case 0x0003:
                        // 8XY3: vX is set to the xor operation of vX and vY
                        generalPurposeRegisters[secondNibble] =
                            generalPurposeRegisters[secondNibble] ^
                            generalPurposeRegisters[thirdNibble];
                        break;
                    case 0x0004:
                        // 8XY4: vX is set to the value of vX plus the value of vY. vF is set to
                        // 1 if the value overflows 255, otherwise it is set to 0
                        const addition =
                            generalPurposeRegisters[secondNibble] +
                            generalPurposeRegisters[thirdNibble];
                        // keep only first 8 bits in the vX register
                        generalPurposeRegisters[secondNibble] = addition & 0xff;
                        // set vF flag
                        generalPurposeRegisters[0xf] = addition > 255 ? 1 : 0;
                        break;
                    case 0x0005:
                        // 8XY5: sets vX to the result of vX - vY.
                        generalPurposeRegisters[secondNibble] =
                            (generalPurposeRegisters[secondNibble] -
                                generalPurposeRegisters[thirdNibble]) &
                            0xff;
                        generalPurposeRegisters[0xf] =
                            generalPurposeRegisters[secondNibble] >=
                            generalPurposeRegisters[thirdNibble]
                                ? 1
                                : 0;
                        break;
                    case 0x0006:
                        // 8XY6: Set vX = vY shift right by one bit (divide by two)

                        // CAREFUL this instruction has different implementations
                        //  for chip 8 and super chip 8 interpreters

                        // chip 8 implementation
                        generalPurposeRegisters[0xf] =
                            generalPurposeRegisters[secondNibble] & 0x1;
                        generalPurposeRegisters[secondNibble] =
                            generalPurposeRegisters[secondNibble] >> 1;
                        // TODO Modern implementation
                        break;
                    case 0x0007:
                        // 8XY7: sets vX to the result of vY - vX.
                        generalPurposeRegisters[secondNibble] =
                            (generalPurposeRegisters[thirdNibble] -
                                generalPurposeRegisters[secondNibble]) &
                            0xff;
                        generalPurposeRegisters[0xf] =
                            generalPurposeRegisters[thirdNibble] >=
                            generalPurposeRegisters[secondNibble]
                                ? 1
                                : 0;
                        break;
                    case 0x000e:
                        // 8XYE: Set vX = vY shift left by one bit (multiply by two)

                        // CAREFUL this instruction has different implementations
                        // for chip 8 and super chip 8 interpreters

                        // chip 8 implementation
                        generalPurposeRegisters[0xf] =
                            (generalPurposeRegisters[secondNibble] >> 7) & 0x1;
                        generalPurposeRegisters[secondNibble] =
                            generalPurposeRegisters[secondNibble] << 1;
                        // TODO Modern implementation
                        break;
                    default:
                        break;
                }
                break;
            case 0x9000:
                // 9XY0: Skips if vX and vY are not equal
                if (
                    generalPurposeRegisters[(opcode & 0x0f00) >> 8] !==
                    generalPurposeRegisters[(opcode & 0x00f0) >> 4]
                ) {
                    incrementPcByNumber(2);
                }
                incrementPcByNumber(2);
                break;
            case 0xa000:
                // 0xANNN: Set I (Index register) to NNN
                I = opcode & 0x0fff;
                /* console.log(`Index register: ${I}`); */
                incrementPcByNumber(2);
                break;
            case 0xb000:
                // 0xBNNN: Jump to location nnn + V0
                pc = (opcode & 0x0fff) + generalPurposeRegisters[0];
                break;
            case 0xc000:
                // 0xCXKK: Set vX = random byte AND kk
                // randomize number between 0 and 255
                const randomNumber = Math.floor(Math.random() * 256);
                generalPurposeRegisters[secondNibble] =
                    randomNumber & (opcode & 0x00ff);
                incrementPcByNumber(2);
                break;
            case 0xe000:
                const vxRegister = (opcode & 0x0f00) >> 8;
                const key = generalPurposeRegisters[vxRegister];

                switch (opcode & 0x00ff) {
                    // 0xEX9E Skip next instruction if key with the value in Vx is pressed.
                    case 0x009e:
                        if (keys[key]) {
                            // Skip instruction
                            incrementPcByNumber(4);
                        } else {
                            incrementPcByNumber(2);
                        }
                        break;
                    // 0xEXA1 Skip next instruction if key with the value in Vx is not pressed.
                    case 0x00a1:
                        if (!keys[key]) {
                            // Skip instruction
                            incrementPcByNumber(4);
                        } else {
                            incrementPcByNumber(2);
                        }
                        break;
                    default:
                        // do nothing
                        break;
                }
                break;
            case 0xd000:
                // 0xDXYN: Draw N-byte sprite rows at x, y coordinates,
                // starting at address stored in I (index register)
                const vx = (opcode & 0x0f00) >> 8;
                const vy = (opcode & 0x00f0) >> 4;
                const x = generalPurposeRegisters[vx];
                const y = generalPurposeRegisters[vy];

                // set vF flag to 0
                setVfFlag(false);
                /* generalPurposeRegisters[0xf] = 0; */
                const heightOfSrite = opcode & 0x000f;
                // sprite rows are represented by bytes, sprites have 8 bit of width and height rows
                let spriteArray = [];

                for (let i = 0; i < heightOfSrite; i++) {
                    spriteArray.push(memory[I + i]);
                }

                // Setting vf flag to 1 or 0 after rendering sprite to indicate a collision
                const collision = chipDisplay.renderSprites(x, y, spriteArray);
                if (collision) {
                    setVfFlag(true);
                } else {
                    setVfFlag(false);
                }
                setDrawFlag(true);
                incrementPcByNumber(2);
                break;
            case 0xf000:
                switch (opcode & 0x00ff) {
                    case 0x0007:
                        // FX07: Set vX = delay timer value
                        generalPurposeRegisters[secondNibble] = delayTimer;
                        incrementPcByNumber(2);
                        break;
                    case 0x0018:
                        // Set sound timer = vX
                        soundTimer = generalPurposeRegisters[secondNibble];
                        incrementPcByNumber(2);
                        break;
                    case 0x0015:
                        // FX15: Set delay timer = vX
                        delayTimer = generalPurposeRegisters[secondNibble];
                        incrementPcByNumber(2);
                        break;
                    case 0x001e:
                        // FX1E: Set I = I + vX
                        I = I + generalPurposeRegisters[secondNibble];
                        incrementPcByNumber(2);
                        break;
                    case 0x0029:
                        // FX29: Set I = location of sprite for hexadecimal digit in Vx

                        // 0x050 is the memory address where the hexadecimal char sprites
                        // start getting populated
                        I = 0x050 + generalPurposeRegisters[secondNibble] * 5;
                        incrementPcByNumber(2);
                        break;
                    case 0x0033:
                        // FX33: Store decimals of vX in memory locations I, I+1, I+2
                        const number = generalPurposeRegisters[secondNibble];
                        const decimalsArray = number
                            .toString()
                            .padStart(3, "0")
                            .split("");
                        const arrayOfNumbers = decimalsArray.map(
                            (numString) => {
                                return Number(numString);
                            }
                        );
                        memory.set(arrayOfNumbers, I);
                        incrementPcByNumber(2);
                        break;
                    case 0x0055:
                        // FX55: Store registers v0 through vX in memory starting at location I
                        const v0tovXArray = generalPurposeRegisters.slice(
                            0,
                            secondNibble + 1
                        );
                        memory.set(v0tovXArray, I);
                        incrementPcByNumber(2);
                        break;
                    case 0x0065:
                        // FX65: Read registers v0 through vX from memory starting at location I.
                        const i0toiXArray = memory.slice(
                            I,
                            I + secondNibble + 1
                        );
                        generalPurposeRegisters.set(i0toiXArray, 0);
                        incrementPcByNumber(2);
                        break;
                    case 0x000a:
                        // FX0A: Wait for a key press, store the key value in Vx (blocks until key is pressed)
                        waitingForKey = true;
                        waitingRegister = secondNibble;
                        break;
                }

            default:
                // do nothing in case the opcode doesn't match anyone
                // provided on the list
                break;
        }

        if ((opcode & 0xf000) === 0x8000) {
            incrementPcByNumber(2);
        }
    }

    function runInstructionsPerTick() {
        for (let i = 0; i < INSTRUCTIONS_PER_TICK; i++) {
            emulateCycle();
        }
    }

    function setVfFlag(bool) {
        generalPurposeRegisters[0xf] = bool ? 1 : 0;
    }

    function printVfFlag() {
        console.log(generalPurposeRegisters[0xf]);
    }

    // 🟢
    function loadFontsIntoMemory() {
        // Font data should be loaded between 0x050 - 0x0A0
        memory.set(hexFontData, 0x050);
    }

    // 🟢
    function loadRomIntoMemory(romCode) {
        // program data should be loaded between 0x200 and 0xFFF
        const PROGRAM_START = 0x200;
        memory.set(romCode, PROGRAM_START);
    }

    function updateTimers() {
        if (delayTimer > 0) {
            delayTimer--;
        }
        if (soundTimer > 0) {
            soundTimer--;
        }

        // Beeping functionality
        /* if (soundTimer === 0) {
            
        } */
    }

    return {
        init,
        emulateCycle,
        loadRomIntoMemory,
        setVfFlag,
        printVfFlag,
        updateTimers,
        checkDrawFlag,
        setDrawFlag,
        runInstructionsPerTick,
        checkAnimationFrameId,
        setAnimationFrameId,
    };
})();

function main(romName) {
    // cancel previous animation frame loop
    if (chipEmulator.checkAnimationFrameId() !== null) {
        cancelAnimationFrame(chipEmulator.checkAnimationFrameId());
    }

    const wrapper = document.querySelector(".wrapper");
    chipDisplay.init(wrapper);

    chipEmulator.init();
    chipEmulator.loadRomIntoMemory(roms[romName]);

    let lastTime = performance.now();
    let instructionAccumulator = 0;
    let timerAccumulator = 0;
    const INSTRUCTIONS_PER_SECOND = 500; // ~9 instructions per 60Hz frame
    const TIMER_INTERVAL = 1000 / 60; // 60Hz

    function loop(now) {
        const delta = now - lastTime; // Time since last frame in ms
        lastTime = now;

        /* instructionAccumulator += delta; */
        timerAccumulator += delta;

        // Calculate how many instructions to run based on elapsed time
        const instructionsPerTick = (INSTRUCTIONS_PER_SECOND / 1000) * delta;
        /* for (let i = 0; i < Math.floor(instructionsPerTick); i++) {
            chipEmulator.runInstructionsPerTick();
        } */
        instructionAccumulator += instructionsPerTick;
        while (instructionAccumulator >= 1) {
            chipEmulator.runInstructionsPerTick();
            instructionAccumulator -= 1;
        }

        // Update display if needed
        if (chipEmulator.checkDrawFlag()) {
            chipDisplay.updateDisplay();
            chipEmulator.setDrawFlag(false);
        }

        // Update timers at 60Hz (decrement delay/sound timers)
        while (timerAccumulator >= TIMER_INTERVAL) {
            chipEmulator.updateTimers();
            timerAccumulator -= TIMER_INTERVAL;
        }

        chipEmulator.setAnimationFrameId(requestAnimationFrame(loop));
    }

    chipEmulator.setAnimationFrameId(requestAnimationFrame(loop));
}

main("stars");
