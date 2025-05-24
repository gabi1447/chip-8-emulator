import { chipDisplay } from "./chipDisplay.js";

/* 
🟢 --> Implemented and tested
🟠 --> Implemented, but not tested
🔴 --> Not implemented
*/

// Container where the chipDisplay will be appended to
const wrapper = document.querySelector(".wrapper");
chipDisplay.init(wrapper);
chipDisplay.drawPixel(0, 0);

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
    const generalPurposeRegisters = new Uint8Array(16);

    // Index register I (16 bit) used to store memory addresses
    let indexRegister;

    // Program Counter (PC) used to store the currently execution address
    // 16 bit register
    let pc;

    // Stack array of 16 16bits
    let stack = new Uint16Array(16);
    // Stack pointer. Points to the top level of the stack 8-bit
    let sp;

    // Delay and Sound Timers 8-bit registers
    let delayTimer = 0;
    let soundTimer = 0;

    // fontSprites
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

    // ---------------------------------------------------------------

    function init() {
        loadFontsIntoMemory();
    }
    // 🟢
    function loadFontsIntoMemory() {
        // Font data should be loaded between 0x050 - 0x0A0
        memory.set(hexFontData, 0x050);
    }

    // 🟠
    function loadRomIntoMemory(rom) {
        // program data should be loaded betwee 0x200 and 0xFFF
        memory.set(rom, 0x200);
    }

    function test() {
        console.log(memory.slice(0x050, 0x0a0));
        console.log(memory[0x050]);
        console.log(memory[0x09f]);
    }

    return {
        init,
        test,
    };
})();

chipEmulator.init();
chipEmulator.test();
