import { chipDisplay } from "./chipDisplay.js";

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
    const keys = new Uint8Array(16).fill(false);

    // prettier-ignore
    const keyMap = {
        '1': 0x1,
        '2': 0x2,
        '3': 0x3,
        '4': 0xC,
        'q': 0x4,
        'w': 0x5,
        'e': 0x6,
        'r': 0xD,
        'a': 0x7,
        's': 0x8,
        'd': 0x9,
        'f': 0xE,
        'z': 0xA,
        'x': 0x0,
        'c': 0xB,
        'v': 0xF
    }

    // Keyboard event listeners
    function addKeyboardEventListeners() {
        window.addEventListener("keydown", (e) => {
            const keyPressed = e.key;
            const keyMapping = keyMap[keyPressed];

            if (keyMapping !== undefined) {
                keys[keyPressed] = true;
            }
        });

        window.addEventListener("keyup", (e) => {
            const keyReleased = e.key;
            const keyMapping = keyMap[keyReleased];

            if (keyMapping !== undefined) {
                keys[keyReleased] = false;
            }
        });
    }

    // Handle keyboard user input
    async function waitForKeyPress(VxRegister) {
        const key = await keyPress();
        const keyMapping = keyMap[key];
        if (keyMapping !== undefined) {
            generalPurposeRegisters[VxRegister] = keyMapping;
        }
    }

    function keyPress() {
        return new Promise((resolve) => {
            document.addEventListener("keydown", function oneKeyHandler(e) {
                document.removeEventListener("keydown", oneKeyHandler);
                resolve(e.key);
            });
        });
    }

    // Opcodes
    let opcode;

    // ROMS
    // prettier-ignore
    const roms = {
        ibm: new Uint8Array(
            [
            0x00, 0xE0, 0xA2, 0X2A, 0X60, 0X0C, 0X61, 0X08, 0XD0, 0X1F, 0X70, 0X09, 0XA2, 0X39, 0XD0, 0X1F,
            0xA2, 0x48, 0x70, 0x08, 0xD0, 0x1F, 0x70, 0x04, 0xA2, 0x57, 0xD0, 0x1F, 0x70, 0x08, 0xA2, 0x66,
            0xD0, 0x1F, 0x70, 0x08, 0xA2, 0x75, 0xD0, 0x1F, 0x12, 0x28, 0xFF, 0x00, 0xFF, 0x00, 0x3C, 0x00,
            0x3C, 0x00, 0x3C, 0x00, 0x3C, 0x00, 0xFF, 0x00, 0xFF, 0xFF, 0x00, 0xFF, 0x00, 0x38, 0x00, 0x3F,
            0x00, 0x3F, 0x00, 0x38, 0x00, 0xFF, 0x00, 0xFF, 0x80, 0x00, 0xE0, 0x00, 0xE0, 0x00, 0x80, 0x00,
            0x80, 0x00, 0xE0, 0x00, 0xE0, 0x00, 0x80, 0xF8, 0x00, 0xFC, 0x00, 0x3E, 0x00, 0x3F, 0x00, 0x3B,
            0x00, 0x39, 0x00, 0xF8, 0x00, 0xF8, 0x03, 0x00, 0x07, 0x00, 0x0F, 0x00, 0xBF, 0x00, 0xFB, 0x00,
            0xF3, 0x00, 0xE3, 0x00, 0x43, 0xE0, 0x00, 0xE0, 0x00, 0x80, 0x00, 0x80, 0x00, 0x80, 0x00, 0x80,
            0x00, 0xE0, 0x00, 0xE0, 
            ]),
        pong: new Uint8Array([]),
    };

    const INSTRUCTIONS_PER_TICK = 10;

    // ---------------------------------------------------------------

    function init() {
        pc = 0x200; // Program counter starts at 0x200
        opcode = 0; // Reset current opcode
        I = 0; // Reset index register
        sp = 0; // Reset stack pointer

        // Set keys state to false NOT NECESSARY??
        /* keys = new Uint8Array(16).fill(false); */

        // Add keyboard event listeners
        addKeyboardEventListeners();

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

        /* console.log(`Instruction: ${opcode.toString(16).padStart(4, "0")}`); */

        // Filter instructions by first nibble for handling purporses
        // Decode by filtering
        switch (opcode & 0xf000) {
            case 0x0000:
                switch (opcode) {
                    case 0x00e0: // 0x00E0: Clears the Screen
                        chipDisplay.resetDisplay();
                        incrementPcByNumber(2);
                        setDrawFlag(true);
                        break;
                    case 0x00ee: // 0x00EE: Returns from subroutine
                        // Decrement stack pointer
                        sp--;
                        // Pop address from stack and set the pc to it to continue program flow
                        pc = stack.pop();
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
            case 0xa000:
                // 0xANNN: Set I (Index register) to NNN
                I = opcode & 0x0fff;
                /* console.log(`Index register: ${I}`); */
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
                        }
                        break;
                    // 0xEXA1 Skip next instruction if key with the value in Vx is not pressed.
                    case 0x00a1:
                        if (!keys[key]) {
                            // Skip instruction
                            incrementPcByNumber(4);
                        }
                        break;
                    default:
                        // do nothing
                        break;
                }

            case 0xd000:
                // 0xDXYN: Draw N-byte sprite rows at x, y coordinates,
                // starting at address stored in I (index register)
                const vx = (opcode & 0x0f00) >> 8;
                const vy = (opcode & 0x00f0) >> 4;
                const x = generalPurposeRegisters[vx];
                const y = generalPurposeRegisters[vy];

                // set vF flag to 0
                generalPurposeRegisters[0xf] = 0;
                const heightOfSrite = opcode & 0x000f;
                // sprite rows are represented by bytes, sprites have 8 bit of width and height rows
                let spriteArray = [];

                for (let i = 0; i < heightOfSrite; i++) {
                    spriteArray.push(memory[I + i]);
                }

                // Setting vf flag to 1 or 0 after rendering sprite to indicate a collision
                if (chipDisplay.renderSprites(x, y, spriteArray)) {
                    setVfFlag(true);
                } else {
                    setVfFlag(false);
                }
                setDrawFlag(true);
                incrementPcByNumber(2);

                break;
            case 0xf000:
                // 0xFX0A Wait for a key press, store the key value in Vx (blocks until key is pressed)
                const registerVx = (opcode & 0x0f00) >> 8;
                waitForKeyPress(registerVx);
                incrementPcByNumber(2);
                break;
            default:
                // do nothing in case the opcode doesn't match anyone
                // provided on the list
                break;
        }
    }

    function fetchCode() {
        const instructionsPerTick = 10;
        let counter = 0;
        for (let i = 0; i < instructionsPerTick; i++) {
            const testingOpcode = (memory[pc] << 8) | memory[pc + 1];
            console.log(
                `Instruction ${counter}: ${testingOpcode
                    .toString(16)
                    .padStart(4, "0")}`
            );
            counter++;
            incrementPcByNumber(2);
        }
    }

    function runInstructionsPerTick() {
        for (let i = 0; i < INSTRUCTIONS_PER_TICK; i++) {
            emulateCycle();
            /* const testingOpcode = (memory[pc] << 8) | memory[pc + 1]; */
            /* console.log(
                `Instruction ${counter}: ${testingOpcode
                    .toString(16)
                    .padStart(4, "0")}`
            ); */
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
    function loadRomIntoMemory(romName) {
        // program data should be loaded between 0x200 and 0xFFF
        const PROGRAM_START = 0x200;
        const rom = roms[romName];

        memory.set(rom, PROGRAM_START);
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

    function test() {
        /* console.log(memory.slice(0x050, 0x0a0));
        console.log(memory[0x050]);
        console.log(memory[0x09f]); */
    }

    return {
        init,
        test,
        emulateCycle,
        loadRomIntoMemory,
        setVfFlag,
        printVfFlag,
        fetchCode,
        updateTimers,
        checkDrawFlag,
        setDrawFlag,
        runInstructionsPerTick,
    };
})();

function main() {
    // Set up render system and register input callbacks
    // Container where the chipDisplay will be appended to
    const wrapper = document.querySelector(".wrapper");
    chipDisplay.init(wrapper);

    /* setupInput(); */

    // Initialize the Chip8 system and load the game into the memory
    chipEmulator.init();
    chipEmulator.loadRomIntoMemory("ibm");

    // Emulation loop
    setInterval(() => {
        chipEmulator.runInstructionsPerTick();

        // update display if drawFlag is set to true
        if (chipEmulator.checkDrawFlag()) {
            chipDisplay.updateDisplay();
            chipEmulator.setDrawFlag(false);
        }

        // update delay timer and sound timer
        chipEmulator.updateTimers();
    }, 1000);

    /* for (;;) {
        // Emulate one cycle
        chipEmulator.emulateCycle();

        // If the draw flag is set, update the screen
        // if (myChip8.drawFlag) drawGraphics();

        // Store key press state (Press and Release)
        // myChip8.setKeys();
    } */
}

main();
