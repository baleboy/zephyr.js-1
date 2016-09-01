// Copyright (c) 2016, Intel Corporation.

// Sample code demonstrating how to use I2C to communicate with slave devices

// Hardware Requirements:
//   - A Grove LCD
//   - pull-up resistors for SDA and SCL
// Wiring:
//   For LCD:
//     - Wire SDA on the LCD above the pull-up resistor. Connect that resistor to power (VCC)
//     - Wire SCL on the LCD above the pull-up resistor. Connect that resistor to power (VCC)
//     - Wire SDA on the LCD to SDA on the Arduino 101
//     - Wire SCL on the LCD to SCL on the Arduino 101
//     - Wire power(5V) and ground accordingly

// import i2c module
var i2c = require("i2c");

// Define various Grove LCD addresses
var GROVE_LCD_DISPLAY_ADDR = 0x3E
var GROVE_RGB_BACKLIGHT_ADDR = 0x62

// Defines for the GLCD_CMD_CURSOR_SHIFT
var GLCD_CS_DISPLAY_SHIFT = 1 << 3;
var GLCD_CS_RIGHT_SHIFT   = 1 << 2;

// LCD Display Commands
var GLCD_CMD_SCREEN_CLEAR    = 1 << 0;
var GLCD_CMD_CURSOR_RETURN   = 1 << 1;
var GLCD_CMD_INPUT_SET       = 1 << 2;
var GLCD_CMD_DISPLAY_SWITCH  = 1 << 3;
var GLCD_CMD_CURSOR_SHIFT    = 1 << 4;
var GLCD_CMD_FUNCTION_SET    = 1 << 5;
var GLCD_CMD_SET_CGRAM_ADDR  = 1 << 6;
var GLCD_CMD_SET_DDRAM_ADDR  = 1 << 7;

// Defines for the LCD_FUNCTION_SET
var GLCD_FS_8BIT_MODE       = 1 << 4;
var GLCD_FS_ROWS_2          = 1 << 3;
var GLCD_FS_ROWS_1          = 0 << 3;
var GLCD_FS_DOT_SIZE_BIG    = 1 << 2;
var GLCD_FS_DOT_SIZE_LITTLE = 0 << 2;

// Defines for the GLCD_CMD_DISPLAY_SWITCH options
var GLCD_DS_DISPLAY_ON    = 1 << 2;
var GLCD_DS_DISPLAY_OFF   = 0 << 2;
var GLCD_DS_CURSOR_ON     = 1 << 1;
var GLCD_DS_CURSOR_OFF    = 0 << 1;
var GLCD_DS_BLINK_ON      = 1 << 0;
var GLCD_DS_BLINK_OFF     = 0 << 0;

/********************************************
 *  RGB FUNCTIONS
 *******************************************/

var REGISTER_POWER  = 0x08
var REGISTER_R      = 0x04
var REGISTER_G      = 0x03
var REGISTER_B      = 0x02

print("I2C sample...");

var setupData = new Buffer(2);
var msgData = new Buffer(7);

// GLCD_CMD_SET_CGRAM_ADDR is equal to 64, which is @ in ascii code.
// GLCD_CMD_SET_CGRAM_ADDR is only needed if you are starting at the first
// position of the line.  If you have an offset it isn't necessary.
// TODO: Configure jerryscript to build with support for String.fromCharCode()
// This will allow this to be written like this instead
// var msgData = new Buffer(String.fromCharCode(GLCD_CMD_SET_CGRAM_ADDR) + "HELLO!");

msgData.write("@HELLO!");

var hello = false;
var lcdDispAddr = { address: GROVE_LCD_DISPLAY_ADDR, length: 2 };

// Open the connection to the I2C bus
var i2cDevice = i2c.open({ bus: 0, speed: 100 });

function init()
{
    // Set our preferences for the Grove LCD
    var setup = GLCD_CMD_FUNCTION_SET | (GLCD_FS_ROWS_2 | GLCD_FS_DOT_SIZE_LITTLE | GLCD_FS_8BIT_MODE);
    setupData.writeUInt8(0, 0);
    setupData.writeUInt8(setup, 1);
    i2cDevice.write(lcdDispAddr, setupData);

    setup = GLCD_CMD_DISPLAY_SWITCH | (GLCD_DS_DISPLAY_ON | GLCD_DS_CURSOR_ON | GLCD_DS_BLINK_ON);
    setupData.writeUInt8(0, 0);
    setupData.writeUInt8(setup, 1);
    i2cDevice.write(lcdDispAddr, setupData);
}

function resetCursor()
{
    // Reset the cursor position
    var col = 0x80;

    setupData.writeUInt8(GLCD_CMD_SET_DDRAM_ADDR, 0);
    setupData.writeUInt8(col, 1);
    i2cDevice.write({ address: GROVE_LCD_DISPLAY_ADDR, length: 2 }, setupData);
}

function writeWord()
{
    resetCursor();

    if (hello) {
        msgData.write("@HELLO!");
    }
    else {
        msgData.write("@WORLD!");
    }

    hello = !hello;
    i2cDevice.write(lcdDispAddr, msgData);
}

// Main function

init();

// Write HELLO! immediately
i2cDevice.write(lcdDispAddr, msgData);

// Alternate writing HELLO! and WORLD! forever
setInterval(writeWord, 2000);
