// Copyright (c) 2016, Intel Corporation.

console.log("Wire IO3 to IO2");

var assert = require("Assert.js");

var pwm = require("pwm");
var gpio = require("gpio");
var pins = require("arduino101_pins");
var pinA, pinB, msTimer, cycleTimer;

pinB = gpio.open({ pin: pins.IO2, direction: 'in' });

// PWMPins open
pinA = pwm.open({ channel: pins.IO3 });
assert(pinA !== null && typeof pinA === "object",
      "open: defined pin and default argument");

assert.throws(function () {
    pinA = pwm.open({ channel: 1024 });
}, "open: undefined pin");

// set Period and PulseWidth with ms
// duty cycle: 33%
var msTrue = 0;
var msFalse = 0;

assert.throws(function () {
    pinA.setPulseWidth(300);
}, "pwmpin: set pulseWidth without period");

pinA = pwm.open({ channel: pins.IO3, period: 3, pulseWidth: 1 });
assert(pinA !== null && typeof pinA === "object",
       "open: with period and pulseWidth");

pinA.setPeriod(3000);

assert.throws(function () {
    pinA.setPulseWidth(3000);
}, "pwmpin: set pulseWidth greater than period");

pinA.setPulseWidth(1000);

msTimer = setInterval(function () {
    if (pinB.read()) {
        msTrue = msTrue + 1;
    } else {
        msFalse = msFalse + 1;
    }
    // set 50 ms but 60 ms actually and time precision 20 ms for zephyr 1.6
}, 50);

setTimeout(function () {
    // 16 = 0.33 < 0.3333 < 0.34 = 17
    assert((15 < msTrue) && (msTrue < 18) && (32 < msFalse) && (msFalse < 35),
           "pwmpin: set period and pulseWidth");
    clearInterval(msTimer);

    assert.throws(function () {
        pinA.setPeriod("Value");
    }, "pwmpin: set period with invalid value");

    assert.throws(function () {
        pinA.setPulseWidth("Value");
    }, "pwmpin: set pulseWidth with invalid value");

    // set Period and PulseWidth with cycle
    // duty cycle: 70%
    var cyclesTrue = 0;
    var cyclesFlase = 0;
    var cyclesCount = 0;
    var periodCount = 0;
    var Flag = false;
    var oldFlag = false;
    pinA = pwm.open({ channel: pins.IO3, polarity: "reverse" });
    assert(pinA !== null && typeof pinA === "object", "open: reverse polarity");

    pinA.setPeriodCycles(10000000);
    pinA.setPulseWidthCycles(3000000);

    cycleTimer = setInterval(function () {
       Flag = pinB.read();

       if (Flag === oldFlag) {
           cyclesCount = cyclesCount + 1;
       } else {
           if (oldFlag) {
               cyclesTrue = cyclesTrue + cyclesCount;
           } else {
               cyclesFlase = cyclesFlase + cyclesCount;
           }

           oldFlag = Flag;
           cyclesCount = 0;

           if (Flag === false) {
               periodCount = periodCount + 1;
           }

           if (periodCount === 3) {
               assert((10 < cyclesFlase) && (cyclesFlase < 14) &&
                      (28 < cyclesTrue) && (cyclesTrue < 32),
                      "pwmpin: set periodCycles and pulseWidthCycles");

               assert.result();
               clearInterval(cycleTimer);
           }
       }
    // set 10 ms but 20 ms actually
    }, 10);
}, 3040);

assert.throws(function () {
    pinA.setPeriodCycles("Value");
}, "pwmpin: set periodCycles with invalid value");

assert.throws(function () {
    pinA.setPulseWidthCycles("Value");
}, "pwmpin: set pulseWidthCycles with invalid value");
